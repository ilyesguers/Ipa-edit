const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const WheelGame = require('../../models/WheelGame');
const WheelSpin = require('../../models/WheelSpin');
const User = require('../../models/User');
const { authMiddleware, adminOnly } = require('../../middlewares/auth');
const logger = require('../../utils/logger');

const clampPage = (v, def = 1) => Math.min(Math.max(parseInt(v, 10) || def, 1), 10000);
const clampLimit = (v, def = 30) => Math.min(Math.max(parseInt(v, 10) || def, 1), 50);

const mapPrize = (p) => ({
  label: String(p.label || '').trim(),
  labelAr: String(p.labelAr || '').trim(),
  value: Math.max(0, Number(p.value) || 0),
  type: p.type === 'nothing' ? 'nothing' : 'balance',
  color: p.color || '#10b981',
  icon: String(p.icon || '').trim(),
  weight: Math.max(0.1, Number(p.weight) || 1),
  isActive: p.isActive !== false
});

const notifyAdminsOfSpin = (req, payload) => {
  try {
    const bot = req.app.get('bot');
    if (!bot?.telegram?.sendMessage) return;
    const adminIds = String(process.env.ADMIN_IDS || '')
      .split(',')
      .map((id) => parseInt(id.trim(), 10))
      .filter(Boolean);
    if (!adminIds.length) return;
    const prizeName = payload.prize.labelAr || payload.prize.label || 'جائزة';
    const prizeValue = payload.prize.value > 0 ? ` (+$${Number(payload.prize.value).toFixed(2)})` : '';
    const text =
      `🎡 <b>فوز في عجلة الحظ</b>\n\n` +
      `👤 ${payload.firstName || 'مستخدم'} (@${payload.username || 'N/A'})\n` +
      `🆔 <code>${payload.telegramId}</code>\n` +
      `🎰 ${payload.wheelName}\n` +
      `🎁 ${prizeName}${prizeValue}\n` +
      `💰 الرصيد بعد الدوران: <b>$${Number(payload.newBalance).toFixed(2)}</b>`;
    for (const adminId of adminIds) {
      bot.telegram.sendMessage(adminId, text, { parse_mode: 'HTML' }).catch(() => {});
    }
  } catch (err) {
    logger.warn('Wheel admin notify failed:', err.message);
  }
};

// ── Admin routes ──
router.get('/', authMiddleware, adminOnly, async (req, res) => {
  try {
    const wheels = await WheelGame.find().sort({ createdAt: -1 });
    res.json({ success: true, data: wheels });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/spins', authMiddleware, adminOnly, async (req, res) => {
  try {
    const page = clampPage(req.query.page);
    const limit = clampLimit(req.query.limit);
    const filter = {};
    if (req.query.wheelId && mongoose.Types.ObjectId.isValid(req.query.wheelId)) {
      filter.wheel = req.query.wheelId;
    }
    if (req.query.telegramId && Number.isFinite(Number(req.query.telegramId))) {
      filter.telegramId = Number(req.query.telegramId);
    }
    const [spins, total] = await Promise.all([
      WheelSpin.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      WheelSpin.countDocuments(filter)
    ]);
    res.json({ success: true, data: spins, total, page, totalPages: Math.ceil(total / limit) || 1 });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { name, nameAr, costPerSpin, prizes } = req.body;
    if (!name || !costPerSpin || !Array.isArray(prizes) || prizes.length < 2) {
      return res.status(400).json({ success: false, error: 'الاسم وسعر الدوران وجائزتان على الأقل مطلوبة' });
    }
    const wheel = await WheelGame.create({
      name, nameAr: nameAr || '',
      costPerSpin: Math.max(0.01, Number(costPerSpin)),
      prizes: prizes.map(mapPrize),
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
    if (Array.isArray(prizes)) updates.prizes = prizes.map(mapPrize);
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

router.get('/:id', async (req, res) => {
  try {
    const wheel = await WheelGame.findById(req.params.id).select('-createdBy');
    if (!wheel || !wheel.isActive) return res.status(404).json({ success: false, error: 'Wheel not found' });
    res.json({ success: true, data: wheel });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/:id/spin', authMiddleware, async (req, res) => {
  try {
    const wheel = await WheelGame.findById(req.params.id);
    if (!wheel || !wheel.isActive) return res.status(404).json({ success: false, error: 'العجلة غير موجودة أو معطّلة' });

    const picked = wheel.pickPrize();
    const prize = picked?.prize;
    if (!prize) return res.status(400).json({ success: false, error: 'لا توجد جوائز متاحة في هذه العجلة' });

    const cost = Number(wheel.costPerSpin) || 0;
    const credit = prize.type === 'balance' && Number(prize.value) > 0 ? Number(prize.value) : 0;
    const net = Math.round((credit - cost) * 100) / 100;
    const history = [{
      type: 'debit',
      amount: cost,
      description: `🎰 دوران: ${wheel.nameAr || wheel.name}`,
      adminId: null,
      createdAt: new Date()
    }];
    if (credit > 0) {
      history.push({
        type: 'credit',
        amount: credit,
        description: `🎰 جائزة: ${prize.labelAr || prize.label}`,
        adminId: null,
        createdAt: new Date()
      });
    }

    const user = await User.findOneAndUpdate(
      { telegramId: req.telegramId, balance: { $gte: cost } },
      { $inc: { balance: net }, $push: { balanceHistory: { $each: history } } },
      { new: true }
    );
    if (!user) {
      const existing = await User.findOne({ telegramId: req.telegramId }).select('balance');
      if (!existing) return res.status(404).json({ success: false, error: 'المستخدم غير موجود' });
      return res.status(400).json({
        success: false,
        error: `رصيدك غير كافٍ — تحتاج $${cost.toFixed(2)} ورصيدك $${Number(existing.balance || 0).toFixed(2)}`
      });
    }

    await WheelGame.findByIdAndUpdate(wheel._id, {
      $inc: { totalSpins: 1, totalPayout: Number(prize.value) || 0 }
    });

    const spinLog = await WheelSpin.create({
      wheel: wheel._id,
      wheelName: wheel.nameAr || wheel.name,
      telegramId: user.telegramId,
      username: user.username || '',
      firstName: user.firstName || '',
      prizeLabel: prize.label || '',
      prizeLabelAr: prize.labelAr || '',
      prizeValue: Number(prize.value) || 0,
      prizeType: prize.type || 'balance',
      prizeIcon: prize.icon || '',
      prizeColor: prize.color || '',
      costPaid: cost,
      newBalance: user.balance
    });

    notifyAdminsOfSpin(req, {
      telegramId: user.telegramId,
      username: user.username,
      firstName: user.firstName,
      wheelName: wheel.nameAr || wheel.name,
      prize,
      newBalance: user.balance
    });

    res.json({
      success: true,
      data: {
        prizeIndex: picked.activeIndex,
        prize: {
          label: prize.label,
          labelAr: prize.labelAr,
          value: prize.value,
          type: prize.type,
          color: prize.color,
          icon: prize.icon
        },
        prizeText: credit > 0 ? `+$${credit.toFixed(2)}` : (prize.labelAr || prize.label || 'حظ أوفر'),
        newBalance: user.balance,
        costPaid: cost,
        spinId: spinLog._id
      }
    });
  } catch (err) {
    logger.error('Wheel spin error:', err);
    res.status(500).json({ success: false, error: 'حدث خطأ أثناء الدوران' });
  }
});

module.exports = router;
