const { Markup } = require('telegraf');
const Settings = require('../../models/Settings');
const { buttonEmojiId, buttonLabel, emojiHtml } = require('../../utils/customEmoji');
const { editOrReplyMenu } = require('../../utils/menuMessage');

const helpHandler = async (ctx) => {
  const user = ctx.dbUser;
  const lang = user?.preferredLanguage || 'ar';
  const supportUsername = await Settings.get('support_username', 'support');
  const botName = await Settings.get('bot_name', 'GAMER STORE');

  const msg = lang === 'en'
    ? `<b>${botName}</b>\n` +
      `${emojiHtml('rocket')} How to buy:\n` +
      `  1. Tap PLAY NOW\n` +
      `  2. Pick game → product → pay\n` +
      `  3. Get your key instantly\n\n` +
      `${emojiHtml('shield')} 100% legit • ${emojiHtml('bolt')} Instant delivery\n\n` +
      `${emojiHtml('chat')} Need help? <b>@${supportUsername}</b> — 24/7`
    : `<b>${botName}</b>\n` +
      `${emojiHtml('rocket')} طريقة الشراء:\n` +
      `  1. اضغط PLAY NOW\n` +
      `  2. اختر اللعبة → المنتج → ادفع\n` +
      `  3. استلم مفتاحك فوراً\n\n` +
      `${emojiHtml('shield')} مضمون 100% • ${emojiHtml('bolt')} تسليم فوري\n\n` +
      `${emojiHtml('chat')} تحتاج مساعدة؟ <b>@${supportUsername}</b> — 24/7`;

  const buttons = Markup.inlineKeyboard([
    [{
      text: buttonLabel('rocket', lang === 'en' ? 'PLAY NOW - STORE' : 'افتح المتجر - PLAY NOW'),
      web_app: { url: `${process.env.BASE_URL}/customer` },
      style: 'primary',
      icon_custom_emoji_id: buttonEmojiId('rocket')
    }],
    [{
      text: buttonLabel('fire', lang === 'en' ? 'Contact Support' : 'تواصل مع الدعم'),
      url: `https://t.me/${supportUsername}`,
      style: 'danger',
      icon_custom_emoji_id: buttonEmojiId('fire')
    }],
    [{
      text: buttonLabel('ghost', lang === 'en' ? 'Home' : 'الرئيسية'),
      callback_data: 'main_menu',
      style: 'primary',
      icon_custom_emoji_id: buttonEmojiId('ghost')
    }]
  ]);

  return editOrReplyMenu(ctx, msg, { parse_mode: 'HTML', ...buttons });
};

module.exports = { helpHandler };
