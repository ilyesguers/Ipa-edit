const { Markup } = require('telegraf');
const Order = require('../../models/Order');
const { buttonEmojiId, buttonLabel, emojiHtml } = require('../../utils/customEmoji');
const { editOrReplyMenu } = require('../../utils/menuMessage');

const { sendGamerError } = require('../../utils/gamerErrors');

const STATUS_LABELS = {
  completed: { ar: 'مكتمل', en: 'Completed' },
  pending: { ar: 'قيد الانتظار', en: 'Pending' },
  processing: { ar: 'قيد المعالجة', en: 'Processing' },
  failed: { ar: 'فشل', en: 'Failed' },
  cancelled: { ar: 'ملغي', en: 'Cancelled' },
  refunded: { ar: 'مسترجع', en: 'Refunded' }
};

const historyHandler = async (ctx, page = 1) => {
  const user = ctx.dbUser;
  if (!user) {
    return sendGamerError(ctx, 'userNotFound');
  }
  const lang = user.preferredLanguage || 'ar';
  const isEn = lang === 'en';
  const limit = 5;
  const skip = (page - 1) * limit;
  const [orders, total] = await Promise.all([
    Order.find({ user: user.telegramId }).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Order.countDocuments({ user: user.telegramId })
  ]);
  const totalPages = Math.max(1, Math.ceil(total / limit));

  if (!orders.length) {
    const msg = `${emojiHtml('ghost')} ${isEn ? 'No orders in your history yet.' : 'لا توجد طلبات في سجلك بعد.'}\n\n${emojiHtml('fire')} ${isEn ? 'Open the store and place your first order.' : 'افتح المتجر وابدأ طلبك الأول.'}`;
    return editOrReplyMenu(ctx, msg, {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard([
        [{
          text: buttonLabel('rocket', isEn ? '🛍️ Open Store' : '🛍️ فتح المتجر'),
          web_app: { url: `${process.env.BASE_URL}/customer` },
          style: 'primary',
          icon_custom_emoji_id: buttonEmojiId('rocket')
        }],
        [{
          text: buttonLabel('ghost', isEn ? '⬅️ Home' : '⬅️ الرئيسية'),
          callback_data: 'main_menu',
          style: 'primary',
          icon_custom_emoji_id: buttonEmojiId('ghost')
        }]
      ])
    });
  }

  let msg = `${emojiHtml('crown')} <b>${isEn ? `Order history — page ${page}/${totalPages}` : `سجل الطلبات — ${page}/${totalPages}`}</b>\n\n`;
  orders.forEach((order) => {
    const statusIcon = order.status === 'completed' ? 'trophy' : order.status === 'pending' ? 'bolt' : order.status === 'refunded' ? 'wallet' : 'skull';
    const statusText = STATUS_LABELS[order.status]?.[isEn ? 'en' : 'ar'] || order.status;
    msg += `${emojiHtml(statusIcon)} <b>${order.productName}</b>\n`;
    msg += `   ${emojiHtml('gem')} ${order.durationName} × ${order.quantity}\n`;
    msg += `   ${emojiHtml('wallet')} $${order.finalPrice.toFixed(2)} | ${order.createdAt.toLocaleDateString(isEn ? 'en-US' : 'ar-IQ-u-nu-latn')} | ${statusText}\n\n`;
  });

  const navButtons = [];
  if (page > 1) navButtons.push({
    text: buttonLabel('ghost', isEn ? '⬅️ Prev' : '⬅️ السابق', { emojiId: buttonEmojiId('ghost') }),
    callback_data: `history_${page - 1}`,
    style: 'primary',
    icon_custom_emoji_id: buttonEmojiId('ghost')
  });
  if (page < totalPages) navButtons.push({
    text: buttonLabel('rocket', isEn ? 'Next ➡️' : 'التالي ➡️', { emojiId: buttonEmojiId('rocket') }),
    callback_data: `history_${page + 1}`,
    style: 'primary',
    icon_custom_emoji_id: buttonEmojiId('rocket')
  });

  const rows = [];
  if (navButtons.length) rows.push(navButtons);
  rows.push([{
    text: buttonLabel('rocket', isEn ? '🛍️ Open Store' : '🛍️ فتح المتجر'),
    web_app: { url: `${process.env.BASE_URL}/customer` },
    style: 'primary',
    icon_custom_emoji_id: buttonEmojiId('rocket')
  }]);
  rows.push([{
    text: buttonLabel('ghost', isEn ? '⬅️ Home' : '⬅️ الرئيسية'),
    callback_data: 'main_menu',
    style: 'primary',
    icon_custom_emoji_id: buttonEmojiId('ghost')
  }]);

  return editOrReplyMenu(ctx, msg, { parse_mode: 'HTML', ...Markup.inlineKeyboard(rows) });
};

module.exports = { historyHandler };
