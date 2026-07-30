const { Markup } = require('telegraf');
const Order = require('../../models/Order');
const { buttonEmojiId, buttonLabel, emojiHtml } = require('../../utils/customEmoji');
const { editOrReplyMenu } = require('../../utils/menuMessage');

const historyButton = (emojiKey, text, callbackData, style = 'primary') => {
  const emojiId = buttonEmojiId(emojiKey);
  return {
    text: buttonLabel(emojiKey, text, { emojiId }),
    callback_data: callbackData,
    style,
    ...(emojiId ? { icon_custom_emoji_id: emojiId } : {})
  };
};

const historyHandler = async (ctx, page = 1) => {
  const user = ctx.dbUser;
  const lang = user?.preferredLanguage || 'ar';
  const limit = 5;
  const skip = (page - 1) * limit;
  const [orders, total] = await Promise.all([
    Order.find({ user: user.telegramId }).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Order.countDocuments({ user: user.telegramId })
  ]);
  const totalPages = Math.max(1, Math.ceil(total / limit));

  if (!orders.length) {
    const msg = `${emojiHtml('orders')} ${lang === 'en' ? 'No order history' : 'لا يوجد سجل طلبات'}`;
    return editOrReplyMenu(ctx, msg, {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard([[historyButton('back', lang === 'en' ? 'Back' : 'رجوع', 'main_menu', 'danger')]])
    });
  }

  let msg = `${emojiHtml('orders')} <b>${lang === 'en' ? `Order History (Page ${page}/${totalPages})` : `سجل الطلبات (الصفحة ${page}/${totalPages})`}</b>\n\n`;
  orders.forEach((order) => {
    const statusIcon = order.status === 'completed' ? 'checkmark' : order.status === 'pending' ? 'clock' : 'skull';
    msg += `${emojiHtml(statusIcon)} <b>${order.productName}</b>\n`;
    msg += `   ${emojiHtml('box')} ${order.durationName} × ${order.quantity}\n`;
    msg += `   ${emojiHtml('coin')} $${order.finalPrice.toFixed(2)} | ${emojiHtml('calendar')} ${order.createdAt.toLocaleDateString(lang === 'en' ? 'en-US' : 'ar-SA')}\n\n`;
  });

  const navButtons = [];
  if (page > 1) navButtons.push(historyButton('back', lang === 'en' ? 'Previous' : 'السابق', `history_${page - 1}`, 'primary'));
  if (page < totalPages) navButtons.push(historyButton('gamepad', lang === 'en' ? 'Next' : 'التالي', `history_${page + 1}`, 'primary'));

  const rows = [];
  if (navButtons.length) rows.push(navButtons);
  rows.push([historyButton('back', lang === 'en' ? 'Home' : 'الرئيسية', 'main_menu', 'danger')]);
  return editOrReplyMenu(ctx, msg, { parse_mode: 'HTML', ...Markup.inlineKeyboard(rows) });
};

module.exports = { historyHandler };
