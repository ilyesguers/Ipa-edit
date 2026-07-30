const { Markup } = require('telegraf');
const Order = require('../../models/Order');
const { buttonEmojiId, buttonLabel, emojiHtml } = require('../../utils/customEmoji');
const { editOrReplyMenu } = require('../../utils/menuMessage');

const keyButton = (emojiKey, text, callbackData, style) => {
  const emojiId = buttonEmojiId(emojiKey);
  return {
    text: buttonLabel(emojiKey, text, { emojiId }),
    callback_data: callbackData,
    style,
    ...(emojiId ? { icon_custom_emoji_id: emojiId } : {})
  };
};

const keysHandler = async (ctx) => {
  const user = ctx.dbUser;
  const lang = user?.preferredLanguage || 'ar';
  const orders = await Order.find({ user: user.telegramId, status: 'completed' }).sort({ createdAt: -1 }).limit(10);

  if (!orders.length) {
    const msg = `${emojiHtml('key')} <b>${lang === 'en' ? 'My Keys' : 'مفاتيحي'}</b>\n\n` +
      `${emojiHtml('ghost')} ${lang === 'en' ? 'No purchased keys yet.' : 'لا توجد مفاتيح مشتراة بعد.'}\n\n` +
      `${lang === 'en' ? 'Start shopping now!' : 'ابدأ بالتسوق الآن!'}`;
    const buttons = Markup.inlineKeyboard([[
      keyButton('gamepad', lang === 'en' ? 'Shop Now' : 'تسوق الآن', 'shop', 'success'),
      keyButton('back', lang === 'en' ? 'Back' : 'رجوع', 'main_menu', 'danger')
    ]]);
    return editOrReplyMenu(ctx, msg, { parse_mode: 'HTML', ...buttons });
  }

  let msg = `${emojiHtml('key')} <b>${lang === 'en' ? `My Recent Keys (${orders.length} orders)` : `مفاتيحي الأخيرة (${orders.length} طلب)`}</b>\n\n`;
  orders.forEach((order, i) => {
    msg += `<b>${i + 1}. ${emojiHtml('checkmark')} ${order.productName}</b> — ${order.durationName}\n`;
    order.keyValues.forEach(key => { msg += `   <code>${key}</code>\n`; });
    msg += `   ${emojiHtml('coin')} $${order.finalPrice.toFixed(2)} | ${emojiHtml('calendar')} ${order.createdAt.toLocaleDateString(lang === 'en' ? 'en-US' : 'ar-SA')}\n\n`;
  });

  const buttons = Markup.inlineKeyboard([
    [keyButton('orders', lang === 'en' ? 'Full History' : 'السجل الكامل', 'history', 'primary')],
    [keyButton('back', lang === 'en' ? 'Home' : 'الرئيسية', 'main_menu', 'danger')]
  ]);
  return editOrReplyMenu(ctx, msg, { parse_mode: 'HTML', ...buttons });
};

module.exports = { keysHandler };
