const { Markup } = require('telegraf');
const { profileHandler, showActivity } = require('./profile');
const { keysHandler } = require('./keys');
const { historyHandler } = require('./history');
const { balanceHandler } = require('./balance');
const { helpHandler } = require('./help');
const { openAdminPortal } = require('./admin');
const { mainKeyboard } = require('./start');
const Settings = require('../../models/Settings');
const logger = require('../../utils/logger');
const { buttonEmojiId, emojiHtml, emojiChar, buttonLabel } = require('../../utils/customEmoji');
const { editOrReplyMenu } = require('../../utils/menuMessage');

const getLang = (ctx) => ctx.dbUser?.preferredLanguage || 'ar';
const t = (lang, ar, en) => lang === 'en' ? en : ar;

// Simplified gamer-focused callback handler - bot now focuses on website
const callbackHandler = async (ctx) => {
  const data = ctx.callbackQuery.data;
  const lang = getLang(ctx);

  await ctx.answerCbQuery().catch(() => {});

  try {
    // Navigation - minimal, web-focused
    if (data === 'main_menu') return handleMainMenu(ctx, lang);
    if (data === 'profile') return profileHandler(ctx);
    if (data === 'my_activity') return showActivity(ctx);
    if (data === 'mykeys') return keysHandler(ctx);
    if (data === 'history') return historyHandler(ctx);
    if (data === 'addbalance') return balanceHandler(ctx);
    if (data === 'help') return helpHandler(ctx);
    if (data === 'language') return handleLanguage(ctx, lang);
    if (data.startsWith('history_')) return historyHandler(ctx, parseInt(data.split('_')[1]));

    // Legacy shop callbacks - redirect to webapp now (bot focuses on site)
    if (data.startsWith('shop') || data.startsWith('cat_') || data.startsWith('game_') || data.startsWith('product_') || data.startsWith('buy_') || data.startsWith('confirm_wallet_')) {
      return redirectToWebApp(ctx, lang);
    }

    if (data.startsWith('oos_')) {
      const name = data.replace('oos_', '');
      return ctx.answerCbQuery(
        t(lang, `💀 "${name}" خلص حالياً - شوف غيره في المتجر 🚀`, `💀 "${name}" out - check store 🚀`),
        { show_alert: true }
      );
    }

    if (data === 'insufficient_balance') {
      return ctx.answerCbQuery(
        t(lang, `💸 رصيدك ما يكفي يا أسطورة 😅 اشحن من المتجر`, `💸 Not enough balance legend 😅 Top up in store`),
        { show_alert: true }
      );
    }

    // Admin routes -> web portal
    const isLegacyAdminRoute = data.startsWith('admin_') || data === 'toggle_maintenance' || data.startsWith('inv_') || data.startsWith('verify_') || data.startsWith('reject_') || data.startsWith('broadcast_');
    if (isLegacyAdminRoute) {
      if (!ctx.isAdmin) return ctx.answerCbQuery(t(lang, '⛔ ما لك صلاحية 👑', '⛔ No permission 👑'), { show_alert: true });
      return openAdminPortal(ctx, data.includes('orders') ? 'orders' : data.includes('users') ? 'users' : data.includes('inventory') ? 'inventory' : data.includes('broadcast') ? 'broadcast' : data.includes('settings') ? 'settings' : 'dashboard');
    }

  } catch (err) {
    logger.error('Callback error:', err);
    await ctx.answerCbQuery(t(lang, `🔥 صار لاق بسيط، جرب مرة ثانية`, `🔥 Small lag, try again`), { show_alert: true }).catch(() => {});
  }
};

const redirectToWebApp = async (ctx, lang) => {
  const msg = lang === 'en'
    ? `${emojiHtml('rocket')} <b>NEW UPDATE! 🔥 Everything moved to web store for faster experience!</b>\n\n` +
      `${emojiHtml('fire')} Hit PLAY NOW below - All games, keys & top-ups inside! 🚀\n\n` +
      `${emojiHtml('crown')} Faster, smoother, more LEGENDARY! 👑`
    : `${emojiHtml('rocket')} <b>تحديث جديد! 🔥 كل شي انتقل للمتجر الإلكتروني لسرعة أفضل!</b>\n\n` +
      `${emojiHtml('fire')} اضغط PLAY NOW تحت - كل الألعاب والمفاتيح والشحنات داخل! 🚀\n\n` +
      `${emojiHtml('crown')} أسرع، أسلس، وأسطورية أكثر! 👑`;

  return editOrReplyMenu(ctx, msg, {
    parse_mode: 'HTML',
    ...Markup.inlineKeyboard([
      [{
        text: buttonLabel('rocket', lang === 'en' ? '🚀 PLAY NOW - OPEN STORE' : '🚀 PLAY NOW - افتح المتجر'),
        web_app: { url: `${process.env.BASE_URL}/customer` },
        style: 'primary',
        icon_custom_emoji_id: buttonEmojiId('rocket')
      }],
      [{
        text: buttonLabel('ghost', lang === 'en' ? '⬅️ Home' : '⬅️ الرئيسية'),
        callback_data: 'main_menu',
        style: 'primary',
        icon_custom_emoji_id: buttonEmojiId('ghost')
      }]
    ])
  });
};

const handleMainMenu = async (ctx, lang) => {
  const { buildWelcomeMessage } = require('./start');
  const { caption } = await buildWelcomeMessage(ctx.dbUser, lang);
  const keyboard = await mainKeyboard(lang, ctx.isAdmin);
  return editOrReplyMenu(ctx, caption, { parse_mode: 'HTML', ...keyboard });
};

const handleLanguage = async (ctx, lang) => {
  const user = ctx.dbUser;
  const newLang = user.preferredLanguage === 'ar' ? 'en' : 'ar';
  user.preferredLanguage = newLang;
  await user.save();

  const backBtn = [{
    text: buttonLabel('rocket', newLang === 'ar' ? '🚀 الرئيسية - PLAY NOW' : '🚀 Home - PLAY NOW'),
    callback_data: 'main_menu',
    style: 'primary',
    icon_custom_emoji_id: buttonEmojiId('rocket')
  }];

  return editOrReplyMenu(ctx,
    newLang === 'ar'
      ? `${emojiHtml('fire')} تم تغيير اللغة إلى العربية 🔥 أهلاً يا أسطورة! 👑`
      : `${emojiHtml('fire')} Language changed to English 🔥 Welcome legend! 👑`,
    { parse_mode: 'HTML', ...Markup.inlineKeyboard([backBtn]) }
  );
};

module.exports = { callbackHandler };
