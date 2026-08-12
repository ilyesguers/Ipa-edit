const express = require('express');
const router = express.Router();
const { authMiddleware, adminOnly, requirePermission, ALL_PERMISSIONS } = require('../../middlewares/auth');
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

// SECURITY: escape user input before it ever reaches a RegExp. Raw `$regex`
// queries with attacker-controlled patterns (e.g. "(a+)+$") cause ReDoS and
// can freeze the entire event loop.
const escapeRegExp = (s) => String(s || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&').slice(0, 64);

// SECURITY: only these keys may be written from req.body — anything else is
// dropped. This stops mass-assignment of internal fields (productCounts,
// stock counters, timestamps…) through the generic update endpoints.
const pick = (obj, allowed) => Object.fromEntries(
  allowed.filter((k) => obj[k] !== undefined).map((k) => [k, obj[k]])
);
const clampPage = (v, def = 1, max = 10000) => Math.min(Math.max(parseInt(v, 10) || def, 1), max);
const clampLimit = (v, def = 20, max = 100) => Math.min(Math.max(parseInt(v, 10) || def, 1), max);

const toNullableString = (value) => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const text = String(value).trim();
  return text || null;
};

const toCleanNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const normalizeDurations = (durations) => {
  if (!Array.isArray(durations)) return undefined;
  return durations
    .map((duration) => ({
      ...(duration._id ? { _id: duration._id } : {}),
      name: String(duration.name || duration.nameAr || '').trim(),
      nameAr: String(duration.nameAr || '').trim(),
      days: Math.max(1, Math.trunc(toCleanNumber(duration.days, 1))),
      price: Math.max(0, toCleanNumber(duration.price, 0)),
      originalPrice: duration.originalPrice === '' || duration.originalPrice === undefined || duration.originalPrice === null ? null : Math.max(0, toCleanNumber(duration.originalPrice, 0)),
      isActive: duration.isActive !== false,
      stockCount: Math.max(0, Math.trunc(toCleanNumber(duration.stockCount, 0))),
      soldCount: Math.max(0, Math.trunc(toCleanNumber(duration.soldCount, 0))),
      order: Math.trunc(toCleanNumber(duration.order, 0))
    }))
    .filter((duration) => duration.name);
};

const normalizeFeatures = (features) => {
  if (!Array.isArray(features)) return undefined;
  return features
    .map((feature) => ({
      text: String(feature.text || '').trim(),
      icon: String(feature.icon || '✅').trim() || '✅',
      isHighlighted: Boolean(feature.isHighlighted)
    }))
    .filter((feature) => feature.text);
};

