const { buildBotInlineKeyboard, getUiSettings } = require('../../utils/uiConfig');
const Settings = require('../../models/Settings');
const User = require('../../models/User');
const logger = require('../../utils/logger');
const { Markup } = require('telegraf');
const { emojiHtml, buttonEmojiId, buttonLabel } = require('../../utils/customEmoji');
const { removeRememberedMenu, rememberMenu } = require('../../utils/menuMessage');
const { sendGamerError } = require('../../utils/gamerErrors');
const { botLocale, showLanguagePicker } = require('./language');

const cleanBotText = (value = '') => String(value)
  .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\uFE0F\u200D]/gu, '')
  .replace(/\s{2,}/g, ' ')
  .trim();

const escapeHtml = (value = '') => cleanBotText(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');

const buildWelcomeMessage = async (user, language = 'ar') => {
  const ui = await getUiSettings();
  const locale = botLocale(language);
  const name = cleanBotText(user.firstName || (locale === 'en' ? 'there' : 'بك'));
  const welcome = ui.welcome[locale];
  const highlights = ui.highlights.slice(0, 3);
  const balance = Number(user.balance || 0).toFixed(2);
  const orders = Number(user.totalOrders || 0);
  const customMessage = String(ui.welcomeMessage || '').trim()
    .replace(/\{name\}/g, name)
    .replace(/\{balance\}/g, balance)
    .replace(/\{orders\}/g, orders);
  const highlightLines = highlights
    .map((item) => `${emojiHtml(item.emojiKey || 'sparkle')} ${escapeHtml(locale === 'en' ? item.textEn : item.textAr)}`)
    .join('\n');

  const caption = locale === 'en'
    ? `${emojiHtml('crown')} <b>${escapeHtml(welcome.title)}</b>\n\n` +
      `Welcome, <b>${escapeHtml(name)}</b>.\n${escapeHtml(welcome.subtitle)}\n\n` +
      `${highlightLines}\n\n` +
      `${emojiHtml('wallet')} Balance: <b>$${balance}</b> · ${emojiHtml('trophy')} Orders: <b>${orders}</b>\n` +
      `${customMessage ? `\n${escapeHtml(customMessage)}\n` : ''}` +
      `\n${emojiHtml('rocket')} Choose “Open Store” below to start.`
    : `${emojiHtml('crown')} <b>${escapeHtml(welcome.title)}</b>\n\n` +
      `أهلاً <b>${escapeHtml(name)}</b>.\n${escapeHtml(welcome.subtitle)}\n\n` +
      `${highlightLines}\n\n` +
      `${emojiHtml('wallet')} الرصيد: <b>$${balance}</b> · ${emojiHtml('trophy')} الطلبات: <b>${orders}</b>\n` +
      `${customMessage ? `\n${escapeHtml(customMessage)}\n` : ''}` +
      `\n${emojiHtml('rocket')} اختر «فتح المتجر» بالأسفل للبدء.`;

  return { ui, caption };
};

const mainKeyboard = async (language = 'ar', isAdmin = false) => {
  const ui = await getUiSettings();
  return buildBotInlineKeyboard({
    Markup,
    lang: botLocale(language),
    isAdmin,
    quickLinks: ui.quickLinks,
    supportUsername: ui.supportUsername,
    channelUsername: ui.channelUsername,
    baseUrl: process.env.BASE_URL || '',
    adminPortalLabel: ui.adminPortalLabel
  });
};

const handleReferral = async (ctx, user, language) => {
  // Enhanced referral system with validation and tracking
  if (!ctx.startPayload || user.referredBy) return;
  
  const payloadStr = String(ctx.startPayload || '').trim();
  const refMatch = payloadStr.match(/^ref_(\d+)$/);
  if (!refMatch) return;
  
  const refId = Number.parseInt(refMatch[1], 10);
  if (!refId || refId === user.telegramId || isNaN(refId)) return;
  
  // Prevent self-referral and invalid IDs
  if (refId <= 0 || refId === user.telegramId) {
    logger.info(`Referral blocked: invalid or self-referral from ${user.telegramId}`);
    return;
  }

  try {
    const referrer = await User.findOne({ telegramId: refId, isBanned: false, isActive: true });
    if (!referrer) {
      logger.info(`Referral: referrer ${refId} not found or inactive`);
      return;
    }

    // Double-check user hasn't been referred already (data safety)
    const freshUser = await User.findOne({ telegramId: user.telegramId });
    if (freshUser && freshUser.referredBy) return;

    user.referredBy = refId;
    await user.save();
    
    referrer.referralCount = (referrer.referralCount || 0) + 1;
    const bonus = await Settings.get('referral_bonus', 0.5);
    
    if (bonus > 0 && bonus !== null && !isNaN(bonus)) {
      await referrer.addBalance(Number(bonus), `مكافأة إحالة: ${user.firstName || user.username || user.telegramId}`);
    }

    const isEnglish = botLocale(language) === 'en';
    const bonusText = !isNaN(bonus) && bonus > 0 ? ` $${Number(bonus).toFixed(2)}` : '';
    await ctx.telegram.sendMessage(
      refId,
      (isEnglish
        ? `${emojiHtml('trophy')} A new user joined through your referral link!` + (bonusText ? ` Bonus: ${bonusText}` : '')
        : `${emojiHtml('trophy')} انضم مستخدم جديد من رابط الدعوة الخاص بك!` + (bonusText ? ` تمت إضافة مكافأة: ${bonusText}` : '')),
      { parse_mode: 'HTML' }
    ).catch((err) => {
      logger.warn(`Failed to notify referrer ${refId}:`, err.message);
    });
    
    logger.info(`✅ Referral completed: user ${user.telegramId} (${user.fullName || 'new'}) referred by ${refId}`);
  } catch (err) {
    logger.error('Referral processing error:', err);
  }
};

const notifyNewUser = async (ctx, user, language) => {
  const adminIds = (process.env.ADMIN_IDS || '').split(',').map((id) => Number.parseInt(id.trim(), 10)).filter(Boolean);
  const isNewUser = Date.now() - new Date(user.createdAt).getTime() < 60_000;
  if (!isNewUser) return;

  const isEnglish = botLocale(language) === 'en';
  for (const adminId of adminIds) {
    await ctx.telegram.sendMessage(
      adminId,
      `${emojiHtml('users')} <b>${isEnglish ? 'New user' : 'مستخدم جديد'}</b>\n\n` +
      `${escapeHtml(user.fullName)}\n` +
      `ID: <code>${user.telegramId}</code>`,
      {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([[
          {
            text: buttonLabel('users', isEnglish ? 'View user' : 'عرض المستخدم'),
            web_app: { url: `${process.env.BASE_URL}/admin#users?search=${user.telegramId}` },
            ...(buttonEmojiId('users') ? { icon_custom_emoji_id: buttonEmojiId('users') } : {})
          }
        ]])
      }
    ).catch(() => {});
  }
};

const startHandler = async (ctx) => {
  try {
    const user = ctx.dbUser;
    if (!user) {
      logger.error('Start handler: ctx.dbUser is undefined - possible DB connection issue');
      return sendGamerError(ctx, 'dbError');
    }

    const language = user.preferredLanguage || 'ar';
    // Preserve referral payloads even when the first visible bot screen is
    // the language gate. This sends no extra message to the new visitor.
    await handleReferral(ctx, user, language);

    // A new visitor sees only the language choices. No banner, menu or other
    // controls are rendered until they make an explicit selection.
    if (!user.languageSelected) {
      await removeRememberedMenu(ctx);
      return showLanguagePicker(ctx, { firstRun: true });
    }

    const { caption } = await buildWelcomeMessage(user, language);
    const inlineKeyboard = await mainKeyboard(language, ctx.isAdmin);
    await removeRememberedMenu(ctx);

    let menuMessage;
    try {
      const customBanner = await Settings.get('banner_image_url', '');
      const baseUrl = (process.env.BASE_URL || '').replace(/\/$/, '');
      const bannerUrl = customBanner && !/^https?:/i.test(customBanner)
        ? `${baseUrl}${customBanner.startsWith('/') ? '' : '/'}${customBanner}`
        : (customBanner || `${baseUrl}/public/banner.png`);
      menuMessage = await ctx.replyWithPhoto(
        { url: bannerUrl },
        { caption, parse_mode: 'HTML', ...inlineKeyboard }
      );
    } catch (err) {
      logger.debug(`Banner failed, sending text: ${err.message}`);
      menuMessage = await ctx.reply(caption, { parse_mode: 'HTML', ...inlineKeyboard });
    }
    rememberMenu(ctx, menuMessage);
    await notifyNewUser(ctx, user, language);
  } catch (err) {
    logger.error('Start handler error:', err);
    const { isDbError, notifyAdminsOfError } = require('../../utils/gamerErrors');
    const errorType = isDbError(err) ? 'dbError' : 'generic';
    notifyAdminsOfError(ctx, err, errorType);
    await sendGamerError(ctx, errorType);
  }
};

module.exports = { startHandler, mainKeyboard, buildWelcomeMessage };
