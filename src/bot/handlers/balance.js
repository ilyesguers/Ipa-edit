const { Markup } = require('telegraf');
const Settings = require('../../models/Settings');

const balanceHandler = async (ctx) => {
  const user = ctx.dbUser;
  const wallet = await Settings.get('usdt_wallet_trc20', '');
  const minDeposit = await Settings.get('min_deposit', 1);

  const msg = `💰 <b>شحن الرصيد</b>\n\n` +
    `💳 رصيدك الحالي: <b>$${user.balance.toFixed(2)}</b>\n\n` +
    `📌 طرق الشحن المتاحة:\n\n` +
    `1️⃣ <b>دفع USDT (TRC20) يدوي</b>\n` +
    `   الحد الأدنى: $${minDeposit}\n` +
    `   ${wallet ? `العنوان: <code>${wallet}</code>` : 'يرجى التواصل مع الدعم'}\n\n` +
    `2️⃣ <b>Binance Pay تلقائي</b>\n` +
    `   متاح من خلال المتجر\n\n` +
    `⚠️ بعد الإرسال، أرسل إثبات الدفع (TxHash أو صورة) هنا`;

  const buttons = Markup.inlineKeyboard([
    [Markup.button.callback('💳 شحن عبر بينانس', 'binance_deposit')],
    [Markup.button.webApp('📱 شحن من المتجر', `${process.env.BASE_URL}/customer`)],
    [Markup.button.callback('🔙 الرئيسية', 'main_menu')]
  ]);

  await ctx.editMessageText?.(msg, { parse_mode: 'HTML', ...buttons })
    .catch(() => ctx.reply(msg, { parse_mode: 'HTML', ...buttons }));
};

module.exports = { balanceHandler };
