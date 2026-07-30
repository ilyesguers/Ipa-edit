const { Markup } = require('telegraf');
const { shopHandler, showGames, showProducts, showProduct } = require('./shop');
const { profileHandler, showActivity } = require('./profile');
const { keysHandler } = require('./keys');
const { historyHandler } = require('./history');
const { balanceHandler } = require('./balance');
const { helpHandler } = require('./help');
const { openAdminPortal } = require('./admin');
const { mainKeyboard } = require('./start');
const { buildMainReplyKeyboard } = require('../../utils/uiConfig');
const Settings = require('../../models/Settings');
const orderService = require('../../services/orderService');
const logger = require('../../utils/logger');

// ── Helper: get user language ──
const getLang = (ctx) => ctx.dbUser?.preferredLanguage || 'ar';

// ── Helper: bilingual text ──
const t = (lang, ar, en) => lang === 'en' ? en : ar;

const callbackHandler = async (ctx) => {
  const data = ctx.callbackQuery.data;
  const lang = getLang(ctx);

  await ctx.answerCbQuery().catch(() => {});

  try {
    // ═══════════════════════════════════════
    // ROUTING TABLE
    // ═══════════════════════════════════════

    // ── Navigation ──
    if (data === 'main_menu') return handleMainMenu(ctx, lang);
    if (data === 'shop') return shopHandler(ctx);
    if (data === 'profile') return profileHandler(ctx);
    if (data === 'my_activity') return showActivity(ctx);
    if (data === 'mykeys') return keysHandler(ctx);
    if (data === 'history') return historyHandler(ctx);
    if (data === 'addbalance') return balanceHandler(ctx);
    if (data === 'help') return helpHandler(ctx);
    if (data === 'language') return handleLanguage(ctx, lang);
    if (data === 'binance_deposit') return handleBinanceDeposit(ctx, lang);

    // ── Shop navigation (prefix-based) ──
    if (data.startsWith('cat_')) return showGames(ctx, data.replace('cat_', ''));
    if (data.startsWith('game_')) return showProducts(ctx, data.replace('game_', ''));
    if (data.startsWith('product_')) return showProduct(ctx, data.replace('product_', ''));
    if (data.startsWith('history_')) return historyHandler(ctx, parseInt(data.split('_')[1]));

    // ── Out of stock ──
    if (data.startsWith('oos_')) {
      const name = data.replace('oos_', '');
      return ctx.answerCbQuery(
        t(lang, `❌ "${name}" غير متوفر حالياً`, `❌ "${name}" is currently unavailable`),
        { show_alert: true }
      );
    }

    // ── Insufficient balance ──
    if (data === 'insufficient_balance') {
      return ctx.answerCbQuery(
        t(lang, '💰 رصيدك غير كافٍ. قم بشحن رصيدك أولاً', '💰 Insufficient balance. Please top up first'),
        { show_alert: true }
      );
    }

    // ── Buy action ──
    if (data.startsWith('buy_')) {
      const parts = data.split('_');
      const productId = parts[1];
      const durationId = parts[2];
      return showCheckout(ctx, productId, durationId, lang);
    }

    // ── Confirm wallet purchase ──
    if (data.startsWith('confirm_wallet_')) {
      const parts = data.split('_');
      const productId = parts[2];
      const durationId = parts[3];
      return confirmWalletPurchase(ctx, productId, durationId, lang);
    }

    // ═══════════════════════════════════════
    // ADMIN ROUTES → MOVED TO WEB PORTAL
    // ═══════════════════════════════════════
    const isLegacyAdminRoute = data.startsWith('admin_') || data === 'toggle_maintenance' ||
      data.startsWith('inv_') || data.startsWith('verify_') || data.startsWith('reject_') || data.startsWith('broadcast_');

    if (isLegacyAdminRoute) {
      if (!ctx.isAdmin) {
        return ctx.answerCbQuery(t(lang, '⛔ غير مصرح', '⛔ Unauthorized'), { show_alert: true });
      }

      if (data === 'admin_orders' || data.startsWith('verify_') || data.startsWith('reject_')) {
        return openAdminPortal(ctx, 'orders');
      }
      if (data === 'admin_users') {
        return openAdminPortal(ctx, 'users');
      }
      if (data === 'admin_inventory' || data.startsWith('inv_')) {
        return openAdminPortal(ctx, 'inventory');
      }
      if (data === 'admin_broadcast' || data.startsWith('broadcast_')) {
        return openAdminPortal(ctx, 'broadcast');
      }
      if (data === 'admin_settings' || data === 'toggle_maintenance') {
        return openAdminPortal(ctx, 'settings');
      }
      return openAdminPortal(ctx, 'dashboard');
    }

  } catch (err) {
    logger.error('Callback error:', err);
    await ctx.answerCbQuery(t(lang, '❌ حدث خطأ، يرجى المحاولة مجدداً', '❌ Error occurred, please try again'), { show_alert: true }).catch(() => {});
  }
};

