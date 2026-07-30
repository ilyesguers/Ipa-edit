const { Markup } = require('telegraf');
const { shopHandler, showGames, showProducts, showProduct } = require('./shop');
const { profileHandler, showActivity } = require('./profile');
const { keysHandler } = require('./keys');
const { historyHandler } = require('./history');
const { balanceHandler } = require('./balance');
const { helpHandler } = require('./help');
const { adminHandler, adminInventoryHandler, adminBroadcastHandler } = require('./admin');
const { mainKeyboard } = require('./start');
const Settings = require('../../models/Settings');
const User = require('../../models/User');
const orderService = require('../../services/orderService');

const callbackHandler = async (ctx) => {
  const data = ctx.callbackQuery.data;
  await ctx.answerCbQuery().catch(() => {});

  try {
    // Navigation
    if (data === 'main_menu') {
      const user = ctx.dbUser;
      const lang = user.preferredLanguage || 'ar';
      const welcomeTemplate = await Settings.get('welcome_message', '👋 أهلاً {name}!');
      const msg = welcomeTemplate.replace('{name}', user.firstName).replace('{balance}', `$${user.balance.toFixed(2)}`);
      return ctx.editMessageText(msg, { parse_mode: 'HTML', ...mainKeyboard(lang) }).catch(() => ctx.reply(msg, { parse_mode: 'HTML', ...mainKeyboard(lang) }));
    }

    // Shop navigation
    if (data === 'shop') return shopHandler(ctx);
    if (data.startsWith('cat_')) return showGames(ctx, data.replace('cat_', ''));
    if (data.startsWith('game_')) return showProducts(ctx, data.replace('game_', ''));
    if (data.startsWith('product_')) return showProduct(ctx, data.replace('product_', ''));

    // User actions
    if (data === 'profile') return profileHandler(ctx);
    if (data === 'my_activity') return showActivity(ctx);
    if (data === 'mykeys') return keysHandler(ctx);
    if (data === 'history') return historyHandler(ctx);
    if (data.startsWith('history_')) return historyHandler(ctx, parseInt(data.split('_')[1]));
    if (data === 'addbalance') return balanceHandler(ctx);
    if (data === 'help') return helpHandler(ctx);

    // Language toggle
    if (data === 'language') {
      const user = ctx.dbUser;
      const newLang = user.preferredLanguage === 'ar' ? 'en' : 'ar';
      user.preferredLanguage = newLang;
      await user.save();
      return ctx.editMessageText(
        newLang === 'ar' ? '✅ تم تغيير اللغة إلى العربية' : '✅ Language changed to English',
        Markup.inlineKeyboard([[Markup.button.callback('🔙 Back', 'main_menu')]])
      ).catch(console.error);
    }

    // Out of stock
    if (data.startsWith('oos_')) {
      return ctx.answerCbQuery(`❌ "${data.replace('oos_', '')}" غير متوفر حالياً`, { show_alert: true });
    }

    // Buy action
    if (data.startsWith('buy_')) {
      const parts = data.split('_');
      const productId = parts[1];
      const durationId = parts[2];
      return showCheckout(ctx, productId, durationId);
    }

    // Confirm wallet purchase
    if (data.startsWith('confirm_wallet_')) {
      const parts = data.split('_');
      const productId = parts[2];
      const durationId = parts[3];
      return confirmWalletPurchase(ctx, productId, durationId);
    }

    // Admin callbacks
    if (data === 'toggle_maintenance') {
      if (!ctx.isAdmin) return ctx.answerCbQuery('⛔ غير مصرح', { show_alert: true });
      const current = await Settings.get('maintenance_mode', false);
      await Settings.set('maintenance_mode', !current, ctx.from.id);
      await ctx.answerCbQuery(`✅ وضع الصيانة ${!current ? 'مفعّل' : 'معطّل'}`, { show_alert: true });
      return adminHandler(ctx);
    }

    if (data === 'admin_inventory') return adminInventoryHandler(ctx);
    if (data === 'admin_broadcast') return adminBroadcastHandler(ctx);

    if (data.startsWith('inv_product_')) {
      if (!ctx.isAdmin) return;
      const productId = data.replace('inv_product_', '');
      const Product = require('../../models/Product');
      const Key = require('../../models/Key');
      const product = await Product.findById(productId);
      if (!product) return;

      let msg = `📦 <b>${product.nameAr || product.name}</b>\n\n`;
      for (const dur of product.durations) {
        const count = await Key.countDocuments({ product: productId, durationId: dur._id, status: 'available' });
        const sold = await Key.countDocuments({ product: productId, durationId: dur._id, status: 'sold' });
        msg += `⏱ ${dur.nameAr || dur.name}: 🟢 ${count} متاح | 🔴 ${sold} مباع\n`;
      }

      return ctx.editMessageText(msg, {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([
          [Markup.button.webApp('➕ إضافة مفاتيح', `${process.env.BASE_URL}/admin`)],
          [Markup.button.callback('🔙 رجوع', 'admin_inventory')]
        ])
      }).catch(console.error);
    }

    // Binance deposit
    if (data === 'binance_deposit') {
      const msg = `💳 <b>شحن عبر بينانس</b>\n\n` +
        `يرجى استخدام المتجر الإلكتروني لإتمام الشحن عبر بينانس\n` +
        `أو تواصل مع الدعم`;
      return ctx.editMessageText(msg, {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([
          [Markup.button.webApp('📱 فتح المتجر', `${process.env.BASE_URL}/customer`)],
          [Markup.button.callback('🔙 رجوع', 'addbalance')]
        ])
      }).catch(console.error);
    }

  } catch (err) {
    console.error('Callback error:', err);
    await ctx.answerCbQuery('❌ حدث خطأ، يرجى المحاولة مجدداً', { show_alert: true }).catch(() => {});
  }
};

