/**
 * 🎮 GAMER ERROR HANDLER - Gaming-themed error messages
 * Provides user-friendly error messages for common bot issues
 */

const { emojiHtml } = require('./customEmoji');

/**
 * Get user-friendly gaming error message
 * @param {string} errorType - Type of error
 * @param {string} lang - Language code ('ar' or 'en')
 * @returns {string} - Gaming-themed error message
 */
const getGamerError = (errorType, lang = 'ar') => {
  const errors = {
    // Database/User errors
    userNotFound: {
      ar: `${emojiHtml('ghost')} <b>يا خوي بياناتك ما وصلت!</b>\n\n` +
          `${emojiHtml('rocket')} جرب /start مرة ثانية عشان تتحمل بياناتك\n\n` +
          `${emojiHtml('fire')} لو استمرت المشكلة، تواصل مع الدعم`,
      en: `${emojiHtml('ghost')} <b>Your data didn't load!</b>\n\n` +
          `${emojiHtml('rocket')} Try /start again to load your data\n\n` +
          `${emojiHtml('fire')} If problem continues, contact support`
    },
    
    dbError: {
      ar: `${emojiHtml('bolt')} <b>لاق كبير! ⏳</b>\n\n` +
          `${emojiHtml('target')} السيرفر يتحمل ضغط - جرب بعد شوي\n\n` +
          `${emojiHtml('explosion')} لو استمرت المشكلة، تواصل مع الدعم`,
      en: `${emojiHtml('bolt')} <b>Major LAG detected!</b>\n\n` +
          `${emojiHtml('target')} Server under pressure - try again in a bit\n\n` +
          `${emojiHtml('explosion')} If it continues, contact support`
    },
  
    // Command errors
    commandError: {
      ar: `${emojiHtml('skull')} <b>الأمر ما اشتغل!</b>\n\n` +
          `${emojiHtml('rocket')} جرب /start للبدء من جديد\n\n` +
          `${emojiHtml('fire')} أو تواصل مع الدعم لو تحتاج مساعدة`,
      en: `${emojiHtml('skull')} <b>Command failed!</b>\n\n` +
          `${emojiHtml('rocket')} Try /start to restart\n\n` +
          `${emojiHtml('fire')} Or contact support if you need help`
    },
    
    // Generic error
    generic: {
      ar: `${emojiHtml('explosion')} <b>صار لاق صغير</b>\n\n` +
          `${emojiHtml('target')} حاول مرة ثانية - غالباً يزبط!\n\n` +
          `${emojiHtml('rocket')} لو كل مرة يسقط، تواصل مع الدعم`,
      en: `${emojiHtml('explosion')} <b>BOOM! Small glitch</b>\n\n` +
          `${emojiHtml('target')} Try again - usually fixes it!\n\n` +
          `${emojiHtml('rocket')} If it keeps happening, contact support`
    },
    
    // Loading state
    loading: {
      ar: `${emojiHtml('bolt')} <b>جاري التحميل...</b>\n\n` +
          `${emojiHtml('rocket')} ثواني وتجهز!`,
      en: `${emojiHtml('bolt')} <b>Loading...</b>\n\n` +
          `${emojiHtml('rocket')} Almost ready!`
    },
    
    // Maintenance
    maintenance: {
      ar: `${emojiHtml('gear')} <b>الصيانة جارية!</b>\n\n` +
          `${emojiHtml('rocket')} بنرجع بأسرع وقت - فضولي؟\n\n` +
          `${emojiHtml('fire')} تابعنا عشان تعرف متى نرجع!`,
      en: `${emojiHtml('gear')} <b>Under maintenance!</b>\n\n` +
          `${emojiHtml('rocket')} Coming back ASAP - stay tuned!\n\n` +
          `${emojiHtml('fire')} Follow us to know when we're back!`
    }
  };
  
  return errors[errorType]?.[lang] || errors.generic[lang];
};

/**
 * Detect language from context or default
 */
const detectLang = (ctx) => {
  if (ctx.dbUser?.preferredLanguage) return ctx.dbUser.preferredLanguage;
  if (ctx.from?.language_code) {
    return String(ctx.from.language_code).toLowerCase().startsWith('en') ? 'en' : 'ar';
  }
  return 'ar';
};

/**
 * Check if an error is caused by the database (MongoDB).
 * Handles every common Mongoose/Mongo error signature so users get the
 * dedicated "dbError" message instead of the misleading generic "Small glitch".
 */
