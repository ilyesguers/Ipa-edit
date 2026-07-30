const { Markup } = require('telegraf');
const orderService = require('../../services/orderService');
const Settings = require('../../models/Settings');

const adminHandler = async (ctx) => {
  if (!ctx.isAdmin) {
    return ctx.reply('⛔ غير مصرح لك بالوصول لهذه الصفحة');
  }

  const stats = await orderService.getStats();
  const maintenance = await Settings.get('maintenance_mode', false);

  const msg = `⚙️ <b>Admin Dashboard</b>\n\n` +
    `👥 إجمالي المستخدمين: <b>${stats.totalUsers}</b>\n` +
    `💰 إجمالي الأرباح: <b>$${stats.totalRevenue.toFixed(2)}</b>\n` +
    `🛒 إجمالي الطلبات: <b>${stats.totalOrders}</b>\n` +
    `🔑 المفاتيح المتاحة: <b>${stats.activeKeys}</b> / إجمالي: ${stats.totalKeys}\n\n` +
    `📊 أرباح اليوم: <b>$${stats.revenueToday.toFixed(2)}</b>\n` +
    `📊 أرباح الشهر: <b>$${stats.revenueMonth.toFixed(2)}</b>\n\n` +
    `🔧 وضع الصيانة: ${maintenance ? '✅ مفعّل' : '❌ معطل'}`;

  const buttons = Markup.inlineKeyboard([
    [Markup.button.webApp('🖥️ فتح لوحة الإدارة', `${process.env.BASE_URL}/admin`)],
    [Markup.button.callback('🔧 ' + (maintenance ? 'تعطيل' : 'تفعيل') + ' الصيانة', 'toggle_maintenance')],
    [Markup.button.callback('📦 إدارة المخزون', 'admin_inventory')],
    [Markup.button.callback('👥 إدارة المستخدمين', 'admin_users')],
    [Markup.button.callback('📢 إرسال إذاعة', 'admin_broadcast')],
    [Markup.button.callback('⚙️ الإعدادات', 'admin_settings')],
  ]);

  await ctx.reply(msg, { parse_mode: 'HTML', ...buttons });
};

const adminInventoryHandler = async (ctx) => {
  if (!ctx.isAdmin) return ctx.answerCbQuery('⛔ غير مصرح', { show_alert: true });

  const Key = require('../../models/Key');
  const Product = require('../../models/Product');

  const products = await Product.find({ isActive: true }).select('name nameAr');
  if (!products.length) return ctx.answerCbQuery('لا توجد منتجات', { show_alert: true });

  const buttons = products.slice(0, 10).map(p =>
    [Markup.button.callback(`📦 ${p.nameAr || p.name}`, `inv_product_${p._id}`)]
  );
  buttons.push([Markup.button.callback('🔙 رجوع', 'admin_back')]);

  await ctx.editMessageText('📦 <b>إدارة المخزون</b>\n\nاختر منتجاً:', {
    parse_mode: 'HTML',
    ...Markup.inlineKeyboard(buttons)
  }).catch(console.error);
};

const adminBroadcastHandler = async (ctx) => {
  if (!ctx.isAdmin) return ctx.answerCbQuery('⛔ غير مصرح', { show_alert: true });

  const buttons = Markup.inlineKeyboard([
    [Markup.button.callback('📢 إرسال للكل', 'broadcast_all')],
    [Markup.button.callback('🛒 إرسال للمشترين فقط', 'broadcast_buyers')],
    [Markup.button.callback('💰 إرسال لمن لديهم رصيد', 'broadcast_balance')],
    [Markup.button.webApp('📝 محرر الإذاعة', `${process.env.BASE_URL}/admin`)],
    [Markup.button.callback('🔙 رجوع', 'admin_back')]
  ]);

  await ctx.editMessageText('📢 <b>الإذاعة</b>\n\nاختر الجمهور المستهدف:', {
    parse_mode: 'HTML', ...buttons
  }).catch(console.error);
};

module.exports = { adminHandler, adminInventoryHandler, adminBroadcastHandler };
