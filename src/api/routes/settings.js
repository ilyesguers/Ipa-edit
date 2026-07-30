const express = require('express');
const router = express.Router();
const { authMiddleware, adminOnly } = require('../../middlewares/auth');
const Settings = require('../../models/Settings');

// Public settings (non-secret only)
router.get('/public', async (req, res) => {
  try {
    const settings = await Settings.find({ isSecret: false });
    const obj = settings.reduce((acc, s) => { acc[s.key] = s.value; return acc; }, {});
    res.json({ success: true, data: obj });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Admin: get all settings
router.get('/', authMiddleware, adminOnly, async (req, res) => {
  try {
    const settings = await Settings.find();
    const obj = settings.reduce((acc, s) => {
      acc[s.key] = s.isSecret ? (s.value ? '***hidden***' : '') : s.value;
      return acc;
    }, {});
    res.json({ success: true, data: obj });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Admin: update settings (bulk)
router.put('/', authMiddleware, adminOnly, async (req, res) => {
  try {
    const updates = req.body; // { key: value, key2: value2 }
    for (const [key, value] of Object.entries(updates)) {
      if (value !== '***hidden***') {
        await Settings.set(key, value, req.telegramId);
      }
    }
    res.json({ success: true, message: 'Settings updated' });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Admin: update single setting
router.put('/:key', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { value } = req.body;
    await Settings.set(req.params.key, value, req.telegramId);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

module.exports = router;
