require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

const { connectDB, seedDefaults } = require('./services/database');
const logger = require('./utils/logger');
const { createBot } = require('./bot');
const apiRoutes = require('./api');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

// Trust proxy for Railway
app.set('trust proxy', 1);

// MIDDLEWARE
app.use(helmet({ 
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false 
}));
app.use(compression());
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
// Avoid filling Railway logs for health probes and fingerprinted static assets.
// Less synchronous log I/O keeps the event loop free for actual requests.
app.use(morgan('combined', {
  skip: (req) => req.path === '/health' || req.path.startsWith('/customer/assets/') || req.path.startsWith('/admin/assets/'),
  stream: { write: (msg) => logger.info(msg.trim()) }
}));

// Rate limiting - more permissive for Railway
const limiter = rateLimit({ 
  windowMs: 60 * 1000, 
  max: 200, 
  message: { error: 'Too many requests. Please try again shortly.' },
  standardHeaders: true,
  legacyHeaders: false
});
const botLimiter = rateLimit({ windowMs: 60 * 1000, max: 60 });
app.use('/api', limiter);
app.use('/webhook', botLimiter);

// IMPORTANT: Health check BEFORE other heavy middleware for Railway
let dbHealthy = false;
app.get('/health', (req, res) => {
  res.status(200).json({
    status: dbHealthy ? 'ok' : 'degraded',
    db: dbHealthy ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    service: 'GAMER STORE',
    version: '5.0.0'
  });
});

app.get('/', (req, res) => {
  // Redirect to customer store if no specific path
  const hasDist = fs.existsSync(path.join(process.cwd(), 'miniapp', 'customer', 'dist'));
  if (hasDist) {
    return res.redirect('/customer');
  }
  res.json({
    name: 'GAMER STORE',
    version: '5.0.0',
    status: 'online',
    endpoints: {
      customer: '/customer',
      admin: '/admin',
      health: '/health',
      api: '/api'
    },
    message: 'Store is available at /customer'
  });
});

// STATIC FILES
const uploadsPath = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}
app.use('/uploads', express.static(uploadsPath));
app.use('/public', express.static(path.join(process.cwd(), 'public')));

// Serve built Mini Apps - with fallback handling
const adminDistPath = path.join(process.cwd(), 'miniapp', 'admin', 'dist');
const customerDistPath = path.join(process.cwd(), 'miniapp', 'customer', 'dist');

if (fs.existsSync(customerDistPath)) {
  logger.info(`Serving customer app from ${customerDistPath}`);
  // Vite fingerprints assets, so they can be cached aggressively. The HTML is
  // deliberately not cached: Railway deploys become visible immediately rather
  // than leaving Telegram users on a stale bundle for a day.
  app.use('/customer', express.static(customerDistPath, {
    maxAge: '1y',
    immutable: true,
    etag: true,
    index: false,
    redirect: false
  }));
  const sendCustomerIndex = (req, res) => {
    res.set('Cache-Control', 'no-cache');
    res.sendFile(path.join(customerDistPath, 'index.html'));
  };
  app.get('/customer', sendCustomerIndex);
  app.get('/customer/*', sendCustomerIndex);
} else {
  logger.warn(`⚠️ Customer dist not found at ${customerDistPath} - run npm run build:customer`);
  app.get('/customer', (req, res) => {
    res.status(200).send(`
      <html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width"><title>GAMER STORE</title></head>
      <body style="background:#000;color:#00ff88;font-family:monospace;display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column">
        <h1>GAMER STORE</h1>
        <p>Customer app is building. Run: npm run build:customer</p>
        <p style="color:#888">Railway builds this automatically.</p>
      </body></html>
    `);
  });
}

if (fs.existsSync(adminDistPath)) {
  logger.info(`Serving admin app from ${adminDistPath}`);
  app.use('/admin', express.static(adminDistPath, { maxAge: '1y', immutable: true, etag: true, index: false, redirect: false }));
  const sendAdminIndex = (req, res) => {
    res.set('Cache-Control', 'no-cache');
    res.sendFile(path.join(adminDistPath, 'index.html'));
  };
  app.get('/admin', sendAdminIndex);
  app.get('/admin/*', sendAdminIndex);
} else {
  logger.warn(`⚠️ Admin dist not found at ${adminDistPath}`);
}

// API ROUTES
app.use('/api', apiRoutes);

// 404 handler for API
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found - Check /health', code: 404 });
});

// SOCKET.IO
io.on('connection', (socket) => {
  logger.info(`Socket connected: ${socket.id} 🎮`);
  socket.on('admin_join', () => socket.join('admin_room'));
  socket.on('disconnect', () => logger.info(`Socket disconnected: ${socket.id}`));
});

// MAIN STARTUP
const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : `http://localhost:${PORT}`);
const isRailway = Boolean(process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PUBLIC_DOMAIN);
let bot = null;
let serverStarted = false;