// ═══════════════════════════════════════
// HANDLER FUNCTIONS
// ═══════════════════════════════════════

const handleMainMenu = async (ctx, lang) => {
  const user = ctx.dbUser;
  const keyboard = await mainKeyboard(lang, ctx.isAdmin);
  const msg = (
    `👋 ${t(lang, `أهلاً ${user.firstName}!`, `Welcome ${user.firstName}!`)}\n\n` +
    `💰 ${t(lang, 'الرصيد', 'Balance')}: $${user.balance.toFixed(2)}\n` +
    `🛒 ${t(lang, 'اختر من القائمة:', 'Choose from menu:')}`
  );
  return ctx.editMessageText(msg, {
    parse_mode: 'HTML',
    ...keyboard
  }).catch(() => ctx.reply(msg, { parse_mode: 'HTML', ...keyboard }));
};

const handleLanguage = async (ctx, lang) => {
  const user = ctx.dbUser;
  const newLang = user.preferredLanguage === 'ar' ? 'en' : 'ar';
  user.preferredLanguage = newLang;
  await user.save();
  await ctx.reply(
    newLang === 'ar'
      ? '🎛️ تم تحديث الكيبورد الذكي إلى العربية'
      : '🎛️ Smart keyboard switched to English',
    buildMainReplyKeyboard(newLang, ctx.isAdmin)
  ).catch(() => {});
  return ctx.editMessageText(
    newLang === 'ar'
      ? '✅ تم تغيير اللغة إلى العربية\n✅ Language changed to Arabic'
      : '✅ Language changed to English\n✅ تم تغيير اللغة إلى الإنجليزية',
    Markup.inlineKeyboard([[Markup.button.callback('🔙 Back / رجوع', 'main_menu')]])
  ).catch(console.error);
};

const handleBinanceDeposit = async (ctx, lang) => {
  const msg = lang === 'en'
    ? `💳 <b>Binance Deposit</b>\n\nPlease use the web shop to complete the deposit via Binance, or contact support.`
    : `💳 <b>شحن عبر بينانس</b>\n\nيرجى استخدام المتجر الإلكتروني لإتمام الشحن عبر بينانس أو تواصل مع الدعم.`;

  return ctx.editMessageText(msg, {
    parse_mode: 'HTML',
    ...Markup.inlineKeyboard([
      [Markup.button.webApp(lang === 'en' ? '📱 Open Shop' : '📱 فتح المتجر', `${process.env.BASE_URL}/customer`)],
      [Markup.button.callback(lang === 'en' ? '🔙 Back' : '🔙 رجوع', 'addbalance')]
    ])
  }).catch(console.error);
};

const handleInventoryProduct = async (ctx, productId, lang) => {
  const Product = require('../../models/Product');
  const Key = require('../../models/Key');
  const product = await Product.findById(productId);
  if (!product) return;

  let msg = `📦 <b>${product.nameAr || product.name}</b>\n\n`;
  for (const dur of product.durations) {
    const count = await Key.countDocuments({ product: productId, durationId: dur._id, status: 'available' });
    const sold = await Key.countDocuments({ product: productId, durationId: dur._id, status: 'sold' });
    msg += `⏱ ${dur.nameAr || dur.name}: 🟢 ${count} ${lang === 'en' ? 'available' : 'متاح'} | 🔴 ${sold} ${lang === 'en' ? 'sold' : 'مباع'}\n`;
  }

  return ctx.editMessageText(msg, {
    parse_mode: 'HTML',
    ...Markup.inlineKeyboard([
      [Markup.button.webApp(lang === 'en' ? '➕ Add Keys' : '➕ إضافة مفاتيح', `${process.env.BASE_URL}/admin`)],
      [Markup.button.callback(lang === 'en' ? '🔙 Back' : '🔙 رجوع', 'admin_inventory')]
    ])
  }).catch(console.error);
};

