const { Markup } = require('telegraf');
const Settings = require('../../models/Settings');
const User = require('../../models/User');

const mainKeyboard = (lang = 'ar') => {
  if (lang === 'en') {
    return Markup.inlineKeyboard([
      [Markup.button.callback('🛍️ Shop', 'shop'), Markup.button.callback('🔑 My Keys', 'mykeys')],
      [Markup.button.callback('📋 History', 'history'), Markup.button.callback('👤 Profile', 'profile')],
      [Markup.button.callback('💰 Add Balance', 'addbalance'), Markup.button.callback('🌐 Language', 'language')],
      [Markup.button.callback('❓ Help', 'help')],
      [Markup.button.webApp('📱 Open Shop', `${process.env.BASE_URL}/customer`)],
      [Markup.button.url('📲 Channel', `https://t.me/${process.env.CHANNEL_USERNAME || 'yourchannel'}`)],
    ]);
  }
  return Markup.inlineKeyboard([
    [Markup.button.callback('🛍️ تسوق', 'shop'), Markup.button.callback('🔑 مفاتيحي', 'mykeys')],
    [Markup.button.callback('📋 السجل', 'history'), Markup.button.callback('👤 حسابي', 'profile')],
    [Markup.button.callback('💰 شحن رصيد', 'addbalance'), Markup.button.callback('🌐 اللغة', 'language')],
    [Markup.button.callback('❓ المساعدة', 'help')],
    [Markup.button.webApp('📱 فتح المتجر', `${process.env.BASE_URL}/customer`)],
    [Markup.button.url('📲 القناة الرسمية', `https://t.me/${process.env.CHANNEL_USERNAME || 'yourchannel'}`)],
  ]);
};

const startHandler = async (ctx) => {
  try {
    const user = ctx.dbUser;
    const lang = user.preferredLanguage || 'ar';

    const welcomeTemplate = await Settings.get('welcome_message',
      '👋 أهلاً {name}!\n\n🛒 مرحباً بك في متجر مفاتيح الباندل الرقمية 🔑\n\nأفضل الأسعار على الإطلاق 🔥\n\n🔥 مخزون حي\n⚡ تسليم فوري'
    );

    const welcomeMsg = welcomeTemplate
      .replace('{name}', user.firstName || 'عزيزي العميل')
      .replace('{username}', user.username ? `@${user.username}` : '')
      .replace('{balance}', `$${user.balance.toFixed(2)}`);

    await ctx.replyWithPhoto(
      { url: `${process.env.BASE_URL}/public/banner.jpg` },
      {
        caption: welcomeMsg,
        parse_mode: 'HTML',
        ...mainKeyboard(lang)
      }
    ).catch(async () => {
      // If image fails, send text only
      await ctx.reply(welcomeMsg, {
        parse_mode: 'HTML',
        ...mainKeyboard(lang)
      });
    });

    // Update referral if applicable
    if (ctx.startPayload && ctx.startPayload !== '' && !user.referredBy) {
      const refId = parseInt(ctx.startPayload);
      if (refId && refId !== user.telegramId) {
        const referrer = await User.findOne({ telegramId: refId });
        if (referrer) {
          user.referredBy = refId;
          await user.save();
          referrer.referralCount += 1;
          const bonus = await Settings.get('referral_bonus', 0.5);
          if (bonus > 0) await referrer.addBalance(bonus, `مكافأة إحالة: ${user.firstName}`);
          await referrer.save();
          await ctx.telegram.sendMessage(refId, `🎉 تمت إحالة مستخدم جديد! +$${bonus} أضيفت لرصيدك`).catch(() => {});
        }
      }
    }

  } catch (err) {
    console.error('Start handler error:', err);
    await ctx.reply('👋 أهلاً! حدث خطأ في التحميل، جرب /start مجدداً');
  }
};

module.exports = { startHandler, mainKeyboard };
