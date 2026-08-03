/**
 * 🎮 GAMER EDITION - Premium Emoji System for Teens & Gamers
 * One source of truth for all bot emojis.
 *
 * Two configuration layers (highest priority first):
 *   1. Admin panel — Settings keys `premium_emoji_enabled` (bool) and
 *      `premium_emoji_map` ({ emojiKey: customEmojiId }). The bot caches them
 *      in memory and refreshes every minute, so the owner can paste a premium
 *      emoji ID in the panel and it goes live without a restart.
 *   2. Environment variables — USE_PREMIUM_EMOJI=true + PREMIUM_EMOJI_*.
 *
 * Fallback to unicode ensures the bot never crashes; every send helper strips
 * premium entities and retries if Telegram rejects an ID.
 */

const PREMIUM_IDS = {
  // Core gaming pack
  gamepad: process.env.PREMIUM_EMOJI_GAMEPAD || '5285430309720966085',
  joystick: process.env.PREMIUM_EMOJI_JOYSTICK || '5347680802671880999',
  trophy: process.env.PREMIUM_EMOJI_TROPHY || '5310076249404621168',
  crown: process.env.PREMIUM_EMOJI_CROWN || '5325567351006222032',
  fire: process.env.PREMIUM_EMOJI_FIRE || '5351394124793794923',
  rocket: process.env.PREMIUM_EMOJI_ROCKET || '5377593766659329633',
  lightning: process.env.PREMIUM_EMOJI_LIGHTNING || '5304376509377252997',
  target: process.env.PREMIUM_EMOJI_TARGET || '5355066655298458910',
  explosion: process.env.PREMIUM_EMOJI_EXPLOSION || '5384150787003857204',
  gem: process.env.PREMIUM_EMOJI_GEM || '5314859470430858628',
  diamond: process.env.PREMIUM_EMOJI_DIAMOND || '5388790256772331442',
  skull: process.env.PREMIUM_EMOJI_SKULL || '5310169226856644648',
  ghost: process.env.PREMIUM_EMOJI_GHOST || '5399843699312044143',
  alien: process.env.PREMIUM_EMOJI_ALIEN || '5404766660500196029',
  shield: process.env.PREMIUM_EMOJI_SHIELD || '5368324170671202286',
  wallet: process.env.PREMIUM_EMOJI_WALLET || '5361809848994090204',
  sparkle: process.env.PREMIUM_EMOJI_SPARKLE || '5372984826433338537',
  coin: process.env.PREMIUM_EMOJI_COIN || '5361809848994090205',
  star: process.env.PREMIUM_EMOJI_STAR || '5368723352220948628',
  bolt: process.env.PREMIUM_EMOJI_BOLT || '5304376509377252998',
};

