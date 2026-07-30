const { Markup } = require('telegraf');
const Settings = require('../../models/Settings');
const { buttonEmojiId, emojiHtml } = require('../../utils/customEmoji');

const balanceHandler = async (ctx) => {
  const user = ctx.dbUser;
  const lang = user?.preferredLanguage || 'ar';
  const wallet = await Settings.get('usdt_wallet_trc20', '');
  const minDeposit = await Settings.get('min_deposit', 1);

  const msg = `${emojiHtml('wallet')} <b>${lang === 'en' ? 'Top Up Balance' : 'شحن الرصيد'}</b>\n\n` +
    `${emojiHtml('diamond')} ${lang === 'en' ? 'Current Balance' : 'رصيدك الحالي'}: <b>$${user.balance.toFixed(2)}</b>\n\n` +
    `📌 ${lang === 'en' ? 'Available top-up methods:' : 'طرق الشحن المتاحة:'}\n\n` +
    `1️⃣ <b>${lang === 'en' ? 'Manual USDT (TRC20)' : 'دفع USDT (TRC20) يدوي'}</b>\n` +
    `   ${lang === 'en' ? 'Minimum' : 'الحد الأدنى'}: $${minDeposit}\n` +
    `   ${wallet ? `${lang === 'en' ? 'Address' : 'العنوان'}: <code>${wallet}</code>` : (lang === 'en' ? 'Please contact support' : 'يرجى التواصل مع الدعم')}\n\n` +
    `2️⃣ <b>${lang === 'en' ? 'Automatic Binance Pay' : 'Binance Pay تلقائي'}</b>\n` +
    `   ${lang === 'en' ? 'Available through the web store' : 'متاح من خلال المتجر'}\n\n` +
    `⚠️ ${lang === 'en' ? 'After sending, send payment proof (TxHash or photo) here' : 'بعد الإرسال، أرسل إثبات الدفع (TxHash أو صورة) هنا'}`;

  const buttons = Markup.inlineKeyboard([
    [{ text: '💎 ' + (lang === 'en' ? 'Binance Deposit' : 'شحن عبر بينانس'), callback_data: 'binance_deposit', style: 'primary', icon_custom_emoji_id: buttonEmojiId('primary') }],
    [{ text: '📱 ' + (lang === 'en' ? 'Open Store' : 'شحن من المتجر'), web_app: { url: `${process.env.BASE_URL}/customer` }, style: 'success', icon_custom_emoji_id: buttonEmojiId('success') }],
    [{ text: lang === 'en' ? '🔙 Home' : '🔙 الرئيسية', callback_data: 'main_menu', style: 'danger', icon_custom_emoji_id: buttonEmojiId('danger') }]
  ]);

  await ctx.editMessageText?.(msg, { parse_mode: 'HTML', ...buttons })
    .catch(() => ctx.reply(msg, { parse_mode: 'HTML', ...buttons }));
};

module.exports = { balanceHandler };
