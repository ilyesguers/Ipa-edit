const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');

const ADMIN_IDS = (process.env.ADMIN_IDS || '').split(',').map(id => parseInt(id.trim())).filter(Boolean);

// Verify Telegram WebApp init data
const verifyTelegramWebApp = (initData) => {
  if (!initData) return null;
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    params.delete('hash');
    const sortedParams = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('\n');

    const crypto = require('crypto');
    const secretKey = crypto.createHmac('sha256', 'WebAppData')
      .update(process.env.BOT_TOKEN || '').digest();
    const expectedHash = crypto.createHmac('sha256', secretKey)
      .update(sortedParams).digest('hex');

    if (hash !== expectedHash) return null;

    const userStr = params.get('user');
    return userStr ? JSON.parse(decodeURIComponent(userStr)) : null;
  } catch (e) {
    return null;
  }
};

// Main auth middleware - supports Telegram WebApp initData or JWT
const authMiddleware = async (req, res, next) => {
  try {
    let telegramUser = null;

    // Try Telegram WebApp auth
    const initData = req.headers['x-telegram-init-data'] || req.body?.initData;
    if (initData) {
      telegramUser = verifyTelegramWebApp(initData);
    }

    // Try JWT token
    if (!telegramUser) {
      const token = req.headers.authorization?.split(' ')[1];
      if (token) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
        telegramUser = { id: decoded.telegramId };
      }
    }

    // Dev mode: allow telegram ID in header for testing
    if (!telegramUser && process.env.NODE_ENV === 'development') {
      const devId = req.headers['x-dev-telegram-id'];
      if (devId) telegramUser = { id: parseInt(devId) };
    }

    if (!telegramUser) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const user = await User.findOne({ telegramId: telegramUser.id });
    if (!user) return res.status(401).json({ success: false, error: 'User not found' });
    if (user.isBanned) return res.status(403).json({ success: false, error: 'User is banned' });

    req.user = user;
    req.telegramId = user.telegramId;
    req.isAdmin = ADMIN_IDS.includes(user.telegramId) || ['admin', 'superadmin'].includes(user.role);
    next();
  } catch (err) {
    logger.error('Auth error:', err.message);
    return res.status(401).json({ success: false, error: 'Authentication failed' });
  }
};

const adminOnly = (req, res, next) => {
  if (!req.isAdmin) {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }
  next();
};

// ── Granular admin permissions ─────────────────────────────────────────────
// A 'superadmin' (owner in ADMIN_IDS) has every permission. A regular 'admin'
// with an empty `permissions` array keeps full access (backward compatible).
// Admins with a non-empty `permissions` array can only touch their sections.
const ALL_PERMISSIONS = ['dashboard', 'products', 'inventory', 'orders', 'users', 'coupons', 'broadcast', 'settings'];

const hasPermission = (user, permission) => {
  if (!user) return false;
  if (user.role === 'superadmin') return true;
  if (user.role !== 'admin') return false;
  const perms = user.permissions || [];
  if (!perms.length) return true; // full-access admin
  return perms.includes(permission);
};

const requirePermission = (permission) => (req, res, next) => {
  if (!req.user || !hasPermission(req.user, permission)) {
    return res.status(403).json({
      success: false,
      error: `You need the "${permission}" permission to access this section`
    });
  }
  next();
};

const generateToken = (telegramId) => {
  return jwt.sign({ telegramId }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
};

module.exports = { authMiddleware, adminOnly, requirePermission, hasPermission, ALL_PERMISSIONS, generateToken, verifyTelegramWebApp };
