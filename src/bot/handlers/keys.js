const { Markup } = require('telegraf');
const Order = require('../../models/Order');
const { buttonEmojiId, buttonLabel, emojiHtml } = require('../../utils/customEmoji');
const { editOrReplyMenu } = require('../../utils/menuMessage');

const { sendGamerError } = require('../../utils/gamerErrors');

const keysHandler = async (ctx) => {
  const user = ctx.dbUser;
  if (!user) {
    return sendGamerError(ctx, 'userNotFound');
  }
  const lang = user.preferredLanguage || 'ar';
  const orders = await Order.find({ user: user.telegramId, status: 'completed' }).sort({ createdAt: -1 }).limit(5);

  if (!orders.length) {
    const msg = `${emojiHtml('ghost')} <b>${lang === 'en' ? 'No keys in your account yet' : 'لا توجد مفاتيح في حسابك بعد'}</b>\n\n` +
      `${emojiHtml('rocket')} ${lang === 'en' ? 'All your purchases appear here right after delivery.' : 'تظهر مشترياتك هنا فور تسليمها.'}\n` +
      `${emojiHtml('fire')} ${lang === 'en' ? 'Instant delivery after payment.' : 'تسليم فوري بعد إتمام الدفع.'}`;

    const buttons = Markup.inlineKeyboard([[
      {
        text: buttonLabel('rocket', lang === 'en' ? '🛍️ Open Store' : '🛍️ فتح المتجر'),
        web_app: { url: `${process.env.BASE_URL}/customer` },
        style: 'primary',
        icon_custom_emoji_id: buttonEmojiId('rocket')
      }
    ],
    [{
      text: buttonLabel('ghost', lang === 'en' ? '⬅️ Home' : '⬅️ الرئيسية'),
      callback_data: 'main_menu',
      style: 'primary',
      icon_custom_emoji_id: buttonEmojiId('ghost')
    }]]);
    return editOrReplyMenu(ctx, msg, { parse_mode: 'HTML', ...buttons });
  }

  let msg = `${emojiHtml('crown')} <b>${lang === 'en' ? `Your keys (${orders.length})` : `مفاتيحك (${orders.length})`}</b>\n\n`;
  orders.forEach((order, i) => {
    msg += `<b>${i + 1}. ${emojiHtml('gem')} ${order.productName}</b> — ${order.durationName}\n`;
    order.keyValues.slice(0, 2).forEach(key => { msg += `   ${emojiHtml('fire')} <code>${key}</code>\n`; });
    if (order.keyValues.length > 2) msg += `   ${emojiHtml('rocket')} +${order.keyValues.length - 2} ${lang === 'en' ? 'more inside the store' : 'أخرى داخل المتجر'}...\n`;
    msg += `   ${emojiHtml('trophy')} $${order.finalPrice.toFixed(2)} | ${order.createdAt.toLocaleDateString(lang === 'en' ? 'en-US' : 'ar-IQ')}\n\n`;
  });
  msg += `${emojiHtml('rocket')} ${lang === 'en' ? 'Open the store to view all your keys anytime.' : 'افتح المتجر لعرض جميع مفاتيحك في أي وقت.'}`;

  const buttons = Markup.inlineKeyboard([
    [{
      text: buttonLabel('rocket', lang === 'en' ? '🛍️ Open Store — All Keys' : '🛍️ فتح المتجر — كل المفاتيح'),
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
  ]);
  return editOrReplyMenu(ctx, msg, { parse_mode: 'HTML', ...buttons });
};

module.exports = { keysHandler };
