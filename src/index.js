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
app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));

// Rate limiting - more permissive for Railway
const limiter = rateLimit({ 
  windowMs: 60 * 1000, 
  max: 200, 
  message: { error: 'Too many requests - Chill bro 🔥' },
  standardHeaders: true,
  legacyHeaders: false
});
const botLimiter = rateLimit({ windowMs: 60 * 1000, max: 60 });
app.use('/api', limiter);
app.use('/webhook', botLimiter);

// IMPORTANT: Health check BEFORE other heavy middleware for Railway
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    service: 'GAMER STORE 🔥',
    version: '3.0.0-gamer-edition'
  });
});

app.get('/', (req, res) => {
  // Redirect to customer store if no specific path
  const hasDist = fs.existsSync(path.join(process.cwd(), 'miniapp', 'customer', 'dist'));
  if (hasDist) {
    return res.redirect('/customer');
  }
  res.json({
    name: 'GAMER STORE 🔥 - Digital Keys for Pro Gamers',
    version: '3.0.0',
    status: 'online 🚀',
    endpoints: {
      customer: '/customer',
      admin: '/admin',
      health: '/health',
      api: '/api'
    },
    message: 'Yo! Store is live - Hit /customer to PLAY NOW 🎮🔥'
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
  logger.info(`✅ Serving customer app from ${customerDistPath}`);
  app.use('/customer', express.static(customerDistPath, { 
    maxAge: '1d',
    etag: true
  }));
  app.get('/customer/*', (req, res) => {
    res.sendFile(path.join(customerDistPath, 'index.html'));
  });
} else {
  logger.warn(`⚠️ Customer dist not found at ${customerDistPath} - run npm run build:customer`);
  app.get('/customer', (req, res) => {
    res.status(200).send(`
      <html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width"><title>GAMER STORE 🔥</title></head>
      <body style="background:#000;color:#00ff88;font-family:monospace;display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column">
        <h1>🎮 GAMER STORE 🔥</h1>
        <p>Customer app building... Please run: npm run build:customer</p>
        <p style="color:#888">This will auto-build on Railway</p>
      </body></html>
    `);
  });
}

if (fs.existsSync(adminDistPath)) {
  logger.info(`✅ Serving admin app from ${adminDistPath}`);
  app.use('/admin', express.static(adminDistPath, { maxAge: '1d', etag: true }));
  app.get('/admin/*', (req, res) => {
    res.sendFile(path.join(adminDistPath, 'index.html'));
  });
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
// NOTE: precedence matters here — without parentheses this evaluates as
// (BASE_URL || RAILWAY_PUBLIC_DOMAIN) ? "https://undefined" : localhost,
// breaking every generated link whenever only BASE_URL is set.
const BASE_URL = process.env.BASE_URL || (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : `http://localhost:${PORT}`);

(async () => {
  try {
    // Connect DB - with retry for Railway
    let dbConnected = false;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await connectDB();
        await seedDefaults();
        dbConnected = true;
        logger.info(`✅ Database connected - Attempt ${attempt}`);
        break;
      } catch (dbErr) {
        logger.warn(`⚠️ DB connection attempt ${attempt} failed: ${dbErr.message}`);
        if (attempt === 3) throw dbErr;
        await new Promise(r => setTimeout(r, 3000));
      }
    }

    // Create Telegram Bot
    const bot = createBot(io);
    app.set('bot', bot);
    app.set('io', io);

    // Make admin routes aware of bot
    app.use((req, res, next) => {
      req.bot = bot;
      next();
    });

    // Setup webhook or polling - improved Railway detection
    const isRailway = !!process.env.RAILWAY_ENVIRONMENT || !!process.env.RAILWAY_PUBLIC_DOMAIN;
    const webhookDomain = process.env.WEBHOOK_DOMAIN || (isRailway && process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : null) || BASE_URL;
    const shouldUseWebhook = webhookDomain && (process.env.NODE_ENV === 'production' || isRailway || process.env.USE_WEBHOOK === 'true');

    if (shouldUseWebhook && process.env.BOT_TOKEN) {
      const webhookPath = `/webhook/${process.env.BOT_TOKEN}`;
      try {
        await bot.telegram.deleteWebhook(); // clean old
        await new Promise(r => setTimeout(r, 500));
        const fullWebhookUrl = `${webhookDomain.replace(/\/$/, '')}${webhookPath}`;
        await bot.telegram.setWebhook(fullWebhookUrl, {
          drop_pending_updates: false,
          allowed_updates: ['message', 'callback_query', 'inline_query']
        });
        app.use(webhookPath, express.json(), (req, res) => {
          try {
            bot.handleUpdate(req.body, res);
          } catch (e) {
            logger.error('Webhook handle error:', e);
            res.status(200).send('OK');
          }
        });
        logger.info(`✅ Webhook set to ${fullWebhookUrl} 🚀`);
      } catch (webhookErr) {
        logger.warn(`⚠️ Webhook setup failed (${webhookErr.message}) - falling back to polling`);
        try {
          await bot.telegram.deleteWebhook();
          await bot.launch({ dropPendingUpdates: true });
          logger.info('✅ Bot started in polling mode (fallback) 🎮');
        } catch (pollErr) {
          logger.error('❌ Both webhook and polling failed:', pollErr.message);
        }
      }
    } else {
      if (process.env.BOT_TOKEN) {
        try {
          await bot.telegram.deleteWebhook();
          await bot.launch({ dropPendingUpdates: true });
          logger.info('✅ Bot started in polling mode 🎮🔥');
        } catch (e) {
          logger.error('Failed to start bot in polling:', e.message);
        }
      } else {
        logger.warn('⚠️ No BOT_TOKEN - bot disabled, API and WebApps still work');
      }
    }

    // Start server - bind 0.0.0.0 for Railway
    server.listen(PORT, '0.0.0.0', () => {
      logger.info(`\n${'═'.repeat(60)}`);
      logger.info(`🚀 GAMER STORE 🔥 - READY TO PLAY!`);
      logger.info(`📡 Server: ${BASE_URL}`);
      logger.info(`📡 Listening on 0.0.0.0:${PORT}`);
      logger.info(`🖥️  Admin Panel: ${BASE_URL}/admin`);
      logger.info(`📱 Customer App: ${BASE_URL}/customer`);
      logger.info(`🔗 Health: ${BASE_URL}/health`);
      logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🚂 Railway: ${isRailway ? 'YES' : 'NO'}`);
      logger.info(`${'═'.repeat(60)}\n`);
    });

    // Graceful shutdown
    const shutdown = async (signal) => {
      logger.info(`Received ${signal}, shutting down gracefully...`);
      try {
        if (bot && bot.stop) bot.stop(signal);
      } catch {}
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
      setTimeout(() => process.exit(1), 10000);
    };
    process.once('SIGINT', () => shutdown('SIGINT'));
    process.once('SIGTERM', () => shutdown('SIGTERM'));
    process.on('unhandledRejection', (reason) => {
      logger.error('Unhandled Rejection:', reason);
    });
    process.on('uncaughtException', (err) => {
      logger.error('Uncaught Exception:', err);
    });

  } catch (err) {
    logger.error('❌ Startup failed:', err);
    // Still start server for healthcheck even if DB fails, so Railway doesn't kill it immediately
    server.listen(PORT, '0.0.0.0', () => {
      logger.info(`⚠️ Server started in degraded mode on port ${PORT} - DB failed but healthcheck will respond`);
      app.get('/health', (req, res) => res.status(500).json({ status: 'error', error: err.message }));
    });
  }
})();
