const express = require('express');
const router = express.Router();
const { authMiddleware, credentialOnly } = require('../../middlewares/auth');
const Order = require('../../models/Order');
const Coupon = require('../../models/Coupon');
const User = require('../../models/User');
const orderService = require('../../services/orderService');
const binanceService = require('../../services/binanceService');
const tronService = require('../../services/tronService');
const starsService = require('../../services/starsService');
const Settings = require('../../models/Settings');
const { getAdminPortalUrl } = require('../../utils/uiConfig');

router.use(authMiddleware, credentialOnly);

// Sensitive endpoints get their own small buckets on top of the global
// limiter: coupon brute-forcing and fake proof spam stay expensive even if
// the shop stays reachable for everyone else.
const rateLimit = require('express-rate-limit');
const couponLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, max: 25,
  standardHeaders: true, legacyHeaders: false,
  message: { success: false, error: 'محاولات كثيرة — جرّب بعد قليل / Too many attempts, try again soon' }
});
const proofLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, max: 20,
  standardHeaders: true, legacyHeaders: false,
  message: { success: false, error: 'محاولات كثيرة — جرّب بعد قليل / Too many attempts, try again soon' }
});

const clampPosInt = (v, def = 1, max = 100) => Math.min(Math.max(parseInt(v, 10) || def, 1), max);

// Push a real-time event to the connected admin panels (socket.io 'admin_room')
const notifyAdminPanel = (req, payload) => {
  try {
    const io = req.app.get('io');
    if (io) io.to('admin_room').emit('new_order', payload);
  } catch (_) { /* sockets are best-effort */ }
};

// Deliver the fulfilled keys to the customer via the bot and tell the admins.
// Shared by the automatic Binance (USDT) verification so a confirmed on-chain
// transfer behaves exactly like a wallet purchase: keys arrive instantly.
const deliverAndNotify = async (req, order, keys) => {
  const bot = req.app.get('bot');
  const adminIds = (process.env.ADMIN_IDS || '').split(',').map((id) => parseInt(id.trim(), 10)).filter(Boolean);
  const keysText = keys.map((k) => k.keyValue).join('\n');

  if (bot) {
    await bot.telegram.sendMessage(
      order.user,
      `✅ <b>تم تأكيد الدفع وتسليم طلبك</b>\n\n` +
      `📦 ${order.productName} — ${order.durationName}\n` +
      `🔑 <b>مفاتيحك:</b>\n${keysText}\n\n` +
      `🧾 رقم الطلب: <code>${order.orderNumber}</code>`,
      { parse_mode: 'HTML' }
    ).catch(() => {});

    for (const adminId of adminIds) {
      await bot.telegram.sendMessage(
        adminId,
        `💳 تم التحقق التلقائي من دفعة USDT (TRC20)\n` +
        `👤 ${order.username || order.user}\n` +
        `📦 ${order.productName} — ${order.durationName}\n` +
        `💰 $${order.finalPrice.toFixed(2)}\n` +
        `🔗 TxHash: <code>${order.paymentTxHash}</code>`,
        { parse_mode: 'HTML' }
      ).catch(() => {});
    }
  }

  notifyAdminPanel(req, {
    type: 'payment_auto_verified',
    orderNumber: order.orderNumber,
    productName: order.productName,
    durationName: order.durationName,
    amount: order.finalPrice,
    txHash: order.paymentTxHash,
    username: order.username,
    telegramId: order.user,
    createdAt: new Date().toISOString()
  });
};

// Build a one-click PayPal link. Accepts a full URL, a PayPal.Me username, or a
// plain email — the simplest possible setup for the store owner.
const buildPaypalLink = (raw, amount) => {
  if (!raw) return '';
  const value = String(raw).trim();
  const money = Number(amount).toFixed(2);
  if (/^https?:\/\//i.test(value)) {
    // PayPal.Me links accept /<amount> appended.
    if (/paypal\.me/i.test(value) && !/\/\d/.test(value)) {
      return `${value.replace(/\/$/, '')}/${money}`;
    }
    return value;
  }
  if (value.includes('@')) {
    return `https://www.paypal.com/cgi-bin/webscr?cmd=_donations&business=${encodeURIComponent(value)}&amount=${money}&currency_code=USD&no_note=1`;
  }
  return `https://www.paypal.com/paypalme/${value.replace(/^@/, '')}/${money}`;
};

