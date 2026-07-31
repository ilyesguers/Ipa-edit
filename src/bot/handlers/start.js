const { buildBotInlineKeyboard, getUiSettings } = require('../../utils/uiConfig');
const Settings = require('../../models/Settings');
const User = require('../../models/User');
const logger = require('../../utils/logger');
const { Markup } = require('telegraf');
const { createCaptcha } = require('../../utils/captcha');
const { emojiHtml, buttonEmojiId, buttonLabel } = require('../../utils/customEmoji');
const { removeRememberedMenu, rememberMenu } = require('../../utils/menuMessage');

const buildWelcomeMessage = async (user, lang = 'ar') => {
  const ui = await getUiSettings();
  const locale = lang === 'en' ? 'en' : 'ar';
  const name = user.firstName || (locale === 'en' ? 'Pro Gamer' : 'يا أسطورة');
  const welcome = ui.welcome[locale];
  const highlights = ui.highlights.slice(0, 4);
  const balance = Number(user.balance || 0).toFixed(2);
  const orders = Number(user.totalOrders || 0);
  const customMessage = (ui.welcomeMessage || '').trim();

  const highlightLines = highlights
    .map((item) => `${emojiHtml(item.emojiKey || 'rocket')} ${locale === 'en' ? item.textEn : item.textAr}`)
    .join('\n');

  if (locale === 'en') {
    return {
      ui,
      caption:
        `${emojiHtml('fire')} <b>${welcome.badge}</b>\n\n` +
        `${emojiHtml('crown')} <b>Yo ${name} 👑 Welcome to the LEGEND ZONE</b>\n` +
        `${emojiHtml('rocket')} <b>${ui.botName}</b> - ${welcome.title}\n` +
        `${welcome.subtitle}\n\n` +
        `${highlightLines}\n\n` +
        `${emojiHtml('wallet')} <b>Balance:</b> $${balance} • ${emojiHtml('trophy')} <b>Orders:</b> ${orders}\n\n` +
        `${customMessage ? `${emojiHtml('explosion')} ${customMessage}\n\n` : ''}` +
        `${emojiHtml('target')} <i>Hit PLAY NOW and level up! ${welcome.footer}</i>\n` +
        `${emojiHtml('fire')} <b>NO CAP - FASTEST DELIVERY IN GAME!</b>`
    };
  }

  return {
    ui,
    caption:
      `${emojiHtml('fire')} <b>${welcome.badge}</b>\n\n` +
      `${emojiHtml('crown')} <b>هلا والله ${name} 👑</b>\n` +
      `${emojiHtml('rocket')} <b>${ui.botName}</b>\n` +
      `${welcome.title}\n` +
      `${welcome.subtitle}\n\n` +
      `${highlightLines}\n\n` +
      `${emojiHtml('wallet')} <b>رصيدك:</b> $${balance} • ${emojiHtml('trophy')} <b>طلباتك:</b> ${orders}\n\n` +
      `${customMessage ? `${emojiHtml('explosion')} ${customMessage}\n\n` : ''}` +
      `${emojiHtml('target')} <i>اضغط PLAY NOW وابدأ اللعب فوراً! ${welcome.footer}</i>\n` +
      `${emojiHtml('fire')} <b>أسرع متجر للجيمرز - تسليم فوري مره نار 🔥</b>`
  };
};

const mainKeyboard = async (lang = 'ar', isAdmin = false) => {
  const ui = await getUiSettings();
  return buildBotInlineKeyboard({
    Markup,
    lang,
    isAdmin,
    quickLinks: ui.quickLinks,
    supportUsername: ui.supportUsername,
    channelUsername: ui.channelUsername,
    baseUrl: process.env.BASE_URL || '',
    adminPortalLabel: ui.adminPortalLabel
  });
};

