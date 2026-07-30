const { Markup } = require('telegraf');
const Order = require('../../models/Order');

// ── Helper: get user language ──
const getLang = (ctx) => ctx.dbUser?.preferredLanguage || 'ar';
const t = (lang, ar, en) => lang === 'en' ? en : ar;

const profileHandler = async (ctx) => {
  const user = ctx.dbUser;
  const lang = getLang(ctx);

  // ── Build referral link ──
  const botUsername = (await ctx.telegram.getMe()).username;
  const referralLink = `https://t.me/${botUsername}?start=ref_${user.telegramId}`;

  // ── Role label ──
  const roleLabel = user.role === 'admin' || user.role === 'superadmin'
    ? t(lang, '👑 مدير', '👑 Admin')
    : t(lang, '👤 عميل', '👤 Customer');

  // ── Activity stats ──
  const completedOrders = await Order.countDocuments({ user: user.telegramId, status: 'completed' });
  const pendingOrders = await Order.countDocuments({ user: user.telegramId, status: { $in: ['pending', 'processing'] } });
  const lastOrder = await Order.findOne({ user: user.telegramId }).sort({ createdAt: -1 }).select('createdAt');
  const lastActiveText = lastOrder
    ? lastOrder.createdAt.toLocaleDateString(lang === 'en' ? 'en-US' : 'ar-SA')
    : t(lang, 'لا يوجد', 'None');

  // ── Bilingual profile message ──
  const msg = (
    `👤 <b>${t(lang, 'ملف المستخدم', 'User Profile')}</b>\n\n` +
    `📛 ${t(lang, 'الاسم', 'Name')}: <b>${user.fullName}</b>\n` +
    `🆔 ${t(lang, 'المعرف', 'ID')}: <code>${user.telegramId}</code>\n` +
    `👤 ${t(lang, 'اليوزر', 'Username')}: ${user.username ? `@${user.username}` : t(lang, 'غير محدد', 'Not set')}\n` +
    `📱 ${t(lang, 'الهاتف', 'Phone')}: ${user.phone || t(lang, 'غير محقق', 'Not verified')}\n` +
    `💱 ${t(lang, 'العملة', 'Currency')}: <b>${user.currency}</b>\n` +
    `🏷️ ${t(lang, 'الدور', 'Role')}: <b>${roleLabel}</b>\n\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `💰 ${t(lang, 'الرصيد', 'Balance')}: <b>$${user.balance.toFixed(2)}</b>\n` +
    `🛒 ${t(lang, 'إجمالي الطلبات', 'Total Orders')}: <b>${user.totalOrders}</b>\n` +
    `💸 ${t(lang, 'إجمالي الإنفاق', 'Total Spent')}: <b>$${user.totalSpent.toFixed(2)}</b>\n` +
    `📊 ${t(lang, 'طلبات مكتملة', 'Completed')}: <b>${completedOrders}</b> | ⏳ ${t(lang, 'قيد الانتظار', 'Pending')}: <b>${pendingOrders}</b>\n` +
    `📅 ${t(lang, 'تاريخ الانضمام', 'Joined')}: <b>${user.createdAt.toLocaleDateString(lang === 'en' ? 'en-US' : 'ar-SA')}</b>\n` +
    `🕐 ${t(lang, 'آخر نشاط', 'Last Active')}: <b>${lastActiveText}</b>\n\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `🔗 ${t(lang, 'إحالاتك', 'Your Referrals')}: <b>${user.referralCount || 0}</b>\n` +
    `${user.referredBy ? `🔗 ${t(lang, 'أُحلت بواسطة', 'Referred by')}: <code>${user.referredBy}</code>\n` : ''}` +
    `\n📤 ${t(lang, 'رابط الإحالة', 'Referral Link')}:\n<code>${referralLink}</code>`
  );

  const buttons = Markup.inlineKeyboard([
    [Markup.button.callback(t(lang, '📊 نشاطي', '📊 My Activity'), 'my_activity')],
    [Markup.button.callback(t(lang, '🔑 مفاتيحي', '🔑 My Keys'), 'mykeys')],
    [Markup.button.callback(t(lang, '🔙 الرئيسية', '🔙 Home'), 'main_menu')]
  ]);

  await ctx.editMessageText?.(msg, { parse_mode: 'HTML', ...buttons })
    .catch(() => ctx.reply(msg, { parse_mode: 'HTML', ...buttons }));
};

const showActivity = async (ctx) => {
  const user = ctx.dbUser;
  const lang = getLang(ctx);
  const recentOrders = await Order.find({ user: user.telegramId, status: 'completed' }).sort({ createdAt: -1 }).limit(5);

  let msg = (
    `📊 <b>${t(lang, 'نشاطي الأخير', 'My Recent Activity')}</b>\n\n` +
    `💸 ${t(lang, 'إجمالي الإنفاق', 'Total Spent')}: <b>$${user.totalSpent.toFixed(2)}</b>\n` +
    `💰 ${t(lang, 'إجمالي الشحن', 'Total Deposited')}: <b>$${user.totalDeposited.toFixed(2)}</b>\n` +
    `🛒 ${t(lang, 'عدد الطلبات', 'Total Orders')}: <b>${user.totalOrders}</b>\n` +
    `🔗 ${t(lang, 'الإحالات', 'Referrals')}: <b>${user.referralCount || 0}</b>\n\n`
  );

  if (recentOrders.length) {
    msg += `📋 <b>${t(lang, 'آخر الطلبات', 'Recent Orders')}:</b>\n`;
    recentOrders.forEach((order, i) => {
      const date = order.createdAt.toLocaleDateString(lang === 'en' ? 'en-US' : 'ar-SA');
      msg += `${i + 1}. ✅ ${order.productName} (${order.durationName}) - $${order.finalPrice.toFixed(2)} 📅${date}\n`;
    });
  } else {
    msg += t(lang, '📭 لا توجد طلبات بعد', '📭 No orders yet');
  }

  await ctx.editMessageText(msg, {
    parse_mode: 'HTML',
    ...Markup.inlineKeyboard([[Markup.button.callback(t(lang, '🔙 رجوع', '🔙 Back'), 'profile')]])
  }).catch(console.error);
};

module.exports = { profileHandler, showActivity };
