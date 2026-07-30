const { Telegraf, Markup, session } = require('telegraf');
const logger = require('../utils/logger');
const User = require('../models/User');
const Settings = require('../models/Settings');

const { startHandler } = require('./handlers/start');
const { shopHandler } = require('./handlers/shop');
const { profileHandler } = require('./handlers/profile');
const { keysHandler } = require('./handlers/keys');
const { historyHandler } = require('./handlers/history');
const { balanceHandler } = require('./handlers/balance');
const { helpHandler } = require('./handlers/help');
const { adminHandler } = require('./handlers/admin');
const { callbackHandler } = require('./handlers/callbacks');
const { paymentHandler } = require('./handlers/payment');

const ADMIN_IDS = (process.env.ADMIN_IDS || '').split(',').map(id => parseInt(id.trim())).filter(Boolean);

const createBot = (io) => {
  const bot = new Telegraf(process.env.BOT_TOKEN);

  // Session middleware
  bot.use(session());

  // User middleware - register/update user on every message
  bot.use(async (ctx, next) => {
    if (!ctx.from) return next();

    try {
      const telegramId = ctx.from.id;
      const isAdmin = ADMIN_IDS.includes(telegramId);

      let user = await User.findOne({ telegramId });
      if (!user) {
        user = await User.create({
          telegramId,
          username: ctx.from.username || null,
          firstName: ctx.from.first_name || '',
          lastName: ctx.from.last_name || '',
          languageCode: ctx.from.language_code || 'ar',
          role: isAdmin ? 'admin' : 'customer'
        });
        logger.info(`🆕 New user: ${user.fullName} (${telegramId})`);
      } else {
        // Update user info
        user.username = ctx.from.username || user.username;
        user.firstName = ctx.from.first_name || user.firstName;
        user.lastName = ctx.from.last_name || user.lastName;
        user.lastSeen = new Date();
        if (isAdmin && user.role === 'customer') user.role = 'admin';
        await user.save();
      }

      ctx.dbUser = user;
      ctx.isAdmin = isAdmin || user.role === 'admin' || user.role === 'superadmin';
      ctx.io = io;

      // Check ban
      if (user.isBanned) {
        return ctx.reply(`🚫 حسابك محظور.\nالسبب: ${user.banReason || 'مخالفة القوانين'}\n\nللتواصل مع الدعم استخدم القناة الرسمية.`);
      }

      // Check maintenance mode
      const maintenance = await Settings.get('maintenance_mode', false);
      if (maintenance && !ctx.isAdmin) {
        const maintenanceMsg = await Settings.get('maintenance_message', '🔧 الموقع تحت الصيانة');
        return ctx.reply(maintenanceMsg);
      }

    } catch (err) {
      logger.error('User middleware error:', err);
    }

    return next();
  });

  // Commands
  bot.start(startHandler);
  bot.command('admin', adminHandler);
  bot.command('shop', shopHandler);
  bot.command('profile', profileHandler);
  bot.command('keys', keysHandler);
  bot.command('history', historyHandler);
  bot.command('balance', balanceHandler);
  bot.command('help', helpHandler);
  bot.command('broadcast', async (ctx) => {
    if (!ctx.isAdmin) return ctx.reply('⛔ غير مصرح لك');
    ctx.reply('📢 استخدم لوحة الإدارة لإرسال الإذاعة');
  });

  // Callback queries
  bot.on('callback_query', callbackHandler);

  // Payment messages
  bot.on('message', paymentHandler);

  // Error handler
  bot.catch((err, ctx) => {
    logger.error(`Bot error for ${ctx.updateType}:`, err);
    if (ctx.reply) {
      ctx.reply('❌ حدث خطأ غير متوقع، يرجى المحاولة مجدداً').catch(() => {});
    }
  });

  return bot;
};

module.exports = { createBot };
