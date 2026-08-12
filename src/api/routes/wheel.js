const express = require('express');
const router = express.Router();
const WheelGame = require('../../models/WheelGame');
const User = require('../../models/User');
const { authMiddleware, adminOnly } = require('../../middlewares/auth');
const logger = require('../../utils/logger');

// ── Admin routes ──
router.get('/', authMiddleware, adminOnly, async (req, res) => {
  try {
    const wheels = await WheelGame.find().sort({ createdAt: -1 });
    res.json({ success: true, data: wheels });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { name, nameAr, costPerSpin, prizes } = req.body;
    if (!name || !costPerSpin || !Array.isArray(prizes) || prizes.length < 2) {
      return res.status(400).json({ success: false, error: 'الاسم وسعر الدوران و至少 2 جوائز مطلوبة' });
    }
    const wheel = await WheelGame.create({
      name, nameAr: nameAr || '',
      costPerSpin: Math.max(0.01, Number(costPerSpin)),
      prizes: prizes.map(p => ({
        label: String(p.label || '').trim(),
        labelAr: String(p.labelAr || '').trim(),
        value: Math.max(0, Number(p.value) || 0),
        type: p.type || 'balance',
        color: p.color || '#10b981',
        icon: String(p.icon || '').trim(),
        weight: Math.max(0.1, Number(p.weight) || 1),
        isActive: p.isActive !== false
      })),
      createdBy: req.telegramId
    });
    res.json({ success: true, data: wheel });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.put('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { name, nameAr, costPerSpin, prizes, isActive, isHidden } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = String(name);
    if (nameAr !== undefined) updates.nameAr = String(nameAr);
    if (costPerSpin !== undefined) updates.costPerSpin = Math.max(0.01, Number(costPerSpin));
    if (isActive !== undefined) updates.isActive = Boolean(isActive);
    if (isHidden !== undefined) updates.isHidden = Boolean(isHidden);
    if (Array.isArray(prizes)) {
      updates.prizes = prizes.map(p => ({
        label: String(p.label || '').trim(),
        labelAr: String(p.labelAr || '').trim(),
        value: Math.max(0, Number(p.value) || 0),
        type: p.type || 'balance',
        color: p.color || '#10b981',
        icon: String(p.icon || '').trim(),
        weight: Math.max(0.1, Number(p.weight) || 1),
        isActive: p.isActive !== false
      }));
    }
    const wheel = await WheelGame.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!wheel) return res.status(404).json({ success: false, error: 'Wheel not found' });
    res.json({ success: true, data: wheel });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.delete('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    await WheelGame.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Customer routes ──

// List active wheels (public)
router.get('/active', async (req, res) => {
  try {
    const wheels = await WheelGame.find({ isActive: true, isHidden: false })
      .select('-createdBy')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: wheels });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get single wheel (public)
router.get('/:id', async (req, res) => {
  try {
    const wheel = await WheelGame.findById(req.params.id).select('-createdBy');
    if (!wheel || !wheel.isActive) return res.status(404).json({ success: false, error: 'Wheel not found' });
    res.json({ success: true, data: wheel });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Spin the wheel (authenticated)
router.post('/:id/spin', authMiddleware, async (req, res) => {
  try {
    const wheel = await WheelGame.findById(req.params.id);
    if (!wheel || !wheel.isActive) return res.status(404).json({ success: false, error: 'العجلة غير موجودة أو معطّلة' });

    const user = await User.findOne({ telegramId: req.telegramId });
    if (!user) return res.status(404).json({ success: false, error: 'المستخدم غير موجود' });

    if (user.balance < wheel.costPerSpin) {
      return res.status(400).json({
        success: false,
        error: `رصيدك غير كافٍ — تحتاج $${wheel.costPerSpin.toFixed(2)} ورصيدك $${user.balance.toFixed(2)}`
      });
    }

    // Deduct cost
    user.balance = Math.round((user.balance - wheel.costPerSpin) * 100) / 100;
    user.balanceHistory.push({
      type: 'debit',
      amount: wheel.costPerSpin,
      description: `🎰 دوران: ${wheel.nameAr || wheel.name}`,
      adminId: null
    });

    // Pick prize
    const prize = wheel.pickPrize();
    const prizeIndex = wheel.prizes.findIndex(p => p === prize);

    // Credit prize
    let prizeText = '';
    if (prize.type === 'balance' && prize.value > 0) {
      user.balance = Math.round((user.balance + prize.value) * 100) / 100;
      user.balanceHistory.push({
        type: 'credit',
        amount: prize.value,
        description: `🎰 جائزة: ${prize.labelAr || prize.label}`,
        adminId: null
      });
      prizeText = `+$${prize.value.toFixed(2)}`;
    } else {
      prizeText = prize.labelAr || prize.label || 'حظ أوفر';
    }

    await user.save();

    // Update wheel stats
    wheel.totalSpins += 1;
    wheel.totalPayout += prize.value || 0;
    await wheel.save();

    res.json({
      success: true,
      data: {
        prizeIndex,
        prize: {
          label: prize.label,
          labelAr: prize.labelAr,
          value: prize.value,
          type: prize.type,
          color: prize.color,
          icon: prize.icon
        },
        prizeText,
        newBalance: user.balance,
        costPaid: wheel.costPerSpin
      }
    });
  } catch (err) {
    logger.error('Wheel spin error:', err);
    res.status(500).json({ success: false, error: 'حدث خطأ أثناء الدوران' });
  }
});

module.exports = router;