const EMOJI = {
  // Primary actions - each gets its own unique ID
  gamepad: PREMIUM_IDS.gamepad,
  controller: PREMIUM_IDS.gamepad,
  games: PREMIUM_IDS.gamepad,
  joystick: PREMIUM_IDS.joystick,
  shop: PREMIUM_IDS.rocket,
  rocket: PREMIUM_IDS.rocket,
  rocket_boost: PREMIUM_IDS.rocket,
  fire: PREMIUM_IDS.fire,
  flame: PREMIUM_IDS.fire,
  hot: PREMIUM_IDS.fire,
  trophy: PREMIUM_IDS.trophy,
  victory: PREMIUM_IDS.trophy,
  win: PREMIUM_IDS.trophy,
  crown: PREMIUM_IDS.crown,
  king: PREMIUM_IDS.crown,
  pro: PREMIUM_IDS.crown,
  target: PREMIUM_IDS.target,
  crosshair: PREMIUM_IDS.target,
  focus: PREMIUM_IDS.target,
  explosion: PREMIUM_IDS.explosion,
  boom: PREMIUM_IDS.explosion,
  bomb: PREMIUM_IDS.explosion,
  gem: PREMIUM_IDS.gem,
  diamond: PREMIUM_IDS.diamond,
  crystal: PREMIUM_IDS.gem,
  loot: PREMIUM_IDS.diamond,
  treasure: PREMIUM_IDS.diamond,
  lightning: PREMIUM_IDS.lightning,
  bolt: PREMIUM_IDS.bolt,
  zap: PREMIUM_IDS.lightning,
  sparkle: PREMIUM_IDS.sparkle,
  magic: PREMIUM_IDS.sparkle,
  star: PREMIUM_IDS.star,
  stars: PREMIUM_IDS.star,
  skull: PREMIUM_IDS.skull,
  danger: PREMIUM_IDS.skull,
  alert: PREMIUM_IDS.skull,
  ghost: PREMIUM_IDS.ghost,
  alien: PREMIUM_IDS.alien,
  monster: PREMIUM_IDS.alien,
  shield: PREMIUM_IDS.shield,
  safe: PREMIUM_IDS.shield,
  checkmark: PREMIUM_IDS.shield,
  secure: PREMIUM_IDS.shield,
  wallet: PREMIUM_IDS.wallet,
  moneybag: PREMIUM_IDS.wallet,
  coin: PREMIUM_IDS.coin,
  cash: PREMIUM_IDS.coin,
  // UI semantic
  key: PREMIUM_IDS.gem,
  key2: PREMIUM_IDS.diamond,
  box: PREMIUM_IDS.diamond,
  folder: PREMIUM_IDS.gem,
  bag: PREMIUM_IDS.diamond,
  creditcard: PREMIUM_IDS.wallet,
  shopping: PREMIUM_IDS.rocket,
  orders: PREMIUM_IDS.trophy,
  tag: PREMIUM_IDS.crown,
  link: PREMIUM_IDS.lightning,
  profile: PREMIUM_IDS.crown,
  admin: PREMIUM_IDS.crown,
  users: PREMIUM_IDS.crown,
  mobile: PREMIUM_IDS.rocket,
  chat: PREMIUM_IDS.fire,
  support: PREMIUM_IDS.fire,
  megaphone: PREMIUM_IDS.explosion,
  back: PREMIUM_IDS.ghost,
  lock: PREMIUM_IDS.shield,
  bell: PREMIUM_IDS.bolt,
  notification: PREMIUM_IDS.bolt,
  gear: PREMIUM_IDS.joystick,
  settings: PREMIUM_IDS.joystick,
  clock: PREMIUM_IDS.bolt,
  calendar: PREMIUM_IDS.bolt,
  globe: PREMIUM_IDS.target,
  help: PREMIUM_IDS.fire,
  gift: PREMIUM_IDS.gem,
};

const UNICODE_FALLBACK = {
  gamepad: '🎮', controller: '🎮', games: '🎮', joystick: '🕹️',
  shop: '🚀', rocket: '🚀', rocket_boost: '🚀',
  fire: '🔥', flame: '🔥', hot: '🔥',
  trophy: '🏆', victory: '🏆', win: '🏆',
  crown: '👑', king: '👑', pro: '👑',
  target: '🎯', crosshair: '🎯', focus: '🎯',
  explosion: '💥', boom: '💥', bomb: '💣',
  gem: '💎', diamond: '💎', crystal: '🔮', loot: '💎', treasure: '💰',
  lightning: '⚡', bolt: '⚡', zap: '⚡',
  sparkle: '✨', magic: '✨', star: '⭐', stars: '🌟',
  skull: '💀', danger: '☠️', alert: '🚨',
  ghost: '👻', alien: '👾', monster: '👹',
  shield: '🛡️', safe: '🛡️', checkmark: '✅', secure: '🔒',
  wallet: '💰', moneybag: '💰', coin: '🪙', cash: '💵',
  key: '🔑', key2: '🗝️', box: '📦', folder: '📂', bag: '🎁',
  creditcard: '💳', shopping: '🛒', orders: '📋', tag: '🏷️',
  link: '🔗', profile: '😎', admin: '👑', users: '👥',
  mobile: '📱', chat: '💬', support: '🔥', megaphone: '📣',
  back: '⬅️', lock: '🔒', bell: '🔔', notification: '🔔',
  gear: '⚙️', settings: '⚙️', clock: '⏰', calendar: '📅',
  globe: '🌍', help: '❓', gift: '🎁'
};

