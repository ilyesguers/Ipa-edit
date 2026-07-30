const { Markup } = require('telegraf');
const Order = require('../../models/Order');
const { buttonEmojiId, emojiHtml } = require('../../utils/customEmoji');

const historyHandler = async (ctx, page = 1) => {
  const user = ctx.dbUser;
  const lang = user?.preferredLanguage || 'ar';
  const limit = 5;
  const skip = (page - 1) * limit;

  const [orders, total] = await Promise.all([
    Order.find({ user: user.telegramId }).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Order.countDocuments({ user: user.telegramId })
  ]);

  const totalPages = Math.ceil(total / limit);

  if (!orders.length) {
    return ctx.editMessageText?.(`📋 ${lang === 'en' ? 'No order history' : 'لا يوجد سجل طلبات'}`, {
      ...Markup.inlineKeyboard([[{ text: lang === 'en' ? '🔙 Back' : '🔙 رجوع', callback_data: 'main_menu', style: 'danger', icon_custom_emoji_id: buttonEmojiId('danger') }]])
    }).catch(() => ctx.reply(`📋 ${lang === 'en' ? 'No order history' : 'لا يوجد سجل طلبات'}`));
  }

  let msg = `📋 <b>${lang === 'en' ? `Order History (Page ${page}/${totalPages})` : `سجل الطلبات (الصفحة ${page}/${totalPages})`}</b>\n\n`;
  orders.forEach(order => {
    const statusIcon = order.status === 'completed' ? emojiHtml('checkmark') : order.status === 'pending' ? '⏳' : '❌';
    msg += `${statusIcon} <b>${order.productName}</b>\n`;
    msg += `   📦 ${order.durationName} × ${order.quantity}\n`;
    msg += `   💰 $${order.finalPrice.toFixed(2)} | ${order.createdAt.toLocaleDateString(lang === 'en' ? 'en-US' : 'ar-SA')}\n\n`;
  });

  const navButtons = [];
  if (page > 1) navButtons.push({ text: '⬅️ ' + (lang === 'en' ? 'Prev' : 'السابق'), callback_data: `history_${page - 1}`, style: 'primary', icon_custom_emoji_id: buttonEmojiId('primary') });
  if (page < totalPages) navButtons.push({ text: (lang === 'en' ? 'Next' : 'التالي') + ' ➡️', callback_data: `history_${page + 1}`, style: 'primary', icon_custom_emoji_id: buttonEmojiId('primary') });

  const buttons = Markup.inlineKeyboard([
    navButtons,
    [{ text: lang === 'en' ? '🔙 Home' : '🔙 الرئيسية', callback_data: 'main_menu', style: 'danger', icon_custom_emoji_id: buttonEmojiId('danger') }]
  ].filter(row => row.length > 0));

  await ctx.editMessageText?.(msg, { parse_mode: 'HTML', ...buttons })
    .catch(() => ctx.reply(msg, { parse_mode: 'HTML', ...buttons }));
};

module.exports = { historyHandler };
