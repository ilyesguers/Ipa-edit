const { Markup } = require('telegraf');
const orderService = require('../../services/orderService');
const Settings = require('../../models/Settings');
const User = require('../../models/User');
const Order = require('../../models/Order');
const Product = require('../../models/Product');
const Key = require('../../models/Key');
const logger = require('../../utils/logger');

// ── Helper: get user language ──
const getLang = (ctx) => ctx.dbUser?.preferredLanguage || 'ar';
const t = (lang, ar, en) => lang === 'en' ? en : ar;

// ═══════════════════════════════════════
// 1. MAIN ADMIN HANDLER (Dashboard)
// ═══════════════════════════════════════

const adminHandler = async (ctx) => {
  if (!ctx.isAdmin) {
    return ctx.reply(t(getLang(ctx), '⛔ غير مصرح لك بالوصول لهذه الصفحة', '⛔ Unauthorized access'));
  }

  const lang = getLang(ctx);
  const stats = await orderService.getStats();
  const maintenance = await Settings.get('maintenance_mode', false);

  const msg = (
    `⚙️ <b>${t(lang, 'لوحة الإدارة', 'Admin Dashboard')}</b>\n\n` +
    `👥 ${t(lang, 'إجمالي المستخدمين', 'Total Users')}: <b>${stats.totalUsers}</b>\n` +
    `💰 ${t(lang, 'إجمالي الأرباح', 'Total Revenue')}: <b>$${stats.totalRevenue.toFixed(2)}</b>\n` +
    `🛒 ${t(lang, 'إجمالي الطلبات', 'Total Orders')}: <b>${stats.totalOrders}</b>\n` +
    `🔑 ${t(lang, 'المفاتيح المتاحة', 'Active Keys')}: <b>${stats.activeKeys}</b> / ${t(lang, 'إجمالي', 'Total')}: ${stats.totalKeys}\n\n` +
    `📊 ${t(lang, 'أرباح اليوم', 'Today Revenue')}: <b>$${stats.revenueToday.toFixed(2)}</b>\n` +
    `📊 ${t(lang, 'أرباح الشهر', 'Month Revenue')}: <b>$${stats.revenueMonth.toFixed(2)}</b>\n\n` +
    `🔧 ${t(lang, 'وضع الصيانة', 'Maintenance')}: ${maintenance ? t(lang, '✅ مفعّل', '✅ Enabled') : t(lang, '❌ معطّل', '❌ Disabled')}`
  );

  const buttons = Markup.inlineKeyboard([
    [Markup.button.webApp(t(lang, '🖥️ فتح لوحة الإدارة', '🖥️ Open Admin Panel'), `${process.env.BASE_URL}/admin`)],
    [Markup.button.callback('🔧 ' + t(lang, (maintenance ? 'تعطيل' : 'تفعيل') + ' الصيانة', (maintenance ? 'Disable' : 'Enable') + ' Maintenance'), 'toggle_maintenance')],
    [Markup.button.callback('📦 ' + t(lang, 'المخزون', 'Inventory'), 'admin_inventory')],
    [Markup.button.callback('👥 ' + t(lang, 'المستخدمون', 'Users'), 'admin_users')],
    [Markup.button.callback('🛒 ' + t(lang, 'الطلبات', 'Orders'), 'admin_orders')],
    [Markup.button.callback('📢 ' + t(lang, 'الإذاعة', 'Broadcast'), 'admin_broadcast')],
    [Markup.button.callback('⚙️ ' + t(lang, 'الإعدادات', 'Settings'), 'admin_settings')],
  ]);

  await ctx.reply(msg, { parse_mode: 'HTML', ...buttons });
};

// ═══════════════════════════════════════
// 2. INVENTORY HANDLER
// ═══════════════════════════════════════

const adminInventoryHandler = async (ctx) => {
  if (!ctx.isAdmin) return ctx.answerCbQuery('⛔', { show_alert: true });
  const lang = getLang(ctx);

  const products = await Product.find({ isActive: true }).select('name nameAr');
  if (!products.length) {
    return ctx.answerCbQuery(t(lang, 'لا توجد منتجات', 'No products'), { show_alert: true });
  }

  const buttons = products.slice(0, 12).map(p => {
    const name = lang === 'en' ? (p.name || p.nameAr) : (p.nameAr || p.name);
    return [Markup.button.callback(`📦 ${name}`, `inv_product_${p._id}`)];
  });
  buttons.push([Markup.button.callback(t(lang, '🔙 رجوع', '🔙 Back'), 'admin_back')]);

  await ctx.editMessageText(
    `📦 <b>${t(lang, 'إدارة المخزون', 'Inventory Management')}</b>\n\n${t(lang, 'اختر منتجاً:', 'Choose a product:')}`,
    { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) }
  ).catch(console.error);
};

