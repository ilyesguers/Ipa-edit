/**
 * One source of truth for the bot's game-themed Telegram custom emojis.
 *
 * Telegram custom-emoji IDs are not interchangeable with unicode.  A bad ID
 * makes Telegram reject the complete message/keyboard, so every call site must
 * use this module instead of writing IDs by hand.  `safeSend.js` is the final
 * fallback and removes the premium fields if Telegram does not accept them.
 *
 * The IDs below are the stable IDs used by the Telegram Premium Icons pack in
 * this project.  They are intentionally reused by semantic role so the whole
 * bot has one visual language: gamepad for actions, trophy for success, skull
 * for danger, loot for premium/store content, and shield for verification.
 */

const PREMIUM_IDS = {
  gamepad: process.env.PREMIUM_EMOJI_GAMEPAD || '5285430309720966085',
  trophy: process.env.PREMIUM_EMOJI_TROPHY || '5310076249404621168',
  skull: process.env.PREMIUM_EMOJI_SKULL || '5310169226856644648',
  loot: process.env.PREMIUM_EMOJI_LOOT || '5388790256772331442',
  shield: process.env.PREMIUM_EMOJI_SHIELD || '5368324170671202286',
  settings: process.env.PREMIUM_EMOJI_SETTINGS || '5285032475490273112'
};

// Semantic names keep handlers readable and make changing a pack a one-file job.
const EMOJI = {
  gamepad: PREMIUM_IDS.gamepad,
  controller: PREMIUM_IDS.gamepad,
  joystick: PREMIUM_IDS.gamepad,
  star: PREMIUM_IDS.gamepad,
  shop: PREMIUM_IDS.gamepad,
  mobile: PREMIUM_IDS.gamepad,
  rocket: PREMIUM_IDS.gamepad,
  key: PREMIUM_IDS.loot,
  key2: PREMIUM_IDS.loot,
  box: PREMIUM_IDS.loot,
  folder: PREMIUM_IDS.loot,
  bag: PREMIUM_IDS.loot,
  diamond: PREMIUM_IDS.loot,
  gem: PREMIUM_IDS.loot,
  creditcard: PREMIUM_IDS.loot,
  trophy: PREMIUM_IDS.trophy,
  medal: PREMIUM_IDS.trophy,
  victory: PREMIUM_IDS.trophy,
  sparkle: PREMIUM_IDS.trophy,
  wallet: PREMIUM_IDS.trophy,
  coin: PREMIUM_IDS.trophy,
  moneybag: PREMIUM_IDS.trophy,
  shopping: PREMIUM_IDS.trophy,
  orders: PREMIUM_IDS.trophy,
  tag: PREMIUM_IDS.trophy,
  link: PREMIUM_IDS.trophy,
  bolt: PREMIUM_IDS.trophy,
  rocket_boost: PREMIUM_IDS.trophy,
  fire: PREMIUM_IDS.skull,
  skull: PREMIUM_IDS.skull,
  target: PREMIUM_IDS.skull,
  crosshair: PREMIUM_IDS.skull,
  bomb: PREMIUM_IDS.skull,
  alert: PREMIUM_IDS.skull,
  support: PREMIUM_IDS.skull,
  megaphone: PREMIUM_IDS.skull,
  back: PREMIUM_IDS.skull,
  lock: PREMIUM_IDS.skull,
  ghost: PREMIUM_IDS.loot,
  alien: PREMIUM_IDS.loot,
  dragon: PREMIUM_IDS.skull,
  checkmark: PREMIUM_IDS.shield,
  shield: PREMIUM_IDS.shield,
  bell: PREMIUM_IDS.shield,
  notification: PREMIUM_IDS.shield,
  gear: PREMIUM_IDS.settings,
  settings: PREMIUM_IDS.settings,
  profile: PREMIUM_IDS.gamepad,
  users: PREMIUM_IDS.gamepad,
  admin: PREMIUM_IDS.gamepad,
  crown: PREMIUM_IDS.gamepad,
  chat: PREMIUM_IDS.loot,
  clock: PREMIUM_IDS.loot,
  calendar: PREMIUM_IDS.loot,
  globe: PREMIUM_IDS.gamepad
};

const UNICODE_FALLBACK = {
  gamepad: '🎮', controller: '🎮', joystick: '🕹️', star: '⭐', shop: '🛍️', mobile: '📱', rocket: '🚀',
  key: '🔑', key2: '🗝️', box: '📦', folder: '📂', bag: '🎁', diamond: '🔹', gem: '💎', creditcard: '💳',
  trophy: '🏆', medal: '🥇', victory: '🏆', sparkle: '✨', wallet: '💰', coin: '🪙', moneybag: '💵',
  shopping: '🛒', orders: '📋', tag: '🏷️', link: '🔗', bolt: '⚡', rocket_boost: '🚀',
  fire: '🔥', skull: '💀', target: '🎯', crosshair: '🎯', bomb: '💣', alert: '🚨', support: '🆘',
  megaphone: '📣', back: '🔙', lock: '🔒', ghost: '👻', alien: '👾', dragon: '🐉',
  checkmark: '✅', shield: '🛡️', bell: '🔔', notification: '🔔', gear: '⚙️', settings: '⚙️',
  profile: '👤', users: '👥', admin: '👑', crown: '👑', chat: '💬', clock: '🕐', calendar: '📅', globe: '🌍'
};

const STYLE_TO_EMOJI = {
  primary: 'gamepad',
  success: 'trophy',
  danger: 'skull'
};

const premiumEnabled = () => {
  const flag = String(process.env.USE_PREMIUM_EMOJI || 'true').trim().toLowerCase();
  return !['false', '0', 'no', 'off'].includes(flag);
};

const getEmojiId = (key) => EMOJI[key] || null;

const getStyleEmojiId = (style) => {
  if (!premiumEnabled()) return undefined;
  return getEmojiId(STYLE_TO_EMOJI[style] || style);
};

// Button text is never HTML. The animated icon is attached separately.
const emojiChar = (key) => UNICODE_FALLBACK[key] || '';

const buttonLabel = (key, text, opts = {}) => {
  const customId = opts.emojiId || getEmojiId(key);
  if (premiumEnabled() && (opts.hasIcon !== false) && customId) return text;
  const glyph = emojiChar(key);
  return glyph ? `${glyph} ${text}` : text;
};

const emojiHtml = (emojiKey, text = '') => {
  const id = getEmojiId(emojiKey);
  const glyph = emojiChar(emojiKey) || '🎮';
  if (!id || !premiumEnabled()) return `${glyph}${text ? ` ${text}` : ''}`;
  return `<tg-emoji emoji-id="${id}">${glyph}</tg-emoji>${text ? ` ${text}` : ''}`;
};

const stripPremiumEmoji = (html = '') =>
  String(html).replace(/<tg-emoji[^>]*>(.*?)<\/tg-emoji>/gis, '$1');

// Accept either a style ('primary') or a semantic emoji key.
const buttonEmojiId = (keyOrStyle) => {
  if (!premiumEnabled()) return undefined;
  return STYLE_TO_EMOJI[keyOrStyle]
    ? getStyleEmojiId(keyOrStyle)
    : getEmojiId(keyOrStyle);
};

module.exports = {
  PREMIUM_IDS,
  EMOJI,
  UNICODE_FALLBACK,
  premiumEnabled,
  getEmojiId,
  getStyleEmojiId,
  emojiHtml,
  emojiChar,
  buttonLabel,
  buttonEmojiId,
  stripPremiumEmoji,
};