const handleVerifyPayment = async (ctx, orderId, lang) => {
  try {
    const order = await Order.findById(orderId);
    if (!order) return ctx.answerCbQuery(t(lang, '❌ الطلب غير موجود', '❌ Order not found'), { show_alert: true });

    const result = await orderService.processWalletPayment(order._id);

    const keysText = result.keys?.map(k => `<code>${k.keyValue}</code>`).join('\n') || '';
    const msg = t(lang,
      `✅ <b>تم التأكيد والتسليم!</b>\n\n📋 الطلب: <code>${order.orderNumber}</code>\n🔑 المفاتيح:\n${keysText}`,
      `✅ <b>Confirmed & Delivered!</b>\n\n📋 Order: <code>${order.orderNumber}</code>\n🔑 Keys:\n${keysText}`
    );

    await ctx.editMessageText(msg, {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard([[Markup.button.callback('✅ تم', 'admin_back')]])
    }).catch(console.error);

  } catch (err) {
    logger.error('Verify payment error:', err);
    await ctx.editMessageText(`❌ ${err.message}`).catch(() => {});
  }
};

const handleRejectPayment = async (ctx, orderId, lang) => {
  try {
    const order = await Order.findById(orderId);
    if (!order) return ctx.answerCbQuery(t(lang, '❌ الطلب غير موجود', '❌ Order not found'), { show_alert: true });

    order.status = 'rejected';
    order.rejectReason = 'Rejected by admin';
    await order.save();

    // Refund balance if applicable
    if (order.paidAmount > 0) {
      const user = await User.findOne({ telegramId: order.user });
      if (user) {
        await user.addBalance(order.paidAmount, `استرداد طلب مرفوض: ${order.orderNumber}`);
        await user.save();
      }
    }

    // Notify user
    await ctx.telegram.sendMessage(order.user,
      t(lang,
        `❌ تم رفض إثبات الدفع\n📋 الطلب: ${order.orderNumber}\n💰 تم استرداد المبلغ لرصيدك`,
        `❌ Payment proof rejected\n📋 Order: ${order.orderNumber}\n💰 Amount refunded to your balance`)
    ).catch(() => {});

    await ctx.editMessageText(
      t(lang, `❌ <b>تم رفض الدفع</b>\n📋 ${order.orderNumber}`, `❌ <b>Payment Rejected</b>\n📋 ${order.orderNumber}`),
      { parse_mode: 'HTML' }
    ).catch(console.error);

  } catch (err) {
    logger.error('Reject payment error:', err);
    await ctx.editMessageText(`❌ ${err.message}`).catch(() => {});
  }
};

// ═══════════════════════════════════════
// CHECKOUT & PURCHASE
// ═══════════════════════════════════════

