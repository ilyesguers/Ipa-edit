const { Markup } = require('telegraf');
const Settings = require('../../models/Settings');

const helpHandler = async (ctx) => {
  const supportUsername = await Settings.get('support_username', 'support');
  const botName = await Settings.get('bot_name', 'Digital Keys Store');

  const msg = `❓ <b>المساعدة والدعم</b>\n\n` +
    `<b>${botName}</b> - متجر المفاتيح الرقمية\n\n` +
    `📋 <b>الأسئلة الشائعة:</b>\n\n` +
    `❓ كيف أشتري؟\n` +
    `   → اضغط 🛍️ تسوق، اختر جهازك ثم اللعبة ثم المنتج\n\n` +
    `❓ كيف أتلقى المفتاح؟\n` +
    `   → يُرسل فوراً بعد إتمام الدفع ✅\n\n` +
    `❓ كيف أشحن رصيدي؟\n` +
    `   → اضغط 💰 شحن رصيد\n\n` +
    `❓ هل الأسعار بالدولار؟\n` +
    `   → نعم، جميع الأسعار بـ USDT\n\n` +
    `👩‍💼 <b>تواصل مع الدعم:</b>\n` +
    `@${supportUsername}\n\n` +
    `⏰ أوقات الدعم: 24/7`;

  const buttons = Markup.inlineKeyboard([
    [Markup.button.url('💬 تواصل مع الدعم', `https://t.me/${supportUsername}`)],
    [Markup.button.callback('🔙 الرئيسية', 'main_menu')]
  ]);

  await ctx.editMessageText?.(msg, { parse_mode: 'HTML', ...buttons })
    .catch(() => ctx.reply(msg, { parse_mode: 'HTML', ...buttons }));
};

module.exports = { helpHandler };