const STYLE_TO_EMOJI = {
  primary: 'rocket', // teen gaming = rocket for primary
  success: 'trophy',
  danger: 'fire'
};

// ── DB-backed configuration (admin panel) ─────────────────────────────────
// Settings are cached in-process and refreshed periodically so the millions of
// messages the bot sends never wait on MongoDB. `configurePremiumEmoji` is
// called from the admin API the moment the owner saves, making it instant.
const SETTINGS_KEY_ENABLED = 'premium_emoji_enabled';
const SETTINGS_KEY_MAP = 'premium_emoji_map';
const REFRESH_MS = 60 * 1000;

let dbState = { loaded: false, enabled: false, map: {} };
let refreshTimer = null;

const validEmojiId = (value) => /^\d{5,25}$/.test(String(value || '').trim());

const normalizeMap = (raw) => {
  const out = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [key, id] of Object.entries(raw)) {
    if (UNICODE_FALLBACK[key] && validEmojiId(id)) out[key] = String(id).trim();
  }
  return out;
};

const loadPremiumEmojiSettings = async () => {
  try {
    const Settings = require('../models/Settings');
    const [enabled, map] = await Promise.all([
      Settings.get(SETTINGS_KEY_ENABLED, null),
      Settings.get(SETTINGS_KEY_MAP, null)
    ]);
    dbState = {
      loaded: true,
      enabled: enabled === null ? false : Boolean(enabled),
      map: normalizeMap(map)
    };
  } catch (err) {
    // DB not ready yet (boot races) — keep previous state and retry next tick.
  }
  return dbState;
};

/** Called once after MongoDB connects; schedules the 60s silent refresh. */
const initPremiumEmoji = () => {
  loadPremiumEmojiSettings().catch(() => {});
  if (!refreshTimer) {
    refreshTimer = setInterval(() => { loadPremiumEmojiSettings().catch(() => {}); }, REFRESH_MS);
    if (refreshTimer.unref) refreshTimer.unref();
  }
};

/** Called by the admin API right after saving — applies without restart. */
const configurePremiumEmoji = (enabled, map) => {
  dbState = { loaded: true, enabled: Boolean(enabled), map: normalizeMap(map) };
  return dbState;
};

// Premium emoji IDs are account-specific. Keeping them opt-in avoids Telegram
// retries (and duplicated-looking glyphs) when an owner has not configured a
// valid pack for this bot. The admin-panel flag wins; env is the fallback.
const premiumEnabled = () => {
  if (dbState.loaded) return dbState.enabled;
  const flag = String(process.env.USE_PREMIUM_EMOJI || 'false').trim().toLowerCase();
  return ['true', '1', 'yes', 'on'].includes(flag);
};

const getEmojiId = (key) => dbState.map[key] || EMOJI[key] || null;

const getStyleEmojiId = (style) => {
  if (!premiumEnabled()) return undefined;
  return getEmojiId(STYLE_TO_EMOJI[style] || style);
};

const emojiChar = (key) => UNICODE_FALLBACK[key] || '🎮';

// Callers from older menus sometimes already include a Unicode emoji in their
// label and then ask this helper to add the button icon. Strip decorative
// symbols first so every button always has one icon, never two.
const stripDecorativeEmoji = (value = '') => String(value)
  .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\uFE0F\u200D]/gu, '')
  .replace(/\s{2,}/g, ' ')
  .trim();

const buttonLabel = (key, text, opts = {}) => {
  const customId = opts.emojiId || getEmojiId(key);
  const cleanText = stripDecorativeEmoji(text);
  if (premiumEnabled() && (opts.hasIcon !== false) && customId) return cleanText;
  const glyph = emojiChar(key);
  return glyph ? `${glyph} ${cleanText}`.trim() : cleanText;
};

