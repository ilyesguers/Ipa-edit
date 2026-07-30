const { Markup } = require('telegraf');
const Order = require('../../models/Order');
const { buttonEmojiId, buttonLabel, emojiHtml } = require('../../utils/customEmoji');
const { editOrReplyMenu } = require('../../utils/menuMessage');

// ── Helper: get user language ──
const getLang = (ctx) => ctx.dbUser?.preferredLanguage || 'ar';
const t = (lang, ar, en) => lang === 'en' ? en : ar;

const btn = (emojiKey, text, data, style = null) => {
  const emojiId = buttonEmojiId(emojiKey) || (style && buttonEmojiId(style));
  return {
    text: buttonLabel(emojiKey, text, { emojiId }),
    callback_data: data,
    ...(style ? { style } : {}),
    ...(emojiId ? { icon_custom_emoji_id: emojiId } : {})
  };
};

const profileHandler = async (ctx) => {
  const user = ctx.dbUser;
  const lang = getLang(ctx);

  // ── Build referral link ──
  const botUsername = (await ctx.telegram.getMe()).username;
  const referralLink = `https://t.me/${botUsername}?start=ref_${user.telegramId}`;

  // ── Role label ──
  const roleLabel = user.role === 'admin' || user.role === 'superadmin'
    ? t(lang, 'مدير', 'Admin')
    : t(lang, 'عميل', 'Customer');

  // ── Activity stats ──
  const completedOrders = await Order.countDocuments({ user: user.telegramId, status: 'completed' });
  const pendingOrders = await Order.countDocuments({ user: user.telegramId, status: { $in: ['pending', 'processing'] } });
  const lastOrder = await Order.findOne({ user: user.telegramId }).sort({ createdAt: -1 }).select('createdAt');
  const lastActiveText = lastOrder
    ? lastOrder.createdAt.toLocaleDateString(lang === 'en' ? 'en-US' : 'ar-SA')
    : t(lang, 'لا يوجد', 'None');

  // ── Bilingual profile message with premium emojis ──
  const msg = (
    `${emojiHtml('profile')} <b>${t(lang, 'ملف المستخدم', 'User Profile')}</b>\n\n` +
    `${emojiHtml('tag')} ${t(lang, 'الاسم', 'Name')}: <b>${user.fullName}</b>\n` +
    `${emojiHtml('orders')} ${t(lang, 'المعرف', 'ID')}: <code>${user.telegramId}</code>\n` +
    `${emojiHtml('profile')} ${t(lang, 'اليوزر', 'Username')}: ${user.username ? `@${user.username}` : t(lang, 'غير محدد', 'Not set')}\n` +
    `${emojiHtml('mobile')} ${t(lang, 'الهاتف', 'Phone')}: ${user.phone || t(lang, 'غير محقق', 'Not verified')}\n` +
    `${emojiHtml('coin')} ${t(lang, 'العملة', 'Currency')}: <b>${user.currency}</b>\n` +
    `${emojiHtml('tag')} ${t(lang, 'الدور', 'Role')}: <b>${emojiHtml('admin')} ${roleLabel}</b>\n\n`
    `━━━━━━━━━━━━━━━━━━\n` +
    `${emojiHtml('wallet')} ${t(lang, 'الرصيد', 'Balance')}: <b>$${user.balance.toFixed(2)}</b>\n` +
    `${emojiHtml('shopping')} ${t(lang, 'إجمالي الطلبات', 'Total Orders')}: <b>${user.totalOrders}</b>\n` +
    `${emojiHtml('coin')} ${t(lang, 'إجمالي الإنفاق', 'Total Spent')}: <b>$${user.totalSpent.toFixed(2)}</b>\n` +
    `${emojiHtml('checkmark')} ${t(lang, 'طلبات مكتملة', 'Completed')}: <b>${completedOrders}</b> | ${emojiHtml('clock')} ${t(lang, 'قيد الانتظار', 'Pending')}: <b>${pendingOrders}</b>\n` +
    `${emojiHtml('calendar')} ${t(lang, 'تاريخ الانضمام', 'Joined')}: <b>${user.createdAt.toLocaleDateString(lang === 'en' ? 'en-US' : 'ar-SA')}</b>\n` +
    `${emojiHtml('clock')} ${t(lang, 'آخر نشاط', 'Last Active')}: <b>${lastActiveText}</b>\n\n`
    `━━━━━━━━━━━━━━━━━━\n` +
    `${emojiHtml('link')} ${t(lang, 'إحالاتك', 'Your Referrals')}: <b>${user.referralCount || 0}</b>\n` +
    `${user.referredBy ? `${emojiHtml('link')} ${t(lang, 'أُحلت بواسطة', 'Referred by')}: <code>${user.referredBy}</code>\n` : ''}` +
    `\n${emojiHtml('link')} ${t(lang, 'رابط الإحالة', 'Referral Link')}:\n<code>${referralLink}</code>`
  );

  const buttons = Markup.inlineKeyboard([
    [btn('target', t(lang, 'نشاطي', 'My Activity'), 'my_activity', 'primary')],
    [btn('key', t(lang, 'مفاتيحي', 'My Keys'), 'mykeys', 'success')],
    [btn('back', t(lang, 'الرئيسية', 'Home'), 'main_menu', 'danger')]
  ]);

  await editOrReplyMenu(ctx, msg, { parse_mode: 'HTML', ...buttons });
};

const showActivity = async (ctx) => {
  const user = ctx.dbUser;
  const lang = getLang(ctx);
  const recentOrders = await Order.find({ user: user.telegramId, status: 'completed' }).sort({ createdAt: -1 }).limit(5);

  let msg = (
    `${emojiHtml('target')} <b>${t(lang, 'نشاطي الأخير', 'My Recent Activity')}</b>\n\n` +
    `${emojiHtml('coin')} ${t(lang, 'إجمالي الإنفاق', 'Total Spent')}: <b>$${user.totalSpent.toFixed(2)}</b>\n` +
    `${emojiHtml('wallet')} ${t(lang, 'إجمالي الشحن', 'Total Deposited')}: <b>$${user.totalDeposited.toFixed(2)}</b>\n` +
    `${emojiHtml('shopping')} ${t(lang, 'عدد الطلبات', 'Total Orders')}: <b>${user.totalOrders}</b>\n` +
    `${emojiHtml('link')} ${t(lang, 'الإحالات', 'Referrals')}: <b>${user.referralCount || 0}</b>\n\n`
  );

  if (recentOrders.length) {
    msg += `${emojiHtml('orders')} <b>${t(lang, 'آخر الطلبات', 'Recent Orders')}:</b>\n`;
    recentOrders.forEach((order, i) => {
      const date = order.createdAt.toLocaleDateString(lang === 'en' ? 'en-US' : 'ar-SA');
      msg += `${i + 1}. ${emojiHtml('checkmark')} ${order.productName} (${order.durationName}) - $${order.finalPrice.toFixed(2)} ${emojiHtml('calendar')}${date}\n`;
    });
  } else {
    msg += `${emojiHtml('ghost')} ${t(lang, 'لا توجد طلبات بعد', 'No orders yet')}`;
  }

  await editOrReplyMenu(ctx, msg, {
    parse_mode: 'HTML',
    ...Markup.inlineKeyboard([[btn('back', t(lang, 'رجوع', 'Back'), 'profile', 'danger')]])
  });
};

module.exports = { profileHandler, showActivity };
