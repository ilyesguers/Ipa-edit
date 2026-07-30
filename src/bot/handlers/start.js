const { buildBotInlineKeyboard, getUiSettings } = require('../../utils/uiConfig');
const Settings = require('../../models/Settings');
const User = require('../../models/User');
const logger = require('../../utils/logger');
const { Markup } = require('telegraf');
const { createCaptcha } = require('../../utils/captcha');
const { emojiHtml, buttonEmojiId } = require('../../utils/customEmoji');

const buildWelcomeMessage = async (user, lang = 'ar') => {
  const ui = await getUiSettings();
  const locale = lang === 'en' ? 'en' : 'ar';
  const name = user.firstName || (locale === 'en' ? 'Dear Customer' : 'عزيزي العميل');
  const welcome = ui.welcome[locale];
  const highlights = ui.highlights.slice(0, 3);
  const balance = Number(user.balance || 0).toFixed(2);
  const orders = Number(user.totalOrders || 0);
  const referrals = Number(user.referralCount || 0);
  const customMessage = (ui.welcomeMessage || '').trim();

  const highlightLines = highlights
    .map((item) => `${item.icon} ${locale === 'en' ? item.textEn : item.textAr}`)
    .join('\n');

  const statsLine = locale === 'en'
    ? `${emojiHtml('wallet')} <b>Balance</b>: $${balance} • ${emojiHtml('shopping')} <b>Orders</b>: ${orders} • ${emojiHtml('link')} <b>Referrals</b>: ${referrals}`
    : `${emojiHtml('wallet')} <b>الرصيد</b>: $${balance} • ${emojiHtml('shopping')} <b>الطلبات</b>: ${orders} • ${emojiHtml('link')} <b>الإحالات</b>: ${referrals}`;

  const footerLine = locale === 'en'
    ? `${emojiHtml('sparkle')} <i>${welcome.footer}</i>`
    : `${emojiHtml('sparkle')} <i>${welcome.footer}</i>`;

  return {
    ui,
    caption:
      `${emojiHtml('crown')} <b>${welcome.badge}</b>\n\n` +
      `${emojiHtml('profile')} <b>${locale === 'en' ? `Welcome ${name}` : `أهلاً ${name}`}</b>\n` +
      `${emojiHtml('tag')} <b>${ui.botName}</b>\n` +
      `${emojiHtml('sparkle')} ${welcome.title}\n` +
      `${welcome.subtitle}\n\n` +
      `${highlightLines}\n\n` +
      `${statsLine}\n\n` +
      `${customMessage ? `${emojiHtml('notification')} ${customMessage}\n\n` : ''}` +
      `${footerLine}`
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

    // ── CAPTCHA for new users ──
    const isBrandNew = (Date.now() - new Date(user.createdAt).getTime()) < 120000;
    if (!user.captchaPassed && isBrandNew) {
      const captcha = createCaptcha(user.telegramId);

      await ctx.reply(
        `${emojiHtml('shield')} <b>${lang === 'en' ? 'Verification Required' : 'تحقق أمني'}</b>\n\n` +
        `${lang === 'en'
          ? `${emojiHtml('bolt')} Please solve this simple math problem to verify you are human:`
          : `${emojiHtml('bolt')} حل المسألة الحسابية البسيطة للتحقق من أنك إنسان:`}\n\n` +
        `${emojiHtml('target')} <b>${captcha.question}</b> = ?\n\n` +
        `${lang === 'en'
          ? `${emojiHtml('sparkle')} Just type the number answer (e.g., 42)`
          : `${emojiHtml('sparkle')} اكتب الإجابة رقمياً فقط (مثال: 42)`}\n` +
        `${lang === 'en'
          ? `${emojiHtml('clock')} You have 3 attempts`
          : `${emojiHtml('clock')} لديك 3 محاولات`}`,
        { parse_mode: 'HTML' }
      );
      return;
    }

    // ── Handle referral with ref_ prefix ──
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
            `${emojiHtml('trophy')} ${lang === 'en' ? 'New User Referral!' : 'تمت إحالة مستخدم جديد!'}\n` +
            `${emojiHtml('coin')} +$${bonus} ${lang === 'en' ? 'Added to your balance' : 'أضيفت لرصيدك'}`
          ).catch(() => {});

          logger.info(`🔗 Referral: ${user.telegramId} referred by ${refId}`);
        }
      }
    }

    const { ui, caption } = await buildWelcomeMessage(user, lang);
    const inlineKeyboard = await mainKeyboard(lang, ctx.isAdmin);

    await ctx.replyWithPhoto(
      { url: `${process.env.BASE_URL}/public/banner.png` },
      {
        caption,
        parse_mode: 'HTML',
        ...inlineKeyboard
      }
    ).catch(async () => {
      await ctx.reply(caption, {
        parse_mode: 'HTML',
        ...inlineKeyboard
      });
    });

    // Single inline keyboard only - no duplicate reply keyboard
    const adminIds = (process.env.ADMIN_IDS || '').split(',').map(id => parseInt(id.trim())).filter(Boolean);
    const isNewUser = (Date.now() - new Date(user.createdAt).getTime()) < 60000;

    if (isNewUser) {
        for (const adminId of adminIds) {
          await ctx.telegram.sendMessage(
            adminId,
            `${emojiHtml('star')} <b>${lang === 'en' ? 'New User' : 'مستخدم جديد'}</b>\n\n` +
            `${emojiHtml('profile')} ${lang === 'en' ? 'Name' : 'الاسم'}: <b>${user.fullName}</b>\n` +
            `${emojiHtml('admin')} ID: <code>${user.telegramId}</code>\n` +
            `${user.username ? `${emojiHtml('chat')} ${lang === 'en' ? 'Username' : 'اليوزر'}: @${user.username}\n` : ''}` +
            `${user.referredBy ? `${emojiHtml('link')} ${lang === 'en' ? 'Referred by' : 'بإحالة من'}: <code>${user.referredBy}</code>\n` : ''}` +
            `${emojiHtml('calendar')} ${lang === 'en' ? 'Date' : 'التاريخ'}: ${new Date().toLocaleString('ar-SA')}`,
            {
              parse_mode: 'HTML',
              ...Markup.inlineKeyboard([
                [{
                  text: `${emojiHtml('admin')} ${lang === 'en' ? ui.adminPortalLabel.en : ui.adminPortalLabel.ar}`,
                  web_app: { url: `${process.env.BASE_URL}/admin#users?search=${user.telegramId}` },
                  style: 'primary',
                  icon_custom_emoji_id: buttonEmojiId('primary')
                }]
              ])
            }
          ).catch(() => {});
        }
    }

  } catch (err) {
    logger.error('Start handler error:', err);
    await ctx.reply(
      `${emojiHtml('sparkle')} أهلاً! حدث خطأ في التحميل، جرب /start مجدداً\n` +
      `${emojiHtml('sparkle')} Welcome! Loading error, try /start again`
    );
  }
};

module.exports = { startHandler, mainKeyboard, buildWelcomeMessage };
