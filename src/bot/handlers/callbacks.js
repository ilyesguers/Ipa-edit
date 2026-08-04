const { Markup } = require('telegraf');
const { profileHandler, showActivity } = require('./profile');
const { keysHandler } = require('./keys');
const { historyHandler } = require('./history');
const { balanceHandler } = require('./balance');
const { helpHandler } = require('./help');
const { openAdminPortal } = require('./admin');
const { mainKeyboard, buildWelcomeMessage } = require('./start');
const logger = require('../../utils/logger');
const { buttonEmojiId, emojiHtml, buttonLabel } = require('../../utils/customEmoji');
const { editOrReplyMenu } = require('../../utils/menuMessage');
const { sendGamerError } = require('../../utils/gamerErrors');
const {
  botLocale,
  showLanguagePicker,
  saveLanguageChoice,
  isLanguageChoiceCallback,
  languageFromCallback
} = require('./language');

const getLang = (ctx) => botLocale(ctx.dbUser?.preferredLanguage || 'ar');
const t = (lang, ar, en) => lang === 'en' ? en : ar;

const callbackHandler = async (ctx) => {
  const data = ctx.callbackQuery?.data || '';
  const lang = getLang(ctx);
  await ctx.answerCbQuery().catch(() => {});

  try {
    if (isLanguageChoiceCallback(data)) {
      const language = languageFromCallback(data);
      if (!language || !ctx.dbUser) return showLanguagePicker(ctx, { firstRun: true, edit: true });
      await saveLanguageChoice(ctx.dbUser, language);
      // Present the normal menu only after the explicit choice has been saved.
      return handleMainMenu(ctx, botLocale(language));
    }

    if (data === 'main_menu') return handleMainMenu(ctx, lang);
    if (data === 'profile') return profileHandler(ctx);
    if (data === 'my_activity') return showActivity(ctx);
    if (data === 'mykeys') return keysHandler(ctx);
    if (data === 'history') return historyHandler(ctx);
    if (data === 'addbalance') return balanceHandler(ctx);
    if (data === 'help') return helpHandler(ctx);
    if (data === 'language') return showLanguagePicker(ctx, { edit: true });
    if (data.startsWith('history_')) {
      const page = Number.parseInt(data.split('_')[1], 10);
      return historyHandler(ctx, Number.isFinite(page) && page > 0 ? page : 1);
    }

    if (data.startsWith('shop') || data.startsWith('cat_') || data.startsWith('game_') || data.startsWith('product_') || data.startsWith('buy_') || data.startsWith('confirm_wallet_')) {
      return redirectToWebApp(ctx, lang);
    }

    if (data.startsWith('oos_')) {
      const name = data.replace('oos_', '');
      return ctx.answerCbQuery(
        `${emojiHtml('alert')} ${t(lang, `"${name}" غير متاح حالياً`, `"${name}" is currently unavailable`)}`,
        { show_alert: true }
      );
    }

    if (data === 'insufficient_balance') {
      return ctx.answerCbQuery(
        `${emojiHtml('wallet')} ${t(lang, 'رصيدك لا يكفي. اشحن من المتجر.', 'Your balance is not enough. Top up in the store.')}`,
        { show_alert: true }
      );
    }

    if (data === 'verify_subscription') {
      if (!ctx.dbUser) return ctx.answerCbQuery('❌ Not found. Send /start.', { show_alert: true });
      try {
        const { getCached } = require('../utils/settingsCache');
        const [forceJoin, channelId] = await Promise.all([
          getCached('force_join_channel', false),
          getCached('channel_id', '')
        ]);
        if (!forceJoin || !channelId) {
          return ctx.answerCbQuery(`${emojiHtml('checkmark')} ${t(lang, 'الاشتراك غير مطلوب حالياً. تابع!', 'Subscription not required.')}`, { show_alert: false });
        }
        let memberStatus = null;
        try {
          const member = await ctx.telegram.getChatMember(channelId, ctx.dbUser.telegramId);
          memberStatus = member?.status;
        } catch (_) { /* ignore */ }
        const isMember = ['member', 'administrator', 'creator'].includes(memberStatus);
        if (isMember) {
          return ctx.answerCbQuery(`${emojiHtml('checkmark')} ${t(lang, 'تم التحقق — مرحباً بك من جديد!', 'Verified — welcome back!')}`, { show_alert: false });
        } else {
          return ctx.answerCbQuery(`${emojiHtml('lock')} ${t(lang, 'ما زلت غير مشترك. الرجاء الاشتراك أولاً.', 'Still not a member. Please join first.')}`, { show_alert: true });
        }
      } catch (err) {
        logger.error('Subscription verification error:', err);
        return ctx.answerCbQuery('⚠️ Try again.', { show_alert: true });
      }
    }

    const isLegacyAdminRoute = data.startsWith('admin_') || data === 'toggle_maintenance' || data.startsWith('inv_') || data.startsWith('verify_') || data.startsWith('reject_') || data.startsWith('broadcast_');
    if (isLegacyAdminRoute) {
      if (!ctx.isAdmin) return ctx.answerCbQuery(`${emojiHtml('alert')} ${t(lang, 'غير مصرح لك', 'No permission')}`, { show_alert: true });
      return openAdminPortal(ctx, data.includes('orders') ? 'orders' : data.includes('users') ? 'users' : data.includes('inventory') ? 'inventory' : data.includes('broadcast') ? 'broadcast' : data.includes('settings') ? 'settings' : 'dashboard');
    }
  } catch (err) {
    logger.error('Callback error:', err);
    await ctx.answerCbQuery(`${emojiHtml('alert')} ${t(lang, 'تعذر تنفيذ الطلب. حاول مرة أخرى.', 'Could not complete the request. Please try again.')}`, { show_alert: true }).catch(() => {});
  }
};

const redirectToWebApp = async (ctx, lang) => {
  const message = lang === 'en'
    ? `${emojiHtml('rocket')} <b>Open the store</b>\nAll products and purchases are available in one place.`
    : `${emojiHtml('rocket')} <b>افتح المتجر</b>\nستجد كل المنتجات والشراء في مكان واحد.`;

  return editOrReplyMenu(ctx, message, {
    parse_mode: 'HTML',
    ...Markup.inlineKeyboard([
      [{
        text: buttonLabel('rocket', lang === 'en' ? 'Open store' : 'فتح المتجر'),
        web_app: { url: `${(process.env.BASE_URL || '').replace(/\/$/, '')}/customer` },
        ...(buttonEmojiId('rocket') ? { icon_custom_emoji_id: buttonEmojiId('rocket') } : {})
      }],
      [{
        text: buttonLabel('back', lang === 'en' ? 'Home' : 'الرئيسية'),
        callback_data: 'main_menu',
        ...(buttonEmojiId('back') ? { icon_custom_emoji_id: buttonEmojiId('back') } : {})
      }]
    ])
  });
};

const handleMainMenu = async (ctx, lang) => {
  if (!ctx.dbUser) {
    await ctx.answerCbQuery(`${emojiHtml('alert')} ${t(lang, 'أرسل /start أولاً', 'Send /start first')}`, { show_alert: true });
    return sendGamerError(ctx, 'userNotFound');
  }
  if (!ctx.dbUser.languageSelected) return showLanguagePicker(ctx, { firstRun: true, edit: true });

  const { caption } = await buildWelcomeMessage(ctx.dbUser, lang);
  const keyboard = await mainKeyboard(lang, ctx.isAdmin);
  return editOrReplyMenu(ctx, caption, { parse_mode: 'HTML', ...keyboard });
};

module.exports = { callbackHandler, handleMainMenu };
