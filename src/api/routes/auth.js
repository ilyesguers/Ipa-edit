const express = require('express');
const router = express.Router();
const User = require('../../models/User');
const { verifyTelegramWebApp, generateToken } = require('../../middlewares/auth');

// Authenticate via Telegram WebApp initData
router.post('/telegram', async (req, res) => {
  try {
    const { initData } = req.body;
    if (!initData) return res.status(400).json({ success: false, error: 'initData required' });

    const telegramUser = verifyTelegramWebApp(initData);
    if (!telegramUser) {
      return res.status(401).json({ success: false, error: 'Invalid Telegram auth data' });
    }

    const ADMIN_IDS = (process.env.ADMIN_IDS || '').split(',').map(id => parseInt(id.trim())).filter(Boolean);
    const isAdmin = ADMIN_IDS.includes(telegramUser.id);

    let user = await User.findOne({ telegramId: telegramUser.id });
    if (!user) {
      user = await User.create({
        telegramId: telegramUser.id,
        username: telegramUser.username || null,
        firstName: telegramUser.first_name || '',
        lastName: telegramUser.last_name || '',
        languageCode: telegramUser.language_code || 'ar',
        preferredLanguage: String(telegramUser.language_code || '').toLowerCase().startsWith('en') ? 'en' : 'ar',
        role: isAdmin ? 'admin' : 'customer'
      });
    } else {
      user.username = telegramUser.username || user.username;
      user.firstName = telegramUser.first_name || user.firstName;
      user.lastSeen = new Date();
      if (isAdmin && user.role === 'customer') user.role = 'admin';
      await user.save();
    }

    if (user.isBanned) {
      return res.status(403).json({ success: false, error: 'User is banned', reason: user.banReason });
    }

    const token = generateToken(user.telegramId);

    res.json({
      success: true,
      token,
      user: {
        telegramId: user.telegramId,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        balance: user.balance,
        role: user.role,
        isAdmin: isAdmin || user.role === 'admin',
        permissions: user.permissions || [],
        totalOrders: user.totalOrders,
        totalSpent: user.totalSpent,
        totalDeposited: user.totalDeposited,
        createdAt: user.createdAt,
        preferredLanguage: user.preferredLanguage
      }
    });
  } catch (err) {
    console.error('Auth error:', err);
    res.status(500).json({ success: false, error: 'Authentication failed' });
  }
});

// Get current user profile
router.get('/me', require('../../middlewares/auth').authMiddleware, async (req, res) => {
  const user = req.user;
  res.json({
    success: true,
    user: {
      telegramId: user.telegramId,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName,
      balance: user.balance,
      role: user.role,
      isAdmin: req.isAdmin,
      permissions: user.permissions || [],
      totalOrders: user.totalOrders,
      totalSpent: user.totalSpent,
      totalDeposited: user.totalDeposited,
      createdAt: user.createdAt,
      preferredLanguage: user.preferredLanguage
    }
  });
});

module.exports = router;
