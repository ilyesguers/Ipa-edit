const { buildBotInlineKeyboard, getUiSettings } = require('../../utils/uiConfig');
const Settings = require('../../models/Settings');
const User = require('../../models/User');
const logger = require('../../utils/logger');
const { Markup } = require('telegraf');
const { emojiHtml, buttonEmojiId, buttonLabel } = require('../../utils/customEmoji');
const { removeRememberedMenu, rememberMenu } = require('../../utils/menuMessage');
const { sendGamerError } = require('../../utils/gamerErrors');

const buildWelcomeMessage = async (user, lang = 'ar') => {
  const ui = await getUiSettings();
  const locale = lang === 'en' ? 'en' : 'ar';
  const name = user.firstName || (locale === 'en' ? 'Pro Gamer' : 'يا أسطورة');
  const welcome = ui.welcome[locale];
  const highlights = ui.highlights.slice(0, 4);
  const balance = Number(user.balance || 0).toFixed(2);
  const orders = Number(user.totalOrders || 0);

  // The welcome_message setting supports {name}, {balance}, {orders} placeholders
  const customMessage = (ui.welcomeMessage || '').trim()
    .replace(/\{name\}/g, name)
    .replace(/\{balance\}/g, balance)
    .replace(/\{orders\}/g, orders);

  // Two strongest highlights only — short, scannable, no clutter.
  const highlightLines = highlights
    .slice(0, 2)
    .map((item) => `• ${locale === 'en' ? item.textEn : item.textAr}`)
    .join('\n');

  if (locale === 'en') {
    return {
      ui,
      caption:
        `${emojiHtml('rocket')} <b>${welcome.badge}</b>\n\n` +
        `Hey <b>${name}</b> 👋\n\n` +
        `${welcome.subtitle}\n\n` +
        `${highlightLines}\n\n` +
        `💰 <b>$${balance}</b> • 🏆 <b>${orders}</b> orders\n\n` +
        `${customMessage ? `${customMessage}\n\n` : ''}` +
        `<b>Ready? Hit PLAY NOW 👇</b>`
    };
  }

  return {
    ui,
    caption:
      `${emojiHtml('rocket')} <b>${welcome.badge}</b>\n\n` +
      `هلا <b>${name}</b> 👋\n\n` +
      `${welcome.subtitle}\n\n` +
      `${highlightLines}\n\n` +
      `💰 <b>$${balance}</b> • 🏆 <b>${orders}</b> طلب\n\n` +
      `${customMessage ? `${customMessage}\n\n` : ''}` +
      `<b>جاهز؟ اضغط PLAY NOW 👇</b>`
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
    if (!user) {
      logger.error('Start handler: ctx.dbUser is undefined - possible DB connection issue');
      return sendGamerError(ctx, 'dbError');
    }
    const lang = user.preferredLanguage || 'ar';

    // Open the main menu immediately: no challenge is placed before navigation.

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
            `${emojiHtml('crown')} ${lang === 'en' ? 'New teammate joined!' : 'واحد جديد انضم عن طريقك!'}\n` +
            `${emojiHtml('gem')} +$${bonus} ${lang === 'en' ? 'Added - Keep grinding!' : 'انضافت لرصيدك - استمر!'}`
          ).catch(() => {});

          logger.info(`Referral: ${user.telegramId} referred by ${refId}`);
        }
      }
    }

    const { ui, caption } = await buildWelcomeMessage(user, lang);
    const inlineKeyboard = await mainKeyboard(lang, ctx.isAdmin);

    await removeRememberedMenu(ctx);
    let menuMessage;
    try {
      // Custom banner image (set from the Media Manager) falls back to the
      // default public/banner.png so the welcome always has a hero image.
      const customBanner = await Settings.get('banner_image_url', '');
      const bannerUrl = customBanner && !/^https?:/i.test(customBanner)
        ? `${process.env.BASE_URL}${customBanner.startsWith('/') ? '' : '/'}${customBanner}`
        : (customBanner || `${process.env.BASE_URL}/public/banner.png`);
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
            `${emojiHtml('fire')} <b>${lang === 'en' ? 'New Gamer Joined' : 'جيمر جديد دخل'}</b>\n\n` +
            `${emojiHtml('crown')} ${user.fullName}\n` +
            `${emojiHtml('target')} ID: <code>${user.telegramId}</code>\n` +
            `${user.username ? `${emojiHtml('fire')} @${user.username}\n` : ''}` +
            `${user.referredBy ? `${emojiHtml('rocket')} Ref: <code>${user.referredBy}</code>\n` : ''}` +
            `${emojiHtml('bolt')} ${new Date().toLocaleString('ar-SA')}`,
            {
              parse_mode: 'HTML',
              ...Markup.inlineKeyboard([
                [{
                  text: buttonLabel('crown', lang === 'en' ? 'View User' : 'شوف اليوزر'),
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
    const { isDbError, notifyAdminsOfError } = require('../../utils/gamerErrors');
    const errorType = isDbError(err) ? 'dbError' : 'generic';
    notifyAdminsOfError(ctx, err, errorType);
    await sendGamerError(ctx, errorType);
  }
};

module.exports = { startHandler, mainKeyboard, buildWelcomeMessage };
