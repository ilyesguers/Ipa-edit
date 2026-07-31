const { Markup } = require('telegraf');
const Order = require('../../models/Order');
const { buttonEmojiId, buttonLabel, emojiHtml } = require('../../utils/customEmoji');
const { editOrReplyMenu } = require('../../utils/menuMessage');

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
    const msg = `${emojiHtml('ghost')} ${lang === 'en' ? 'No orders yet? Time to become legend! 🚀' : 'ما عندك طلبات؟ وقت تصير أسطورة! 🚀'}\n\n${emojiHtml('fire')} ${lang === 'en' ? 'Hit PLAY NOW and level up! 👑' : 'اضغط PLAY NOW وارتقِ مستواك! 👑'}`;
    return editOrReplyMenu(ctx, msg, {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard([
        [{
          text: buttonLabel('rocket', lang === 'en' ? '🚀 PLAY NOW' : '🚀 افتح المتجر'),
          web_app: { url: `${process.env.BASE_URL}/customer` },
          style: 'primary',
          icon_custom_emoji_id: buttonEmojiId('rocket')
        }],
        [{
          text: buttonLabel('ghost', lang === 'en' ? '⬅️ Home' : '⬅️ الرئيسية'),
          callback_data: 'main_menu',
          style: 'primary',
          icon_custom_emoji_id: buttonEmojiId('ghost')
        }]
      ])
    });
  }

  let msg = `${emojiHtml('crown')} <b>${lang === 'en' ? `Legend Orders - Page ${page}/${totalPages} 👑` : `طلبات الأسطورة - ${page}/${totalPages} 👑`}</b>\n\n`;
  orders.forEach((order) => {
    const statusIcon = order.status === 'completed' ? 'trophy' : order.status === 'pending' ? 'bolt' : 'skull';
    msg += `${emojiHtml(statusIcon)} <b>${order.productName}</b> ${emojiHtml('fire')}\n`;
    msg += `   ${emojiHtml('gem')} ${order.durationName} × ${order.quantity}\n`;
    msg += `   ${emojiHtml('wallet')} $${order.finalPrice.toFixed(2)} | ${order.createdAt.toLocaleDateString(lang === 'en' ? 'en-US' : 'ar-SA')} | ${order.status}\n\n`;
  });

  const navButtons = [];
  if (page > 1) navButtons.push({
    text: buttonLabel('ghost', lang === 'en' ? '⬅️ Prev' : '⬅️ السابق', { emojiId: buttonEmojiId('ghost') }),
    callback_data: `history_${page - 1}`,
    style: 'primary',
    icon_custom_emoji_id: buttonEmojiId('ghost')
  });
  if (page < totalPages) navButtons.push({
    text: buttonLabel('rocket', lang === 'en' ? 'Next ➡️' : 'التالي ➡️', { emojiId: buttonEmojiId('rocket') }),
    callback_data: `history_${page + 1}`,
    style: 'primary',
    icon_custom_emoji_id: buttonEmojiId('rocket')
  });

  const rows = [];
  if (navButtons.length) rows.push(navButtons);
  rows.push([{
    text: buttonLabel('rocket', lang === 'en' ? '🚀 Open Store' : '🚀 افتح المتجر'),
    web_app: { url: `${process.env.BASE_URL}/customer` },
    style: 'primary',
    icon_custom_emoji_id: buttonEmojiId('rocket')
  }]);
  rows.push([{
    text: buttonLabel('ghost', lang === 'en' ? '⬅️ Home' : '⬅️ الرئيسية'),
    callback_data: 'main_menu',
    style: 'primary',
    icon_custom_emoji_id: buttonEmojiId('ghost')
  }]);

  return editOrReplyMenu(ctx, msg, { parse_mode: 'HTML', ...Markup.inlineKeyboard(rows) });
};

module.exports = { historyHandler };