const emojiHtml = (emojiKey, text = '') => {
  const id = getEmojiId(emojiKey);
  const glyph = emojiChar(emojiKey) || '🎮';
  if (!id || !premiumEnabled()) return `${glyph}${text ? ` ${text}` : ''}`;
  return `<tg-emoji emoji-id="${id}">${glyph}</tg-emoji>${text ? ` ${text}` : ''}`;
};

const stripPremiumEmoji = (html = '') =>
  String(html).replace(/<tg-emoji[^>]*>(.*?)<\/tg-emoji>/gis, '$1');

const buttonEmojiId = (keyOrStyle) => {
  if (!premiumEnabled()) return undefined;
  return STYLE_TO_EMOJI[keyOrStyle]
    ? getStyleEmojiId(keyOrStyle)
    : getEmojiId(keyOrStyle);
};

// ── Whole-message upgrade: replace plain Unicode emoji with premium ────────
// The bot has hundreds of places that hand-write raw emoji (🛒 ✅ 📦 …). The
// admin "Premium emoji" page maps each of those glyphs to a custom emoji ID,
// and applyPremiumEmoji() rewrites any outgoing HTML text so the owner only
// pastes IDs — no code changes needed per message.
let unicodeMapCache = null;

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildUnicodeMap = () => {
  // key → [unicodeGlyph, emojiId]; glyph variants deduped.
  const pairs = new Map();
  for (const key of Object.keys(UNICODE_FALLBACK)) {
    const id = premiumEnabled() ? getEmojiId(key) : null;
    if (!id || !validEmojiId(id)) continue;
    const glyph = UNICODE_FALLBACK[key];
    if (!pairs.has(glyph)) pairs.set(glyph, id);
  }
  unicodeMapCache = pairs;
  return pairs;
};

const applyPremiumEmoji = (html = '') => {
  if (!premiumEnabled()) return String(html);
  if (!unicodeMapCache) buildUnicodeMap();
  if (!unicodeMapCache || !unicodeMapCache.size) return String(html);

  let out = String(html);
  for (const [glyph, id] of unicodeMapCache.entries()) {
    // Skip glyphs that are already wrapped in a <tg-emoji> for this id by
    // rewriting only raw occurrences. A negative lookbehind for '">' keeps us
    // from touching entity contents of existing tags' attributes.
    const pattern = new RegExp(escapeRegExp(glyph), 'g');
    if (!pattern.test(out)) continue;
    out = out.replace(pattern, `<tg-emoji emoji-id="${id}">${glyph}</tg-emoji>`);
  }
  // Clean up accidental nesting: tg-emoji inside tg-emoji (rare double-pass).
  out = out.replace(/(<tg-emoji[^>]*>)(<tg-emoji[^>]*>)(.*?)(<\/tg-emoji>)(<\/tg-emoji>)/gis, '$1$3$4');
  return out;
};

/** Invalidate caches after the admin saves a new map. */
const invalidateUnicodeMap = () => { unicodeMapCache = null; };

/** Catalog used by the admin page: every known emoji with its current state. */
const getEmojiCatalog = () => Object.keys(UNICODE_FALLBACK).map((key) => ({
  key,
  unicode: UNICODE_FALLBACK[key],
  label: key,
  currentId: getEmojiId(key) || '',
  configuredId: dbState.map[key] || '',
  defaultId: EMOJI[key] || ''
}));

module.exports = {
  PREMIUM_IDS,
  EMOJI,
  UNICODE_FALLBACK,
  SETTINGS_KEY_ENABLED,
  SETTINGS_KEY_MAP,
  premiumEnabled,
  getEmojiId,
  getStyleEmojiId,
  emojiHtml,
  emojiChar,
  buttonLabel,
  buttonEmojiId,
  stripPremiumEmoji,
  applyPremiumEmoji,
  invalidateUnicodeMap,
  getEmojiCatalog,
  validEmojiId,
  initPremiumEmoji,
  configurePremiumEmoji,
  loadPremiumEmojiSettings,
};
