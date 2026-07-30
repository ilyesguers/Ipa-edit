require('dotenv').config();

// Ensure BASE_URL and WEBHOOK_DOMAIN always have valid https:// scheme and no trailing slash
const normalizeUrl = (url) => {
  if (!url) return url;
  let clean = String(url).trim().replace(/\/+$/, '');
  if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
    clean = `https://${clean}`;
  } else if (clean.startsWith('http://') && !clean.includes('localhost') && !clean.includes('127.0.0.1')) {
    clean = clean.replace('http://', 'https://');
  }
  return clean;
};

if (process.env.BASE_URL) {
  process.env.BASE_URL = normalizeUrl(process.env.BASE_URL);
} else if (process.env.WEBHOOK_DOMAIN) {
  process.env.BASE_URL = normalizeUrl(process.env.WEBHOOK_DOMAIN);
}

if (process.env.WEBHOOK_DOMAIN) {
  process.env.WEBHOOK_DOMAIN = normalizeUrl(process.env.WEBHOOK_DOMAIN);
}

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
app.set('trust proxy', 1);
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

// ── MIDDLEWARE ──
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));

// Rate limiting
const limiter = rateLimit({ windowMs: 60 * 1000, max: 100, message: { error: 'Too many requests' } });
const botLimiter = rateLimit({ windowMs: 60 * 1000, max: 30 });
app.use('/api', limiter);
app.use('/webhook', botLimiter);

// ── STATIC FILES ──
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
app.use('/public', express.static(path.join(process.cwd(), 'public')));

// Serve built Mini Apps
const adminDistPath = path.join(process.cwd(), 'miniapp', 'admin', 'dist');
const customerDistPath = path.join(process.cwd(), 'miniapp', 'customer', 'dist');

if (fs.existsSync(adminDistPath)) {
  app.use('/admin', express.static(adminDistPath));
  app.get('/admin/*', (req, res) => res.sendFile(path.join(adminDistPath, 'index.html')));
}

if (fs.existsSync(customerDistPath)) {
  app.use('/customer', express.static(customerDistPath));
  app.get('/customer/*', (req, res) => res.sendFile(path.join(customerDistPath, 'index.html')));
}

// ── HEALTH CHECK ──
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// ── API ROUTES ──
app.use('/api', apiRoutes);

// ── SOCKET.IO ──
io.on('connection', (socket) => {
  logger.info(`Socket connected: ${socket.id}`);
  socket.on('admin_join', () => socket.join('admin_room'));
  socket.on('disconnect', () => logger.info(`Socket disconnected: ${socket.id}`));
});

// ── MAIN STARTUP ──
const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

(async () => {
  try {
    // Connect DB
    await connectDB();
    await seedDefaults();

    // Create Telegram Bot
    const bot = createBot(io);
    app.set('bot', bot);
    app.set('io', io);

    // Make admin routes aware of bot
    app.use((req, res, next) => {
      req.bot = bot;
      next();
    });

    // Setup webhook or polling
    if (process.env.WEBHOOK_DOMAIN && process.env.NODE_ENV === 'production') {
      const webhookPath = `/webhook/${process.env.BOT_TOKEN}`;
      await bot.telegram.setWebhook(`${BASE_URL}${webhookPath}`);
      app.use(webhookPath, express.json(), (req, res) => {
        bot.handleUpdate(req.body, res);
      });
      logger.info(`✅ Webhook set to ${BASE_URL}${webhookPath}`);
    } else {
      await bot.telegram.deleteWebhook();
      bot.launch();
      logger.info('✅ Bot started in polling mode');
    }

    // Start server
    server.listen(PORT, () => {
      logger.info(`\n${'═'.repeat(60)}`);
      logger.info(`🚀 Digital Keys Store started!`);
      logger.info(`📡 Server: ${BASE_URL}`);
      logger.info(`🖥️  Admin Panel: ${BASE_URL}/admin`);
      logger.info(`📱 Customer App: ${BASE_URL}/customer`);
      logger.info(`🔗 Health: ${BASE_URL}/health`);
      logger.info(`${'═'.repeat(60)}\n`);
    });

    // Graceful shutdown
    process.once('SIGINT', () => { bot.stop('SIGINT'); server.close(); });
    process.once('SIGTERM', () => { bot.stop('SIGTERM'); server.close(); });

  } catch (err) {
    logger.error('❌ Startup failed:', err);
    process.exit(1);
  }
})();
