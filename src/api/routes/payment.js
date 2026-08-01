const express = require('express');
const router = express.Router();
const Settings = require('../../models/Settings');
const QRCode = require('qrcode');

// Get payment info (wallet address + QR for manual payment)
router.get('/info', async (req, res) => {
  try {
    const wallet = await Settings.get('usdt_wallet_trc20', '');
    const minDeposit = await Settings.get('min_deposit', 1);
    const paymentTimeoutMinutes = await Settings.get('payment_timeout_minutes', 15);

    res.json({
      success: true,
      data: {
        usdtWallet: wallet,
        minDeposit,
        network: 'TRC20',
        currency: 'USDT',
        paymentTimeoutMinutes
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Generate QR for amount
router.get('/qr/:amount', async (req, res) => {
  try {
    const amount = parseFloat(req.params.amount);
    const wallet = await Settings.get('usdt_wallet_trc20', '');
    const qrData = wallet || `Send ${amount} USDT TRC20`;
    const qrUrl = await QRCode.toDataURL(qrData, { width: 300, margin: 2 });
    res.json({ success: true, qrUrl, wallet, amount });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
