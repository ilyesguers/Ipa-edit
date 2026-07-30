const express = require('express');
const router = express.Router();

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const shopRoutes = require('./routes/shop');
const orderRoutes = require('./routes/orders');
const userRoutes = require('./routes/users');
const uploadRoutes = require('./routes/upload');
const paymentRoutes = require('./routes/payment');
const settingsRoutes = require('./routes/settings');

router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/shop', shopRoutes);
router.use('/orders', orderRoutes);
router.use('/users', userRoutes);
router.use('/upload', uploadRoutes);
router.use('/payment', paymentRoutes);
router.use('/settings', settingsRoutes);

module.exports = router;
