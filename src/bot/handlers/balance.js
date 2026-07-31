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
  const wallet = await Settings.get('usdt_wallet_trc20', '');
  const minDeposit = await Settings.get('min_deposit', 1);

  const msg = lang === 'en'
    ? `${emojiHtml('wallet')} <b>TOP UP - BECOME LEGEND 💰🚀</b>\n\n` +
      `${emojiHtml('fire')} Current Balance: <b>$${user.balance.toFixed(2)}</b>\n\n` +
      `${emojiHtml('rocket')} <b>FAST TOP-UP METHODS:</b>\n\n` +
      `1. <b>USDT TRC20 Manual 🔥</b>\n   Min: $${minDeposit}\n   ${wallet ? `Addr: <code>${wallet}</code>` : 'Contact support @support'}\n\n` +
      `2. <b>Binance Pay - AUTO ⚡</b>\n   Fastest via web store\n\n` +
      `${emojiHtml('shield')} After sending, drop TxHash here - we verify rocket fast! 🚀`
    : `${emojiHtml('wallet')} <b>شحن الرصيد - صير أسطورة 💰🚀</b>\n\n` +
      `${emojiHtml('fire')} رصيدك الحالي: <b>$${user.balance.toFixed(2)}</b>\n\n` +
      `${emojiHtml('rocket')} <b>طرق الشحن السريع:</b>\n\n` +
      `1. <b>USDT TRC20 يدوي 🔥</b>\n   الحد الأدنى: $${minDeposit}\n   ${wallet ? `العنوان: <code>${wallet}</code>` : 'تواصل مع الدعم'}\n\n` +
      `2. <b>Binance Pay تلقائي ⚡</b>\n   الأسرع عبر المتجر\n\n` +
      `${emojiHtml('shield')} بعد الإرسال، ارسل TxHash هنا - نتحقق بسرعة الصاروخ! 🚀`;

  const buttons = Markup.inlineKeyboard([
    [{
      text: buttonLabel('rocket', lang === 'en' ? '🚀 OPEN STORE - TOP UP' : '🚀 افتح المتجر - اشحن'),
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
