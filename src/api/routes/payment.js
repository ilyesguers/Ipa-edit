const express = require('express');
const router = express.Router();
const Settings = require('../../models/Settings');
const QRCode = require('qrcode');

// Get payment info (wallet address + QR for manual payment + PayPal link)
router.get('/info', async (req, res) => {
  try {
    const [wallet, minDeposit, paymentTimeoutMinutes, binanceId, paypalEnabled, paypalEmail, paypalLink] = await Promise.all([
      Settings.get('usdt_wallet_trc20', ''),
      Settings.get('min_deposit', 1),
      Settings.get('payment_timeout_minutes', 15),
      Settings.get('binance_merchant_id', ''),
      Settings.get('paypal_enabled', false),
      Settings.get('paypal_email', ''),
      Settings.get('paypal_link', '')
    ]);

    res.json({
      success: true,
      data: {
        usdtWallet: wallet,
        binanceId,
        minDeposit,
        network: 'TRC20',
        currency: 'USDT',
        paymentTimeoutMinutes,
        paypal: {
          enabled: Boolean(paypalEnabled) || Boolean(paypalEmail || paypalLink),
          email: paypalEmail,
          link: paypalLink
        }
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
