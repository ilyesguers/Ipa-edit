const { Markup } = require('telegraf');
const Settings = require('../../models/Settings');
const { buttonEmojiId, buttonLabel, emojiHtml } = require('../../utils/customEmoji');
const { editOrReplyMenu } = require('../../utils/menuMessage');

const helpHandler = async (ctx) => {
  const user = ctx.dbUser;
  const lang = user?.preferredLanguage || 'ar';
  const supportUsername = await Settings.get('support_username', 'support');
  const botName = await Settings.get('bot_name', 'Digital Keys Store');
  const contactId = buttonEmojiId('chat');

  const msg = `${emojiHtml('support')} <b>${lang === 'en' ? 'Help & Support' : 'المساعدة والدعم'}</b>\n\n` +
    `<b>${botName}</b> — ${lang === 'en' ? 'Digital Keys Store' : 'متجر المفاتيح الرقمية'}\n\n` +
    `${emojiHtml('orders')} <b>${lang === 'en' ? 'FAQ:' : 'الأسئلة الشائعة:'}</b>\n\n` +
    `${emojiHtml('gamepad')} ${lang === 'en' ? 'How to buy?' : 'كيف أشتري؟'}\n` +
    `   → ${lang === 'en' ? 'Open Games, then choose device → game → product.' : 'افتح الألعاب، ثم اختر الجهاز ← اللعبة ← المنتج.'}\n\n` +
    `${emojiHtml('clock')} ${lang === 'en' ? 'How do I receive the key?' : 'كيف أتلقى المفتاح؟'}\n` +
    `   → ${lang === 'en' ? 'It is delivered instantly after payment.' : 'يتم التسليم فورياً بعد تأكيد الدفع.'} ${emojiHtml('checkmark')}\n\n` +
    `${emojiHtml('wallet')} ${lang === 'en' ? 'How do I top up?' : 'كيف أشحن؟'}\n` +
    `   → ${lang === 'en' ? 'Open Top Up Balance and follow the instructions.' : 'افتح شحن الرصيد واتبع التعليمات.'}\n\n` +
    `${emojiHtml('coin')} ${lang === 'en' ? 'Are prices in USD?' : 'هل الأسعار بالدولار؟'}\n` +
    `   → ${lang === 'en' ? 'Yes, prices are displayed in USD/USDT.' : 'نعم، الأسعار معروضة بالدولار وUSDT.'}\n\n` +
    `${emojiHtml('chat')} <b>${lang === 'en' ? 'Contact Support:' : 'تواصل مع الدعم:'}</b> @${supportUsername}\n` +
    `${emojiHtml('clock')} ${lang === 'en' ? 'Support is available 24/7.' : 'الدعم متاح على مدار الساعة.'}`;

  const buttons = Markup.inlineKeyboard([
    [{
      text: buttonLabel('chat', lang === 'en' ? 'Contact Support' : 'تواصل مع الدعم', { emojiId: contactId }),
      url: `https://t.me/${supportUsername}`,
      style: 'primary',
      ...(contactId ? { icon_custom_emoji_id: contactId } : {})
    }],
    [{
      text: buttonLabel('back', lang === 'en' ? 'Home' : 'الرئيسية'),
      callback_data: 'main_menu',
      style: 'danger',
      ...(buttonEmojiId('back') ? { icon_custom_emoji_id: buttonEmojiId('back') } : {})
    }]
  ]);

  return editOrReplyMenu(ctx, msg, { parse_mode: 'HTML', ...buttons });
};

module.exports = { helpHandler };
