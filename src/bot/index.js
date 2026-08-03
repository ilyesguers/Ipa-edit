const { Telegraf, session, Markup } = require('telegraf');
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
const { showLanguagePicker, isLanguageChoiceCallback, botLocale } = require('./handlers/language');

  const ADMIN_IDS = (process.env.ADMIN_IDS || '').split(',').map(id => parseInt(id.trim())).filter(Boolean);

  // Cache successful channel-membership checks (10 min) so we don't hammer the
  // Telegram API with getChatMember on every single message. Failures are never
  // cached, so a user who just joined passes on the very next message.
  const forceJoinOkCache = new Map();

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

  // Global premium-emoji safety net.
  //
  // IMPORTANT: Telegraf builds a FRESH `Telegram` instance for every update
  // and hands it to the Context as `ctx.telegram` (see telegraf/lib/telegraf.js
  // `handleUpdate`: `const tg = new Telegram(this.token, this.telegram.options, ...)`).
  // That instance is NOT `bot.telegram`. So patching only `bot.telegram`
  // (the launch instance) never intercepts `ctx.reply` / `ctx.telegram.*`
  // calls made from handlers — which is exactly where every user-facing send
  // happens. The result: any message containing premium custom emoji
  // (`<tg-emoji>` text, or `icon_custom_emoji_id`/`style` on buttons) is
  // rejected by Telegram with `400 CUSTOM_EMOJI_INVALID`, the handler throws,
  // and the user sees the generic "💥 Small glitch" error — the bot looks dead.
  //
  // Fix: patch the SHARED Telegram prototype ONCE so every instance —
  // including the per-update one — inherits the automatic premium-emoji
  // fallback (retry the same request with all premium-only fields stripped).
  const { isPremiumEmojiError, stripKeyboardExtras } = require('../utils/safeSend');
  const { stripPremiumEmoji, emojiHtml, buttonEmojiId, buttonLabel } = require('../utils/customEmoji');

  const TelegramProto = Object.getPrototypeOf(bot.telegram);
  if (!Object.getOwnPropertyDescriptor(TelegramProto, '__premiumEmojiSafe')?.value) {
    const originalCallApi = TelegramProto.callApi; // unbound; re-bound per call below
    TelegramProto.callApi = async function (method, payload = {}, ...rest) {
      try {
        return await originalCallApi.call(this, method, payload, ...rest);
      } catch (err) {
        if (!payload || typeof payload !== 'object' || !isPremiumEmojiError(err, payload)) throw err;

        logger.warn(`⚠️ [${method}] premium emoji rejected — retrying without premium emoji.`);
        let scrubbed;
        try {
          const clean = { ...payload };
          if (typeof clean.text === 'string') clean.text = stripPremiumEmoji(clean.text);
          if (typeof clean.caption === 'string') clean.caption = stripPremiumEmoji(clean.caption);
          scrubbed = stripKeyboardExtras(clean);
        } catch (cleanErr) {
          logger.error('Failed to strip premium emoji for retry, rethrowing original error:', cleanErr);
          throw err;
        }
        return originalCallApi.call(this, method, scrubbed, ...rest);
      }
    };
    Object.defineProperty(TelegramProto, '__premiumEmojiSafe', {
      value: true, enumerable: false, configurable: true, writable: true
    });
    logger.info('🛡️ Premium-emoji safety net installed on Telegram prototype (covers ctx.telegram)');
  }

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

      // ── Optional force-join-channel gate (admin setting) ──
      // Skipped for admins and for brand-new users who still need to pass the
      // captcha first (otherwise they could never reach the captcha prompt).
      if (!ctx.isAdmin && user.captchaPassed) {
        const [forceJoin, channelId] = await Promise.all([
          Settings.get('force_join_channel', false),
          Settings.get('channel_id', '')
        ]);
        if (forceJoin && channelId) {
          const cached = forceJoinOkCache.get(telegramId);
          if (!cached || Date.now() - cached > 10 * 60 * 1000) {
            let memberStatus = null;
            try {
              const member = await ctx.telegram.getChatMember(channelId, telegramId);
              memberStatus = member?.status;
            } catch (_) { /* channel unreachable — don't block users */ }
            const isMember = ['member', 'administrator', 'creator'].includes(memberStatus);
            if (isMember) {
              forceJoinOkCache.set(telegramId, Date.now());
            } else if (memberStatus && memberStatus !== 'restricted') {
              const channelUsername = await Settings.get('channel_username', '');
              const fallback = `https://t.me/${String(channelId).replace(/^-100/, '')}`;
              const channelLink = channelUsername
                ? `https://t.me/${channelUsername}`
                : (memberStatus ? fallback : '');
              const isEn = botLocale(user.preferredLanguage) === 'en';
              return ctx.reply(
                `${emojiHtml('lock')} <b>${isEn ? 'Join our channel first bro!' : 'اشترك في القناة أولاً يا بطل!'}</b>\n\n` +
                `${emojiHtml('explosion')} ${isEn ? 'You must join the deals channel to keep playing:' : 'لازم تكون مشترك في قناة العروض عشان تكمل:'}\n\n` +
                `${emojiHtml('rocket')} ${isEn ? 'Join, then hit /start - EZ!' : 'اشترك، وبعدها اضغط /start - سهلة!'}`,
                {
                  parse_mode: 'HTML',
                  ...(channelLink ? Markup.inlineKeyboard([[
                    {
                      text: buttonLabel('megaphone', isEn ? 'JOIN CHANNEL' : 'اشترك في القناة'),
                      url: channelLink,
                      style: 'primary',
                      icon_custom_emoji_id: buttonEmojiId('megaphone')
                    }
                  ]]) : {})
                }
              );
            }
          }
        }
      }

      // First-run gate: until a language is chosen the bot deliberately shows
      // only the language menu. This also prevents commands or old inline
      // buttons from exposing a second, confusing interface before setup.
      const messageText = ctx.message?.text || '';
      const isStartCommand = /^\/start(?:@\w+)?(?:\s|$)/i.test(messageText);
      const callbackData = ctx.callbackQuery?.data || '';
      if (!user.languageSelected && !isStartCommand && !isLanguageChoiceCallback(callbackData)) {
        if (ctx.callbackQuery) await ctx.answerCbQuery().catch(() => {});
        return showLanguagePicker(ctx, { firstRun: true, edit: Boolean(ctx.callbackQuery) });
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
    const lang = botLocale(ctx.dbUser?.preferredLanguage || 'ar');
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
  // /store and /menu — quick webapp link (fixed: old version sent a broken https://{username} link)
  bot.command(['store', 'menu'], async (ctx) => {
    const lang = botLocale(ctx.dbUser?.preferredLanguage || 'ar');
    const url = `${(process.env.BASE_URL || '').replace(/\/$/, '')}/customer`;
    return ctx.reply(
      `${emojiHtml('rocket')} <b>${lang === 'en' ? 'Open the store' : 'افتح المتجر'}</b>: <code>${url}</code>\n` +
      `${emojiHtml('fire')} ${lang === 'en' ? 'Or hit PLAY NOW below' : 'أو اضغط PLAY NOW تحت'}`,
      {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([[
          {
            text: buttonLabel('rocket', lang === 'en' ? 'PLAY NOW 🚀' : 'افتح المتجر 🚀'),
            web_app: { url },
            style: 'primary',
            icon_custom_emoji_id: buttonEmojiId('rocket')
          }
        ]])
      }
    );
  });

  // /id — show user ID (useful for support tickets & admin lookups)
  bot.command('id', (ctx) => {
    const user = ctx.dbUser;
    return ctx.reply(
      `${emojiHtml('target')} <b>${user?.fullName || 'Yo'}</b>\n` +
      `${emojiHtml('tag')} ID: <code>${ctx.from.id}</code>\n` +
      `${user?.role && ['admin', 'superadmin'].includes(user.role) ? `${emojiHtml('crown')} ${user.role === 'superadmin' ? 'SUPER ADMIN' : 'ADMIN'}\n` : ''}` +
      `${emojiHtml('calendar')} ${new Date(user?.createdAt || Date.now()).toLocaleString()}`,
      { parse_mode: 'HTML' }
    );
  });

  // /panel — alias for /admin
  bot.command('panel', (ctx) => openAdminPortal(ctx, 'dashboard'));

  // /maintenance [on|off] — quick admin toggle from chat
  bot.command('maintenance', async (ctx) => {
    if (!ctx.isAdmin) return ctx.reply(`${emojiHtml('skull')} غير مصرح / Unauthorized`);
    const arg = (ctx.message.text.split(' ')[1] || '').toLowerCase();
    const current = await Settings.get('maintenance_mode', false);
    const next = arg === 'on' ? true : arg === 'off' ? false : !current;
    await Settings.set('maintenance_mode', next, ctx.from.id, 'Toggled from bot');
    const lang = botLocale(ctx.dbUser?.preferredLanguage || 'ar');
    return ctx.reply(
      `${next ? emojiHtml('gear') : emojiHtml('checkmark')} <b>${lang === 'en' ? `Maintenance ${next ? 'ENABLED' : 'DISABLED'}` : `الصيانة ${next ? 'مفعّلة' : 'معطّلة'}`}</b>`,
      { parse_mode: 'HTML' }
    );
  });

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
    const lang = botLocale(user.preferredLanguage || 'ar');

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
    const lang = botLocale(ctx.dbUser?.preferredLanguage ||
      (ctx.from?.language_code?.toLowerCase().startsWith('en') ? 'en' : 'ar'));
    
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