// Listen before connecting to MongoDB. Railway can now receive /health while
// MongoDB wakes up or retries, instead of treating a healthy process as down.
const startHttpServer = () => {
  if (serverStarted) return;
  serverStarted = true;
  server.listen(PORT, '0.0.0.0', () => {
    logger.info(`Server listening on 0.0.0.0:${PORT}`);
    logger.info(`Customer: ${BASE_URL}/customer | Admin: ${BASE_URL}/admin | Railway: ${isRailway ? 'yes' : 'no'}`);
  });
};

const schedulePendingOrderCleanup = () => {
  const cron = require('node-cron');
  cron.schedule('*/10 * * * *', async () => {
    try {
      const Settings = require('./models/Settings');
      const Order = require('./models/Order');
      const timeoutMinutes = await Settings.get('payment_timeout_minutes', 15);
      const cutoff = new Date(Date.now() - timeoutMinutes * 60 * 1000);
      const stale = await Order.find({ status: 'pending', createdAt: { $lt: cutoff } }).limit(50);
      for (const order of stale) {
        order.status = 'cancelled';
        order.adminNotes = 'انتهت مهلة الدفع - أُلغي تلقائياً';
        await order.save();
        const activeBot = app.get('bot');
        if (activeBot?.telegram?.sendMessage) {
          await activeBot.telegram.sendMessage(
            order.user,
            `<b>انتهت مهلة الدفع</b>\n\n${order.productName} - ${order.durationName}\n<code>${order.orderNumber}</code>\n\nأُلغي الطلب تلقائياً بعد ${timeoutMinutes} دقيقة. تواصل مع الدعم إذا تم الدفع فعلاً.`,
            { parse_mode: 'HTML' }
          ).catch(() => {});
        }
      }
      if (stale.length) logger.info(`Auto-cancelled ${stale.length} stale pending order(s)`);
    } catch (err) {
      logger.error('Auto-cancel cron error:', err.message);
    }
  });
  logger.info('Payment timeout cleanup scheduled');
};

const startBot = async () => {
  bot = createBot(io);
  app.set('bot', bot);
  app.set('io', io);

  const webhookDomain = process.env.WEBHOOK_DOMAIN
    || (isRailway && process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : null)
    || BASE_URL;
  const shouldUseWebhook = Boolean(webhookDomain && (process.env.NODE_ENV === 'production' || isRailway || process.env.USE_WEBHOOK === 'true'));

  if (!process.env.BOT_TOKEN) {
    logger.warn('BOT_TOKEN is not set; the API and mini apps are available without the bot');
    return;
  }

  if (shouldUseWebhook) {
    const webhookPath = `/webhook/${process.env.BOT_TOKEN}`;
    try {
      await bot.telegram.deleteWebhook();
      const fullWebhookUrl = `${webhookDomain.replace(/\/$/, '')}${webhookPath}`;
      await bot.telegram.setWebhook(fullWebhookUrl, {
        drop_pending_updates: false,
        // pre_checkout_query + successful_payment (inside message) power Telegram Stars
        allowed_updates: ['message', 'callback_query', 'pre_checkout_query']
      });
      app.use(webhookPath, express.json(), (req, res) => {
        Promise.resolve(bot.handleUpdate(req.body, res)).catch((err) => {
          logger.error('Webhook handle error:', err);
          if (!res.headersSent) res.status(200).send('OK');
        });
      });
      logger.info(`Webhook configured: ${fullWebhookUrl}`);
      return;
    } catch (webhookErr) {
      logger.warn(`Webhook setup failed (${webhookErr.message}); falling back to polling`);
    }
  }

  try {
    await bot.telegram.deleteWebhook();
    await bot.launch({ dropPendingUpdates: true });
    logger.info('Bot started in polling mode');
  } catch (err) {
    logger.error('Bot polling failed:', err.message);
  }
};

startHttpServer();

let servicesStarted = false;
let recoveryTimer = null;
const bootstrapServices = async () => {
  if (servicesStarted) return;
  try {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        await connectDB();
        await seedDefaults();
        dbHealthy = true;
        logger.info(`Database connected on attempt ${attempt}`);
        try { require('./utils/customEmoji').initPremiumEmoji(); } catch (_) {}
        break;
      } catch (dbErr) {
        logger.warn(`Database connection attempt ${attempt} failed: ${dbErr.message}`);
        if (attempt === 3) throw dbErr;
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    }

    await startBot();
    schedulePendingOrderCleanup();
    servicesStarted = true;
  } catch (err) {
    dbHealthy = false;
    // Keep Railway's process healthy and retry in the background. This is much
    // safer than a restart loop when MongoDB takes longer than the deploy.
    logger.error('Startup entered degraded mode:', err);
    recoveryTimer = setTimeout(() => {
      recoveryTimer = null;
      bootstrapServices();
    }, 15_000);
  }
};
bootstrapServices();

const shutdown = async (signal) => {
  logger.info(`Received ${signal}, shutting down gracefully`);
  if (recoveryTimer) clearTimeout(recoveryTimer);
  try {
    if (bot?.stop) bot.stop(signal);
  } catch (_) {}
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000);
};

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));
process.on('unhandledRejection', (reason) => logger.error('Unhandled Rejection:', reason));
process.on('uncaughtException', (err) => logger.error('Uncaught Exception:', err));
