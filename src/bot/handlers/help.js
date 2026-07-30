const { Markup } = require('telegraf');
const Settings = require('../../models/Settings');
const { buttonEmojiId, emojiHtml } = require('../../utils/customEmoji');

const helpHandler = async (ctx) => {
  const user = ctx.dbUser;
  const lang = user?.preferredLanguage || 'ar';
  const supportUsername = await Settings.get('support_username', 'support');
  const botName = await Settings.get('bot_name', 'Digital Keys Store');

  const msg = `${emojiHtml('support')} <b>${lang === 'en' ? 'Help & Support' : 'المساعدة والدعم'}</b>\n\n` +
    `<b>${botName}</b> - ${lang === 'en' ? 'Digital Keys Store' : 'متجر المفاتيح الرقمية'}\n\n` +
    `📋 <b>${lang === 'en' ? 'FAQ:' : 'الأسئلة الشائعة:'}</b>\n\n` +
    `❓ ${lang === 'en' ? 'How to buy?' : 'كيف أشتري؟'}\n` +
    `   → ${lang === 'en' ? 'Press 🛍️ Shop, choose device → game → product' : 'اضغط 🛍️ تسوق، اختر جهازك ثم اللعبة ثم المنتج'}\n\n` +
    `❓ ${lang === 'en' ? 'How do I receive the key?' : 'كيف أتلقى المفتاح؟'}\n` +
    `   → ${lang === 'en' ? 'Sent instantly after payment' : 'يُرسل فوراً بعد إتمام الدفع'} ${emojiHtml('checkmark')}\n\n` +
    `❓ ${lang === 'en' ? 'How to top up?' : 'كيف أشحن رصيدي؟'}\n` +
    `   → ${lang === 'en' ? 'Press 💰 Top Up' : 'اضغط 💰 شحن رصيد'}\n\n` +
    `❓ ${lang === 'en' ? 'Are prices in USD?' : 'هل الأسعار بالدولار؟'}\n` +
    `   → ${lang === 'en' ? 'Yes, all prices in USDT' : 'نعم، جميع الأسعار بـ USDT'}\n\n` +
    `👩‍💼 <b>${lang === 'en' ? 'Contact Support:' : 'تواصل مع الدعم:'}</b>\n` +
    `@${supportUsername}\n\n` +
    `⏰ ${lang === 'en' ? 'Support: 24/7' : 'أوقات الدعم: 24/7'}`;

  const buttons = Markup.inlineKeyboard([
    [{ text: '💬 ' + (lang === 'en' ? 'Contact Support' : 'تواصل مع الدعم'), url: `https://t.me/${supportUsername}`, style: 'primary', icon_custom_emoji_id: buttonEmojiId('primary') }],
    [{ text: lang === 'en' ? '🔙 Home' : '🔙 الرئيسية', callback_data: 'main_menu', style: 'danger', icon_custom_emoji_id: buttonEmojiId('danger') }]
  ]);

  await ctx.editMessageText?.(msg, { parse_mode: 'HTML', ...buttons })
    .catch(() => ctx.reply(msg, { parse_mode: 'HTML', ...buttons }));
};

module.exports = { helpHandler };
