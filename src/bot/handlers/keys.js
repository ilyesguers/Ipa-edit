const { Markup } = require('telegraf');
const Order = require('../../models/Order');

const keysHandler = async (ctx) => {
  const user = ctx.dbUser;
  const orders = await Order.find({ user: user.telegramId, status: 'completed' })
    .sort({ createdAt: -1 }).limit(10);

  if (!orders.length) {
    const msg = `🔑 <b>مفاتيحي</b>\n\n📭 لا توجد مفاتيح مشتراة بعد\n\nابدأ بالتسوق الآن! 🛍️`;
    return ctx.editMessageText?.(msg, {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard([[Markup.button.callback('🛍️ تسوق الآن', 'shop'), Markup.button.callback('🔙 رجوع', 'main_menu')]])
    }).catch(() => ctx.reply(msg, {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard([[Markup.button.callback('🛍️ تسوق الآن', 'shop')]])
    }));
  }

  let msg = `🔑 <b>مفاتيحي الأخيرة (${orders.length} طلب)</b>\n\n`;
  orders.forEach((order, i) => {
    msg += `<b>${i + 1}. ${order.productName}</b> - ${order.durationName}\n`;
    order.keyValues.forEach(key => {
      msg += `   <code>${key}</code>\n`;
    });
    msg += `   💰 $${order.finalPrice.toFixed(2)} | 📅 ${order.createdAt.toLocaleDateString('ar-SA')}\n\n`;
  });

  const buttons = Markup.inlineKeyboard([
    [Markup.button.callback('📋 السجل الكامل', 'history')],
    [Markup.button.callback('🔙 الرئيسية', 'main_menu')]
  ]);

  await ctx.editMessageText?.(msg, { parse_mode: 'HTML', ...buttons })
    .catch(() => ctx.reply(msg, { parse_mode: 'HTML', ...buttons }));
};

module.exports = { keysHandler };
