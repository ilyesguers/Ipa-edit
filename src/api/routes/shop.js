const express = require('express');
const router = express.Router();
const Category = require('../../models/Category');
const Game = require('../../models/Game');
const Product = require('../../models/Product');
const Key = require('../../models/Key');
const { authMiddleware, credentialOnly } = require('../../middlewares/auth');

// The catalogue is private: an administrator-issued account is required even
// for browsing, so bypassing the React login screen cannot expose the store.
router.use(authMiddleware, credentialOnly);

// GET all categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true, isHidden: false }).sort('order');
    res.json({ success: true, data: categories });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET games by category
router.get('/categories/:id/games', async (req, res) => {
  try {
    const games = await Game.find({ category: req.params.id, isActive: true, isHidden: false }).sort('order');
    res.json({ success: true, data: games });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET products by game
router.get('/games/:id/products', async (req, res) => {
  try {
    const products = await Product.find({ game: req.params.id, isActive: true, isHidden: false })
      .sort('order')
      .select('-__v');
    res.json({ success: true, data: products });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET single product with stock info
router.get('/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('game').populate('category');
    if (!product) return res.status(404).json({ success: false, error: 'Product not found' });

    // Add stock count for each duration
    const durationsWithStock = await Promise.all(
      product.durations.map(async (dur) => {
        const stock = await Key.countDocuments({
          product: product._id,
          durationId: dur._id,
          status: 'available'
        });
        return {
          ...dur.toObject(),
          stockCount: stock,
          inStock: stock > 0
        };
      })
    );

    const productObj = product.toObject();
    productObj.durations = durationsWithStock;

    res.json({ success: true, data: productObj });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET featured products
router.get('/featured', async (req, res) => {
  try {
    const products = await Product.find({ isActive: true, isFeatured: true })
      .limit(10)
      .populate('game')
      .populate('category');
    res.json({ success: true, data: products });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Escape regex-special characters — a raw user-controlled pattern here is a
// classic ReDoS hole (e.g. "(a+)+$") that could freeze the public shop API.
const escapeRegExp = (s) => String(s || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&').slice(0, 48);

// GET search products
router.get('/search', async (req, res) => {
  try {
    const q = escapeRegExp(req.query.q || '');
    if (!q || q.length < 2) return res.json({ success: true, data: [] });

    const products = await Product.find({
      isActive: true,
      isHidden: false,
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { nameAr: { $regex: q, $options: 'i' } },
        { tags: { $in: [new RegExp(q, 'i')] } }
      ]
    }).limit(20).populate('game').populate('category');

    res.json({ success: true, data: products });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