// ═══════════════════════════════════════
// 3. USERS HANDLER
// ═══════════════════════════════════════

const adminUsersHandler = async (ctx) => {
  if (!ctx.isAdmin) return ctx.answerCbQuery('⛔', { show_alert: true });
  const lang = getLang(ctx);

  const totalUsers = await User.countDocuments();
  const bannedUsers = await User.countDocuments({ isBanned: true });
  const activeToday = await User.countDocuments({ lastSeen: { $gte: new Date(Date.now() - 86400000) } });
  const newThisWeek = await User.countDocuments({ createdAt: { $gte: new Date(Date.now() - 7 * 86400000) } });
  const topSpenders = await User.find({ totalSpent: { $gt: 0 } }).sort({ totalSpent: -1 }).limit(5).select('firstName username totalSpent totalOrders');

  let msg = (
    `👥 <b>${t(lang, 'إدارة المستخدمين', 'Users Management')}</b>\n\n` +
    `👤 ${t(lang, 'إجمالي', 'Total')}: <b>${totalUsers}</b>\n` +
    `🚫 ${t(lang, 'محظور', 'Banned')}: <b>${bannedUsers}</b>\n` +
    `📅 ${t(lang, 'نشط اليوم', 'Active today')}: <b>${activeToday}</b>\n` +
    `🆕 ${t(lang, 'جديد هذا الأسبوع', 'New this week')}: <b>${newThisWeek}</b>\n`
  );

  if (topSpenders.length) {
    msg += `\n🏆 <b>${t(lang, 'أعلى إنفاقاً', 'Top Spenders')}:</b>\n`;
    topSpenders.forEach((u, i) => {
      msg += `${i + 1}. ${u.firstName || 'N/A'} ${u.username ? `(@${u.username})` : ''} - $${u.totalSpent.toFixed(2)} (${u.totalOrders} ${t(lang, 'طلب', 'orders')})\n`;
    });
  }

  const buttons = Markup.inlineKeyboard([
    [Markup.button.webApp(t(lang, '🖥️ إدارة المستخدمين', '🖥️ Manage Users'), `${process.env.BASE_URL}/admin`)],
    [Markup.button.callback(t(lang, '🔙 رجوع', '🔙 Back'), 'admin_back')]
  ]);

  await ctx.editMessageText(msg, { parse_mode: 'HTML', ...buttons }).catch(console.error);
};

// ═══════════════════════════════════════
// 4. ORDERS HANDLER
// ═══════════════════════════════════════

const adminOrdersHandler = async (ctx) => {
  if (!ctx.isAdmin) return ctx.answerCbQuery('⛔', { show_alert: true });
  const lang = getLang(ctx);

  const totalOrders = await Order.countDocuments();
  const pendingOrders = await Order.countDocuments({ status: 'pending' });
  const processingOrders = await Order.countDocuments({ status: 'processing' });
  const completedToday = await Order.countDocuments({ status: 'completed', completedAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) } });
  const rejectedOrders = await Order.countDocuments({ status: 'rejected' });

  // Get pending orders for quick action
  const pendingList = await Order.find({ status: { $in: ['pending', 'processing'] } }).sort({ createdAt: -1 }).limit(5);

  let msg = (
    `🛒 <b>${t(lang, 'إدارة الطلبات', 'Orders Management')}</b>\n\n` +
    `📦 ${t(lang, 'إجمالي', 'Total')}: <b>${totalOrders}</b>\n` +
    `⏳ ${t(lang, 'انتظار', 'Pending')}: <b>${pendingOrders}</b>\n` +
    `🔄 ${t(lang, 'قيد المعالجة', 'Processing')}: <b>${processingOrders}</b>\n` +
    `✅ ${t(lang, 'مكتمل اليوم', 'Completed today')}: <b>${completedToday}</b>\n` +
    `❌ ${t(lang, 'مرفوض', 'Rejected')}: <b>${rejectedOrders}</b>\n`
  );

  if (pendingList.length) {
    msg += `\n⏳ <b>${t(lang, 'طلبات بانتظار الإجراء', 'Orders Pending Action')}:</b>\n`;
    pendingList.forEach((order, i) => {
      msg += `${i + 1}. 📋 <code>${order.orderNumber}</code> - ${order.productName} ($${order.finalPrice?.toFixed(2)})\n`;
    });
  }

  const buttons = Markup.inlineKeyboard([
    [Markup.button.webApp(t(lang, '🖥️ إدارة الطلبات', '🖥️ Manage Orders'), `${process.env.BASE_URL}/admin`)],
    [Markup.button.callback(t(lang, '🔙 رجوع', '🔙 Back'), 'admin_back')]
  ]);

  await ctx.editMessageText(msg, { parse_mode: 'HTML', ...buttons }).catch(console.error);
};

