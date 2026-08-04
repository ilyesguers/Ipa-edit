const express = require('express');
const router = express.Router();
const { authMiddleware, adminOnly, requirePermission } = require('../../middlewares/auth');
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
router.get('/', authMiddleware, adminOnly, requirePermission('settings'), async (req, res) => {
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

// Only these settings may be changed through the API. Anything else (even a
// typo) is rejected instead of silently creating junk keys in the database.
const ALLOWED_SETTING_KEYS = new Set([
  'bot_name', 'bot_username', 'channel_username', 'support_username', 'channel_id',
  'ui_theme_preset', 'ui_welcome_badge_ar', 'ui_welcome_badge_en', 'ui_welcome_title_ar',
  'ui_welcome_title_en', 'ui_welcome_subtitle_ar', 'ui_welcome_subtitle_en',
  'ui_footer_note_ar', 'ui_footer_note_en', 'admin_portal_label_ar', 'admin_portal_label_en',
  'ui_home_highlights', 'bot_quick_links',
  'welcome_message', 'maintenance_message', 'shop_title', 'shop_description', 'footer_text',
  'binance_api_key', 'binance_secret_key', 'binance_merchant_id', 'usdt_wallet_trc20',
  'min_deposit', 'payment_timeout_minutes', 'stars_enabled', 'stars_per_usd',
  'paypal_enabled', 'paypal_email', 'paypal_link',
  'balance_offers_enabled', 'balance_offers_note_ar', 'balance_offers_note_en',
  'referral_bonus', 'auto_verify_payments', 'admin_notification_on_order',
  'admin_notification_on_payment', 'force_join_channel', 'maintenance_mode',
  'premium_emoji_enabled', 'premium_emoji_map'
]);

const isDangerousValue = (value) => {
  if (value === null || value === undefined) return false;
  // Never allow Mongo operator objects — defence in depth against injection.
  if (typeof value === 'object' && !Array.isArray(value)) {
    return Object.keys(value).some((k) => k.startsWith('$'));
  }
  return false;
};

// Admin: update settings (bulk)
router.put('/', authMiddleware, adminOnly, requirePermission('settings'), async (req, res) => {
  try {
    const updates = req.body; // { key: value, key2: value2 }
    if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
      return res.status(400).json({ success: false, error: 'Invalid payload' });
    }
    for (const [key, value] of Object.entries(updates)) {
      if (!ALLOWED_SETTING_KEYS.has(key)) continue;
      if (value === '***hidden***' || isDangerousValue(value)) continue;
      await Settings.set(key, value, req.telegramId);
      require('../../utils/settingsCache').invalidateSettings(key);
    }
    // Keep the in-bot premium emoji cache in sync when edited from there.
    if (updates.premium_emoji_enabled !== undefined || updates.premium_emoji_map !== undefined) {
      const customEmoji = require('../../utils/customEmoji');
      const enabled = await Settings.get(customEmoji.SETTINGS_KEY_ENABLED, false);
      const map = await Settings.get(customEmoji.SETTINGS_KEY_MAP, {});
      customEmoji.configurePremiumEmoji(enabled, map);
      customEmoji.invalidateUnicodeMap();
    }
    res.json({ success: true, message: 'Settings updated' });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Admin: update single setting
router.put('/:key', authMiddleware, adminOnly, requirePermission('settings'), async (req, res) => {
  try {
    if (!ALLOWED_SETTING_KEYS.has(req.params.key)) {
      return res.status(400).json({ success: false, error: 'Unknown setting key' });
    }
    const { value } = req.body;
    if (isDangerousValue(value)) {
      return res.status(400).json({ success: false, error: 'Invalid value' });
    }
    await Settings.set(req.params.key, value, req.telegramId);
    require('../../utils/settingsCache').invalidateSettings(req.params.key);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

module.exports = router;