const isDbError = (err) => {
  if (!err) return false;
  const msg = String(err.message || err.description || '');
  const name = err.name || '';
  return (
    msg.includes('MongoDB') ||
    msg.includes('MongoNetworkError') ||
    msg.includes('MongoNotConnectedError') ||
    msg.includes('ECONNREFUSED') ||
    msg.includes('buffering timed out') ||
    msg.includes('server selection timed out') ||
    msg.includes('timed out after') ||
    name === 'MongoNetworkError' ||
    name === 'MongoNotConnectedError' ||
    name === 'MongoServerSelectionError' ||
    name === 'MongooseServerSelectionError' ||
    name === 'MongooseError'
  );
};

const escHtml = (value) =>
  String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Throttle: at most one alert per error signature per minute, so a total
// outage (every message failing) doesn't spam the admins.
const lastAlertAt = new Map();

/**
 * Send the REAL error to the configured admins (ADMIN_IDS) so the owner can
 * see exactly why users are getting error messages, without digging through logs.
 */
const notifyAdminsOfError = (ctx, err, errorType = 'generic') => {
  const adminIds = (process.env.ADMIN_IDS || '').split(',').map(id => parseInt(id.trim())).filter(Boolean);
  if (!adminIds.length || !ctx?.telegram) return;

  const key = `${errorType}:${String((err && err.message) || err || '').slice(0, 80)}`;
  const now = Date.now();
  if (lastAlertAt.has(key) && now - lastAlertAt.get(key) < 60000) return;
  lastAlertAt.set(key, now);

  const userTag = ctx.from
    ? (ctx.from.username ? `@${ctx.from.username}` : `${ctx.from.first_name || ''} (${ctx.from.id})`)
    : 'unknown';
  const where = ctx.updateType || (ctx.callbackQuery ? 'callback_query' : 'message');
  const detail = String((err && (err.message || err.description)) || err || 'Unknown error').slice(0, 400);

  const text =
    `${emojiHtml('skull')} <b>Bot Error Detected</b>\n\n` +
    `${emojiHtml('target')} Type: <code>${escHtml(errorType)}</code>\n` +
    `${emojiHtml('ghost')} User: <code>${escHtml(userTag)}</code>\n` +
    `${emojiHtml('bolt')} Where: <code>${escHtml(where)}</code>\n\n` +
    `${emojiHtml('fire')} <b>Real error:</b>\n<code>${escHtml(detail)}</code>\n\n` +
    `${emojiHtml('rocket')} Check logs for the full stack.`;

  for (const adminId of adminIds) {
    ctx.telegram.sendMessage(adminId, text, { parse_mode: 'HTML' }).catch(() => {});
  }
};

/**
 * Send error message with gaming theme
 */
const sendGamerError = async (ctx, errorType = 'generic', extra = {}) => {
  const lang = detectLang(ctx);
  const message = getGamerError(errorType, lang);
  const parseMode = extra.parse_mode || 'HTML';
  
  try {
    return await ctx.reply(message, { parse_mode: parseMode, ...extra });
  } catch (err) {
    // If HTML fails, try plain text with premium emojis
    try {
      const plainMsg = message.replace(/<[^>]*>/g, '');
      return await ctx.reply(plainMsg, extra);
    } catch (_) {
      // Last resort with premium emojis
      return ctx.reply(
        lang === 'en' 
          ? `${emojiHtml('rocket')} Error detected. Try /start` 
          : `${emojiHtml('rocket')} تم اكتشاف خطأ. جرب /start`
      );
    }
  }
};

/**
 * Check if user exists and send error if not
 */
const requireUser = (ctx) => {
  if (!ctx.dbUser) {
    return { valid: false, lang: detectLang(ctx) };
  }
  return { valid: true, user: ctx.dbUser, lang: ctx.dbUser.preferredLanguage || 'ar' };
};

/**
 * Wrap handler with user check
 */
const withUser = (handler) => {
  return async (ctx, ...args) => {
    const { valid, lang } = requireUser(ctx);
    if (!valid) {
      return sendGamerError(ctx, 'userNotFound');
    }
    return handler(ctx, ...args);
  };
};

module.exports = {
  getGamerError,
  detectLang,
  sendGamerError,
  isDbError,
  notifyAdminsOfError,
  requireUser,
  withUser
};
