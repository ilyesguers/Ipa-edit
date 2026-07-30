const { Markup } = require('telegraf');
const Settings = require('../../models/Settings');
const { buttonEmojiId, emojiHtml, buttonLabel } = require('../../utils/customEmoji');
const { editOrReplyMenu } = require('../../utils/menuMessage');

const balanceButton = (emojiKey, text, callbackData, extra = {}) => {
  const emojiId = buttonEmojiId(emojiKey);
  return {
    text: buttonLabel(emojiKey, text, { emojiId, hasIcon: Boolean(emojiId) }),
    ...extra,
    ...(callbackData ? { callback_data: callbackData } : {}),
    ...(emojiId ? { icon_custom_emoji_id: emojiId } : {})
  };
};

const balanceHandler = async (ctx) => {
  const user = ctx.dbUser;
  const lang = user?.preferredLanguage || 'ar';
  const wallet = await Settings.get('usdt_wallet_trc20', '');
  const minDeposit = await Settings.get('min_deposit', 1);

  const msg = `${emojiHtml('wallet')} <b>${lang === 'en' ? 'Top Up Balance' : 'شحن الرصيد'}</b>\n\n` +
    `${emojiHtml('diamond')} ${lang === 'en' ? 'Current Balance' : 'رصيدك الحالي'}: <b>$${user.balance.toFixed(2)}</b>\n\n` +
    `${emojiHtml('tag')} <b>${lang === 'en' ? 'Available top-up methods:' : 'طرق الشحن المتاحة:'}</b>\n\n` +
    `1. <b>${lang === 'en' ? 'Manual USDT (TRC20)' : 'دفع USDT (TRC20) يدوي'}</b>\n` +
    `   ${lang === 'en' ? 'Minimum' : 'الحد الأدنى'}: $${minDeposit}\n` +
    `   ${wallet ? `${lang === 'en' ? 'Address' : 'العنوان'}: <code>${wallet}</code>` : (lang === 'en' ? 'Please contact support' : 'يرجى التواصل مع الدعم')}\n\n` +
    `2. <b>${lang === 'en' ? 'Automatic Binance Pay' : 'Binance Pay تلقائي'}</b>\n` +
    `   ${lang === 'en' ? 'Available through the web store' : 'متاح من خلال المتجر'}\n\n` +
    `${emojiHtml('shield')} ${lang === 'en' ? 'After sending, send payment proof (TxHash or photo) here' : 'بعد الإرسال، أرسل إثبات الدفع (TxHash أو صورة) هنا'}`;

  const buttons = Markup.inlineKeyboard([
    [balanceButton('gem', lang === 'en' ? 'Binance Deposit' : 'شحن عبر بينانس', 'binance_deposit', { style: 'primary' })],
    [balanceButton('mobile', lang === 'en' ? 'Open Store' : 'فتح المتجر', null, { web_app: { url: `${process.env.BASE_URL}/customer` }, style: 'success' })],
    [balanceButton('back', lang === 'en' ? 'Home' : 'الرئيسية', 'main_menu', { style: 'danger' })]
  ]);

  return editOrReplyMenu(ctx, msg, { parse_mode: 'HTML', ...buttons });
};

module.exports = { balanceHandler };
