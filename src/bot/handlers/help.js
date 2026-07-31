const { Markup } = require('telegraf');
const Settings = require('../../models/Settings');
const { buttonEmojiId, buttonLabel, emojiHtml } = require('../../utils/customEmoji');
const { editOrReplyMenu } = require('../../utils/menuMessage');

const helpHandler = async (ctx) => {
  const user = ctx.dbUser;
  const lang = user?.preferredLanguage || 'ar';
  const supportUsername = await Settings.get('support_username', 'support');
  const botName = await Settings.get('bot_name', 'GAMER STORE 🔥');

  const msg = lang === 'en'
    ? `${emojiHtml('fire')} <b>HELP - LEGEND ZONE 🔥</b>\n\n` +
      `<b>${botName}</b> — ${emojiHtml('rocket')} Fastest gamer store\n\n` +
      `${emojiHtml('rocket')} <b>HOW TO BECOME LEGEND?</b>\n` +
      `   → ${emojiHtml('target')} Hit PLAY NOW 🚀 Choose game → product → pay\n` +
      `   → ${emojiHtml('trophy')} Get key instantly! EZ WIN 🏆\n\n` +
      `${emojiHtml('crown')} <b>WHY WE ARE BEST?</b>\n` +
      `   → ${emojiHtml('fire')} Rocket speed delivery\n` +
      `   → ${emojiHtml('shield')} 100% legit & safe\n` +
      `   → ${emojiHtml('explosion')} Daily deals & giveaways\n\n` +
      `${emojiHtml('chat')} <b>NEED HELP?</b> @${supportUsername} - Fast AF ⚡\n` +
      `${emojiHtml('fire')} Support is 24/7 - We never sleep! 🎮`
    : `${emojiHtml('fire')} <b>المساعدة - منطقة الأساطير 🔥</b>\n\n` +
      `<b>${botName}</b> — ${emojiHtml('rocket')} أسرع متجر للجيمرز\n\n` +
      `${emojiHtml('rocket')} <b>كيف تصير أسطورة؟</b>\n` +
      `   → ${emojiHtml('target')} اضغط PLAY NOW 🚀 اختر اللعبة → المنتج → ادفع\n` +
      `   → ${emojiHtml('trophy')} استلم المفتاح فوري! EZ WIN 🏆\n\n` +
      `${emojiHtml('crown')} <b>ليش نحنا الأفضل؟</b>\n` +
      `   → ${emojiHtml('fire')} تسليم بسرعة الصاروخ\n` +
      `   → ${emojiHtml('shield')} مضمون 100% وآمن\n` +
      `   → ${emojiHtml('explosion')} عروض يومية وجوائز\n\n` +
      `${emojiHtml('chat')} <b>تحتاج مساعدة؟</b> @${supportUsername} - نرد بسرعة ⚡\n` +
      `${emojiHtml('fire')} الدعم 24/7 - ما ننام! 🎮`;

  const buttons = Markup.inlineKeyboard([
    [{
      text: buttonLabel('rocket', lang === 'en' ? '🚀 PLAY NOW - STORE' : '🚀 افتح المتجر - PLAY NOW'),
      web_app: { url: `${process.env.BASE_URL}/customer` },
      style: 'primary',
      icon_custom_emoji_id: buttonEmojiId('rocket')
    }],
    [{
      text: buttonLabel('fire', lang === 'en' ? '🔥 Contact Support' : '🔥 تواصل مع الدعم'),
      url: `https://t.me/${supportUsername}`,
      style: 'danger',
      icon_custom_emoji_id: buttonEmojiId('fire')
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

module.exports = { helpHandler };
