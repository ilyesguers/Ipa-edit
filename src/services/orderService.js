const Order = require('../models/Order');
const Key = require('../models/Key');
const User = require('../models/User');
const Product = require('../models/Product');
const Coupon = require('../models/Coupon');
const logger = require('../utils/logger');

class OrderService {
  async createOrder({ telegramId, productId, durationId, quantity = 1, paymentMethod, couponCode = null }) {
    const user = await User.findOne({ telegramId });
    if (!user) throw new Error('User not found');
    if (user.isBanned) throw new Error('User is banned');

    const product = await Product.findById(productId);
    if (!product || !product.isActive) throw new Error('Product not found or inactive');

    const duration = product.durations.id(durationId);
    if (!duration || !duration.isActive) throw new Error('Duration not found or inactive');

    // Check stock
    const availableKeys = await Key.countDocuments({
      product: productId,
      durationId: durationId,
      status: 'available'
    });
    if (availableKeys < quantity) throw new Error(`Insufficient stock. Available: ${availableKeys}`);

    let unitPrice = duration.price;
    let totalPrice = unitPrice * quantity;
    let discountAmount = 0;
    let couponApplied = null;

    // Apply coupon
    if (couponCode) {
      const coupon = await Coupon.findOne({ code: couponCode.toUpperCase() });
      if (coupon) {
        const validity = coupon.isValid();
        if (validity.valid) {
          discountAmount = coupon.calculateDiscount(totalPrice);
          couponApplied = coupon;
        }
      }
    }

    const finalPrice = Math.max(0, totalPrice - discountAmount);

    const order = new Order({
      user: telegramId,
      username: user.username,
      product: productId,
      productName: product.name,
      duration: durationId,
      durationName: duration.name,
      quantity,
      unitPrice,
      totalPrice,
      discountAmount,
      finalPrice,
      couponCode: couponApplied ? couponCode : null,
      paymentMethod,
      status: 'pending',
      orderNumber: `ORD-${Date.now()}`
    });

    await order.save();
    return { order, user, product, duration, finalPrice };
  }

  async processWalletPayment(orderId) {
    const order = await Order.findById(orderId);
    const user = await User.findOne({ telegramId: order.user });

    if (user.balance < order.finalPrice) {
      throw new Error('Insufficient wallet balance');
    }

    await user.deductBalance(order.finalPrice, `Order ${order.orderNumber}`, null);
    return this.fulfillOrder(order, user);
  }

  async fulfillOrder(order, user) {
    const keys = [];
    for (let i = 0; i < order.quantity; i++) {
      const key = await Key.getAvailableKey(order.product, order.duration);
      if (!key) throw new Error('Key not available');
      key.status = 'sold';
      key.soldTo = order.user;
      key.soldToUsername = order.username;
      key.soldAt = new Date();
      key.orderId = order._id;
      await key.save();
      keys.push(key);
    }

    order.keys = keys.map(k => k._id);
    order.keyValues = keys.map(k => k.keyValue);
    order.status = 'completed';
    order.deliveredAt = new Date();
    await order.save();

    // Update product stats
    await Product.findByIdAndUpdate(order.product, {
      $inc: { totalSales: order.quantity, totalRevenue: order.finalPrice }
    });

    // Update duration stock count
    await Product.findOneAndUpdate(
      { _id: order.product, 'durations._id': order.duration },
      { $inc: { 'durations.$.stockCount': -order.quantity, 'durations.$.soldCount': order.quantity } }
    );

    // Update user stats
    await User.findOneAndUpdate({ telegramId: order.user }, {
      $inc: { totalSpent: order.finalPrice, totalOrders: order.quantity },
      $push: {
        purchaseHistory: {
          $each: keys.map(k => ({
            orderId: order._id,
            productName: order.productName,
            duration: order.durationName,
            price: order.unitPrice,
            key: k.keyValue,
            purchasedAt: new Date()
          }))
        }
      }
    });

    // Update coupon usage
    if (order.couponCode) {
      await Coupon.findOneAndUpdate(
        { code: order.couponCode },
        {
          $inc: { currentUses: 1 },
          $push: {
            usedBy: {
              userId: order.user,
              username: order.username,
              orderId: order._id,
              discountApplied: order.discountAmount
            }
          }
        }
      );
    }

    logger.info(`✅ Order ${order.orderNumber} fulfilled for user ${order.user}`);
    return { order, keys };
  }

  async getStats() {
    const [totalUsers, totalOrders, totalRevenue, totalKeys, activeKeys] = await Promise.all([
      require('../models/User').countDocuments({ role: 'customer' }),
      Order.countDocuments({ status: 'completed' }),
      Order.aggregate([{ $match: { status: 'completed' } }, { $group: { _id: null, total: { $sum: '$finalPrice' } } }]),
      Key.countDocuments(),
      Key.countDocuments({ status: 'available' })
    ]);

    const revenueToday = await Order.aggregate([
      { $match: { status: 'completed', createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) } } },
      { $group: { _id: null, total: { $sum: '$finalPrice' } } }
    ]);

    const revenueMonth = await Order.aggregate([
      { $match: { status: 'completed', createdAt: { $gte: new Date(new Date().setDate(1)) } } },
      { $group: { _id: null, total: { $sum: '$finalPrice' } } }
    ]);

    // Revenue chart for last 7 days
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const start = new Date(date.setHours(0, 0, 0, 0));
      const end = new Date(date.setHours(23, 59, 59, 999));
      const dayRevenue = await Order.aggregate([
        { $match: { status: 'completed', createdAt: { $gte: start, $lte: end } } },
        { $group: { _id: null, total: { $sum: '$finalPrice' }, count: { $sum: 1 } } }
      ]);
      last7Days.push({
        date: start.toISOString().split('T')[0],
        revenue: dayRevenue[0]?.total || 0,
        orders: dayRevenue[0]?.count || 0
      });
    }

    return {
      totalUsers,
      totalOrders,
      totalRevenue: totalRevenue[0]?.total || 0,
      totalKeys,
      activeKeys,
      soldKeys: totalKeys - activeKeys,
      revenueToday: revenueToday[0]?.total || 0,
      revenueMonth: revenueMonth[0]?.total || 0,
      revenueChart: last7Days
    };
  }
}

module.exports = new OrderService();
