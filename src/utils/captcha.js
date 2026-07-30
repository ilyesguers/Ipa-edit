/**
 * Simple Math Captcha System
 * Generates simple arithmetic challenges for user verification
 */

const logger = require('./logger');

// Store captcha challenges in memory (by telegramId)
const captchaStore = new Map();

// Clean up old captchas every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of captchaStore.entries()) {
    if (now - value.createdAt > 5 * 60 * 1000) {
      captchaStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Generate a simple math captcha (medium difficulty)
 * @returns {{ question: string, answer: number, emoji: string }}
 */
const generateCaptcha = () => {
  const types = [
    // Simple addition
    () => {
      const a = Math.floor(Math.random() * 20) + 5;
      const b = Math.floor(Math.random() * 15) + 3;
      return { question: `${a} + ${b}`, answer: a + b };
    },
    // Simple subtraction
    () => {
      const a = Math.floor(Math.random() * 30) + 15;
      const b = Math.floor(Math.random() * a) + 1;
      return { question: `${a} - ${b}`, answer: a - b };
    },
    // Simple multiplication
    () => {
      const a = Math.floor(Math.random() * 9) + 2;
      const b = Math.floor(Math.random() * 8) + 2;
      return { question: `${a} × ${b}`, answer: a * b };
    },
    // Mixed: two operations
    () => {
      const a = Math.floor(Math.random() * 10) + 2;
      const b = Math.floor(Math.random() * 8) + 2;
      const c = Math.floor(Math.random() * 5) + 1;
      return { question: `${a} × ${b} + ${c}`, answer: a * b + c };
    }
  ];

  const pick = types[Math.floor(Math.random() * types.length)]();
  
  const emojis = ['🧮', '🔢', '✖️', '➕', '➖', '🎯', '🧩'];
  const emoji = emojis[Math.floor(Math.random() * emojis.length)];

  return {
    question: pick.question,
    answer: pick.answer,
    emoji
  };
};

/**
 * Create a captcha for a user
 * @param {number} telegramId
 * @returns {{ message: string, correctAnswer: number }}
 */
const createCaptcha = (telegramId) => {
  const captcha = generateCaptcha();
  const id = `${telegramId}`;
  
  captchaStore.set(id, {
    answer: captcha.answer,
    attempts: 0,
    createdAt: Date.now()
  });

  return captcha;
};

/**
 * Verify a captcha answer
 * @param {number} telegramId
 * @param {number} userAnswer
 * @returns {{ success: boolean, message: string }}
 */
const verifyCaptcha = (telegramId, userAnswer) => {
  const id = `${telegramId}`;
  const stored = captchaStore.get(id);

  if (!stored) {
    return { success: false, message: '⏳ انتهت صلاحية الكابتشا، حاول مرة أخرى / Captcha expired, try again' };
  }

  stored.attempts += 1;

  if (stored.attempts > 3) {
    captchaStore.delete(id);
    return { success: false, message: '❌ تجاوزت الحد الأقصى للمحاولات / Too many attempts. ارسل /start مرة أخرى' };
  }

  if (parseInt(userAnswer) === stored.answer) {
    captchaStore.delete(id);
    return { success: true, message: '✅ تم التحقق بنجاح! / Verified successfully!' };
  }

  return { 
    success: false, 
    message: `❌ إجابة خاطئة! حاول مرة أخرى (المحاولة المتبقية: ${3 - stored.attempts}) / Wrong answer! Try again (${3 - stored.attempts} attempts left)` 
  };
};

/**
 * Check if a user has an active captcha
 */
const hasActiveCaptcha = (telegramId) => {
  return captchaStore.has(`${telegramId}`);
};

module.exports = {
  createCaptcha,
  verifyCaptcha,
  hasActiveCaptcha
};
