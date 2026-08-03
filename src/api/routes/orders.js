const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../../middlewares/auth');
const Order = require('../../models/Order');
const Coupon = require('../../models/Coupon');
const orderService = require('../../services/orderService');
const binanceService = require('../../services/binanceService');
const starsService = require('../../services/starsService');
const Settings = require('../../models/Settings');
const { getAdminPortalUrl } = require('../../utils/uiConfig');

router.use(authMiddleware);

// Push a real-time event to the connected admin panels (socket.io 'admin_room')
const notifyAdminPanel = (req, payload) => {
  try {
    const io = req.app.get('io');
    if (io) io.to('admin_room').emit('new_order', payload);
  } catch (_) { /* sockets are best-effort */ }
};

// Get user orders
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const query = { user: req.telegramId };
    if (status) query.status = status;

    const [orders, total] = await Promise.all([
      Order.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(parseInt(limit)),
      Order.countDocuments(query)
    ]);
    res.json({ success: true, data: orders, total, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Validate coupon
router.post('/validate-coupon', async (req, res) => {
  try {
    const { code, amount } = req.body;
    if (!code || typeof code !== 'string' || !code.trim()) {
      return res.status(400).json({ success: false, error: 'أدخل كود الخصم / Enter a coupon code' });
    }
    if (amount === undefined || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return res.status(400).json({ success: false, error: 'مبلغ غير صالح / Invalid amount' });
    }
    const coupon = await Coupon.findOne({ code: code.trim().toUpperCase() });
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
    const { productId, durationId, quantity = 1, couponCode } = req.body;
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

// Create Binance Pay order
router.post('/binance', async (req, res) => {
  try {
    const { productId, durationId, quantity = 1, couponCode } = req.body;
    const { order, finalPrice } = await orderService.createOrder({
      telegramId: req.telegramId,
      productId, durationId, quantity, paymentMethod: 'binance', couponCode
    });

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

    res.json({
      success: true,
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        amount: finalPrice,
        binancePrepayId: binanceOrder.prepayId,
        checkoutUrl: binanceOrder.checkoutUrl,
        qrCodeUrl: binanceOrder.qrcodeLink,
        universalUrl: binanceOrder.universalUrl
      }
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

    const { productId, durationId, quantity = 1, couponCode } = req.body;
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
router.post('/payment-proof', async (req, res) => {
  try {
    const { orderId, txHash } = req.body;
    const order = await Order.findOne({ _id: orderId, user: req.telegramId });
    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });

    order.paymentTxHash = txHash;
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

// Check Binance payment status
router.get('/binance/status/:prepayId', async (req, res) => {
  try {
    const status = await binanceService.queryOrder(req.params.prepayId);
    res.json({ success: true, data: status });
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
