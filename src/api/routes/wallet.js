const express = require('express');
const rateLimit = require('express-rate-limit');
const { authMiddleware, credentialOnly } = require('../../middlewares/auth');
const WalletTopup = require('../../models/WalletTopup');
const Settings = require('../../models/Settings');
const starsService = require('../../services/starsService');

const router = express.Router();
router.use(authMiddleware, credentialOnly);

const createLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 15, standardHeaders: true, legacyHeaders: false });
const proofLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 15, standardHeaders: true, legacyHeaders: false });
const validAmount = (raw) => {
  const amount = Math.round(Number(raw) * 100) / 100;
  return Number.isFinite(amount) && amount >= 1 && amount <= 10000 ? amount : null;
};
const paypalUrl = (raw, amount) => {
  const value = String(raw || '').trim();
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return /paypal\.me/i.test(value) ? `${value.replace(/\/$/, '')}/${amount.toFixed(2)}` : value;
  if (value.includes('@')) return `https://www.paypal.com/cgi-bin/webscr?cmd=_donations&business=${encodeURIComponent(value)}&amount=${amount.toFixed(2)}&currency_code=USD&no_note=1`;
  return `https://www.paypal.com/paypalme/${value.replace(/^@/, '')}/${amount.toFixed(2)}`;
};

router.get('/config', async (req, res) => {
  try {
    const [stars, minDeposit, wallet, binanceId, paypalEnabled, paypalEmail, paypalLink] = await Promise.all([
      starsService.getStarsConfig(),
      Settings.get('min_deposit', 1),
      Settings.get('usdt_wallet_trc20', ''),
      Settings.get('binance_merchant_id', ''),
      Settings.get('paypal_enabled', false),
      Settings.get('paypal_email', ''),
      Settings.get('paypal_link', '')
    ]);
    res.json({ success: true, data: {
      minDeposit: Math.max(1, Number(minDeposit) || 1),
      stars: { enabled: stars.enabled, perUsd: stars.perUsd },
      usdt: { enabled: Boolean(wallet || binanceId), wallet, binanceId, network: 'TRC20' },
      paypal: { enabled: paypalEnabled !== false && String(paypalEnabled) !== 'false' && Boolean(paypalEmail || paypalLink) }
    } });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

router.post('/stars', createLimiter, async (req, res) => {
  try {
    const amount = validAmount(req.body.amount);
    if (!amount) return res.status(400).json({ success: false, error: 'المبلغ يجب أن يكون بين $1 و $10,000' });
    const config = await starsService.getStarsConfig();
    if (!config.enabled) return res.status(400).json({ success: false, error: 'الدفع بالنجوم غير مفعّل' });
    const starsAmount = starsService.usdToStars(amount, config.perUsd);
    const topup = await WalletTopup.create({ user: req.telegramId, username: req.user.accessUsername || req.user.username, amount, method: 'telegram_stars', starsAmount });
    try {
      const { invoiceUrl } = await starsService.createTopupInvoiceLink(topup, starsAmount);
      res.status(201).json({ success: true, data: { topupId: topup._id, topupNumber: topup.topupNumber, amount, starsAmount, invoiceUrl } });
    } catch (error) {
      await WalletTopup.findByIdAndUpdate(topup._id, { status: 'cancelled', adminNotes: error.message });
      throw error;
    }
  } catch (error) { res.status(400).json({ success: false, error: error.message }); }
});

router.post('/manual', createLimiter, async (req, res) => {
  try {
    const amount = validAmount(req.body.amount);
    const method = String(req.body.method || '');
    if (!amount) return res.status(400).json({ success: false, error: 'المبلغ يجب أن يكون بين $1 و $10,000' });
    if (!['usdt', 'paypal'].includes(method)) return res.status(400).json({ success: false, error: 'طريقة دفع غير مدعومة' });
    const [wallet, binanceId, paypalEnabled, paypalEmail, paypalLink] = await Promise.all([
      Settings.get('usdt_wallet_trc20', ''), Settings.get('binance_merchant_id', ''), Settings.get('paypal_enabled', false), Settings.get('paypal_email', ''), Settings.get('paypal_link', '')
    ]);
    if (method === 'usdt' && !wallet && !binanceId) return res.status(400).json({ success: false, error: 'USDT غير مفعّل حالياً' });
    const paypalIsEnabled = paypalEnabled !== false && String(paypalEnabled) !== 'false';
    if (method === 'paypal' && (!paypalIsEnabled || (!paypalEmail && !paypalLink))) return res.status(400).json({ success: false, error: 'PayPal غير مفعّل حالياً' });
    const topup = await WalletTopup.create({ user: req.telegramId, username: req.user.accessUsername || req.user.username, amount, method });
    res.status(201).json({ success: true, data: {
      topupId: topup._id, topupNumber: topup.topupNumber, amount, method,
      usdt: method === 'usdt' ? { wallet, binanceId, network: 'TRC20' } : null,
      paymentUrl: method === 'paypal' ? paypalUrl(paypalLink || paypalEmail, amount) : null
    } });
  } catch (error) { res.status(400).json({ success: false, error: error.message }); }
});

router.post('/:id/proof', proofLimiter, async (req, res) => {
  try {
    const reference = String(req.body.reference || '').trim();
    if (reference.length < 6 || reference.length > 128 || !/^[\w\-:.\s]+$/i.test(reference)) return res.status(400).json({ success: false, error: 'رقم العملية غير صالح' });
    const duplicate = await WalletTopup.exists({ transactionReference: reference });
    if (duplicate) return res.status(409).json({ success: false, error: 'رقم العملية مستخدم مسبقاً' });
    const topup = await WalletTopup.findOneAndUpdate(
      { _id: req.params.id, user: req.telegramId, method: { $in: ['usdt', 'paypal'] }, status: 'pending' },
      { status: 'processing', transactionReference: reference }, { new: true }
    );
    if (!topup) return res.status(404).json({ success: false, error: 'طلب الشحن غير موجود أو تمت معالجته' });
    const io = req.app.get('io');
    if (io) io.to('admin_room').emit('new_order', { type: 'wallet_topup', productName: `شحن محفظة ${topup.topupNumber}`, durationName: `${topup.method} · $${topup.amount}`, telegramId: topup.user });
    res.json({ success: true, data: topup, message: 'تم إرسال العملية للمراجعة' });
  } catch (error) { res.status(400).json({ success: false, error: error.message }); }
});

router.get('/:id', async (req, res) => {
  const topup = await WalletTopup.findOne({ _id: req.params.id, user: req.telegramId }).select('-adminNotes -transactionReference');
  if (!topup) return res.status(404).json({ success: false, error: 'Top-up not found' });
  res.json({ success: true, data: topup });
});

router.get('/', async (req, res) => {
  const data = await WalletTopup.find({ user: req.telegramId }).sort({ createdAt: -1 }).limit(20).select('-adminNotes');
  res.json({ success: true, data });
});

module.exports = router;
