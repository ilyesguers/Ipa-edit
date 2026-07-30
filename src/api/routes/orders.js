const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../../middlewares/auth');
const Order = require('../../models/Order');
const Coupon = require('../../models/Coupon');
const orderService = require('../../services/orderService');
const binanceService = require('../../services/binanceService');
const Settings = require('../../models/Settings');

router.use(authMiddleware);

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
    const coupon = await Coupon.findOne({ code: code.toUpperCase() });
    if (!coupon) return res.status(404).json({ success: false, error: 'الكود غير موجود' });

    const validity = coupon.isValid();
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
          `🛒 طلب جديد من ${req.user.fullName}\n📦 ${result.order.productName}\n💰 $${result.order.finalPrice.toFixed(2)}`,
          { parse_mode: 'HTML' }
        ).catch(() => {});
      }

      // Send key to user via bot too
      const keysText = result.keys.map(k => `<code>${k.keyValue}</code>`).join('\n');
      await bot.telegram.sendMessage(req.telegramId,
        `✅ <b>تم الشراء بنجاح!</b>\n\n📦 ${result.order.productName} - ${result.order.durationName}\n\n🔑 مفتاحك:\n${keysText}\n\n📋 رقم الطلب: ${result.order.orderNumber}`,
        { parse_mode: 'HTML' }
      ).catch(() => {});
    }

    res.json({ success: true, data: { order: result.order, keys: result.keys.map(k => k.keyValue) } });
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

// Submit manual payment proof
router.post('/payment-proof', async (req, res) => {
  try {
    const { orderId, txHash } = req.body;
    const order = await Order.findOne({ _id: orderId, user: req.telegramId });
    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });

    order.paymentTxHash = txHash;
    order.status = 'processing';
    await order.save();

    // Notify admins
    const adminIds = (process.env.ADMIN_IDS || '').split(',').map(id => parseInt(id.trim())).filter(Boolean);
    const bot = req.app.get('bot');
    const { Markup } = require('telegraf');

    if (bot) {
      for (const adminId of adminIds) {
        await bot.telegram.sendMessage(adminId,
          `💳 إثبات دفع جديد!\n👤 ${req.user.fullName}\n📦 ${order.productName}\n💰 $${order.finalPrice.toFixed(2)}\n🔗 TxHash: <code>${txHash}</code>`,
          {
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [[
                { text: '✅ تأكيد', callback_data: `verify_payment_${order._id}` },
                { text: '❌ رفض', callback_data: `reject_payment_${order._id}` }
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
