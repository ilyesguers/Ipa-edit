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
      ar: `${emojiHtml('ghost')} <b>يا خوي بياناتك ما وصلت!</b> 💀\n\n` +
          `${emojiHtml('rocket')} جرب /start مرة ثانية عشان تتحمل بياناتك 🚀\n\n` +
          `${emojiHtml('fire')} لو استمرت المشكلة، تواصل مع الدعم 🔥`,
      en: `${emojiHtml('ghost')} <b>Your data didn't load!</b> 💀\n\n` +
          `${emojiHtml('rocket')} Try /start again to load your data 🚀\n\n` +
          `${emojiHtml('fire')} If problem continues, contact support 🔥`
    },
    
    dbError: {
      ar: `${emojiHtml('bolt')} <b>LAG太大了! ⏳</b>\n\n` +
          `${emojiHtml('target')} السرفر يتحمل ضغط - جرب بعد شوي 🎮\n\n` +
          `${emojiHtml('explosion')} لو开封 continues، تواصل مع الدعم 👾`,
      en: `${emojiHtml('bolt')} <b>Major LAG detected! ⏳</b>\n\n` +
          `${emojiHtml('target')} Server under pressure - try again in a bit 🎮\n\n` +
          `${emojiHtml('explosion')} If it continues, contact support 👾`
    },
    
    // Command errors
    commandError: {
      ar: `${emojiHtml('skull')} <b>الأمر ما اشتغل!</b> 💀\n\n` +
          `${emojiHtml('rocket')} جرب /start للبدء من جديد 🚀\n\n` +
          `${emojiHtml('fire')} أو تواصل مع الدعم لو تحتاج مساعدة 🔥`,
      en: `${emojiHtml('skull')} <b>Command failed!</b> 💀\n\n` +
          `${emojiHtml('rocket')} Try /start to restart 🚀\n\n` +
          `${emojiHtml('fire')} Or contact support if you need help 🔥`
    },
    
    // Generic error
    generic: {
      ar: `${emojiHtml('explosion')} <b>砸! صار لاق صغير</b> 💥\n\n` +
          `${emojiHtml('target')} حاول مرة ثانية - غالباً يزبط! 🎯\n\n` +
          `${emojiHtml('rocket')} لو كل مرة يسقط، تواصل مع الدعم 🚀`,
      en: `${emojiHtml('explosion')} <b>BOOM! Small glitch</b> 💥\n\n` +
          `${emojiHtml('target')} Try again - usually fixes it! 🎯\n\n` +
          `${emojiHtml('rocket')} If it keeps happening, contact support 🚀`
    },
    
    // Loading state
    loading: {
      ar: `${emojiHtml('bolt')} <b>جاري التحميل...</b> ⚡\n\n` +
          `${emojiHtml('rocket')} ثواني وتجهز! 🚀`,
      en: `${emojiHtml('bolt')} <b>Loading...</b> ⚡\n\n` +
          `${emojiHtml('rocket')} Almost ready! 🚀`
    },
    
    // Maintenance
    maintenance: {
      ar: `${emojiHtml('gear')} <b>الصيانة جارية!</b> 🔧\n\n` +
          `${emojiHtml('rocket')} بنرجع بأسرع وقت - فضولي؟ 🚀\n\n` +
          `${emojiHtml('fire')} تابعنا عشان تعرف متى نرجع! 🔥`,
      en: `${emojiHtml('gear')} <b>Under maintenance!</b> 🔧\n\n` +
          `${emojiHtml('rocket')} Coming back ASAP - stay tuned! 🚀\n\n` +
          `${emojiHtml('fire')} Follow us to know when we're back! 🔥`
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
 * Send error message with gaming theme
 */
const sendGamerError = async (ctx, errorType = 'generic', extra = {}) => {
  const lang = detectLang(ctx);
  const message = getGamerError(errorType, lang);
  const parseMode = extra.parse_mode || 'HTML';
  
  try {
    return await ctx.reply(message, { parse_mode: parseMode, ...extra });
  } catch (err) {
    // If HTML fails, try plain text
    try {
      const plainMsg = message.replace(/<[^>]*>/g, '');
      return await ctx.reply(plainMsg, extra);
    } catch (_) {
      // Last resort
      return ctx.reply(
        lang === 'en' 
          ? '⚠️ Error detected. Try /start 🔄' 
          : '⚠️ تم اكتشاف خطأ. جرب /start 🔄'
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
  requireUser,
  withUser
};