const startHandler = async (ctx) => {
  try {
    const user = ctx.dbUser;
    const lang = user.preferredLanguage || 'ar';

    // CAPTCHA for new users
    const isBrandNew = (Date.now() - new Date(user.createdAt).getTime()) < 120000;
    if (!user.captchaPassed && isBrandNew) {
      const captcha = createCaptcha(user.telegramId);

      await ctx.reply(
        `${emojiHtml('shield')} <b>${lang === 'en' ? 'Anti-Bot Check 🛡️' : 'تحقق سريع - انت انسان؟ 🛡️'}</b>\n\n` +
        `${lang === 'en'
          ? `${emojiHtml('target')} Solve this quick math to enter the LEGEND ZONE:`
          : `${emojiHtml('target')} حل هذي المسألة السريعة عشان تدخل منطقة الأساطير:`}\n\n` +
        `${emojiHtml('explosion')} <b>${captcha.question}</b> = ?\n\n` +
        `${lang === 'en'
          ? `${emojiHtml('rocket')} Just type the number (e.g., 42)`
          : `${emojiHtml('rocket')} بس اكتب الرقم (مثال: 42)`}\n` +
        `${lang === 'en'
          ? `${emojiHtml('fire')} You have 3 tries - EZ!`
          : `${emojiHtml('fire')} عندك 3 محاولات - سهلة!`}`,
        { parse_mode: 'HTML' }
      );
      return;
    }

    // Handle referral
    if (ctx.startPayload && ctx.startPayload !== '' && !user.referredBy) {
      const payload = ctx.startPayload;
      let refId = null;

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

          await ctx.telegram.sendMessage(refId,
            `${emojiHtml('crown')} ${lang === 'en' ? 'New teammate joined! 🔥' : 'واحد جديد انضم عن طريقك! 🔥'}\n` +
            `${emojiHtml('gem')} +$${bonus} ${lang === 'en' ? 'Added - Keep grinding!' : 'انضافت لرصيدك - استمر!'}`
          ).catch(() => {});

          logger.info(`🔗 Referral: ${user.telegramId} referred by ${refId}`);
        }
      }
    }

    const { ui, caption } = await buildWelcomeMessage(user, lang);
    const inlineKeyboard = await mainKeyboard(lang, ctx.isAdmin);

    await removeRememberedMenu(ctx);
    let menuMessage;
    try {
      const bannerUrl = `${process.env.BASE_URL}/public/banner.png`;
      menuMessage = await ctx.replyWithPhoto(
        { url: bannerUrl },
        {
          caption,
          parse_mode: 'HTML',
          ...inlineKeyboard
        }
      );
    } catch (err) {
      logger.debug(`Banner failed, sending text: ${err.message}`);
      menuMessage = await ctx.reply(caption, {
        parse_mode: 'HTML',
        ...inlineKeyboard
      });
    }
    rememberMenu(ctx, menuMessage);

    // Admin notification for new users only
    const adminIds = (process.env.ADMIN_IDS || '').split(',').map(id => parseInt(id.trim())).filter(Boolean);
    const isNewUser = (Date.now() - new Date(user.createdAt).getTime()) < 60000;

    if (isNewUser) {
        for (const adminId of adminIds) {
          await ctx.telegram.sendMessage(
            adminId,
            `${emojiHtml('fire')} <b>${lang === 'en' ? 'New Gamer Joined 🔥' : 'جيمر جديد دخل 🔥'}</b>\n\n` +
            `${emojiHtml('crown')} ${user.fullName}\n` +
            `${emojiHtml('target')} ID: <code>${user.telegramId}</code>\n` +
            `${user.username ? `${emojiHtml('fire')} @${user.username}\n` : ''}` +
            `${user.referredBy ? `${emojiHtml('rocket')} Ref: <code>${user.referredBy}</code>\n` : ''}` +
            `${emojiHtml('bolt')} ${new Date().toLocaleString('ar-SA')}`,
            {
              parse_mode: 'HTML',
              ...Markup.inlineKeyboard([
                [{
                  text: buttonLabel('crown', lang === 'en' ? 'View User 👑' : 'شوف اليوزر 👑'),
                  web_app: { url: `${process.env.BASE_URL}/admin#users?search=${user.telegramId}` },
                  style: 'primary',
                  icon_custom_emoji_id: buttonEmojiId('crown')
                }]
              ])
            }
          ).catch(() => {});
        }
    }

  } catch (err) {
    logger.error('Start handler error:', err);
    await ctx.reply(
      `${emojiHtml('rocket')} أهلاً يا أسطورة! حدث خلل بسيط، ارسل /start 🚀\n` +
      `${emojiHtml('fire')} Yo legend! Small bug, send /start again 🔥`
    );
  }
};

module.exports = { startHandler, mainKeyboard, buildWelcomeMessage };
