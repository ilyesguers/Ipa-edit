const { Markup } = require('telegraf');
const Order = require('../../models/Order');

const historyHandler = async (ctx, page = 1) => {
  const user = ctx.dbUser;
  const limit = 5;
  const skip = (page - 1) * limit;

  const [orders, total] = await Promise.all([
    Order.find({ user: user.telegramId }).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Order.countDocuments({ user: user.telegramId })
  ]);

  const totalPages = Math.ceil(total / limit);

  if (!orders.length) {
    return ctx.editMessageText?.('📋 لا يوجد سجل طلبات', {
      ...Markup.inlineKeyboard([[Markup.button.callback('🔙 رجوع', 'main_menu')]])
    }).catch(() => ctx.reply('📋 لا يوجد سجل طلبات'));
  }

  let msg = `📋 <b>سجل الطلبات</b> (الصفحة ${page}/${totalPages})\n\n`;
  orders.forEach(order => {
    const statusIcon = order.status === 'completed' ? '✅' : order.status === 'pending' ? '⏳' : '❌';
    msg += `${statusIcon} <b>${order.productName}</b>\n`;
    msg += `   📦 ${order.durationName} × ${order.quantity}\n`;
    msg += `   💰 $${order.finalPrice.toFixed(2)} | ${order.createdAt.toLocaleDateString('ar-SA')}\n\n`;
  });

  const navButtons = [];
  if (page > 1) navButtons.push(Markup.button.callback('⬅️ السابق', `history_${page - 1}`));
  if (page < totalPages) navButtons.push(Markup.button.callback('➡️ التالي', `history_${page + 1}`));

  const buttons = Markup.inlineKeyboard([
    navButtons,
    [Markup.button.callback('🔙 الرئيسية', 'main_menu')]
  ].filter(row => row.length > 0));

  await ctx.editMessageText?.(msg, { parse_mode: 'HTML', ...buttons })
    .catch(() => ctx.reply(msg, { parse_mode: 'HTML', ...buttons }));
};

module.exports = { historyHandler };
