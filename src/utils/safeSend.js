/**
 * 🛡️ Resilient Telegram send helpers.
 *
 * Premium animated custom emoji (via <tg-emoji> in HTML text, or via
 * `icon_custom_emoji_id` on buttons) require the bot owner to have a Telegram
 * Premium subscription AND a valid, accessible emoji id. If ANY id is invalid,
 * Telegram rejects the ENTIRE request with a 400 error such as:
 *   - CUSTOM_EMOJI_INVALID
 *   - MESSAGE_CUSTOM_EMOJI_INVALID
 *   - EMOJI_INVALID
 *   - "button emoji" / "invalid button style"
 *
 * Without protection this silently breaks large parts of the bot. These helpers
 * automatically retry the same message with all premium emoji stripped so the
 * user always receives the message (just with plain unicode instead of animated
 * emoji). This makes premium emoji a progressive enhancement, never a crash.
 */

const { stripPremiumEmoji } = require('./customEmoji');
const logger = require('./logger');

// Error signatures that mean "the premium emoji / button style was rejected".
const PREMIUM_EMOJI_ERROR = /(custom.?emoji|emoji.?invalid|button.?style|icon_custom_emoji_id|ENTITY_BOUNDS_INVALID)/i;

const isPremiumEmojiError = (err, payload = null) => {
  const msg = (err && (err.description || err.message)) || '';
  const code = err && (err.error_code || err.code);
  const hasPremiumFields = payload && JSON.stringify(payload).match(/icon_custom_emoji_id|\"style\"|<tg-emoji/i);
  // Some Bot API versions report unsupported button fields as the generic
  // BUTTON_TYPE_INVALID. If the failed payload contains our progressive
  // premium fields, it is safe to retry without them.
  return (code === 400 || /400/.test(String(msg))) && (PREMIUM_EMOJI_ERROR.test(msg) || Boolean(hasPremiumFields));
};

/**
 * Recursively remove premium-only fields from an inline/reply keyboard so a
 * retry succeeds on non-premium bots or with invalid emoji ids.
 */
const stripKeyboardExtras = (extra) => {
  if (!extra || typeof extra !== 'object') return extra;
  const clone = JSON.parse(JSON.stringify(extra));

  const scrubButtons = (markup) => {
    if (!markup) return;
    const rows = markup.inline_keyboard || markup.keyboard;
    if (!Array.isArray(rows)) return;
    for (const row of rows) {
      if (!Array.isArray(row)) continue;
      for (const btn of row) {
        if (btn && typeof btn === 'object') {
          delete btn.icon_custom_emoji_id;
          delete btn.style;
        }
      }
    }
  };

  if (clone.reply_markup) scrubButtons(clone.reply_markup);
  scrubButtons(clone);
  // Also clean caption text if present
  if (typeof clone.caption === 'string') clone.caption = stripPremiumEmoji(clone.caption);
  return clone;
};

/**
 * Try an operation; if it fails with a premium-emoji error, run the fallback.
 * @param {Function} attempt   async () => result  (premium version)
 * @param {Function} fallback  async () => result  (plain version)
 */
const withEmojiFallback = async (attempt, fallback) => {
  try {
    return await attempt();
  } catch (err) {
    if (isPremiumEmojiError(err)) {
      logger.warn(`⚠️ Premium emoji rejected (${err.description || err.message}). Retrying without premium emoji.`);
      try {
        return await fallback();
      } catch (err2) {
        logger.error('Fallback send also failed:', err2.description || err2.message);
        throw err2;
      }
    }
    throw err;
  }
};

/**
 * ctx.reply with automatic premium-emoji fallback.
 */
const safeReply = (ctx, text, extra = {}) =>
  withEmojiFallback(
    () => ctx.reply(text, extra),
    () => ctx.reply(stripPremiumEmoji(text), stripKeyboardExtras(extra))
  );

/**
 * ctx.editMessageText with automatic premium-emoji fallback.
 */
const safeEditMessageText = (ctx, text, extra = {}) =>
  withEmojiFallback(
    () => ctx.editMessageText(text, extra),
    () => ctx.editMessageText(stripPremiumEmoji(text), stripKeyboardExtras(extra))
  );

/**
 * telegram.sendMessage with automatic premium-emoji fallback.
 */
const safeSendMessage = (telegram, chatId, text, extra = {}) =>
  withEmojiFallback(
    () => telegram.sendMessage(chatId, text, extra),
    () => telegram.sendMessage(chatId, stripPremiumEmoji(text), stripKeyboardExtras(extra))
  );

module.exports = {
  isPremiumEmojiError,
  stripKeyboardExtras,
  withEmojiFallback,
  safeReply,
  safeEditMessageText,
  safeSendMessage,
};
