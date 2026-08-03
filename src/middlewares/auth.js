const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const logger = require('../utils/logger');

const ADMIN_IDS = (process.env.ADMIN_IDS || '').split(',').map(id => parseInt(id.trim())).filter(Boolean);

// ── JWT secret ──────────────────────────────────────────────────────────────
// SECURITY: never fall back to a hard-coded secret. If JWT_SECRET is missing
// we generate a cryptographically random one for this process (tokens issued
// before a restart become invalid, which is safe: clients silently re-auth
// with Telegram initData). A fixed fallback would let anyone forge tokens and
// take over accounts — including admin accounts.
let BOOT_JWT_SECRET = null;
const getJwtSecret = () => {
  const envSecret = String(process.env.JWT_SECRET || '').trim();
  if (envSecret && envSecret !== 'secret') return envSecret;
  if (!BOOT_JWT_SECRET) {
    BOOT_JWT_SECRET = crypto.randomBytes(48).toString('hex');
    logger.warn('⚠️ JWT_SECRET is not set in the environment — a random per-boot secret was generated. Set JWT_SECRET so sessions survive restarts.');
  }
  return BOOT_JWT_SECRET;
};

// Maximum age (seconds) accepted for Telegram initData. Old WebApp payloads
// are still fully re-usable by an attacker if they leak, so a replay window
// closes that hole. Default: 7 days — strict enough to kill indefinite replay,
// lenient enough that long-lived WebView sessions never break for customers.
// Configure with TG_AUTH_MAX_AGE_SECONDS (0 disables the check).
const TG_AUTH_MAX_AGE = Number(process.env.TG_AUTH_MAX_AGE_SECONDS ?? 7 * 24 * 60 * 60);

const timingSafeEqualHex = (a, b) => {
  try {
    const bufA = Buffer.from(String(a), 'hex');
    const bufB = Buffer.from(String(b), 'hex');
    return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
  } catch (_) {
    return false;
  }
};

// Verify Telegram WebApp init data
const verifyTelegramWebApp = (initData) => {
  if (!initData || typeof initData !== 'string') return null;
  // Guard against oversized payloads (initData is normally < 4KB)
  if (initData.length > 16 * 1024) return null;
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return null;
    params.delete('hash');
    const sortedParams = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('\n');

    const secretKey = crypto.createHmac('sha256', 'WebAppData')
      .update(process.env.BOT_TOKEN || '').digest();
    const expectedHash = crypto.createHmac('sha256', secretKey)
      .update(sortedParams).digest('hex');

    // Constant-time comparison so the hash can't be brute-forced by timing.
    if (!timingSafeEqualHex(hash, expectedHash)) return null;

    // Replay protection: reject very old initData so a leaked payload cannot
    // be reused forever. URLSearchParams.get already percent-decodes values —
    // decoding again corrupts names that legitimately contain '%' (+ fixed).
    if (TG_AUTH_MAX_AGE > 0) {
      const authDate = parseInt(params.get('auth_date') || '0', 10);
      if (!authDate || Math.abs(Date.now() / 1000 - authDate) > TG_AUTH_MAX_AGE) return null;
    }

    const userStr = params.get('user');
    if (!userStr) return null;
    const user = JSON.parse(userStr);
    if (!user || !Number.isFinite(Number(user.id))) return null;
    return user;
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
        const decoded = jwt.verify(token, getJwtSecret());
        if (Number.isFinite(Number(decoded.telegramId))) {
          telegramUser = { id: Number(decoded.telegramId) };
        }
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
  return jwt.sign({ telegramId: Number(telegramId) }, getJwtSecret(), { expiresIn: '7d' });
};

module.exports = { authMiddleware, adminOnly, requirePermission, hasPermission, ALL_PERMISSIONS, generateToken, verifyTelegramWebApp };
