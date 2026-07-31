const { Markup } = require('telegraf');
const Order = require('../../models/Order');
const { buttonEmojiId, buttonLabel, emojiHtml } = require('../../utils/customEmoji');
const { editOrReplyMenu } = require('../../utils/menuMessage');

const getLang = (ctx) => ctx.dbUser?.preferredLanguage || 'ar';
const t = (lang, ar, en) => lang === 'en' ? en : ar;

const btn = (emojiKey, text, data, style = null, isWebApp = false, url = null) => {
  const emojiId = buttonEmojiId(emojiKey);
  if (isWebApp) {
    return {
      text: buttonLabel(emojiKey, text, { emojiId }),
      web_app: { url },
      ...(style ? { style } : {}),
      ...(emojiId ? { icon_custom_emoji_id: emojiId } : {})
    };
  }
  return {
    text: buttonLabel(emojiKey, text, { emojiId }),
    ...(url ? { url } : { callback_data: data }),
    ...(style ? { style } : {}),
    ...(emojiId ? { icon_custom_emoji_id: emojiId } : {})
  };
};

const profileHandler = async (ctx) => {
  const user = ctx.dbUser;
  const lang = getLang(ctx);

  const botUsername = (await ctx.telegram.getMe()).username;
  const referralLink = `https://t.me/${botUsername}?start=ref_${user.telegramId}`;

  const roleLabel = user.role === 'admin' || user.role === 'superadmin'
    ? t(lang, 'أسطورة 👑', 'Legend 👑')
    : t(lang, 'جيمر 😎', 'Gamer 😎');

  const completedOrders = await Order.countDocuments({ user: user.telegramId, status: 'completed' });
  const pendingOrders = await Order.countDocuments({ user: user.telegramId, status: { $in: ['pending', 'processing'] } });

  const msg = (
    `${emojiHtml('crown')} <b>${t(lang, 'بروفايل الأسطورة', 'Legend Profile')} 👑</b>\n\n` +
    `${emojiHtml('rocket')} ${t(lang, 'الاسم', 'Name')}: <b>${user.fullName}</b> ${emojiHtml('fire')}\n` +
    `${emojiHtml('target')} ID: <code>${user.telegramId}</code>\n` +
    `${emojiHtml('fire')} ${user.username ? `@${user.username}` : t(lang, 'مو محدد', 'No username')} | ${emojiHtml('crown')} ${roleLabel}\n\n` +
    `━━━━━━━━━━━━━━━\n` +
    `${emojiHtml('wallet')} ${t(lang, 'الرصيد', 'Balance')}: <b>$${user.balance.toFixed(2)}</b> 💰\n` +
    `${emojiHtml('trophy')} ${t(lang, 'الطلبات', 'Orders')}: <b>${user.totalOrders}</b> ${emojiHtml('fire')}\n` +
    `${emojiHtml('gem')} ${t(lang, 'الصرف', 'Spent')}: <b>$${user.totalSpent.toFixed(2)}</b>\n` +
    `${emojiHtml('shield')} ${t(lang, 'مكتملة', 'Done')}: <b>${completedOrders}</b> | ${emojiHtml('bolt')} ${t(lang, 'معلقة', 'Pending')}: <b>${pendingOrders}</b>\n\n` +
    `━━━━━━━━━━━━━━━\n` +
    `${emojiHtml('rocket')} ${t(lang, 'الإحالات', 'Referrals')}: <b>${user.referralCount || 0}</b> ${emojiHtml('explosion')}\n` +
    `${emojiHtml('target')} ${t(lang, 'رابط الدعوة', 'Invite Link')}:\n<code>${referralLink}</code>\n\n` +
    `${emojiHtml('fire')} ${t(lang, 'ادع ربعك وخذ بونص - كل ما زادوا كل ما صرت أسطورة أكثر!', 'Invite friends & get bonus - more friends = more legend!')} 👑🚀`
  );

  const buttons = Markup.inlineKeyboard([
    [btn('rocket', t(lang, '🚀 افتح المتجر - PLAY NOW', '🚀 Open Store - PLAY NOW'), null, 'primary', true, `${process.env.BASE_URL}/customer`)],
    [btn('gem', t(lang, '🔑 مفاتيحي', '🔑 My Keys'), null, 'success', true, `${process.env.BASE_URL}/customer`)],
    [btn('ghost', t(lang, '⬅️ الرئيسية', '⬅️ Home'), 'main_menu', 'primary')]
  ]);

  await editOrReplyMenu(ctx, msg, { parse_mode: 'HTML', ...buttons });
};

const showActivity = async (ctx) => {
  const user = ctx.dbUser;
  const lang = getLang(ctx);
  const recentOrders = await Order.find({ user: user.telegramId, status: 'completed' }).sort({ createdAt: -1 }).limit(5);

  let msg = (
    `${emojiHtml('fire')} <b>${t(lang, 'نشاطك الأسطوري 🔥', 'Your Legendary Activity 🔥')}</b>\n\n` +
    `${emojiHtml('trophy')} ${t(lang, 'إجمالي الطلبات', 'Total Orders')}: <b>${user.totalOrders}</b> | ${emojiHtml('wallet')} $${user.totalSpent.toFixed(2)}\n` +
    `${emojiHtml('crown')} ${t(lang, 'المستوى', 'Level')}: <b>${user.totalOrders > 10 ? 'أسطورة 👑' : user.totalOrders > 5 ? 'محترف 🔥' : 'جيمر صاعد 🚀'}</b>\n\n`
  );

  if (recentOrders.length) {
    msg += `${emojiHtml('rocket')} <b>${t(lang, 'آخر مشترياتك', 'Last Purchases')}:</b>\n`;
    recentOrders.forEach((order, i) => {
      msg += `${i + 1}. ${emojiHtml('gem')} ${order.productName} - ${order.durationName} | $${order.finalPrice.toFixed(2)}\n`;
    });
  } else {
    msg += `${emojiHtml('ghost')} ${t(lang, 'لسا ما اشتريت؟ يلا ابدأ وكن أسطورة! 🚀', 'No purchases yet? Let\'s GO & become legend! 🚀')}`;
  }

  await editOrReplyMenu(ctx, msg, {
    parse_mode: 'HTML',
    ...Markup.inlineKeyboard([[btn('ghost', t(lang, '⬅️ رجوع', '⬅️ Back'), 'profile', 'primary')]])
  });
};

module.exports = { profileHandler, showActivity };
