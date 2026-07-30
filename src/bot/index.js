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

  // ── User middleware: update ONLY on change ──
  bot.use(async (ctx, next) => {
    if (!ctx.from) return next();

    try {
      const telegramId = ctx.from.id;
      const isAdmin = ADMIN_IDS.includes(telegramId);

      let user = await User.findOne({ telegramId });

      if (!user) {
        // ── Create new user ──
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
        // ── Update ONLY if data changed (saves DB writes) ──
        let needsSave = false;
        const newUsername = ctx.from.username || null;
        const newFirstName = ctx.from.first_name || '';
        const newLastName = ctx.from.last_name || '';

        if (user.username !== newUsername) {
          user.username = newUsername;
          needsSave = true;
        }
        if (user.firstName !== newFirstName) {
          user.firstName = newFirstName;
          needsSave = true;
        }
        if (user.lastName !== newLastName) {
          user.lastName = newLastName;
          needsSave = true;
        }
        // Update lastSeen every 5 minutes max (not every message)
        const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
        if (!user.lastSeen || user.lastSeen < fiveMinAgo) {
          user.lastSeen = new Date();
          needsSave = true;
        }
        // Role upgrade
        if (isAdmin && user.role === 'customer') {
          user.role = 'admin';
          needsSave = true;
        }

        if (needsSave) {
          await user.save();
        }
      }

      ctx.dbUser = user;
      ctx.isAdmin = isAdmin || user.role === 'admin' || user.role === 'superadmin';
      ctx.io = io;

      // Check ban
      if (user.isBanned) {
        return ctx.reply(
          `🚫 حسابك محظور. / Your account is banned.\n` +
          `السبب / Reason: ${user.banReason || 'مخالفة القوانين / Violation'}\n\n` +
          `للتواصل / Contact: @${process.env.SUPPORT_USERNAME || 'support'}`
        );
      }

      // Check maintenance mode
      const maintenance = await Settings.get('maintenance_mode', false);
      if (maintenance && !ctx.isAdmin) {
        const maintenanceMsg = await Settings.get('maintenance_message', '🔧 الموقع تحت الصيانة / Site under maintenance');
        return ctx.reply(maintenanceMsg);
      }

    } catch (err) {
      logger.error('User middleware error:', err);
    }

    return next();
  });

  // ═══════════════════════════════════════
  // COMMANDS
  // ═══════════════════════════════════════
  bot.start(startHandler);
  bot.command('admin', adminHandler);
  bot.command('shop', shopHandler);
  bot.command('profile', profileHandler);
  bot.command('keys', keysHandler);
  bot.command('history', historyHandler);
  bot.command('balance', balanceHandler);
  bot.command('help', helpHandler);

  // ── /stats alias for admins ──
  bot.command('stats', async (ctx) => {
    if (!ctx.isAdmin) return ctx.reply('⛔ غير مصرح لك / Unauthorized');
    return adminHandler(ctx);
  });

  bot.command('broadcast', async (ctx) => {
    if (!ctx.isAdmin) return ctx.reply('⛔ غير مصرح لك / Unauthorized');
    ctx.reply('📢 استخدم لوحة الإدارة لإرسال الإذاعة\n📢 Use admin panel to send broadcast');
  });

  // ── Callback queries ──
  bot.on('callback_query', callbackHandler);

  // ── Payment messages (text handler) ──
  bot.on('message', paymentHandler);

  // ── Error handler ──
  bot.catch((err, ctx) => {
    logger.error(`Bot error for ${ctx.updateType}:`, err);
    if (ctx.reply) {
      ctx.reply(
        '❌ حدث خطأ غير متوقع، يرجى المحاولة مجدداً\n' +
        '❌ Unexpected error, please try again'
      ).catch(() => {});
    }
  });

  return bot;
};

module.exports = { createBot };
