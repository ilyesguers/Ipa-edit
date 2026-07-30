const { Markup } = require('telegraf');
const Settings = require('../../models/Settings');
const User = require('../../models/User');
const logger = require('../../utils/logger');

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

// ── Build bilingual welcome message ──
const buildWelcomeMessage = (user) => {
  const name = user.firstName || (user.preferredLanguage === 'en' ? 'Dear Customer' : 'عزيزي العميل');
  return (
    `👋 أهلاً ${name}! / Welcome ${name}!\n\n` +
    `🛒 مرحباً بك في متجر مفاتيح الباندل الرقمية 🔑\n` +
    `🛒 Welcome to your Digital Bundle Keys Store 🔑\n\n` +
    `⚡ تسليم فوري / Instant Delivery\n` +
    `🔥 مخزون حي / Live Stock\n` +
    `💰 أفضل الأسعار / Best Prices\n\n` +
    `💳 رصيدك: $${user.balance.toFixed(2)} / Balance: $${user.balance.toFixed(2)}`
  );
};

const startHandler = async (ctx) => {
  try {
    const user = ctx.dbUser;
    const lang = user.preferredLanguage || 'ar';

    // ── Handle referral with ref_ prefix ──
    if (ctx.startPayload && ctx.startPayload !== '' && !user.referredBy) {
      const payload = ctx.startPayload;
      let refId = null;

      // Support both formats: ref_123456 and 123456
      if (payload.startsWith('ref_')) {
        refId = parseInt(payload.replace('ref_', ''));
      } else {
        refId = parseInt(payload);
      }

      if (refId && refId !== user.telegramId) {
        const referrer = await User.findOne({ telegramId: refId });
        if (referrer) {
          user.referredBy = refId;
          await user.save();
          referrer.referralCount += 1;
          const bonus = await Settings.get('referral_bonus', 0.5);
          if (bonus > 0) {
            await referrer.addBalance(bonus, `مكافأة إحالة: ${user.firstName}`);
          }
          await referrer.save();

          // Notify referrer
          await ctx.telegram.sendMessage(refId,
            `🎉 تمت إحالة مستخدم جديد! / New User Referral!\n` +
            `+$${bonus} أضيفت لرصيدك / Added to your balance`
          ).catch(() => {});

          logger.info(`🔗 Referral: ${user.telegramId} referred by ${refId}`);
        }
      }
    }

    // ── Build welcome message (bilingual) ──
    const welcomeMsg = buildWelcomeMessage(user);

    // ── Send with image fallback to text-only ──
    await ctx.replyWithPhoto(
      { url: `${process.env.BASE_URL}/public/banner.jpg` },
      {
        caption: welcomeMsg,
        parse_mode: 'HTML',
        ...mainKeyboard(lang)
      }
    ).catch(async () => {
      // Fallback: send text only if image fails
      await ctx.reply(welcomeMsg, {
        parse_mode: 'HTML',
        ...mainKeyboard(lang)
      });
    });

    // ── Notify admins about new user ──
    const adminIds = (process.env.ADMIN_IDS || '').split(',').map(id => parseInt(id.trim())).filter(Boolean);
    const isNewUser = (Date.now() - new Date(user.createdAt).getTime()) < 60000; // within last minute

    if (isNewUser) {
      for (const adminId of adminIds) {
        await ctx.telegram.sendMessage(adminId,
          `🆕 <b>مستخدم جديد / New User</b>\n\n` +
          `👤 الاسم / Name: <b>${user.fullName}</b>\n` +
          `🆔 المعرف / ID: <code>${user.telegramId}</code>\n` +
          `${user.username ? `👤 اليوزر / Username: @${user.username}` : ''}\n` +
          `${user.referredBy ? `🔗 بإحالة من / Referred by: <code>${user.referredBy}</code>` : ''}\n` +
          `📅 التاريخ / Date: ${new Date().toLocaleString('ar-SA')}`,
          { parse_mode: 'HTML' }
        ).catch(() => {});
      }
    }

  } catch (err) {
    logger.error('Start handler error:', err);
    await ctx.reply(
      '👋 أهلاً! حدث خطأ في التحميل، جرب /start مجدداً\n' +
      '👋 Welcome! Loading error, try /start again'
    );
  }
};

module.exports = { startHandler, mainKeyboard, buildWelcomeMessage };