const showCheckout = async (ctx, productId, durationId, lang) => {
  const Product = require('../../models/Product');
  const product = await Product.findById(productId);
  if (!product) return;

  const duration = product.durations.id(durationId);
  if (!duration) return;

  const user = ctx.dbUser;
  const hasBalance = user.balance >= duration.price;
  const prodName = lang === 'en' ? (product.name || product.nameAr) : (product.nameAr || product.name);
  const durName = lang === 'en' ? (duration.name || duration.nameAr) : (duration.nameAr || duration.name);

  const msg = (
    `💳 <b>${t(lang, 'إتمام الشراء', 'Complete Purchase')}</b>\n\n` +
    `📦 ${t(lang, 'المنتج', 'Product')}: <b>${prodName}</b>\n` +
    `⏱ ${t(lang, 'المدة', 'Duration')}: <b>${durName}</b>\n` +
    `💰 ${t(lang, 'السعر', 'Price')}: <b>$${duration.price.toFixed(2)}</b>\n\n` +
    `💳 ${t(lang, 'رصيدك', 'Balance')}: <b>$${user.balance.toFixed(2)}</b>\n\n` +
    t(lang, 'اختر طريقة الدفع:', 'Choose payment method:')
  );

  const buttons = [
    hasBalance
      ? [Markup.button.callback(`✅ ${t(lang, 'الدفع من المحفظة', 'Pay from wallet')} ($${user.balance.toFixed(2)})`, `confirm_wallet_${productId}_${durationId}`)]
      : [Markup.button.callback(`💳 ${t(lang, 'المحفظة (رصيد غير كافٍ)', 'Wallet (insufficient balance)')}`, `insufficient_balance`)],
    [Markup.button.webApp('💎 ' + t(lang, 'دفع بينانس', 'Binance Pay'), `${process.env.BASE_URL}/customer`)],
    [Markup.button.callback(t(lang, '🔙 رجوع', '🔙 Back'), `product_${productId}`)]
  ];

  await ctx.editMessageText(msg, { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) }).catch(console.error);
};

const confirmWalletPurchase = async (ctx, productId, durationId, lang) => {
  try {
    const { order, keys } = await orderService.createOrder({
      telegramId: ctx.from.id,
      productId,
      durationId,
      paymentMethod: 'wallet'
    });

    const result = await orderService.processWalletPayment(order._id);

    const keysText = result.keys.map(k => `<code>${k.keyValue}</code>`).join('\n');
    const msg = (
      `✅ <b>${t(lang, 'تم الشراء بنجاح!', 'Purchase Successful!')}</b>\n\n` +
      `📦 ${result.order.productName}\n` +
      `⏱ ${result.order.durationName}\n` +
      `💰 $${result.order.finalPrice.toFixed(2)}\n\n` +
      `🔑 <b>${t(lang, 'مفتاحك', 'Your Key')}:</b>\n${keysText}\n\n` +
      `📋 ${t(lang, 'رقم الطلب', 'Order #')}: <code>${result.order.orderNumber}</code>`
    );

    await ctx.editMessageText(msg, {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard([
        [Markup.button.callback(t(lang, '🛍️ تسوق أكثر', '🛍️ Shop More'), 'shop')],
        [Markup.button.callback(t(lang, '🔙 الرئيسية', '🔙 Home'), 'main_menu')]
      ])
    }).catch(console.error);

    // Notify admins
    const adminIds = (process.env.ADMIN_IDS || '').split(',').map(id => parseInt(id.trim())).filter(Boolean);
    const adminNotify = await Settings.get('admin_notification_on_order', true);
    if (adminNotify) {
      const user = ctx.dbUser;
      for (const adminId of adminIds) {
        await ctx.telegram.sendMessage(adminId,
          `🛒 <b>${t(lang, 'طلب جديد', 'New Order')}!</b>\n` +
          `👤 ${user.fullName} (@${user.username || 'N/A'})\n` +
          `📦 ${result.order.productName} - ${result.order.durationName}\n` +
          `💰 $${result.order.finalPrice.toFixed(2)}\n\n` +
          `${t(lang, 'إدارة الطلب من خلال لوحة التحكم فقط.', 'Manage this order from the admin portal only.')}`,
          {
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard([
              [Markup.button.webApp(`👑 ${t(lang, 'فتح الطلب', 'Open Order')}`, `${process.env.BASE_URL}/admin#orders?search=${encodeURIComponent(result.order.orderNumber)}`)]
            ])
          }
        ).catch(() => {});
      }
    }

  } catch (err) {
    logger.error('Purchase error:', err);
    await ctx.editMessageText(
      `❌ <b>${t(lang, 'فشل الشراء', 'Purchase Failed')}</b>\n\n${err.message}`,
      {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([[Markup.button.callback(t(lang, '🔙 رجوع', '🔙 Back'), 'main_menu')]])
      }
    ).catch(console.error);
  }
};

module.exports = { callbackHandler };
