const { Markup } = require('telegraf');
const Settings = require('../../models/Settings');
const { buttonEmojiId, emojiHtml, buttonLabel } = require('../../utils/customEmoji');
const { editOrReplyMenu } = require('../../utils/menuMessage');
const { sendGamerError } = require('../../utils/gamerErrors');

const balanceHandler = async (ctx) => {
  const user = ctx.dbUser;
  if (!user) {
    return sendGamerError(ctx, 'userNotFound');
  }
  const lang = user.preferredLanguage || 'ar';
  const [wallet, minDeposit, supportUsername, starsEnabled] = await Promise.all([
    Settings.get('usdt_wallet_trc20', ''),
    Settings.get('min_deposit', 1),
    Settings.get('support_username', 'support'),
    Settings.get('stars_enabled', true)
  ]);

  const starsLine = starsEnabled
    ? (lang === 'en'
      ? `3. <b>Telegram Stars</b> ⭐\n   Pay directly inside the mini app — instant delivery`
      : `3. <b>نجوم تيليجرام</b> ⭐\n   ادفع مباشرة من داخل التطبيق المصغّر — تسليم فوري`)
    : '';

  const msg = lang === 'en'
    ? `${emojiHtml('wallet')} <b>Top up your balance</b>\n\n` +
      `${emojiHtml('fire')} Current balance: <b>$${user.balance.toFixed(2)}</b>\n\n` +
      `${emojiHtml('rocket')} <b>Available payment methods:</b>\n\n` +
      `1. <b>USDT (TRC20) — manual</b>\n   Minimum: $${minDeposit}\n   ${wallet ? `Address: <code>${wallet}</code>` : `Contact support @${supportUsername}`}\n\n` +
      `2. <b>Binance Pay — automatic</b>\n   Verified automatically through the web store\n\n` +
      `${starsLine ? `${starsLine}\n\n` : ''}` +
      `${emojiHtml('shield')} After sending, paste the transaction hash here — verification is fast.`
    : `${emojiHtml('wallet')} <b>شحن الرصيد</b>\n\n` +
      `${emojiHtml('fire')} رصيدك الحالي: <b>$${user.balance.toFixed(2)}</b>\n\n` +
      `${emojiHtml('rocket')} <b>طرق الدفع المتاحة:</b>\n\n` +
      `1. <b>USDT (TRC20) — يدوي</b>\n   الحد الأدنى: $${minDeposit}\n   ${wallet ? `العنوان: <code>${wallet}</code>` : `تواصل مع الدعم @${supportUsername}`}\n\n` +
      `2. <b>Binance Pay — آلي</b>\n   يُتحقق منه تلقائياً عبر المتجر الإلكتروني\n\n` +
      `${starsLine ? `${starsLine}\n\n` : ''}` +
      `${emojiHtml('shield')} بعد الإرسال، الصق رقم المعاملة (TxHash) هنا وسيُتحقق منه سريعاً.`;

  const buttons = Markup.inlineKeyboard([
    [{
      text: buttonLabel('rocket', lang === 'en' ? '🛍️ Open Store' : '🛍️ فتح المتجر'),
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

module.exports = { balanceHandler };
