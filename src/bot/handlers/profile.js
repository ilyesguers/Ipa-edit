const { Markup } = require('telegraf');
const Order = require('../../models/Order');
const Settings = require('../../models/Settings');
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

const { sendGamerError } = require('../../utils/gamerErrors');

const profileHandler = async (ctx) => {
  const user = ctx.dbUser;
  if (!user) {
    return sendGamerError(ctx, 'userNotFound');
  }
  const lang = getLang(ctx);
  const isEn = lang === 'en';

  const botUsername = (await ctx.telegram.getMe()).username;
  const referralLink = `https://t.me/${botUsername}?start=ref_${user.telegramId}`;

  const roleLabel = user.role === 'admin' || user.role === 'superadmin'
    ? t(lang, '👑 إدارة', '👑 Admin')
    : t(lang, '👤 عضو', '👤 Member');

  const completedOrders = await Order.countDocuments({ user: user.telegramId, status: 'completed' });
  const pendingOrders = await Order.countDocuments({ user: user.telegramId, status: { $in: ['pending', 'processing'] } });

  // Fetch channel and support info for quick-access buttons
  const [supportUsername, channelUsername] = await Promise.all([
    Settings.get('support_username', 'support'),
    Settings.get('channel_username', '')
  ]);

  // Build a professional profile message with clean dividers
  const msg = (
    `${emojiHtml('crown')} <b>${t(lang, 'ملفي الشخصي', 'My Profile')}</b>\n\n` +
    `┌─────────────────────┐\n` +
    `│ ${emojiHtml('rocket')} ${t(lang, 'الاسم', 'Name')}: <b>${user.fullName}</b>\n` +
    `│ ${emojiHtml('target')} ID: <code>${user.telegramId}</code>\n` +
    `│ ${emojiHtml('fire')} ${user.username ? `@${user.username}` : t(lang, 'بدون معرّف', 'No username')}\n` +
    `│ ${emojiHtml('crown')} ${t(lang, 'الرتبة', 'Role')}: ${roleLabel}\n` +
    `└─────────────────────┘\n\n` +
    `${emojiHtml('wallet')} <b>${t(lang, 'الرصيد', 'Balance')}: $${user.balance.toFixed(2)}</b>\n` +
    `${emojiHtml('trophy')} ${t(lang, 'الطلبات', 'Orders')}: <b>${user.totalOrders}</b>\n` +
    `${emojiHtml('gem')} ${t(lang, 'إجمالي المشتريات', 'Total spent')}: <b>$${user.totalSpent.toFixed(2)}</b>\n` +
    `${emojiHtml('shield')} ${t(lang, 'مكتملة', 'Completed')}: <b>${completedOrders}</b> · ${emojiHtml('bolt')} ${t(lang, 'قيد المعالجة', 'Pending')}: <b>${pendingOrders}</b>\n\n` +
    `━━━━━━━━━━━━━━━━━━━\n` +
    `${emojiHtml('sparkle')} <b>${t(lang, 'نظام الدعوات', 'Invite System')}</b>\n` +
    `${emojiHtml('rocket')} ${t(lang, 'دعواتك الناجحة', 'Successful invites')}: <b>${user.referralCount || 0}</b>\n` +
    `${emojiHtml('gift')} ${t(lang, 'شارك رابطك واحصل على مكافأة!', 'Share your link and earn rewards!')}`
  );

  const keyboardRows = [
    // Row 1: Main actions
    [btn('rocket', t(lang, '🛍️ فتح المتجر', '🛍️ Open Store'), null, 'primary', true, `${process.env.BASE_URL}/customer`)],
    // Row 2: Quick tools
    [
      btn('gem', t(lang, '🔑 مفاتيحي', '🔑 My Keys'), null, 'success', true, `${process.env.BASE_URL}/customer`),
      btn('trophy', t(lang, '📋 طلباتي', '📋 My Orders'), null, 'success', true, `${process.env.BASE_URL}/customer`)
    ],
  ];

  // Row 3: Channel + Support — always visible and professional
  const row3 = [];
  if (channelUsername) {
    row3.push(btn('megaphone', t(lang, '📢 القناة', '📢 Channel'), null, null, false, `https://t.me/${channelUsername}`));
  }
  if (supportUsername) {
    row3.push(btn('fire', t(lang, '💬 الدعم', '💬 Support'), null, null, false, `https://t.me/${supportUsername}`));
  }
  if (row3.length) keyboardRows.push(row3);

  // Row 4: Copy referral link
  keyboardRows.push([
    btn('link', t(lang, '🔗 نسخ رابط الدعوة', '🔗 Copy invite link'), null, 'secondary', false, referralLink)
  ]);

  // Row 5: Back to home
  keyboardRows.push([btn('ghost', t(lang, '🏠 الرئيسية', '🏠 Home'), 'main_menu', 'primary')]);

  const buttons = Markup.inlineKeyboard(keyboardRows);

  await editOrReplyMenu(ctx, msg, { parse_mode: 'HTML', ...buttons });
};

const showActivity = async (ctx) => {
  const user = ctx.dbUser;
  const lang = getLang(ctx);
  const isEn = lang === 'en';
  const recentOrders = await Order.find({ user: user.telegramId, status: 'completed' }).sort({ createdAt: -1 }).limit(5);

  let msg = (
    `${emojiHtml('fire')} <b>${t(lang, 'ملخص نشاطك', 'Your Activity Summary')}</b>\n\n` +
    `${emojiHtml('trophy')} ${t(lang, 'إجمالي الطلبات', 'Total orders')}: <b>${user.totalOrders}</b> · ${emojiHtml('wallet')} $${user.totalSpent.toFixed(2)}\n\n`
  );

  if (recentOrders.length) {
    msg += `${emojiHtml('rocket')} <b>${t(lang, 'آخر المشتريات', 'Latest purchases')}:</b>\n\n`;
    recentOrders.forEach((order, i) => {
      const date = order.createdAt.toLocaleDateString(isEn ? 'en-US' : 'ar-IQ-u-nu-latn');
      msg += `<b>${i + 1}.</b> ${emojiHtml('gem')} ${order.productName}\n`;
      msg += `   ${emojiHtml('tag')} ${order.durationName} · ${emojiHtml('wallet')} $${order.finalPrice.toFixed(2)} · ${emojiHtml('clock')} ${date}\n\n`;
    });
  } else {
    msg += `${emojiHtml('ghost')} ${t(lang, 'لا توجد مشتريات بعد — ابدأ من المتجر الإلكتروني.', 'No purchases yet — start from the web store.')}`;
  }

  await editOrReplyMenu(ctx, msg, {
    parse_mode: 'HTML',
    ...Markup.inlineKeyboard([
      [btn('rocket', t(lang, '🛍️ فتح المتجر', '🛍️ Open Store'), null, 'primary', true, `${process.env.BASE_URL}/customer`)],
      [btn('ghost', t(lang, '🏠 الرئيسية', '🏠 Home'), 'main_menu', 'primary')]
    ])
  });
};

module.exports = { profileHandler, showActivity };
