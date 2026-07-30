const { Markup } = require('telegraf');
const Order = require('../../models/Order');
const { buttonEmojiId, emojiHtml } = require('../../utils/customEmoji');

const keysHandler = async (ctx) => {
  const user = ctx.dbUser;
  const lang = user?.preferredLanguage || 'ar';
  const orders = await Order.find({ user: user.telegramId, status: 'completed' })
    .sort({ createdAt: -1 }).limit(10);

  if (!orders.length) {
    const msg = `${emojiHtml('key')} <b>${lang === 'en' ? 'My Keys' : 'مفاتيحي'}</b>\n\n📭 ${lang === 'en' ? 'No purchased keys yet' : 'لا توجد مفاتيح مشتراة بعد'}\n\n${lang === 'en' ? 'Start shopping now!' : 'ابدأ بالتسوق الآن!'} 🛍️`;
    return ctx.editMessageText?.(msg, {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard([[
        { text: lang === 'en' ? '🛍️ Shop Now' : '🛍️ تسوق الآن', callback_data: 'shop', style: 'success', icon_custom_emoji_id: buttonEmojiId('success') },
        { text: lang === 'en' ? '🔙 Back' : '🔙 رجوع', callback_data: 'main_menu', style: 'danger', icon_custom_emoji_id: buttonEmojiId('danger') }
      ]])
    }).catch(() => ctx.reply(msg, {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard([[
        { text: lang === 'en' ? '🛍️ Shop Now' : '🛍️ تسوق الآن', callback_data: 'shop', style: 'success', icon_custom_emoji_id: buttonEmojiId('success') }
      ]])
    }));
  }

  let msg = `${emojiHtml('key')} <b>${lang === 'en' ? `My Recent Keys (${orders.length} orders)` : `مفاتيحي الأخيرة (${orders.length} طلب)`}</b>\n\n`;
  orders.forEach((order, i) => {
    msg += `<b>${i + 1}. ${emojiHtml('checkmark')} ${order.productName}</b> - ${order.durationName}\n`;
    order.keyValues.forEach(key => {
      msg += `   <code>${key}</code>\n`;
    });
    msg += `   💰 $${order.finalPrice.toFixed(2)} | 📅 ${order.createdAt.toLocaleDateString(lang === 'en' ? 'en-US' : 'ar-SA')}\n\n`;
  });

  const buttons = Markup.inlineKeyboard([
    [{ text: lang === 'en' ? '📋 Full History' : '📋 السجل الكامل', callback_data: 'history', style: 'primary', icon_custom_emoji_id: buttonEmojiId('primary') }],
    [{ text: lang === 'en' ? '🔙 Home' : '🔙 الرئيسية', callback_data: 'main_menu', style: 'danger', icon_custom_emoji_id: buttonEmojiId('danger') }]
  ]);

  await ctx.editMessageText?.(msg, { parse_mode: 'HTML', ...buttons })
    .catch(() => ctx.reply(msg, { parse_mode: 'HTML', ...buttons }));
};

module.exports = { keysHandler };
