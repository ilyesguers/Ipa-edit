const { Markup } = require('telegraf');
const { shopHandler, showGames, showProducts, showProduct } = require('./shop');
const { profileHandler, showActivity } = require('./profile');
const { keysHandler } = require('./keys');
const { historyHandler } = require('./history');
const { balanceHandler } = require('./balance');
const { helpHandler } = require('./help');
const { openAdminPortal } = require('./admin');
const { mainKeyboard } = require('./start');
const Settings = require('../../models/Settings');
const orderService = require('../../services/orderService');
const logger = require('../../utils/logger');
const { buttonEmojiId, emojiHtml } = require('../../utils/customEmoji');

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
        t(lang,
          `${emojiHtml('skull')} \"${name}\" غير متوفر حالياً`,
          `${emojiHtml('skull')} \"${name}\" is currently unavailable`),
        { show_alert: true }
      );
    }

    // ── Insufficient balance ──
    if (data === 'insufficient_balance') {
      return ctx.answerCbQuery(
        t(lang,
          `${emojiHtml('wallet')} رصيدك غير كافٍ. قم بشحن رصيدك أولاً`,
          `${emojiHtml('wallet')} Insufficient balance. Please top up first`),
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
    await ctx.answerCbQuery(t(lang,
      `${emojiHtml('alert')} حدث خطأ، يرجى المحاولة مجدداً`,
      `${emojiHtml('alert')} Error occurred, please try again`),
      { show_alert: true }
    ).catch(() => {});
  }
};

// ═══════════════════════════════════════
// HANDLER FUNCTIONS
// ═══════════════════════════════════════

const handleMainMenu = async (ctx, lang) => {
  const { buildWelcomeMessage } = require('./start');
  const { caption } = await buildWelcomeMessage(ctx.dbUser, lang);
  const keyboard = await mainKeyboard(lang, ctx.isAdmin);
  return ctx.editMessageText(caption, {
    parse_mode: 'HTML',
    ...keyboard
  }).catch(() => ctx.reply(caption, { parse_mode: 'HTML', ...keyboard }));
};

const handleLanguage = async (ctx, lang) => {
  const user = ctx.dbUser;
  const newLang = user.preferredLanguage === 'ar' ? 'en' : 'ar';
  user.preferredLanguage = newLang;
  await user.save();

  const backBtn = [{
    text: newLang === 'ar' ? `${emojiHtml('back')} الرئيسية` : `${emojiHtml('back')} Home`,
    callback_data: 'main_menu',
    style: 'primary',
    icon_custom_emoji_id: buttonEmojiId('primary')
  }];

  await ctx.reply(
    newLang === 'ar'
      ? `${emojiHtml('checkmark')} تم تغيير اللغة إلى العربية`
      : `${emojiHtml('checkmark')} Language changed to English`,
    Markup.inlineKeyboard([backBtn])
  ).catch(() => {});
  return ctx.editMessageText(
    newLang === 'ar'
      ? `${emojiHtml('checkmark')} تم تغيير اللغة إلى العربية`
      : `${emojiHtml('checkmark')} Language changed to English`,
    Markup.inlineKeyboard([backBtn])
  ).catch(console.error);
};

