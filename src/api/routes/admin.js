const express = require('express');
const router = express.Router();
const { authMiddleware, adminOnly } = require('../../middlewares/auth');
const Category = require('../../models/Category');
const Game = require('../../models/Game');
const Product = require('../../models/Product');
const Key = require('../../models/Key');
const User = require('../../models/User');
const Order = require('../../models/Order');
const Coupon = require('../../models/Coupon');
const Settings = require('../../models/Settings');
const Broadcast = require('../../models/Broadcast');
const orderService = require('../../services/orderService');

router.use(authMiddleware, adminOnly);

// ── STATS ──
router.get('/stats', async (req, res) => {
  try {
    const stats = await orderService.getStats();
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Recent orders
router.get('/recent-orders', async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 }).limit(20);
    res.json({ success: true, data: orders });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── CATEGORIES ──
router.get('/categories', async (req, res) => {
  const cats = await Category.find().sort('order');
  res.json({ success: true, data: cats });
});

router.post('/categories', async (req, res) => {
  try {
    const { name, nameAr, icon, slug, order } = req.body;
    const cat = await Category.create({ name, nameAr, icon, slug: slug || name.toLowerCase().replace(/\s+/g, '-'), order: order || 0 });
    res.json({ success: true, data: cat });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.put('/categories/:id', async (req, res) => {
  try {
    const cat = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: cat });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.delete('/categories/:id', async (req, res) => {
  await Category.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

// ── GAMES ──
router.get('/games', async (req, res) => {
  const { categoryId } = req.query;
  const query = categoryId ? { category: categoryId } : {};
  const games = await Game.find(query).populate('category').sort('order');
  res.json({ success: true, data: games });
});

router.post('/games', async (req, res) => {
  try {
    const { name, nameAr, category, icon, image, slug, order } = req.body;
    const game = await Game.create({ name, nameAr, category, icon, image, slug: slug || name.toLowerCase().replace(/\s+/g, '-'), order: order || 0 });
    await Category.findByIdAndUpdate(category, { $inc: { gamesCount: 1 } });
    res.json({ success: true, data: game });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.put('/games/:id', async (req, res) => {
  try {
    const game = await Game.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: game });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.delete('/games/:id', async (req, res) => {
  const game = await Game.findByIdAndDelete(req.params.id);
  if (game) await Category.findByIdAndUpdate(game.category, { $inc: { gamesCount: -1 } });
  res.json({ success: true });
});

// ── PRODUCTS ──
router.get('/products', async (req, res) => {
  const { gameId } = req.query;
  const query = gameId ? { game: gameId } : {};
  const products = await Product.find(query).populate('game').populate('category').sort('order');
  res.json({ success: true, data: products });
});

router.post('/products', async (req, res) => {
  try {
    const product = await Product.create(req.body);
    await Game.findByIdAndUpdate(req.body.game, { $inc: { productsCount: 1 } });
    res.json({ success: true, data: product });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.put('/products/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: product });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.delete('/products/:id', async (req, res) => {
  const product = await Product.findByIdAndDelete(req.params.id);
  if (product) await Game.findByIdAndUpdate(product.game, { $inc: { productsCount: -1 } });
  res.json({ success: true });
});

// Add/remove duration from product
router.post('/products/:id/durations', async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { $push: { durations: req.body } },
      { new: true }
    );
    res.json({ success: true, data: product });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.put('/products/:id/durations/:durationId', async (req, res) => {
  try {
    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, 'durations._id': req.params.durationId },
      { $set: { 'durations.$': { ...req.body, _id: req.params.durationId } } },
      { new: true }
    );
    res.json({ success: true, data: product });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.delete('/products/:id/durations/:durationId', async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { $pull: { durations: { _id: req.params.durationId } } },
      { new: true }
    );
    res.json({ success: true, data: product });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ── KEYS / INVENTORY ──
router.get('/keys', async (req, res) => {
  try {
    const { productId, durationId, status, page = 1, limit = 50 } = req.query;
    const query = {};
    if (productId) query.product = productId;
    if (durationId) query.durationId = durationId;
    if (status) query.status = status;

    const [keys, total] = await Promise.all([
      Key.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(parseInt(limit)),
      Key.countDocuments(query)
    ]);

    res.json({ success: true, data: keys, total, page: parseInt(page), totalPages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/keys/bulk', async (req, res) => {
  try {
    const { productId, durationId, durationName, keys } = req.body;
    if (!keys || !Array.isArray(keys) || keys.length === 0) {
      return res.status(400).json({ success: false, error: 'No keys provided' });
    }

    const keyDocs = keys.map(keyValue => ({
      product: productId,
      durationId,
      durationName,
      keyValue: keyValue.trim(),
      addedBy: req.telegramId,
      source: 'bulk_import'
    }));

    const inserted = await Key.insertMany(keyDocs, { ordered: false });

    // Update stock count
    await Product.findOneAndUpdate(
      { _id: productId, 'durations._id': durationId },
      { $inc: { 'durations.$.stockCount': inserted.length } }
    );

    res.json({ success: true, added: inserted.length, data: inserted });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.delete('/keys/unsold', async (req, res) => {
  try {
    const { productId, durationId } = req.body;
    const query = { status: 'available' };
    if (productId) query.product = productId;
    if (durationId) query.durationId = durationId;
    const result = await Key.deleteMany(query);
    res.json({ success: true, deleted: result.deletedCount });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/keys/:id', async (req, res) => {
  await Key.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

// ── USERS ──
router.get('/users', async (req, res) => {
  try {
    const { search, page = 1, limit = 20, role, banned } = req.query;
    const query = {};
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { telegramId: isNaN(search) ? -1 : parseInt(search) }
      ];
    }
    if (role) query.role = role;
    if (banned !== undefined) query.isBanned = banned === 'true';

    const [users, total] = await Promise.all([
      User.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(parseInt(limit)).select('-balanceHistory -purchaseHistory'),
      User.countDocuments(query)
    ]);

    res.json({ success: true, data: users, total, page: parseInt(page), totalPages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findOne({ telegramId: parseInt(req.params.id) });
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    const orders = await Order.find({ user: parseInt(req.params.id) }).sort({ createdAt: -1 }).limit(20);
    res.json({ success: true, data: { ...user.toObject(), recentOrders: orders } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/users/:id/balance', async (req, res) => {
  try {
    const { amount, type, description } = req.body;
    const user = await User.findOne({ telegramId: parseInt(req.params.id) });
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    if (type === 'add') {
      await user.addBalance(parseFloat(amount), description || 'Admin balance addition', req.telegramId);
    } else {
      await user.deductBalance(parseFloat(amount), description || 'Admin balance deduction', req.telegramId);
    }

    // Notify user via bot
    try {
      const bot = req.app.get('bot');
      if (bot) {
        await bot.telegram.sendMessage(user.telegramId,
          `${type === 'add' ? '✅ تم إضافة' : '➖ تم خصم'} <b>$${parseFloat(amount).toFixed(2)}</b> ${type === 'add' ? 'إلى' : 'من'} رصيدك\n\n💰 رصيدك الحالي: <b>$${user.balance.toFixed(2)}</b>`,
          { parse_mode: 'HTML' }
        ).catch(() => {});
      }
    } catch (e) {}

    res.json({ success: true, data: { balance: user.balance } });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/users/:id/ban', async (req, res) => {
  try {
    const { reason, ban } = req.body;
    const user = await User.findOneAndUpdate(
      { telegramId: parseInt(req.params.id) },
      { isBanned: ban !== false, banReason: reason || 'مخالفة القوانين' },
      { new: true }
    );
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    // Notify user
    try {
      const bot = req.app.get('bot');
      if (bot && ban !== false) {
        await bot.telegram.sendMessage(user.telegramId,
          `🚫 تم حظر حسابك\nالسبب: ${reason || 'مخالفة القوانين'}`,
          { parse_mode: 'HTML' }
        ).catch(() => {});
      }
    } catch (e) {}

    res.json({ success: true, data: user });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/users/:id/dm', async (req, res) => {
  try {
    const { message } = req.body;
    const bot = req.app.get('bot');
    if (!bot) return res.status(500).json({ success: false, error: 'Bot not available' });

    await bot.telegram.sendMessage(parseInt(req.params.id), message, { parse_mode: 'HTML' });
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ── COUPONS ──
router.get('/coupons', async (req, res) => {
  const coupons = await Coupon.find().sort({ createdAt: -1 });
  res.json({ success: true, data: coupons });
});

router.post('/coupons', async (req, res) => {
  try {
    const coupon = await Coupon.create({ ...req.body, createdBy: req.telegramId });
    res.json({ success: true, data: coupon });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.put('/coupons/:id', async (req, res) => {
  const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json({ success: true, data: coupon });
});

router.delete('/coupons/:id', async (req, res) => {
  await Coupon.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

// ── BROADCAST ──
router.post('/broadcast', async (req, res) => {
  try {
    const { title, message, imageUrl, buttons, targetAudience, specificUserIds } = req.body;
    const bot = req.app.get('bot');

    // Build target user list
    let userQuery = { isBanned: false };
    if (targetAudience === 'buyers') userQuery.totalOrders = { $gt: 0 };
    if (targetAudience === 'with_balance') userQuery.balance = { $gt: 0 };
    if (targetAudience === 'specific') userQuery.telegramId = { $in: specificUserIds };

    const users = await User.find(userQuery).select('telegramId');

    const broadcast = await Broadcast.create({
      title, message, imageUrl, buttons, targetAudience,
      specificUserIds, totalTargets: users.length,
      status: 'sending', createdBy: req.telegramId
    });

    // Send async
    res.json({ success: true, data: broadcast, totalTargets: users.length });

    // Fire and forget
    let sentCount = 0, failedCount = 0;
    for (const u of users) {
      try {
        const tgButtons = buttons?.length
          ? { reply_markup: { inline_keyboard: [buttons.map(b => ({ text: b.text, url: b.url }))] } }
          : {};

        if (imageUrl) {
          await bot.telegram.sendPhoto(u.telegramId, imageUrl, { caption: message, parse_mode: 'HTML', ...tgButtons });
        } else {
          await bot.telegram.sendMessage(u.telegramId, message, { parse_mode: 'HTML', ...tgButtons });
        }
        sentCount++;
      } catch (e) { failedCount++; }
      await new Promise(r => setTimeout(r, 50)); // Rate limit
    }

    await Broadcast.findByIdAndUpdate(broadcast._id, {
      status: 'completed', sentCount, failedCount, completedAt: new Date()
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── ORDERS ──
router.get('/orders', async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const query = {};
    if (status) query.status = status;
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { orderNumber: searchRegex },
        { productName: searchRegex },
        { durationName: searchRegex },
        { username: searchRegex },
        { user: isNaN(search) ? -1 : parseInt(search) },
      ];
      if (/^[a-f\d]{24}$/i.test(search)) {
        query.$or.push({ _id: search });
      }
    }
    const [orders, total] = await Promise.all([
      Order.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(parseInt(limit)),
      Order.countDocuments(query)
    ]);
    res.json({ success: true, data: orders, total, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/orders/:id/verify-payment', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });

    const user = await User.findOne({ telegramId: order.user });
    const { fulfilled } = await orderService.fulfillOrder(order, user);

    const bot = req.app.get('bot');
    if (bot) {
      const keysText = order.keyValues.map(k => `<code>${k}</code>`).join('\n');
      await bot.telegram.sendMessage(order.user,
        `✅ <b>تم تأكيد دفعتك!</b>\n\n📦 ${order.productName} - ${order.durationName}\n\n🔑 مفتاحك:\n${keysText}`,
        { parse_mode: 'HTML' }
      ).catch(() => {});
    }

    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/orders/:id/reject-payment', async (req, res) => {
  try {
    const { reason } = req.body;
    const order = await Order.findByIdAndUpdate(req.params.id, { status: 'failed', adminNotes: reason }, { new: true });

    const bot = req.app.get('bot');
    if (bot) {
      await bot.telegram.sendMessage(order.user,
        `❌ <b>تم رفض دفعتك</b>\n\nالسبب: ${reason || 'الدفعة غير مؤكدة'}\n\nيرجى التواصل مع الدعم`,
        { parse_mode: 'HTML' }
      ).catch(() => {});
    }

    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

module.exports = router;
