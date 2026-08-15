const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const User = require('../../models/User');
const { verifyTelegramWebApp, generateToken } = require('../../middlewares/auth');
const { normalizeAccessUsername, verifyPassword } = require('../../utils/passwords');

// A real scrypt digest keeps unknown usernames and known usernames on the same
// expensive verification path, reducing timing-based account enumeration.
const DUMMY_PASSWORD_HASH = 'scrypt$d30cbafce1427d773dbe9a9b6f121d4d$2d25f8eb2808e54231c825a33a6ea065d1667fb691350802ee3c11a48efb54949c436035ee069c9039ab01b3a2f9845d5fe9419af50a376fe9ccc582aa3b7238';

const credentialLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 12,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { success: false, error: 'Too many login attempts. Please try again later.' }
});

const publicUser = (user, isAdmin = false) => ({
  telegramId: user.telegramId,
  username: user.username,
  firstName: user.firstName,
  lastName: user.lastName,
  fullName: user.fullName,
  balance: user.balance,
  role: user.role,
  isAdmin,
  permissions: user.permissions || [],
  totalOrders: user.totalOrders,
  totalSpent: user.totalSpent,
  totalDeposited: user.totalDeposited,
  createdAt: user.createdAt,
  preferredLanguage: user.preferredLanguage,
  languageSelected: Boolean(user.languageSelected),
  accessUsername: user.accessUsername,
  accessExpiresAt: user.accessExpiresAt
});

const credentialLogin = ({ requireAdmin = false } = {}) => async (req, res) => {
  try {
    const username = normalizeAccessUsername(req.body?.username);
    const password = String(req.body?.password || '');
    const user = username
      ? await User.findOne({ accessUsername: username }).select('+accessPasswordHash +accessFailedAttempts +accessLockedUntil')
      : null;

    const now = Date.now();
    const locked = user?.accessLockedUntil && new Date(user.accessLockedUntil).getTime() > now;
    const passwordValid = !locked
      ? await verifyPassword(password, user?.accessPasswordHash || DUMMY_PASSWORD_HASH)
      : false;
    const expired = user?.accessExpiresAt && new Date(user.accessExpiresAt).getTime() <= now;
    const ownerIds = (process.env.ADMIN_IDS || '').split(',').map((id) => parseInt(id.trim(), 10)).filter(Boolean);
    const hasAdminRole = user && (ownerIds.includes(user.telegramId) || ['admin', 'superadmin'].includes(user.role));
    const allowed = user && passwordValid && user.accessEnabled && !expired && !user.isBanned && (!requireAdmin || hasAdminRole);

    if (!allowed) {
      if (user && !locked && !passwordValid) {
        user.accessFailedAttempts = Number(user.accessFailedAttempts || 0) + 1;
        if (user.accessFailedAttempts >= 5) {
          user.accessLockedUntil = new Date(now + 15 * 60 * 1000);
          user.accessFailedAttempts = 0;
        }
        await user.save().catch(() => {});
      }
      // A single generic response prevents account and role enumeration.
      return res.status(401).json({ success: false, error: 'Invalid or inactive login' });
    }

    user.accessFailedAttempts = 0;
    user.accessLockedUntil = null;
    user.accessLastLoginAt = new Date();
    user.lastSeen = new Date();
    await user.save();

    const sessionDays = Math.min(30, Math.max(1, Number(user.accessSessionDays || 7)));
    const token = generateToken(user.telegramId, {
      authType: 'credential',
      sessionVersion: user.accessSessionVersion || 0,
      expiresIn: `${sessionDays}d`
    });

    res.set('Cache-Control', 'no-store');
    res.json({ success: true, token, user: publicUser(user, Boolean(hasAdminRole)) });
  } catch (err) {
    console.error('Credential auth error:', err);
    res.status(500).json({ success: false, error: 'Authentication failed' });
  }
};

// Separate endpoints keep customer and administration intent explicit. Both
// share the same hardened verification and administrator-controlled sessions.
router.post('/login', credentialLoginLimiter, credentialLogin());
router.post('/admin-login', credentialLoginLimiter, credentialLogin({ requireAdmin: true }));

// Authenticate via Telegram WebApp initData
router.post('/telegram', async (req, res) => {
  try {
    const { initData } = req.body;
    if (!initData) return res.status(400).json({ success: false, error: 'initData required' });

    const telegramUser = verifyTelegramWebApp(initData);
    if (!telegramUser) {
      return res.status(401).json({ success: false, error: 'Invalid Telegram auth data' });
    }

    const ADMIN_IDS = (process.env.ADMIN_IDS || '').split(',').map(id => parseInt(id.trim())).filter(Boolean);
    const isAdmin = ADMIN_IDS.includes(telegramUser.id);

    let user = await User.findOne({ telegramId: telegramUser.id });
    if (!user) {
      user = await User.create({
        telegramId: telegramUser.id,
        username: telegramUser.username || null,
        firstName: telegramUser.first_name || '',
        lastName: telegramUser.last_name || '',
        languageCode: telegramUser.language_code || 'ar',
        preferredLanguage: String(telegramUser.language_code || '').toLowerCase().startsWith('en') ? 'en' : 'ar',
        role: isAdmin ? 'admin' : 'customer'
      });
    } else {
      user.username = telegramUser.username || user.username;
      user.firstName = telegramUser.first_name || user.firstName;
      user.lastSeen = new Date();
      if (isAdmin && user.role === 'customer') user.role = 'admin';
      await user.save();
    }

    if (user.isBanned) {
      return res.status(403).json({ success: false, error: 'User is banned', reason: user.banReason });
    }

    const token = generateToken(user.telegramId);

    res.json({
      success: true,
      token,
      user: {
        telegramId: user.telegramId,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        balance: user.balance,
        role: user.role,
        isAdmin: isAdmin || user.role === 'admin',
        permissions: user.permissions || [],
        totalOrders: user.totalOrders,
        totalSpent: user.totalSpent,
        totalDeposited: user.totalDeposited,
        createdAt: user.createdAt,
        preferredLanguage: user.preferredLanguage,
        languageSelected: Boolean(user.languageSelected)
      }
    });
  } catch (err) {
    console.error('Auth error:', err);
    res.status(500).json({ success: false, error: 'Authentication failed' });
  }
});

// Get current user profile
router.get('/me', require('../../middlewares/auth').authMiddleware, async (req, res) => {
  const user = req.user;
  res.json({
    success: true,
    user: {
      telegramId: user.telegramId,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName,
      balance: user.balance,
      role: user.role,
      isAdmin: req.isAdmin,
      permissions: user.permissions || [],
      totalOrders: user.totalOrders,
      totalSpent: user.totalSpent,
      totalDeposited: user.totalDeposited,
      createdAt: user.createdAt,
      preferredLanguage: user.preferredLanguage,
      languageSelected: Boolean(user.languageSelected)
    }
  });
});

module.exports = router;