// Get user orders
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    const page = clampPosInt(req.query.page, 1, 1000);
    const limit = clampPosInt(req.query.limit, 10, 30);
    const query = { user: req.telegramId };
    if (status) query.status = status;

    const [orders, total] = await Promise.all([
      Order.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      Order.countDocuments(query)
    ]);
    res.json({ success: true, data: orders, total, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Validate coupon
router.post('/validate-coupon', couponLimiter, async (req, res) => {
  try {
    const { code, amount } = req.body;
    if (!code || typeof code !== 'string' || !code.trim()) {
      return res.status(400).json({ success: false, error: 'أدخل كود الخصم / Enter a coupon code' });
    }
    if (amount === undefined || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return res.status(400).json({ success: false, error: 'مبلغ غير صالح / Invalid amount' });
    }
    const normalizedCode = code.trim().toUpperCase().slice(0, 40);
    if (!/^[A-Z0-9_-]{2,40}$/.test(normalizedCode)) {
      return res.status(400).json({ success: false, error: 'أدخل كود الخصم / Enter a coupon code' });
    }
    const coupon = await Coupon.findOne({ code: normalizedCode });
    if (!coupon) return res.status(404).json({ success: false, error: 'الكود غير موجود' });

    const validity = coupon.isValid(parseFloat(amount));
    if (!validity.valid) return res.status(400).json({ success: false, error: validity.reason });

    // Check if already used by this user
    const alreadyUsed = coupon.usedBy.some(u => u.userId === req.telegramId);
    if (alreadyUsed) return res.status(400).json({ success: false, error: 'لقد استخدمت هذا الكوبون مسبقاً' });

    const discount = coupon.calculateDiscount(parseFloat(amount));
    res.json({
      success: true,
      data: {
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        discountAmount: discount,
        finalAmount: Math.max(0, parseFloat(amount) - discount)
      }
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Create wallet order
router.post('/wallet', async (req, res) => {
  try {
    const { productId, durationId, quantity: rawQty = 1, couponCode } = req.body;
    const quantity = clampPosInt(rawQty, 1, 99);
    const { order } = await orderService.createOrder({
      telegramId: req.telegramId,
      productId, durationId, quantity, paymentMethod: 'wallet', couponCode
    });

    const result = await orderService.processWalletPayment(order._id);

    // Notify admins
    const adminIds = (process.env.ADMIN_IDS || '').split(',').map(id => parseInt(id.trim())).filter(Boolean);
    const bot = req.app.get('bot');
    if (bot) {
      for (const adminId of adminIds) {
        await bot.telegram.sendMessage(adminId,
          `🛒 طلب جديد من ${req.user.fullName}\n📦 ${result.order.productName}\n💰 $${result.order.finalPrice.toFixed(2)}\n\n👑 افتح الطلب من لوحة التحكم لإدارته بالكامل.`,
          {
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [[
                { text: '👑 فتح الطلب', web_app: { url: getAdminPortalUrl('orders', { search: result.order.orderNumber }) } }
              ]]
            }
          }
        ).catch(() => {});
      }

      // Send key to user via bot too
      const keysText = result.keys.map(k => `<code>${k.keyValue}</code>`).join('\n');
      await bot.telegram.sendMessage(req.telegramId,
        `✅ <b>تم إتمام الشراء بنجاح</b>\n\n` +
        `📦 ${result.order.productName} — ${result.order.durationName}\n\n` +
        `🔑 <b>مفاتيحك:</b>\n${keysText}\n\n` +
        `🧾 رقم الطلب: <code>${result.order.orderNumber}</code>\n` +
        `تجد نسخة دائمة منها داخل المتجر في قسم «مفاتيحي».`,
        { parse_mode: 'HTML' }
      ).catch(() => {});
    }

    notifyAdminPanel(req, {
      type: 'wallet_order',
      orderNumber: result.order.orderNumber,
      productName: result.order.productName,
      durationName: result.order.durationName,
      amount: result.order.finalPrice,
      username: req.user.username || req.user.fullName,
      telegramId: req.telegramId,
      createdAt: new Date().toISOString()
    });

    // Return the fresh balance so the mini-app header updates instantly
    res.json({
      success: true,
      data: {
        order: result.order,
        keys: result.keys.map(k => k.keyValue),
        balance: req.user.balance
      }
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Create Binance Pay order.
// If the store owner configured full Binance Pay API credentials, this opens a
// real hosted checkout. Otherwise (the common case — only a TRC20 wallet +
// Binance ID are filled in) it creates a manual USDT order and returns the
// wallet details so the mini app can show the address/QR and verify the
// on-chain transfer automatically once the customer pays.
router.post('/binance', async (req, res) => {
  try {
    const { productId, durationId, quantity: rawQty = 1, couponCode } = req.body;
    const quantity = clampPosInt(rawQty, 1, 99);
    const { order, finalPrice } = await orderService.createOrder({
      telegramId: req.telegramId,
      productId, durationId, quantity, paymentMethod: 'binance', couponCode
    });

    const { apiKey, secretKey, merchantId, wallet } = await binanceService.getCredentials();
    const minDeposit = await Settings.get('min_deposit', 1);
    const paymentTimeoutMinutes = await Settings.get('payment_timeout_minutes', 15);
    order.paymentAmount = finalPrice;

    // Real Binance Pay hosted checkout when full API credentials exist.
    if (apiKey && secretKey) {
      try {
        const binanceOrder = await binanceService.createPayOrder(
          finalPrice,
          'USDT',
          order.orderNumber,
          `${order.productName} - ${order.durationName}`
        );
        order.binancePayId = binanceOrder.prepayId;
        await order.save();
        notifyAdminPanel(req, {
          type: 'binance_order',
          orderNumber: order.orderNumber,
          productName: order.productName,
          durationName: order.durationName,
          amount: finalPrice,
          username: req.user.username || req.user.fullName,
          telegramId: req.telegramId,
          createdAt: new Date().toISOString()
        });
        return res.json({
          success: true,
          data: {
            mode: 'hosted',
            orderId: order._id,
            orderNumber: order.orderNumber,
            amount: finalPrice,
            binancePrepayId: binanceOrder.prepayId,
            checkoutUrl: binanceOrder.checkoutUrl,
            qrCodeUrl: binanceOrder.qrcodeLink,
            universalUrl: binanceOrder.universalUrl,
            paymentTimeoutMinutes
          }
        });
      } catch (e) {
        logger.warn('[orders] Binance hosted checkout failed, using manual USDT:', e.message);
      }
    }

    // Manual USDT (TRC20) — the default for wallets without Binance Pay API.
    await order.save();
    notifyAdminPanel(req, {
      type: 'binance_order',
      orderNumber: order.orderNumber,
      productName: order.productName,
      durationName: order.durationName,
      amount: finalPrice,
      username: req.user.username || req.user.fullName,
      telegramId: req.telegramId,
      createdAt: new Date().toISOString()
    });

    res.json({
      success: true,
      data: {
        mode: 'manual',
        orderId: order._id,
        orderNumber: order.orderNumber,
        amount: finalPrice,
        paymentAmount: finalPrice,
        wallet,
        binanceId: merchantId,
        network: 'TRC20',
        currency: 'USDT',
        minDeposit,
        paymentTimeoutMinutes
      }
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Create a PayPal order (simple mode: owner pastes an email / PayPal.Me link).
router.post('/paypal', async (req, res) => {
  try {
    const { productId, durationId, quantity: rawQty = 1, couponCode } = req.body;
    const quantity = clampPosInt(rawQty, 1, 99);
    const { order, finalPrice } = await orderService.createOrder({
      telegramId: req.telegramId,
      productId, durationId, quantity, paymentMethod: 'paypal', couponCode
    });

    order.paymentAmount = finalPrice;
    await order.save();

    const paypalEmail = await Settings.get('paypal_email', '');
    const paypalLink = await Settings.get('paypal_link', '');
    const paymentTimeoutMinutes = await Settings.get('payment_timeout_minutes', 15);

    notifyAdminPanel(req, {
      type: 'paypal_order',
      orderNumber: order.orderNumber,
      productName: order.productName,
      durationName: order.durationName,
      amount: finalPrice,
      username: req.user.username || req.user.fullName,
      telegramId: req.telegramId,
      createdAt: new Date().toISOString()
    });

    res.json({
      success: true,
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        amount: finalPrice,
        paymentAmount: finalPrice,
        paypalEmail,
        paypalLink: buildPaypalLink(paypalLink || paypalEmail, finalPrice),
        paymentTimeoutMinutes
      }
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Verify a Binance / USDT (TRC20) payment.
//  - With a `txId`: checks that exact transfer on-chain (immediate proof).
//  - Without a `txId`: auto-detects an incoming transfer matching this order's
//    amount inside the payment window.
// When a real transfer is found the order is fulfilled and the keys are
// delivered instantly — no admin in the loop.
router.post('/binance/verify', async (req, res) => {
  try {
    const { orderId, txId } = req.body;
    if (!/^[a-f\d]{24}$/i.test(String(orderId || ''))) {
      return res.status(400).json({ success: false, error: 'Order not found' });
    }
    const order = await Order.findOne({ _id: orderId, user: req.telegramId });
    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });
    if (order.status === 'completed') {
      return res.json({ success: true, completed: true, already: true, data: { order, keys: order.keyValues } });
    }
    if (!['pending', 'processing'].includes(order.status)) {
      return res.status(400).json({ success: false, error: `Order is ${order.status}` });
    }

    const wallet = await Settings.get('usdt_wallet_trc20', '');
    const timeoutMinutes = await Settings.get('payment_timeout_minutes', 15);
    const result = await tronService.verifyTransfer({
      wallet,
      expectedAmount: order.finalPrice,
      paymentAmount: order.paymentAmount,
      orderId: order.orderNumber,
      txId: txId ? String(txId).trim() : undefined,
      timeoutMinutes
    });

    if (!result.verified) {
      // Still record the pasted TxID so the admin can verify it manually.
      if (txId) {
        order.paymentTxHash = String(txId).trim().slice(0, 128);
        order.status = 'processing';
        await order.save();
        notifyAdminPanel(req, {
          type: 'payment_proof',
          orderNumber: order.orderNumber,
          productName: order.productName,
          durationName: order.durationName,
          amount: order.finalPrice,
          txHash: txId,
          username: req.user.username || req.user.fullName,
          telegramId: req.telegramId,
          createdAt: new Date().toISOString()
        });
      }
      return res.json({ success: true, completed: false, verified: false, reason: result.reason });
    }

    // Guard against one transfer fulfilling two orders.
    const alreadyUsed = await Order.findOne({
      paymentTxHash: result.txId,
      status: 'completed',
      _id: { $ne: order._id }
    });
    if (alreadyUsed) {
      return res.json({ success: true, completed: false, verified: false, reason: 'already_used' });
    }

    order.paymentTxHash = result.txId;
    order.paymentVerifiedAt = new Date();
    const user = await User.findOne({ telegramId: order.user });
    const { keys } = await orderService.fulfillOrder(order, user);
    await deliverAndNotify(req, order, keys);

    res.json({
      success: true,
      completed: true,
      verified: true,
      data: { order, keys: keys.map((k) => k.keyValue) }
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Create a Telegram Stars order and return the XTR invoice link.
// The mini app hands the link to Telegram.WebApp.openInvoice(); delivery
// happens in the bot's successful_payment handler the moment Telegram
// confirms the payment.
router.post('/stars', async (req, res) => {
  try {
    const config = await starsService.getStarsConfig();
    if (!config.enabled) {
      return res.status(403).json({ success: false, error: 'الدفع بالنجوم متوقف حالياً / Stars payments are currently disabled' });
    }

    const { productId, durationId, quantity: rawQty = 1, couponCode } = req.body;
    const quantity = clampPosInt(rawQty, 1, 99);
    const { order, finalPrice } = await orderService.createOrder({
      telegramId: req.telegramId,
      productId, durationId, quantity, paymentMethod: 'telegram_stars', couponCode
    });

    const starsAmount = starsService.usdToStars(finalPrice, config.perUsd);
    order.starsAmount = starsAmount;
    await order.save();

    let invoiceUrl;
    try {
      ({ invoiceUrl } = await starsService.createInvoiceLink(order, starsAmount));
    } catch (invoiceErr) {
      // Never leave a dangling pending order when the invoice could not be created.
      try {
        order.status = 'cancelled';
        order.adminNotes = `تعذر إنشاء رابط النجوم: ${invoiceErr.message}`;
        await order.save();
      } catch (_) {}
      throw invoiceErr;
    }

    notifyAdminPanel(req, {
      type: 'stars_order',
      orderNumber: order.orderNumber,
      productName: order.productName,
      durationName: order.durationName,
      amount: finalPrice,
      starsAmount,
      username: req.user.username || req.user.fullName,
      telegramId: req.telegramId,
      createdAt: new Date().toISOString()
    });

    res.json({
      success: true,
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        amount: finalPrice,
        starsAmount,
        starsPerUsd: config.perUsd,
        invoiceUrl
      }
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Public-order lookup (own orders only) — the mini app polls this after a
// Stars checkout until the bot's successful_payment handler delivers the keys.
router.get('/lookup/:orderNumber', async (req, res) => {
  try {
    const order = await Order.findOne({ orderNumber: req.params.orderNumber, user: req.telegramId })
      .select('orderNumber productName durationName status finalPrice starsAmount keyValues paymentMethod quantity');
    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });
    res.json({ success: true, data: order });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Submit manual payment proof
router.post('/payment-proof', proofLimiter, async (req, res) => {
  try {
    const { orderId, txHash } = req.body;
    if (typeof txHash !== 'string' || txHash.trim().length < 10 || txHash.trim().length > 128
      || !/^[\w\-:.\s]+$/i.test(txHash.trim())) {
      return res.status(400).json({ success: false, error: 'رقم معاملة غير صالح / Invalid transaction reference' });
    }
    if (!/^[a-f\d]{24}$/i.test(String(orderId || ''))) {
      return res.status(400).json({ success: false, error: 'Order not found' });
    }
    const order = await Order.findOne({ _id: orderId, user: req.telegramId });
    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });
    // Idempotent: only a live order may receive a proof. This blocks replaying
    // proofs onto completed/cancelled orders to trigger re-fulfilment.
    if (!['pending', 'processing'].includes(order.status)) {
      return res.status(400).json({ success: false, error: `Order is already ${order.status}` });
    }

    order.paymentTxHash = txHash.trim().slice(0, 128);
    order.status = 'processing';
    await order.save();

    notifyAdminPanel(req, {
      type: 'payment_proof',
      orderNumber: order.orderNumber,
      productName: order.productName,
      durationName: order.durationName,
      amount: order.finalPrice,
      txHash,
      username: req.user.username || req.user.fullName,
      telegramId: req.telegramId,
      createdAt: new Date().toISOString()
    });

    // Notify admins
    const adminIds = (process.env.ADMIN_IDS || '').split(',').map(id => parseInt(id.trim())).filter(Boolean);
    const bot = req.app.get('bot');

    if (bot) {
      for (const adminId of adminIds) {
        await bot.telegram.sendMessage(adminId,
          `💳 إثبات دفع جديد!\n👤 ${req.user.fullName}\n📦 ${order.productName}\n💰 $${order.finalPrice.toFixed(2)}\n🔗 TxHash: <code>${txHash}</code>\n\n👑 تمت إزالة أدوات الإدارة من البوت، افتح لوحة التحكم لمراجعة الطلب.`,
          {
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [[
                { text: '👑 فتح الطلب', web_app: { url: getAdminPortalUrl('orders', { search: order.orderNumber }) } },
                { text: '👤 المستخدم', web_app: { url: getAdminPortalUrl('users', { search: req.user.telegramId }) } }
              ]]
            }
          }
        ).catch(() => {});
      }
    }

    res.json({ success: true, message: 'تم استلام إثبات الدفع، جاري التحقق' });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Check Binance payment status (hosted Binance Pay). Completes the order and
// delivers keys the moment Binance reports the payment as PAID.
router.get('/binance/status/:prepayId', async (req, res) => {
  try {
    const status = await binanceService.queryOrder(req.params.prepayId);
    const order = await Order.findOne({ binancePayId: req.params.prepayId });
    let orderStatus = order?.status;
    if (status?.data?.status === 'PAID' && order && ['pending', 'processing'].includes(order.status)) {
      const user = await User.findOne({ telegramId: order.user });
      const { keys } = await orderService.fulfillOrder(order, user);
      await deliverAndNotify(req, order, keys);
      orderStatus = order.status;
    }
    res.json({ success: true, data: status, orderStatus });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Get my keys
router.get('/my-keys', async (req, res) => {
  try {
    const orders = await Order.find({ user: req.telegramId, status: 'completed' })
      .sort({ createdAt: -1 }).limit(50);
    res.json({ success: true, data: orders });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
