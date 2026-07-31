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
    const msg = `${emojiHtml('ghost')} <b>${lang === 'en' ? 'No legendary keys yet? 👀' : 'ما عندك مفاتيح أسطورية لسه؟ 👀'}</b>\n\n` +
      `${emojiHtml('rocket')} ${lang === 'en' ? 'Time to become LEGEND! Hit PLAY NOW 🚀' : 'وقت تصير أسطورة! اضغط PLAY NOW 🚀'}\n` +
      `${emojiHtml('fire')} ${lang === 'en' ? 'Fastest delivery - Instant keys! ⚡' : 'أسرع تسليم - مفاتيح فورية! ⚡'}`;

    const buttons = Markup.inlineKeyboard([[
      {
        text: buttonLabel('rocket', lang === 'en' ? '🚀 PLAY NOW - STORE' : '🚀 افتح المتجر - PLAY NOW'),
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

  let msg = `${emojiHtml('crown')} <b>${lang === 'en' ? `Your Legendary Keys (${orders.length}) 👑🔥` : `مفاتيحك الأسطورية (${orders.length}) 👑🔥`}</b>\n\n`;
  orders.forEach((order, i) => {
    msg += `<b>${i + 1}. ${emojiHtml('gem')} ${order.productName}</b> — ${order.durationName}\n`;
    order.keyValues.slice(0, 2).forEach(key => { msg += `   ${emojiHtml('fire')} <code>${key}</code>\n`; });
    if (order.keyValues.length > 2) msg += `   ${emojiHtml('rocket')} +${order.keyValues.length - 2} more in store...\n`;
    msg += `   ${emojiHtml('trophy')} $${order.finalPrice.toFixed(2)} | ${order.createdAt.toLocaleDateString(lang === 'en' ? 'en-US' : 'ar-SA')}\n\n`;
  });
  msg += `${emojiHtml('rocket')} ${lang === 'en' ? 'Full keys in web store - PLAY NOW!' : 'المفاتيح الكاملة في المتجر - PLAY NOW!'} 🚀`;

  const buttons = Markup.inlineKeyboard([
    [{
      text: buttonLabel('rocket', lang === 'en' ? '🚀 Open Store - See All Keys' : '🚀 افتح المتجر - شوف كل المفاتيح'),
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
