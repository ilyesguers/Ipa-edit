const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../../middlewares/auth');
const User = require('../../models/User');
const Order = require('../../models/Order');

router.use(authMiddleware);

// Get own profile
router.get('/me', async (req, res) => {
  const user = req.user;
  res.json({
    success: true,
    data: {
      telegramId: user.telegramId,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName,
      balance: user.balance,
      role: user.role,
      totalOrders: user.totalOrders,
      totalSpent: user.totalSpent,
      totalDeposited: user.totalDeposited,
      createdAt: user.createdAt,
      preferredLanguage: user.preferredLanguage,
      referralCount: user.referralCount
    }
  });
});

// Update profile
router.put('/me', async (req, res) => {
  try {
    const { preferredLanguage, notificationsEnabled } = req.body;
    const user = await User.findOneAndUpdate(
      { telegramId: req.telegramId },
      { preferredLanguage, notificationsEnabled },
      { new: true }
    );
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Get balance history
router.get('/me/balance-history', async (req, res) => {
  try {
    const user = await User.findOne({ telegramId: req.telegramId }).select('balanceHistory balance');
    res.json({ success: true, data: { balance: user.balance, history: user.balanceHistory.reverse().slice(0, 50) } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
