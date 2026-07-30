const { Markup } = require('telegraf');
const { getAdminPortalUrl, getUiSettings } = require('../../utils/uiConfig');

const getLang = (ctx) => ctx.dbUser?.preferredLanguage || 'ar';
const t = (lang, ar, en) => lang === 'en' ? en : ar;

const openAdminPortal = async (ctx, page = 'dashboard') => {
  const lang = getLang(ctx);

  if (!ctx.isAdmin) {
    return ctx.reply(t(lang, '⛔ غير مصرح لك بالوصول للوحة التحكم', '⛔ You are not allowed to access the admin portal'));
  }

  const ui = await getUiSettings();
  const msg =
    `👑 <b>${t(lang, 'لوحة التحكم الإدارية', 'Admin Control Portal')}</b>\n\n` +
    `${ui.theme.panelEmoji} ${t(lang, 'تم نقل جميع أدوات الإدارة إلى موقع التحكم لتكون الواجهة أوضح وأرتب.', 'All admin actions were moved to the control website for a cleaner workflow.')}\n\n` +
    `🛒 ${t(lang, 'إدارة الطلبات والمخزون والمستخدمين والإعدادات من مكان واحد.', 'Manage orders, stock, users, and settings from one place.')}`;

  const buttons = Markup.inlineKeyboard([
    [Markup.button.webApp(`👑 ${lang === 'en' ? ui.adminPortalLabel.en : ui.adminPortalLabel.ar}`, getAdminPortalUrl(page))],
    [Markup.button.webApp(t(lang, '📱 فتح المتجر', '📱 Open Store'), `${process.env.BASE_URL}/customer`)]
  ]);

  return ctx.reply(msg, { parse_mode: 'HTML', ...buttons });
};

module.exports = { openAdminPortal };