const showCheckout = async (ctx, productId, durationId) => {
  const Product = require('../../models/Product');
  const product = await Product.findById(productId);
  if (!product) return;

  const duration = product.durations.id(durationId);
  if (!duration) return;

  const user = ctx.dbUser;
  const hasBalance = user.balance >= duration.price;

  const msg = `💳 <b>إتمام الشراء</b>\n\n` +
    `📦 المنتج: <b>${product.nameAr || product.name}</b>\n` +
    `⏱ المدة: <b>${duration.nameAr || duration.name}</b>\n` +
    `💰 السعر: <b>$${duration.price.toFixed(2)}</b>\n\n` +
    `💳 رصيدك: <b>$${user.balance.toFixed(2)}</b>\n\n` +
    `اختر طريقة الدفع:`;

  const buttons = [
    hasBalance
      ? [Markup.button.callback(`✅ الدفع من المحفظة ($${user.balance.toFixed(2)})`, `confirm_wallet_${productId}_${durationId}`)]
      : [Markup.button.callback(`💳 المحفظة (رصيد غير كافٍ)`, `insufficient_balance`)],
    [Markup.button.webApp('💎 دفع بينانس', `${process.env.BASE_URL}/customer`)],
    [Markup.button.callback('🔙 رجوع', `product_${productId}`)]
  ];

  await ctx.editMessageText(msg, { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) }).catch(console.error);
};

const confirmWalletPurchase = async (ctx, productId, durationId) => {
  try {
    const { order, keys } = await orderService.createOrder({
      telegramId: ctx.from.id,
      productId,
      durationId,
      paymentMethod: 'wallet'
    });

    const result = await orderService.processWalletPayment(order._id);

    const keysText = result.keys.map(k => `<code>${k.keyValue}</code>`).join('\n');
    const msg = `✅ <b>تم الشراء بنجاح!</b>\n\n` +
      `📦 ${result.order.productName}\n` +
      `⏱ ${result.order.durationName}\n` +
      `💰 $${result.order.finalPrice.toFixed(2)}\n\n` +
      `🔑 <b>مفتاحك:</b>\n${keysText}\n\n` +
      `📋 رقم الطلب: <code>${result.order.orderNumber}</code>`;

    await ctx.editMessageText(msg, {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('🛍️ تسوق أكثر', 'shop')],
        [Markup.button.callback('🔙 الرئيسية', 'main_menu')]
      ])
    }).catch(console.error);

    // Notify admins
    const adminIds = (process.env.ADMIN_IDS || '').split(',').map(id => parseInt(id.trim())).filter(Boolean);
    const adminNotify = await Settings.get('admin_notification_on_order', true);
    if (adminNotify) {
      const user = ctx.dbUser;
      for (const adminId of adminIds) {
        await ctx.telegram.sendMessage(adminId,
          `🛒 <b>طلب جديد!</b>\n👤 ${user.fullName} (@${user.username || 'N/A'})\n📦 ${result.order.productName} - ${result.order.durationName}\n💰 $${result.order.finalPrice.toFixed(2)}`,
          { parse_mode: 'HTML' }
        ).catch(() => {});
      }
    }

  } catch (err) {
    console.error('Purchase error:', err);
    await ctx.editMessageText(`❌ <b>فشل الشراء</b>\n\n${err.message}`, {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard([[Markup.button.callback('🔙 رجوع', 'main_menu')]])
    }).catch(console.error);
  }
};

module.exports = { callbackHandler };
