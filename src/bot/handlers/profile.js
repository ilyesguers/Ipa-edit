const { Markup } = require('telegraf');
const Order = require('../../models/Order');

const profileHandler = async (ctx) => {
  const user = ctx.dbUser;

  const msg = `👤 <b>ملف المستخدم</b>\n\n` +
    `📛 الاسم: <b>${user.fullName}</b>\n` +
    `🆔 المعرف: <code>${user.telegramId}</code>\n` +
    `👤 اليوزر: ${user.username ? `@${user.username}` : 'غير محدد'}\n` +
    `📱 الهاتف: ${user.phone || 'غير محقق'}\n` +
    `💱 العملة: <b>${user.currency}</b>\n` +
    `🏷️ الدور: <b>${user.role === 'admin' ? '👑 مدير' : '👤 عميل'}</b>\n\n` +
    `💰 الرصيد: <b>$${user.balance.toFixed(2)}</b>\n` +
    `🛒 إجمالي الطلبات: <b>${user.totalOrders}</b>\n` +
    `💸 إجمالي الإنفاق: <b>$${user.totalSpent.toFixed(2)}</b>\n` +
    `📅 تاريخ الانضمام: <b>${user.createdAt.toLocaleDateString('ar-SA')}</b>`;

  const buttons = Markup.inlineKeyboard([
    [Markup.button.callback('📊 نشاطي', 'my_activity')],
    [Markup.button.callback('🔑 مفاتيحي', 'mykeys')],
    [Markup.button.callback('🔙 الرئيسية', 'main_menu')]
  ]);

  await ctx.editMessageText?.(msg, { parse_mode: 'HTML', ...buttons })
    .catch(() => ctx.reply(msg, { parse_mode: 'HTML', ...buttons }));
};

const showActivity = async (ctx) => {
  const user = ctx.dbUser;
  const recentOrders = await Order.find({ user: user.telegramId, status: 'completed' }).sort({ createdAt: -1 }).limit(5);

  let msg = `📊 <b>نشاطي الأخير</b>\n\n`;
  msg += `💸 إجمالي الإنفاق: <b>$${user.totalSpent.toFixed(2)}</b>\n`;
  msg += `💰 إجمالي الشحن: <b>$${user.totalDeposited.toFixed(2)}</b>\n`;
  msg += `🛒 عدد الطلبات: <b>${user.totalOrders}</b>\n\n`;

  if (recentOrders.length) {
    msg += `📋 <b>آخر الطلبات:</b>\n`;
    recentOrders.forEach((order, i) => {
      msg += `${i + 1}. ✅ ${order.productName} (${order.durationName}) - $${order.finalPrice.toFixed(2)}\n`;
    });
  } else {
    msg += `📭 لا توجد طلبات بعد`;
  }

  await ctx.editMessageText(msg, {
    parse_mode: 'HTML',
    ...Markup.inlineKeyboard([[Markup.button.callback('🔙 رجوع', 'profile')]])
  }).catch(console.error);
};

module.exports = { profileHandler, showActivity };