// ── Granular section permissions (empty permissions = full access) ──
router.use('/stats', requirePermission('dashboard'));
router.use('/recent-orders', requirePermission('dashboard'));
router.use('/categories', requirePermission('products'));
router.use('/games', requirePermission('products'));
router.use('/products', requirePermission('products'));
router.use('/keys', requirePermission('inventory'));
router.use('/users', requirePermission('users'));
router.use('/coupons', requirePermission('coupons'));
router.use('/broadcast', requirePermission('broadcast'));
router.use('/broadcasts', requirePermission('broadcast'));
router.use('/orders', requirePermission('orders'));

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
    const { name, nameAr, icon, image, slug, order, description, isActive, isHidden } = req.body;
    const cat = await Category.create({
      name,
      nameAr,
      icon,
      image: toNullableString(image),
      description: String(description || ''),
      slug: slug || name.toLowerCase().replace(/\s+/g, '-'),
      order: order || 0,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      isHidden: Boolean(isHidden)
    });
    res.json({ success: true, data: cat });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.put('/categories/:id', async (req, res) => {
  try {
    const updates = pick(req.body, ['name', 'nameAr', 'icon', 'image', 'slug', 'description', 'order', 'isActive', 'isHidden']);
    if (updates.image !== undefined) updates.image = toNullableString(updates.image);
    const cat = await Category.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
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
    const { name, nameAr, category, icon, image, slug, order, description, isActive, isHidden, isFeatured } = req.body;
    const game = await Game.create({
      name,
      nameAr,
      category,
      icon: toNullableString(icon),
      image: toNullableString(image),
      description: String(description || ''),
      slug: slug || name.toLowerCase().replace(/\s+/g, '-'),
      order: order || 0,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      isHidden: Boolean(isHidden),
      isFeatured: Boolean(isFeatured)
    });
    await Category.findByIdAndUpdate(category, { $inc: { gamesCount: 1 } });
    res.json({ success: true, data: game });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.put('/games/:id', async (req, res) => {
  try {
    const updates = pick(req.body, ['name', 'nameAr', 'category', 'icon', 'image', 'description', 'slug', 'order', 'isActive', 'isHidden', 'isFeatured']);
    if (updates.icon !== undefined) updates.icon = toNullableString(updates.icon);
    if (updates.image !== undefined) updates.image = toNullableString(updates.image);
    const game = await Game.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
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
    const payload = pick(req.body, [
      'name', 'nameAr', 'slug', 'game', 'category', 'logo', 'banner', 'description', 'features', 'durations',
      'productType', 'isActive', 'isHidden', 'isFeatured', 'order', 'tags', 'shareMessage'
    ]);
    payload.logo = toNullableString(payload.logo);
    payload.banner = toNullableString(payload.banner);
    payload.features = normalizeFeatures(payload.features) || [];
    payload.durations = normalizeDurations(payload.durations) || [];
    if (payload.tags !== undefined) payload.tags = Array.isArray(payload.tags)
      ? payload.tags.map((tag) => String(tag).trim()).filter(Boolean)
      : [];
    const product = await Product.create(payload);
    await Game.findByIdAndUpdate(req.body.game, { $inc: { productsCount: 1 } });
    res.json({ success: true, data: product });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.put('/products/:id', async (req, res) => {
  try {
    const updates = pick(req.body, [
      'name', 'nameAr', 'slug', 'game', 'category', 'logo', 'banner', 'description', 'features', 'durations',
      'productType', 'isActive', 'isHidden', 'isFeatured', 'order', 'tags', 'shareMessage'
    ]);
    if (updates.logo !== undefined) updates.logo = toNullableString(updates.logo);
    if (updates.banner !== undefined) updates.banner = toNullableString(updates.banner);
    if (updates.features !== undefined) updates.features = normalizeFeatures(updates.features);
    if (updates.durations !== undefined) updates.durations = normalizeDurations(updates.durations);
    if (updates.tags !== undefined) updates.tags = Array.isArray(updates.tags)
      ? updates.tags.map((tag) => String(tag).trim()).filter(Boolean)
      : [];
    const product = await Product.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
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

// ── NEW: change a single key's status (mark invalid / back to available / expired / reserved) ──
router.post('/keys/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['available', 'sold', 'reserved', 'expired', 'invalid'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: `Status must be one of: ${validStatuses.join(', ')}` });
    }

    const key = await Key.findById(req.params.id);
    if (!key) return res.status(404).json({ success: false, error: 'Key not found' });

    const prevStatus = key.status;

    // If returning a sold/reserved key to stock, clear the ownership fields
    if (status === 'available') {
      key.soldTo = null;
      key.soldToUsername = null;
      key.soldAt = null;
      key.orderId = null;
      key.reservedAt = null;
      key.reservedUntil = null;
    }
    key.status = status;
    await key.save();

    // Keep the product's duration stock count in sync (available → other = -1, other → available = +1)
    if (prevStatus !== status) {
      const delta = status === 'available' ? 1 : (prevStatus === 'available' ? -1 : 0);
      if (delta !== 0) {
        await Product.findOneAndUpdate(
          { _id: key.product, 'durations._id': key.durationId },
          { $inc: { 'durations.$.stockCount': delta } }
        );
      }
    }
    res.json({ success: true, data: key });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ── NEW: update a key's notes / metadata ──
router.put('/keys/:id', async (req, res) => {
  try {
    const { notes } = req.body;
    const key = await Key.findByIdAndUpdate(req.params.id, { notes: notes || '' }, { new: true });
    if (!key) return res.status(404).json({ success: false, error: 'Key not found' });
    res.json({ success: true, data: key });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ── USERS ──
router.get('/users', async (req, res) => {
  try {
    const { search, role, banned } = req.query;
    const page = clampPage(req.query.page);
    const limit = clampLimit(req.query.limit, 20, 50);
    const query = {};
    if (search) {
      const safe = escapeRegExp(search);
      query.$or = [
        { username: { $regex: safe, $options: 'i' } },
        { firstName: { $regex: safe, $options: 'i' } },
        { telegramId: isNaN(search) ? -1 : parseInt(search) }
      ];
    }
    if (role) query.role = role;
    if (banned !== undefined) query.isBanned = banned === 'true';

    const [users, total] = await Promise.all([
      User.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).select('-balanceHistory -purchaseHistory'),
      User.countDocuments(query)
    ]);

    res.json({ success: true, data: users, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/users/:id', async (req, res) => {
  try {
    const telegramId = parseInt(req.params.id);
    const user = await User.findOne({ telegramId });
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    // Rich control-tower view: one round of aggregates instead of many queries.
    const [orders, orderAgg, referrer] = await Promise.all([
      Order.find({ user: telegramId }).sort({ createdAt: -1 }).limit(20),
      Order.aggregate([
        { $match: { user: telegramId } },
        { $group: {
          _id: '$status',
          count: { $sum: 1 },
          total: { $sum: { $ifNull: ['$finalPrice', 0] } },
          lastAt: { $max: '$createdAt' }
        } }
      ]),
      user.referredBy
        ? User.findOne({ telegramId: user.referredBy }).select('telegramId username firstName')
        : null
    ]);

    const byStatus = {};
    let completedTotal = 0;
    let completedCount = 0;
    let lastOrderAt = null;
    for (const row of orderAgg) {
      byStatus[row._id] = { count: row.count, total: row.total };
      if (row._id === 'completed') { completedTotal = row.total; completedCount = row.count; }
      if (!lastOrderAt || row.lastAt > lastOrderAt) lastOrderAt = row.lastAt;
    }

    res.json({
      success: true,
      data: {
        ...user.toObject(),
        recentOrders: orders,
        stats: {
          ordersByStatus: byStatus,
          completedOrders: completedCount,
          completedRevenue: completedTotal,
          avgOrderValue: completedCount ? completedTotal / completedCount : 0,
          lastOrderAt,
          referredBy: referrer,
          accountAgeDays: Math.max(0, Math.floor((Date.now() - new Date(user.createdAt).getTime()) / 86400000))
        }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── NEW: full profile edit (owner-level member control) ────────────────────
// Lets the admin correct names/usernames, edit the wallet balance directly,
// change the language, toggle notifications and keep private admin notes —
// everything logged in balanceHistory when money moves.
router.put('/users/:id', async (req, res) => {
  try {
    const telegramId = parseInt(req.params.id);
    const user = await User.findOne({ telegramId });
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    const ownerIds = (process.env.ADMIN_IDS || '').split(',').map(id => parseInt(id.trim())).filter(Boolean);
    const isOwnerTarget = user.role === 'superadmin' || ownerIds.includes(user.telegramId);
    const requesterIsOwner = ownerIds.includes(req.telegramId);

    // Only an owner may edit the owner account itself.
    if (isOwnerTarget && !requesterIsOwner) {
      return res.status(403).json({ success: false, error: 'لا يمكن تعديل حساب المالك إلا من المالك نفسه' });
    }

    const { firstName, lastName, username, phone, preferredLanguage, notificationsEnabled, balance, adminNotes } = req.body;

    if (firstName !== undefined) {
      const v = String(firstName).trim();
      if (!v || v.length > 64) return res.status(400).json({ success: false, error: 'الاسم مطلوب ويجب أن يكون أقل من 64 حرفاً' });
      user.firstName = v;
    }
    if (lastName !== undefined) user.lastName = String(lastName).trim().slice(0, 64);
    if (username !== undefined) {
      const v = String(username || '').trim().replace(/^@/, '');
      if (v && !/^[a-zA-Z0-9_]{3,32}$/.test(v)) return res.status(400).json({ success: false, error: 'صيغة اليوزر غير صحيحة' });
      user.username = v || null;
    }
    if (phone !== undefined) user.phone = String(phone || '').trim().slice(0, 32) || null;
    if (preferredLanguage !== undefined) {
      const { isSupportedLanguage } = require('../../utils/languages');
      const lang = String(preferredLanguage).toLowerCase().split('-')[0];
      if (!isSupportedLanguage(lang)) return res.status(400).json({ success: false, error: 'لغة غير مدعومة' });
      user.preferredLanguage = lang;
      user.languageSelected = true;
    }
    if (notificationsEnabled !== undefined) user.notificationsEnabled = Boolean(notificationsEnabled);
    if (adminNotes !== undefined) user.adminNotes = String(adminNotes || '').slice(0, 1000);

    // Direct balance override — always audited in the wallet history.
    if (balance !== undefined && balance !== '' && balance !== null) {
      const next = parseFloat(balance);
      if (!Number.isFinite(next) || next < 0 || next > 1000000) {
        return res.status(400).json({ success: false, error: 'الرصيد يجب أن يكون رقماً بين $0 و $1,000,000' });
      }
      const diff = Math.round((next - user.balance) * 100) / 100;
      if (diff !== 0) {
        user.balance = Math.round(next * 100) / 100;
        user.balanceHistory.push({
          type: diff > 0 ? 'credit' : 'debit',
          amount: Math.abs(diff),
          description: '✏️ تعديل مباشر من الإدارة',
          adminId: req.telegramId
        });
      }
    }

    await user.save();
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/users/:id/balance', async (req, res) => {
  try {
    const { amount, type, description } = req.body;
    const user = await User.findOne({ telegramId: parseInt(req.params.id) });
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    const value = parseFloat(amount);
    if (isNaN(value) || value <= 0) return res.status(400).json({ success: false, error: 'Invalid amount' });
    if (!['add', 'deduct'].includes(type)) return res.status(400).json({ success: false, error: 'Type must be add or deduct' });

    if (type === 'add') {
      await user.addBalance(value, description || 'Admin balance addition', req.telegramId);
    } else {
      try {
        await user.deductBalance(value, description || 'Admin balance deduction', req.telegramId);
      } catch (e) {
        return res.status(400).json({ success: false, error: 'User balance is not enough to deduct that amount' });
      }
    }

    // Notify user via bot
    try {
      const bot = req.app.get('bot');
      if (bot) {
        await bot.telegram.sendMessage(user.telegramId,
          `${type === 'add' ? '✅ تم إضافة' : '➖ تم خصم'} <b>$${value.toFixed(2)}</b> ${type === 'add' ? 'إلى' : 'من'} رصيدك\n\n💰 رصيدك الحالي: <b>$${user.balance.toFixed(2)}</b>`,
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
    // Strict boolean check: missing `ban` must never silently ban a user.
    const shouldBan = ban === true;
    const user = await User.findOneAndUpdate(
      { telegramId: parseInt(req.params.id) },
      { isBanned: shouldBan, banReason: shouldBan ? (reason || 'مخالفة القوانين') : null },
      { new: true }
    );
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    // Notify user
    try {
      const bot = req.app.get('bot');
      if (bot && shouldBan) {
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

// ── NEW: role management (promote / demote admin) ──
router.post('/users/:id/role', async (req, res) => {
  try {
    const { role } = req.body;
    if (!['customer', 'admin'].includes(role)) {
      return res.status(400).json({ success: false, error: 'Role must be customer or admin' });
    }
    const target = await User.findOne({ telegramId: parseInt(req.params.id) });
    if (!target) return res.status(404).json({ success: false, error: 'User not found' });

    // Protect the owner's superadmin account from demotion
    const ownerIds = (process.env.ADMIN_IDS || '').split(',').map(id => parseInt(id.trim())).filter(Boolean);
    if (target.role === 'superadmin' || ownerIds.includes(target.telegramId)) {
      return res.status(400).json({ success: false, error: 'لا يمكن تغيير صلاحية المالك الأساسي' });
    }

    target.role = role;
    // Fresh admin = full access (empty permissions); demotion clears them too
    target.permissions = [];
    await target.save();

    const bot = req.app.get('bot');
    if (bot) {
      await bot.telegram.sendMessage(target.telegramId,
        `👑 <b>${role === 'admin' ? 'تمت ترقيتك إلى إدارة المتجر' : 'تم إلغاء صلاحية الإدارة عن حسابك'}</b>\n\n` +
        `${role === 'admin'
          ? 'تم تفعيل دخولك إلى لوحة التحكم بكامل الصلاحيات، ويمكن للمالك تحديد صلاحيات معيّنة لك من داخل اللوحة.'
          : 'لأي استفسار، يرجى التواصل مع الدعم.'}`,
        { parse_mode: 'HTML' }
      ).catch(() => {});
    }

    res.json({ success: true, data: { telegramId: target.telegramId, role: target.role, permissions: target.permissions } });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ── NEW: set granular permissions for an admin ──
router.post('/users/:id/permissions', async (req, res) => {
  try {
    const { permissions } = req.body;
    const clean = (Array.isArray(permissions) ? permissions : [])
      .filter((p) => ALL_PERMISSIONS.includes(p));
    const unique = [...new Set(clean)];

    const target = await User.findOne({ telegramId: parseInt(req.params.id) });
    if (!target) return res.status(404).json({ success: false, error: 'User not found' });

    // Owner's account can never be restricted
    const ownerIds = (process.env.ADMIN_IDS || '').split(',').map(id => parseInt(id.trim())).filter(Boolean);
    if (target.role === 'superadmin' || ownerIds.includes(target.telegramId)) {
      return res.status(400).json({ success: false, error: 'لا يمكن تعديل صلاحيات المالك الأساسي' });
    }
    if (target.role !== 'admin') {
      return res.status(400).json({ success: false, error: 'رقّ المستخدم لأدمن أولاً قبل ضبط الصلاحيات' });
    }

    target.permissions = unique;
    await target.save();

    // Notify the admin of their new permissions
    const bot = req.app.get('bot');
    if (bot) {
      const permLabels = {
        dashboard: 'الإحصائيات', products: 'المنتجات والأقسام', inventory: 'المخزون',
        wheel: 'عجلة الحظ', orders: 'الطلبات', users: 'المستخدمون', coupons: 'الكوبونات',
        broadcast: 'الإذاعة', settings: 'الإعدادات'
      };
      const list = unique.length
        ? unique.map((p) => `✓ ${permLabels[p] || p}`).join('\n')
        : '✓ كل الصلاحيات (تحكم كامل)';
      await bot.telegram.sendMessage(target.telegramId,
        `🎛️ <b>تم تحديث صلاحياتك في لوحة التحكم</b>\n\n${list}`,
        { parse_mode: 'HTML' }
      ).catch(() => {});
    }

    res.json({ success: true, data: { telegramId: target.telegramId, permissions: unique } });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ── NEW: full balance history for a user (admin view) ──
router.get('/users/:id/balance-history', async (req, res) => {
  try {
    const user = await User.findOne({ telegramId: parseInt(req.params.id) }).select('balance balanceHistory');
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    const history = (user.balanceHistory || []).slice().reverse().slice(0, 100);
    res.json({ success: true, data: { balance: user.balance, history } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/users/:id/dm', async (req, res) => {
  try {
    const { message } = req.body;
    if (typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ success: false, error: 'Message is required' });
    }
    // Telegram rejects messages > 4096 chars; cap before sending so the admin
    // gets a clean error, and never forward absurd payloads.
    const text = message.trim().slice(0, 4096);
    const bot = req.app.get('bot');
    if (!bot) return res.status(500).json({ success: false, error: 'Bot not available' });

    const { safeSendMessage } = require('../../utils/safeSend');
    await safeSendMessage(bot.telegram, parseInt(req.params.id), text, { parse_mode: 'HTML' });
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
  const updates = pick(req.body, [
    'code', 'description', 'discountType', 'discountValue', 'maxUses',
    'minOrderAmount', 'maxDiscountAmount', 'applicableProducts', 'isActive', 'expiresAt'
  ]);
  const coupon = await Coupon.findByIdAndUpdate(req.params.id, updates, { new: true });
  res.json({ success: true, data: coupon });
});

router.delete('/coupons/:id', async (req, res) => {
  await Coupon.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

// ── BROADCAST ──

// Build the target query for a broadcast audience
const buildBroadcastQuery = (targetAudience, specificUserIds = []) => {
  const query = { isBanned: false, notificationsEnabled: { $ne: false } };
  if (targetAudience === 'buyers') query.totalOrders = { $gt: 0 };
  if (targetAudience === 'with_balance') query.balance = { $gt: 0 };
  if (targetAudience === 'specific') {
    const ids = (Array.isArray(specificUserIds) ? specificUserIds : [])
      .map(id => parseInt(id)).filter(id => !isNaN(id) && id > 0);
    query.telegramId = { $in: ids };
  }
  return query;
};

// NEW: preview how many users a broadcast would reach (no sending)
router.post('/broadcast/target-count', async (req, res) => {
  try {
    const { targetAudience, specificUserIds } = req.body;
    const query = buildBroadcastQuery(targetAudience || 'all', specificUserIds);
    const count = await User.countDocuments(query);
    res.json({ success: true, data: { count } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// NEW: list previous broadcasts
router.get('/broadcasts', async (req, res) => {
  try {
    const broadcasts = await Broadcast.find().sort({ createdAt: -1 }).limit(30);
    res.json({ success: true, data: broadcasts });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/broadcast', async (req, res) => {
  try {
    const { title, message, imageUrl, buttons, targetAudience, specificUserIds } = req.body;
    const bot = req.app.get('bot');
    if (!bot) return res.status(500).json({ success: false, error: 'Bot not available' });

    if (!message || !String(message).trim()) {
      return res.status(400).json({ success: false, error: 'Message is required' });
    }
    if (String(message).length > 4096) {
      return res.status(400).json({ success: false, error: 'Message is too long (max 4096 characters)' });
    }
    // Only real http(s) images — Telegram fetches the URL server-side, so an
    // unrestricted value is an SSRF vector against anything Telegram can reach.
    const safeImage = /^https:\/\/\S+\.(png|jpe?g|webp|gif)(\?\S*)?$/i.test(String(imageUrl || '')) ? imageUrl : null;
    const audience = ['all', 'buyers', 'with_balance', 'specific'].includes(targetAudience) ? targetAudience : 'all';
    if (audience === 'specific' && (!Array.isArray(specificUserIds) || specificUserIds.length === 0)) {
      return res.status(400).json({ success: false, error: 'Specific audience requires at least one user ID' });
    }

    // Build target user list
    const userQuery = buildBroadcastQuery(audience, specificUserIds);
    const users = await User.find(userQuery).select('telegramId');
    if (users.length === 0) {
      return res.status(400).json({ success: false, error: 'No users match this audience' });
    }

    const safeButtons = (Array.isArray(buttons) ? buttons : []).slice(0, 8)
      .filter(b => b && String(b.text || '').trim() && String(b.url || '').startsWith('http'))
      .map(b => ({ text: String(b.text).trim(), url: String(b.url).trim() }));

    // Title is always present: explicit title, else auto-generated from message.
    // This eliminates the old "Broadcast validation failed: Path 'title' is required".
    const rawMessage = String(message);
    const finalTitle = String(title || '').trim() || rawMessage.replace(/\*\*(.+?)\*\*/g, '$1').slice(0, 60);

    // Convert admin **markdown** to Telegram HTML so users never see raw asterisks
    const { mdToHtml } = require('../../utils/mdToHtml');
    const htmlMessage = mdToHtml(rawMessage);

    const broadcast = await Broadcast.create({
      title: finalTitle,
      message: rawMessage,
      imageUrl: safeImage,
      buttons: safeButtons,
      targetAudience: audience,
      specificUserIds: audience === 'specific' ? users.map(u => u.telegramId) : [],
      totalTargets: users.length,
      status: 'sending', createdBy: req.telegramId
    });

    // Send async
    res.json({ success: true, data: broadcast, totalTargets: users.length });

    // Fire and forget (with a cap so a runaway loop can't freeze the process)
    let sentCount = 0, failedCount = 0;
    for (const u of users) {
      try {
        const tgButtons = safeButtons.length
          ? { reply_markup: { inline_keyboard: [safeButtons.map(b => ({ text: b.text, url: b.url }))] } }
          : {};

        if (safeImage) {
          await bot.telegram.sendPhoto(u.telegramId, safeImage, { caption: htmlMessage, parse_mode: 'HTML', ...tgButtons });
        } else {
          await bot.telegram.sendMessage(u.telegramId, htmlMessage, { parse_mode: 'HTML', ...tgButtons });
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
    const { status, search } = req.query;
    const page = clampPage(req.query.page);
    const limit = clampLimit(req.query.limit, 20, 50);
    const query = {};
    if (status) query.status = status;
    if (search) {
      const searchRegex = new RegExp(escapeRegExp(search), 'i');
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
      Order.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
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

    // Guard: never fulfill twice (keys would be delivered twice)
    if (order.status === 'completed') {
      return res.status(400).json({ success: false, error: 'Order is already completed' });
    }
    if (!['pending', 'processing'].includes(order.status)) {
      return res.status(400).json({ success: false, error: `Cannot verify an order with status "${order.status}"` });
    }

    const user = await User.findOne({ telegramId: order.user });
    if (!user) return res.status(404).json({ success: false, error: 'User not found - cannot deliver' });

    const result = await orderService.fulfillOrder(order, user);

    const bot = req.app.get('bot');
    if (bot) {
      const keysText = result.keys.map(k => `<code>${k.keyValue}</code>`).join('\n');
      await bot.telegram.sendMessage(order.user,
        `✅ <b>تم تأكيد عملية الدفع</b>\n\n` +
        `📦 ${order.productName} — ${order.durationName}\n` +
        `🧾 رقم الطلب: <code>${order.orderNumber}</code>\n\n` +
        `🔑 <b>مفاتيحك:</b>\n${keysText}\n\n` +
        `تجد نسخة دائمة منها داخل المتجر في قسم «مفاتيحي».`,
        { parse_mode: 'HTML' }
      ).catch(() => {});
    }

    res.json({ success: true, data: { order } });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/orders/:id/reject-payment', async (req, res) => {
  try {
    const { reason } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });
    if (order.status === 'completed') {
      return res.status(400).json({ success: false, error: 'Completed orders cannot be rejected - use refund instead' });
    }

    order.status = 'failed';
    order.adminNotes = reason || 'الدفعة غير مؤكدة';
    await order.save();

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

// ── NEW: refund a completed order back to the user's wallet ──
router.post('/orders/:id/refund', async (req, res) => {
  try {
    const { reason } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });
    if (order.status !== 'completed') {
      return res.status(400).json({ success: false, error: 'Only completed orders can be refunded' });
    }
    if (order.paymentMethod === 'wallet' && !order.keyValues?.length) {
      return res.status(400).json({ success: false, error: 'Order has no delivered keys' });
    }

    const user = await User.findOne({ telegramId: order.user });
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    // Telegram Stars orders are refunded through Telegram itself (Stars go
    // back to the buyer's Stars balance) — no wallet credit, which avoids
    // compensating the user twice.
    if (order.paymentMethod === 'telegram_stars') {
      if (!order.telegramPaymentChargeId) {
        return res.status(400).json({ success: false, error: 'لا يوجد معرّف دفع للنجوم — لا يمكن الاسترجاع تلقائياً' });
      }
      const { refundStarPayment } = require('../../services/starsService');
      const Key = require('../../models/Key');
      const Product = require('../../models/Product');
      try {
        await refundStarPayment(order.user, order.telegramPaymentChargeId);
      } catch (starsErr) {
        return res.status(400).json({ success: false, error: `فشل استرجاع النجوم من تيليجرام: ${starsErr.message}` });
      }
      await Key.updateMany({ orderId: order._id }, { status: 'invalid', notes: `Stars refund: ${reason || 'استرجاع من الإدارة'}` });
      order.status = 'refunded';
      order.refundedAt = new Date();
      order.starsRefundedAt = new Date();
      order.refundReason = reason || 'استرجاع نجوم من الإدارة';
      await order.save();
      await Product.findByIdAndUpdate(order.product, { $inc: { totalSales: -order.quantity, totalRevenue: -order.finalPrice } }).catch(() => {});
      await Product.findOneAndUpdate(
        { _id: order.product, 'durations._id': order.duration },
        { $inc: { 'durations.$.soldCount': -order.quantity } }
      ).catch(() => {});

      const bot = req.app.get('bot');
      if (bot) {
        await bot.telegram.sendMessage(order.user,
          `⭐ <b>تم استرجاع نجومك بالكامل</b>\n\n` +
          `📦 ${order.productName} — ${order.durationName}\n` +
          `🧾 رقم الطلب: <code>${order.orderNumber}</code>\n` +
          `⭐ النجوم المسترجعة: <b>${order.starsAmount || ''} Stars</b>\n` +
          `📝 السبب: ${reason || 'استرجاع من الإدارة'}\n\n` +
          `أعاد تيليجرام النجوم إلى رصيدك مباشرة.`,
          { parse_mode: 'HTML' }
        ).catch(() => {});
      }
      return res.json({ success: true, data: { order, starsRefunded: true } });
    }

    const { refundedOrder } = await orderService.refundOrder(order, user, reason || 'استرجاع من الإدارة', req.telegramId);

    const bot = req.app.get('bot');
    if (bot) {
      await bot.telegram.sendMessage(order.user,
        `💰 <b>تم استرجاع مبلغ طلبك</b>\n\n` +
        `📦 ${order.productName} - ${order.durationName}\n` +
        `📋 رقم الطلب: <code>${order.orderNumber}</code>\n` +
        `💵 المبلغ المسترجع: <b>$${order.finalPrice.toFixed(2)}</b>\n` +
        `📝 السبب: ${reason || 'استرجاع من الإدارة'}\n\n` +
        `✅ رصيدك الحالي: <b>$${user.balance.toFixed(2)}</b>`,
        { parse_mode: 'HTML' }
      ).catch(() => {});
    }

    res.json({ success: true, data: { order: refundedOrder } });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ── NEW: cancel a pending order (no payment delivered yet) ──
router.post('/orders/:id/cancel', async (req, res) => {
  try {
    const { reason } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });
    if (!['pending', 'processing'].includes(order.status)) {
      return res.status(400).json({ success: false, error: `Cannot cancel an order with status "${order.status}"` });
    }

    order.status = 'cancelled';
    order.adminNotes = reason || 'ألغي من الإدارة';
    await order.save();

    const bot = req.app.get('bot');
    if (bot) {
      await bot.telegram.sendMessage(order.user,
        `🚫 <b>تم إلغاء طلبك</b>\n\n📦 ${order.productName} - ${order.durationName}\n📋 رقم الطلب: <code>${order.orderNumber}</code>\n📝 السبب: ${reason || 'ألغي من الإدارة'}`,
        { parse_mode: 'HTML' }
      ).catch(() => {});
    }

    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ── ✨ PREMIUM EMOJI MANAGER ───────────────────────────────────────────────
// The owner lists every emoji the bot uses, pastes a Telegram Premium custom
// emoji ID next to it, and the bot renders the animated version everywhere —
// without touching code. Cached in the bot; applies instantly on save.
const customEmoji = require('../../utils/customEmoji');

router.use('/emojis', requirePermission('settings'));

router.get('/emojis/catalog', (req, res) => {
  res.json({
    success: true,
    data: {
      enabled: customEmoji.premiumEnabled(),
      catalog: customEmoji.getEmojiCatalog()
    }
  });
});

router.put('/emojis', async (req, res) => {
  try {
    const { enabled, map } = req.body || {};
    const cleanMap = {};
    for (const [key, id] of Object.entries(map || {})) {
      const v = String(id || '').trim();
      if (!v) continue; // empty = remove override, keep default
      if (!customEmoji.validEmojiId(v)) {
        return res.status(400).json({ success: false, error: `ID غير صالح للإيموجي "${key}" — يجب أن يكون رقماً (من 5 إلى 25 خانة)` });
      }
      cleanMap[key] = v;
    }
    await Settings.set(customEmoji.SETTINGS_KEY_ENABLED, Boolean(enabled), req.telegramId);
    await Settings.set(customEmoji.SETTINGS_KEY_MAP, cleanMap, req.telegramId);
    customEmoji.configurePremiumEmoji(enabled, cleanMap);
    customEmoji.invalidateUnicodeMap();
    res.json({ success: true, data: { enabled: Boolean(enabled), mapped: Object.keys(cleanMap).length } });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Send the requesting admin a live preview message using their mapped IDs.
router.post('/emojis/test', async (req, res) => {
  try {
    const bot = req.app.get('bot');
    if (!bot?.telegram?.sendMessage) {
      return res.status(500).json({ success: false, error: 'البوت غير متاح حالياً' });
    }
    const { safeSendMessage } = require('../../utils/safeSend');
    const sample = ['gamepad', 'rocket', 'fire', 'crown', 'key', 'wallet', 'shield', 'star', 'checkmark', 'gift'];
    const lines = sample.map((key) => `${customEmoji.emojiHtml(key)} — ${key} (ID: ${customEmoji.getEmojiId(key) || 'بدون'})`);
    await customEmoji.loadPremiumEmojiSettings();
    await safeSendMessage(bot.telegram, req.telegramId,
      `${customEmoji.emojiHtml('sparkle')} <b>معاينة الإيموجي البريميوم</b>\n\n${lines.join('\n')}\n\n${customEmoji.premiumEnabled() ? '✅ الإيموجي البريميوم مفعّل حالياً' : '⚠️ الإيموجي البريميوم معطّل حالياً — فعّله من لوحة التحكم'}`,
      { parse_mode: 'HTML' }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

module.exports = router;
