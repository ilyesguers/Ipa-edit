/**
 * 🌟 Telegram Premium Custom Emoji Configuration
 * 
 * These are animated custom emoji IDs from Telegram's official
 * "Telegram Premium Icons" pack (t.me/addemoji/TgPremiumIcons).
 * 
 * They work in:
 * 1. Inline keyboard buttons → icon_custom_emoji_id field (Bot API 9.4+)
 * 2. Message text → <tg-emoji emoji-id="...">emoji</tg-emoji> (HTML parse_mode)
 * 
 * REQUIREMENTS:
 * - Bot owner must have Telegram Premium subscription
 * - Works in private chats, groups, and supergroups
 * - All users (Premium & non-Premium) can SEE the animated emojis
 * 
 * To add more: Use @S0N59/Telegram-Emoji-ID bot or ask @Stickers bot
 */

const EMOJI = {
  // ═══ Navigation & Main Actions ═══
  star: '5285430309720966085',        // ⭐ Animated star - Primary actions, main menu
  sparkle: '5310076249404621168',      // ✨ Animated sparkle - Success, positive actions
  fire: '5310169226856644648',         // 🔥 Animated fire - Danger, warnings, hot deals
  diamond: '5388790256772331442',      // 🔹 Blue diamond - Premium features
  checkmark: '5368324170671202286',    // ✅ Animated checkmark - Confirmed, verified
  
  // ═══ Business & Store ═══
  shopping: '5310076249404621168',     // 🛒 Shopping - Store, products (uses sparkle)
  key: '5285430309720966085',          // 🔑 Keys (uses star)
  wallet: '5310076249404621168',       // 💰 Wallet, balance (uses sparkle)
  
  // ═══ Profile & Users ═══
  profile: '5285430309720966085',      // 👤 User profile (uses star)
  support: '5310169226856644648',      // 🆘 Support, help (uses fire)
  
  // ═══ Admin ═══
  admin: '5285430309720966085',        // 👑 Admin panel (uses star)
  settings: '5285032475490273112',     // ⚙️ Settings (decorative)
  
  // ═══ Notifications ═══
  notification: '5368324170671202286', // 🔔 Notifications
  alert: '5310169226856644648',        // 🚨 Alerts (uses fire)
};

/**
 * Get custom emoji ID by key
 * @param {string} key - Emoji key from EMOJI object
 * @returns {string|null} Custom emoji ID or null if not found
 */
const getEmojiId = (key) => {
  return EMOJI[key] || null;
};

/**
 * Get the style-appropriate emoji ID for buttons
 * @param {string} style - 'primary', 'success', 'danger', or null/undefined
 * @returns {string|null} Custom emoji ID
 */
const getStyleEmojiId = (style) => {
  const styleMap = {
    primary: EMOJI.star,
    success: EMOJI.sparkle,
    danger: EMOJI.fire,
  };
  return styleMap[style] || null;
};

/**
 * Wrap text with custom emoji for HTML messages
 * @param {string} emojiKey - Key from EMOJI object
 * @param {string} text - Text to append after emoji (optional)
 * @returns {string} HTML string with tg-emoji tag
 */
const emojiHtml = (emojiKey, text = '') => {
  const id = EMOJI[emojiKey];
  if (!id) return text;
  
  // Map emoji keys to their actual unicode emoji
  const emojiMap = {
    star: '⭐',
    sparkle: '✨',
    fire: '🔥',
    diamond: '🔹',
    checkmark: '✅',
    shopping: '🛒',
    key: '🔑',
    wallet: '💰',
    profile: '👤',
    support: '🆘',
    admin: '👑',
    settings: '⚙️',
    notification: '🔔',
    alert: '🚨',
  };
  
  const unicodeEmoji = emojiMap[emojiKey] || '⭐';
  return `<tg-emoji emoji-id="${id}">${unicodeEmoji}</tg-emoji>${text ? ` ${text}` : ''}`;
};

/**
 * Build an icon_custom_emoji_id for a button based on its style
 * @param {string} style - 'primary', 'success', 'danger', or null
 * @returns {string|undefined} Custom emoji ID or undefined
 */
const buttonEmojiId = (style) => {
  const id = getStyleEmojiId(style);
  return id || undefined;
};

module.exports = {
  EMOJI,
  getEmojiId,
  getStyleEmojiId,
  emojiHtml,
  buttonEmojiId,
};
