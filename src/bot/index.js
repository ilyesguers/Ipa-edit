const { Telegraf, session } = require('telegraf');
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
const { openAdminPortal } = require('./handlers/admin');
const { callbackHandler } = require('./handlers/callbacks');
const { paymentHandler } = require('./handlers/payment');

const ADMIN_IDS = (process.env.ADMIN_IDS || '').split(',').map(id => parseInt(id.trim())).filter(Boolean);

const createBot = (io) => {
  if (!process.env.BOT_TOKEN) {
    logger.warn('⚠️ BOT_TOKEN not set - bot will not start, but server will continue for Railway healthcheck');
    // Return dummy bot that doesn't crash server
    return {
      telegram: { setWebhook: async () => {}, deleteWebhook: async () => {}, getMe: async () => ({ username: 'test' }), sendMessage: async () => {} },
      launch: async () => {},
      stop: () => {},
      handleUpdate: () => {}
    };
  }

  const bot = new Telegraf(process.env.BOT_TOKEN);

  // Global premium-emoji safety net
  const { isPremiumEmojiError, stripKeyboardExtras } = require('../utils/safeSend');
  const { stripPremiumEmoji, emojiHtml, buttonEmojiId, buttonLabel } = require('../utils/customEmoji');

  const originalCallApi = bot.telegram.callApi.bind(bot.telegram);
  bot.telegram.callApi = async function (method, payload = {}, ...rest) {
    try {
      return await originalCallApi(method, payload, ...rest);
    } catch (err) {
      if (!isPremiumEmojiError(err, payload) || !payload || typeof payload !== 'object') throw err;

      logger.warn(`⚠️ [${method}] premium emoji rejected — retrying without premium emoji.`);
      const clean = { ...payload };
      if (typeof clean.text === 'string') clean.text = stripPremiumEmoji(clean.text);
      if (typeof clean.caption === 'string') clean.caption = stripPremiumEmoji(clean.caption);
      const scrubbed = stripKeyboardExtras(clean);
      return originalCallApi(method, scrubbed, ...rest);
    }
  };

  bot.use(session({ defaultSession: () => ({ menuMessageId: null }) }));

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
          preferredLanguage: String(ctx.from.language_code || '').toLowerCase().startsWith('en') ? 'en' : 'ar',
          role: isAdmin ? 'admin' : 'customer'
        });
        logger.info(`🆕 New gamer: ${user.fullName} (${telegramId}) 🔥`);
      } else {
        let needsSave = false;
        const newUsername = ctx.from.username || null;
        const newFirstName = ctx.from.first_name || '';
        const newLastName = ctx.from.last_name || '';

        if (user.username !== newUsername) { user.username = newUsername; needsSave = true; }
        if (user.firstName !== newFirstName) { user.firstName = newFirstName; needsSave = true; }
        if (user.lastName !== newLastName) { user.lastName = newLastName; needsSave = true; }
        const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
        if (!user.lastSeen || user.lastSeen < fiveMinAgo) { user.lastSeen = new Date(); needsSave = true; }
        if (isAdmin && user.role === 'customer') { user.role = 'admin'; needsSave = true; }
        if (needsSave) await user.save();
      }

      ctx.dbUser = user;
      ctx.isAdmin = isAdmin || user.role === 'admin' || user.role === 'superadmin';
      ctx.io = io;

      if (user.isBanned) {
        return ctx.reply(
          `${emojiHtml('skull')} حسابك محظور يا برو / Your account is banned bro\n` +
          `السبب / Reason: ${user.banReason || 'مخالفة'}\n\n` +
          `تواصل / Contact: @${process.env.SUPPORT_USERNAME || 'support'}`
        );
      }

      const maintenance = await Settings.get('maintenance_mode', false);
      if (maintenance && !ctx.isAdmin) {
        const maintenanceMsg = await Settings.get('maintenance_message', `${emojiHtml('gear')} المتجر تحت الصيانة السريعة - بنرجع بسرعة الصاروخ / Quick maintenance - coming back rocket fast`);
        return ctx.reply(maintenanceMsg);
      }

      return next();
    } catch (err) {
      logger.error('🔴 User middleware error:', err);
      // Check if it's a database connection issue
      const { isDbError, sendGamerError, notifyAdminsOfError } = require('../utils/gamerErrors');
      const errorType = isDbError(err) ? 'dbError' : 'generic';
      
      // Tell the owner the real reason behind the error message
      notifyAdminsOfError(ctx, err, errorType);
      
      // Try to send a helpful error message
      try {
        return await sendGamerError(ctx, errorType);
      } catch (sendErr) {
        logger.error('Failed to send error message:', sendErr);
      }
      return; // Don't continue to handlers if user data failed
    }
  });

  // Commands - all focus on webapp now
  bot.start(startHandler);
  bot.command('admin', (ctx) => openAdminPortal(ctx, 'dashboard'));
  bot.command('shop', async (ctx) => {
    // Redirect to webapp instead of old inline shop
    const { Markup } = require('telegraf');
    const lang = ctx.dbUser?.preferredLanguage || 'ar';
    return ctx.reply(
      `${emojiHtml('rocket')} <b>${lang === 'en' ? 'Open the Store for fastest shopping' : 'افتح المتجر للتسوق السريع'}</b>\n\n` +
      `${emojiHtml('fire')} ${lang === 'en' ? 'All products inside the web app now!' : 'كل المنتجات صارت داخل المتجر الإلكتروني!'}`,
      {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([[
          {
            text: buttonLabel('rocket', lang === 'en' ? 'PLAY NOW' : 'افتح المتجر'),
            web_app: { url: `${process.env.BASE_URL}/customer` },
            style: 'primary',
            icon_custom_emoji_id: buttonEmojiId('rocket')
          }
        ]])
      }
    );
  });
  bot.command('profile', profileHandler);
  bot.command('keys', keysHandler);
  bot.command('history', historyHandler);
  bot.command('balance', balanceHandler);
  bot.command('help', helpHandler);
  bot.command('store', (ctx) => ctx.telegram.sendMessage(ctx.chat.id, `https://${ctx.me} - Open: ${process.env.BASE_URL}/customer`));

  bot.command('stats', async (ctx) => {
    if (!ctx.isAdmin) return ctx.reply(`${emojiHtml('skull')} غير مصرح / Unauthorized`);
    return openAdminPortal(ctx, 'dashboard');
  });

  bot.command('broadcast', async (ctx) => {
    if (!ctx.isAdmin) return ctx.reply(`${emojiHtml('skull')} غير مصرح / Unauthorized`);
    return openAdminPortal(ctx, 'broadcast');
  });

  bot.on('callback_query', callbackHandler);

  bot.on('text', async (ctx, next) => {
    const user = ctx.dbUser;
    if (!user) return next();

    const { hasActiveCaptcha, verifyCaptcha } = require('../utils/captcha');
    const lang = user.preferredLanguage || 'ar';

    if (!user.captchaPassed && hasActiveCaptcha(user.telegramId)) {
      const text = ctx.message.text.trim();
      const answer = parseInt(text);

      if (isNaN(answer)) {
        return ctx.reply(`${emojiHtml('target')} ${lang === 'en' ? 'Numbers only bro!' : 'بس أرقام يا برو!'}`);
      }

      const result = verifyCaptcha(user.telegramId, answer);

      if (result.success) {
        user.captchaPassed = true;
        user.captchaPassedAt = new Date();
        await user.save();

        await ctx.reply(
          `${emojiHtml('trophy')} ${lang === 'en' ? 'EZ! Verified - Welcome to legend zone' : 'تم! مرحباً بك في منطقة الأساطير'}\n\n` +
          `${emojiHtml('rocket')} ${lang === 'en' ? 'Send /start to PLAY NOW' : 'ارسل /start عشان تبدأ اللعب'}`
        );
      } else {
        await ctx.reply(result.message);
      }
      return;
    }

    return next();
  });

  bot.on('message', paymentHandler);

  bot.catch((err, ctx) => {
    logger.error(`🎮 Bot error [${ctx.updateType}]:`, err);
    
    // Try to send a gaming-themed error message
    const { sendGamerError, isDbError, notifyAdminsOfError } = require('../utils/gamerErrors');
    const lang = ctx.dbUser?.preferredLanguage || 
                 (ctx.from?.language_code?.toLowerCase().startsWith('en') ? 'en' : 'ar');
    
    // Determine error type based on the error
    const errorType = isDbError(err) ? 'dbError' : 'generic';
    
    // Tell the owner the real reason behind the error message
    notifyAdminsOfError(ctx, err, errorType);
    
    if (ctx.reply) {
      sendGamerError(ctx, errorType).catch(() => {
        // Fallback if even that fails
        ctx.reply(
          `${emojiHtml('explosion')} ${lang === 'en' ? 'LAG! Try /start to respawn' : 'لك lag! جرب /start عشان تعيد التشغيل'}`
        ).catch(() => {});
      });
    }
  });

  return bot;
};

module.exports = { createBot };