// ═══════════════════════════════════════
// 5. BROADCAST HANDLER
// ═══════════════════════════════════════

const adminBroadcastHandler = async (ctx) => {
  if (!ctx.isAdmin) return ctx.answerCbQuery('⛔', { show_alert: true });
  const lang = getLang(ctx);

  const totalUsers = await User.countDocuments();
  const activeUsers = await User.countDocuments({ lastSeen: { $gte: new Date(Date.now() - 7 * 86400000) } });

  const buttons = Markup.inlineKeyboard([
    [Markup.button.callback(t(lang, '📢 إرسال للكل', '📢 Send to all'), 'broadcast_all')],
    [Markup.button.callback(t(lang, '🛒 للمشترين فقط', '🛒 Buyers only'), 'broadcast_buyers')],
    [Markup.button.callback(t(lang, '💰 لمن لديهم رصيد', '💰 With balance'), 'broadcast_balance')],
    [Markup.button.callback(t(lang, '📅 نشط هذا الأسبوع', '📅 Active this week'), 'broadcast_active')],
    [Markup.button.webApp(t(lang, '📝 محرر الإذاعة', '📝 Broadcast Editor'), `${process.env.BASE_URL}/admin`)],
    [Markup.button.callback(t(lang, '🔙 رجوع', '🔙 Back'), 'admin_back')]
  ]);

  const msg = (
    `📢 <b>${t(lang, 'الإذاعة', 'Broadcast')}</b>\n\n` +
    `📊 ${t(lang, 'الجمهور المستهدف', 'Target audience')}:\n` +
    `👥 ${t(lang, 'إجمالي', 'Total')}: <b>${totalUsers}</b>\n` +
    `📅 ${t(lang, 'نشط هذا الأسبوع', 'Active this week')}: <b>${activeUsers}</b>\n\n` +
    t(lang, 'اختر الجمهور المستهدف:', 'Choose target audience:')
  );

  await ctx.editMessageText(msg, { parse_mode: 'HTML', ...buttons }).catch(console.error);
};

// ═══════════════════════════════════════
// 6. SETTINGS HANDLER
// ═══════════════════════════════════════

const adminSettingsHandler = async (ctx) => {
  if (!ctx.isAdmin) return ctx.answerCbQuery('⛔', { show_alert: true });
  const lang = getLang(ctx);

  const maintenance = await Settings.get('maintenance_mode', false);
  const referralBonus = await Settings.get('referral_bonus', 0.5);
  const minDeposit = await Settings.get('min_deposit', 1);
  const welcomeMsg = await Settings.get('welcome_message', '');

  const msg = (
    `⚙️ <b>${t(lang, 'الإعدادات', 'Settings')}</b>\n\n` +
    `🔧 ${t(lang, 'وضع الصيانة', 'Maintenance Mode')}: ${maintenance ? t(lang, '✅ مفعّل', '✅ Enabled') : t(lang, '❌ معطّل', '❌ Disabled')}\n` +
    `🔗 ${t(lang, 'مكافأة الإحالة', 'Referral Bonus')}: <b>$${referralBonus}</b>\n` +
    `💰 ${t(lang, 'الحد الأدنى للشحن', 'Min Deposit')}: <b>$${minDeposit}</b>\n` +
    `${welcomeMsg ? `📝 ${t(lang, 'رسالة الترحيب', 'Welcome Message')}: ✅ ${t(lang, 'مخصصة', 'Custom')}` : `📝 ${t(lang, 'رسالة الترحيب', 'Welcome Message')}: ${t(lang, 'افتراضية', 'Default')}`}\n`
  );

  const buttons = Markup.inlineKeyboard([
    [Markup.button.callback('🔧 ' + t(lang, (maintenance ? 'تعطيل' : 'تفعيل') + ' الصيانة', (maintenance ? 'Disable' : 'Enable') + ' Maintenance'), 'toggle_maintenance')],
    [Markup.button.webApp(t(lang, '🖥️ تعديل الإعدادات', '🖥️ Edit Settings'), `${process.env.BASE_URL}/admin`)],
    [Markup.button.callback(t(lang, '🔙 رجوع', '🔙 Back'), 'admin_back')]
  ]);

  await ctx.editMessageText(msg, { parse_mode: 'HTML', ...buttons }).catch(console.error);
};

module.exports = {
  adminHandler,
  adminInventoryHandler,
  adminUsersHandler,
  adminOrdersHandler,
  adminBroadcastHandler,
  adminSettingsHandler
};