const handleBinanceDeposit = async (ctx, lang) => {
  const msg = lang === 'en'
    ? `${emojiHtml('gem')} <b>Binance Deposit</b>\n\nPlease use the web shop to complete the deposit via Binance, or contact support.`
    : `${emojiHtml('gem')} <b>شحن عبر بينانس</b>\n\nيرجى استخدام المتجر الإلكتروني لإتمام الشحن عبر بينانس أو تواصل مع الدعم.`;

  return ctx.editMessageText(msg, {
    parse_mode: 'HTML',
    ...Markup.inlineKeyboard([
      [{
        text: lang === 'en' ? `${emojiHtml('mobile')} Open Shop` : `${emojiHtml('mobile')} فتح المتجر`,
        web_app: { url: `${process.env.BASE_URL}/customer` },
        style: 'primary',
        icon_custom_emoji_id: buttonEmojiId('primary')
      }],
      [{
        text: lang === 'en' ? `${emojiHtml('back')} Back` : `${emojiHtml('back')} رجوع`,
        callback_data: 'addbalance',
        style: 'danger',
        icon_custom_emoji_id: buttonEmojiId('danger')
      }]
    ])
  }).catch(console.error);
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
    `${emojiHtml('creditcard')} <b>${t(lang, 'إتمام الشراء', 'Complete Purchase')}</b>\n\n` +
    `${emojiHtml('key')} ${t(lang, 'المنتج', 'Product')}: <b>${prodName}</b>\n` +
    `${emojiHtml('clock')} ${t(lang, 'المدة', 'Duration')}: <b>${durName}</b>\n` +
    `${emojiHtml('coin')} ${t(lang, 'السعر', 'Price')}: <b>$${duration.price.toFixed(2)}</b>\n\n` +
    `${emojiHtml('wallet')} ${t(lang, 'رصيدك', 'Balance')}: <b>$${user.balance.toFixed(2)}</b>\n\n` +
    `${emojiHtml('bolt')} ${t(lang, 'اختر طريقة الدفع:', 'Choose payment method:')}`
  );

  const buttons = [
    hasBalance
      ? [{
        text: `${emojiHtml('checkmark')} ${t(lang, 'الدفع من المحفظة', 'Pay from wallet')} ($${user.balance.toFixed(2)})`,
        callback_data: `confirm_wallet_${productId}_${durationId}`,
        style: 'success',
        icon_custom_emoji_id: buttonEmojiId('success')
      }]
      : [{
        text: `${emojiHtml('skull')} ${t(lang, 'المحفظة (رصيد غير كافٍ)', 'Wallet (insufficient balance)')}`,
        callback_data: `insufficient_balance`,
        style: 'danger',
        icon_custom_emoji_id: buttonEmojiId('danger')
      }],
    [{
      text: `${emojiHtml('gem')} ${t(lang, 'دفع بينانس', 'Binance Pay')}`,
      web_app: { url: `${process.env.BASE_URL}/customer` },
      style: 'primary',
      icon_custom_emoji_id: buttonEmojiId('primary')
    }],
    [{
      text: `${emojiHtml('back')} ${t(lang, 'رجوع', 'Back')}`,
      callback_data: `product_${productId}`,
      style: 'danger',
      icon_custom_emoji_id: buttonEmojiId('danger')
    }]
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
      `${emojiHtml('trophy')} <b>${t(lang, 'تم الشراء بنجاح!', 'Purchase Successful!')}</b>\n\n` +
      `${emojiHtml('key')} ${result.order.productName}\n` +
      `${emojiHtml('clock')} ${result.order.durationName}\n` +
      `${emojiHtml('coin')} $${result.order.finalPrice.toFixed(2)}\n\n` +
      `${emojiHtml('diamond')} <b>${t(lang, 'مفتاحك', 'Your Key')}:</b>\n${keysText}\n\n` +
      `${emojiHtml('orders')} ${t(lang, 'رقم الطلب', 'Order #')}: <code>${result.order.orderNumber}</code>`
    );

    await ctx.editMessageText(msg, {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard([
        [{
          text: `${emojiHtml('shop')} ${t(lang, 'تسوق أكثر', 'Shop More')}`,
          callback_data: 'shop',
          style: 'primary',
          icon_custom_emoji_id: buttonEmojiId('primary')
        }],
        [{
          text: `${emojiHtml('crown')} ${t(lang, 'الرئيسية', 'Home')}`,
          callback_data: 'main_menu',
          style: 'success',
          icon_custom_emoji_id: buttonEmojiId('success')
        }]
      ])
    }).catch(console.error);

    // Notify admins
    const adminIds = (process.env.ADMIN_IDS || '').split(',').map(id => parseInt(id.trim())).filter(Boolean);
    const adminNotify = await Settings.get('admin_notification_on_order', true);
    if (adminNotify) {
      const user = ctx.dbUser;
      for (const adminId of adminIds) {
        await ctx.telegram.sendMessage(adminId,
          `${emojiHtml('shopping')} <b>${t(lang, 'طلب جديد', 'New Order')}!</b>\n` +
          `${emojiHtml('profile')} ${user.fullName} (@${user.username || 'N/A'})\n` +
          `${emojiHtml('key')} ${result.order.productName} - ${result.order.durationName}\n` +
          `${emojiHtml('coin')} $${result.order.finalPrice.toFixed(2)}\n\n` +
          `${t(lang, 'إدارة الطلب من خلال لوحة التحكم فقط.', 'Manage this order from the admin portal only.')}`,
          {
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard([
              [{
                text: `${emojiHtml('admin')} ${t(lang, 'فتح الطلب', 'Open Order')}`,
                web_app: { url: `${process.env.BASE_URL}/admin#orders?search=${encodeURIComponent(result.order.orderNumber)}` },
                style: 'primary',
                icon_custom_emoji_id: buttonEmojiId('primary')
              }]
            ])
          }
        ).catch(() => {});
      }
    }

  } catch (err) {
    logger.error('Purchase error:', err);
    await ctx.editMessageText(
      `${emojiHtml('skull')} <b>${t(lang, 'فشل الشراء', 'Purchase Failed')}</b>\n\n${err.message}`,
      {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([[{
          text: `${emojiHtml('back')} ${t(lang, 'رجوع', 'Back')}`,
          callback_data: 'main_menu',
          style: 'danger',
          icon_custom_emoji_id: buttonEmojiId('danger')
        }]])
      }
    ).catch(console.error);
  }
};

module.exports = { callbackHandler };
