const { Markup } = require('telegraf');
const { getAdminPortalUrl, getUiSettings } = require('../../utils/uiConfig');
const { buttonEmojiId, emojiHtml, buttonLabel } = require('../../utils/customEmoji');

const getLang = (ctx) => ctx.dbUser?.preferredLanguage || 'ar';
const t = (lang, ar, en) => lang === 'en' ? en : ar;

const openAdminPortal = async (ctx, page = 'dashboard') => {
  const lang = getLang(ctx);

  if (!ctx.isAdmin) {
    return ctx.reply(t(lang, '⛔ غير مصرح لك بالوصول للوحة التحكم', '⛔ You are not allowed to access the admin portal'));
  }

  const ui = await getUiSettings();
  const msg =
    `${emojiHtml('admin')} <b>${t(lang, 'لوحة التحكم الإدارية', 'Admin Control Portal')}</b>\n\n` +
    `${ui.theme.panelEmoji} ${t(lang, 'تم نقل جميع أدوات الإدارة إلى موقع التحكم لتكون الواجهة أوضح وأرتب.', 'All admin actions were moved to the control website for a cleaner workflow.')}\n\n` +
    `${emojiHtml('shopping')} ${t(lang, 'إدارة الطلبات والمخزون والمستخدمين والإعدادات من مكان واحد.', 'Manage orders, stock, users, and settings from one place.')}`;

  const buttons = Markup.inlineKeyboard([
    [{
      text: buttonLabel('admin', lang === 'en' ? ui.adminPortalLabel.en : ui.adminPortalLabel.ar),
      web_app: { url: getAdminPortalUrl(page) },
      style: 'primary',
      icon_custom_emoji_id: buttonEmojiId('primary')
    }],
    [{
      text: t(lang, '📱 فتح المتجر', '📱 Open Store'),
      web_app: { url: `${process.env.BASE_URL}/customer` },
      style: 'success',
      icon_custom_emoji_id: buttonEmojiId('success')
    }]
  ]);

  return ctx.reply(msg, { parse_mode: 'HTML', ...buttons });
};

module.exports = { openAdminPortal };
