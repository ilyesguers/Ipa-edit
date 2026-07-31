/**
 * 🎮 GAMER EDITION - Premium Emoji System for Teens & Gamers
 * One source of truth for all bot emojis.
 * Target: gaming teens - fire, rocket, explosion, crown, etc.
 * All IDs are distinct, no more 4 repeated emojis.
 * Fallback to unicode ensures bot never crashes.
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
  coin: PREMIUM_IDS.coin,
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

const premiumEnabled = () => {
  const flag = String(process.env.USE_PREMIUM_EMOJI || 'true').trim().toLowerCase();
  return !['false', '0', 'no', 'off'].includes(flag);
};

const getEmojiId = (key) => EMOJI[key] || null;

const getStyleEmojiId = (style) => {
  if (!premiumEnabled()) return undefined;
  return getEmojiId(STYLE_TO_EMOJI[style] || style);
};

const emojiChar = (key) => UNICODE_FALLBACK[key] || '🎮';

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
