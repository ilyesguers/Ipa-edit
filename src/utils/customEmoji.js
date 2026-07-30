/**
 * 🌟 Telegram Premium Animated Custom Emojis
 *
 * Source: "Telegram Premium Icons" pack  →  https://t.me/addemoji/TgPremiumIcons
 *
 * Works in:
 *   1) Inline keyboards → `icon_custom_emoji_id` (Bot API 9.4+)
 *   2) Message text     → <tg-emoji emoji-id="ID">🔤</tg-emoji> (HTML parse_mode)
 *
 * REQUIREMENTS:
 *   - The bot owner must have Telegram Premium to SEND animated emojis
 *   - All users (Premium & free) can SEE the animated emojis
 *   - Non-Premium bots fall back to the unicode emoji inside <tg-emoji>
 */

const EMOJI = {
  // ═══ Core / Style buttons (🔵🟢🔴) ═══
  star:        '5285430309720966085', // ⭐  Primary / main actions (blue)
  sparkle:     '5310076249404621168', // ✨  Success / positive (green)
  fire:        '5310169226856644648', // 🔥  Danger / hot / warnings (red)

  // ═══ Navigation & UI ═══
  diamond:     '5388790256772331442', // 🔹 Premium / diamond
  checkmark:   '5368324170671202286', // ✅ Verified / confirmed
  bell:        '5368324170671202286', // 🔔 Notifications (uses checkmark as fallback)
  gear:        '5285032475490273112', // ⚙️ Settings / admin
  crown:       '5285430309720966085', // 👑 Admin / VIP (uses star)
  rocket:      '5310076249404621168', // 🚀 Launch / fast (uses sparkle)
  bolt:        '5310076249404621168', // ⚡ Instant / flash (uses sparkle)
  shield:      '5388790256772331442', // 🛡️ Security / captcha (uses diamond)
  lock:        '5310169226856644648', // 🔒 Locked (uses fire as "alert")

  // ═══ Store / Shop ═══
  shop:        '5285430309720966085', // 🛍️ Store / browse (uses star)
  shopping:    '5310076249404621168', // 🛒 Cart / orders (uses sparkle)
  bag:         '5388790256772331442', // 🎁 Gift / pack (uses diamond)
  tag:         '5310076249404621168', // 🏷️ Product tag (uses sparkle)

  // ═══ Games / Controller ═══
  controller:  '5285430309720966085', // 🎮 Controller / games (uses star)
  joystick:    '5285430309720966085', // 🕹️ Joystick (uses star)
  target:      '5310169226856644648', // 🎯 Aim / cheat (uses fire "hot")
  trophy:      '5310076249404621168', // 🏆 Trophy / win (uses sparkle)
  medal:       '5310076249404621168', // 🥇 Medal / rank (uses sparkle)
  skull:       '5310169226856644648', // 💀 Skull / banned / danger (uses fire)
  ghost:       '5388790256772331442', // 👻 Ghost / stealth (uses diamond)
  alien:       '5388790256772331442', // 👾 Alien / retro (uses diamond)
  dragon:      '5310169226856644648', // 🐉 Dragon / fire (uses fire)
  bomb:        '5310169226856644648', // 💣 Bomb / explosive (uses fire)
  crosshair:   '5310169226856644648', // 🎯 Same as target

  // ═══ Keys / Inventory ═══
  key:         '5285430309720966085', // 🔑 Keys / products (uses star)
  key2:        '5285430309720966085', // 🗝️ Old key (uses star)
  box:         '5388790256772331442', // 📦 Box / inventory (uses diamond)
  folder:      '5388790256772331442', // 📂 Categories (uses diamond)

  // ═══ Money / Wallet ═══
  wallet:      '5310076249404621168', // 💰 Wallet / balance (uses sparkle)
  coin:        '5310076249404621168', // 🪙 Coin / USD (uses sparkle)
  moneybag:    '5310076249404621168', // 💵 Money bag (uses sparkle)
  creditcard:  '5388790256772331442', // 💳 Credit card / pay (uses diamond)
  gem:         '5388790256772331442', // 💎 Premium / Binance gem (uses diamond)

  // ═══ Users / Profile ═══
  profile:     '5285430309720966085', // 👤 User profile (uses star)
  users:       '5285430309720966085', // 👥 Users list (uses star)
  admin:       '5285430309720966085', // 👑 Admin panel (uses star)
  support:     '5310169226856644648', // 🆘 Help / support (uses fire "alert")
  chat:        '5388790256772331442', // 💬 Chat / message (uses diamond)
  megaphone:   '5310169226856644648', // 📣 Broadcast / channel (uses fire "alert")
  orders:      '5310076249404621168', // 📋 Orders / history (uses sparkle)
  clock:       '5388790256772331442', // 🕐 Time / pending (uses diamond)
  calendar:    '5388790256772331442', // 📅 Date (uses diamond)
  link:        '5310076249404621168', // 🔗 Referral link (uses sparkle)
  back:        '5310169226856644648', // 🔙 Back / return (uses fire for contrast)
  mobile:      '5285430309720966085', // 📱 Mobile app (uses star)
  globe:       '5388790256772331442', // 🌍 Language / global (uses diamond)
  alert:       '5310169226856644648', // 🚨 Alert / danger (uses fire)
  notification:'5368324170671202286', // 🔔 Bell notification (uses checkmark)
};

/**
 * Safe unicode fallback map (used when emoji ID is missing, or as the visible
 * glyph inside <tg-emoji> for non-Premium clients).
 */
const UNICODE_FALLBACK = {
  star: '⭐', sparkle: '✨', fire: '🔥', diamond: '🔹', checkmark: '✅',
  bell: '🔔', gear: '⚙️', crown: '👑', rocket: '🚀', bolt: '⚡',
  shield: '🛡️', lock: '🔒', shop: '🛍️', shopping: '🛒', bag: '🎁', tag: '🏷️',
  controller: '🎮', joystick: '🕹️', target: '🎯', trophy: '🏆', medal: '🥇',
  skull: '💀', ghost: '👻', alien: '👾', dragon: '🐉', bomb: '💣', crosshair: '🎯',
  key: '🔑', key2: '🗝️', box: '📦', folder: '📂',
  wallet: '💰', coin: '🪙', moneybag: '💵', creditcard: '💳', gem: '💎',
  profile: '👤', users: '👥', admin: '👑', support: '🆘', chat: '💬',
  megaphone: '📣', orders: '📋', clock: '🕐', calendar: '📅', link: '🔗',
  back: '🔙', mobile: '📱', globe: '🌍', alert: '🚨', notification: '🔔',
};

/**
 * Global toggle. Premium animated emojis require the bot owner to have a
 * Telegram Premium subscription (or Fragment usernames). If an emoji ID is
 * invalid/inaccessible, Telegram rejects the WHOLE message/keyboard with a 400
 * error — which would silently break the bot. Set USE_PREMIUM_EMOJI=false to
 * fall back to plain unicode everywhere. Defaults to enabled.
 * The resilient send wrapper (src/utils/safeSend.js) auto-retries without
 * premium emoji if a 400 happens, so leaving this on is safe.
 * @returns {boolean}
 */
const premiumEnabled = () => {
  const flag = (process.env.USE_PREMIUM_EMOJI || 'true').toString().trim().toLowerCase();
  return !['false', '0', 'no', 'off'].includes(flag);
};

/**
 * Get raw custom emoji ID by key.
 * @param {string} key
 * @returns {string|null}
 */
const getEmojiId = (key) => EMOJI[key] || null;

/**
 * Return the emoji ID that corresponds to a button "style" color.
 * @param {'primary'|'success'|'danger'|string|undefined|null} style
 * @returns {string|undefined}
 */
const getStyleEmojiId = (style) => {
  if (!premiumEnabled()) return undefined;
  const map = { primary: EMOJI.star, success: EMOJI.sparkle, danger: EMOJI.fire };
  return map[style] || undefined;
};

/**
 * Plain unicode glyph for a key — SAFE for inline-keyboard BUTTON LABELS.
 *
 * ⚠️ Button `text` does NOT render HTML, so <tg-emoji> tags must never be put
 * there (they would show as literal broken text). Premium animated emoji on a
 * button must be supplied via the separate `icon_custom_emoji_id` field.
 *
 * @param {string} key
 * @returns {string} unicode emoji (or '' if unknown)
 */
const emojiChar = (key) => UNICODE_FALLBACK[key] || '';

/**
 * Build a clean button LABEL. Never contains HTML.
 *
 * When premium is enabled we DON'T prepend the unicode glyph, because the
 * animated emoji is shown separately through `icon_custom_emoji_id`; prepending
 * would duplicate it. When premium is disabled we prepend the unicode glyph so
 * the button still has an icon.
 *
 * @param {string} key   emoji key (used only for the fallback glyph)
 * @param {string} text  the label text
 * @param {{ hasIcon?: boolean }} [opts] hasIcon=true means an icon_custom_emoji_id is attached
 * @returns {string}
 */
const buttonLabel = (key, text, opts = {}) => {
  const hasIcon = opts.hasIcon !== undefined ? opts.hasIcon : premiumEnabled();
  if (hasIcon && premiumEnabled()) {
    // Animated icon rendered via icon_custom_emoji_id — keep label text clean.
    return text;
  }
  const glyph = emojiChar(key);
  return glyph ? `${glyph} ${text}` : text;
};

/**
 * Wrap text with an animated custom emoji tag for use in HTML-formatted messages.
 * Falls back to a plain unicode emoji when the key is unknown (safe for all clients).
 *
 * @param {string} emojiKey - Key in EMOJI object
 * @param {string} [text=''] - Optional text to append after the emoji (with a space)
 * @returns {string} HTML
 */
const emojiHtml = (emojiKey, text = '') => {
  const id = EMOJI[emojiKey];
  const glyph = UNICODE_FALLBACK[emojiKey] || (typeof emojiKey === 'string' && emojiKey.length <= 4 ? emojiKey : '⭐');

  if (!id || !premiumEnabled()) {
    // Unknown key or premium disabled — output the raw unicode so nothing breaks
    return `${glyph}${text ? ` ${text}` : ''}`;
  }

  return `<tg-emoji emoji-id="${id}">${glyph}</tg-emoji>${text ? ` ${text}` : ''}`;
};

/**
 * Strip every <tg-emoji> wrapper from a string, leaving only the plain unicode
 * glyph inside. Used by the resilient send wrapper to retry a message without
 * premium custom emoji when Telegram rejects an invalid emoji id.
 * @param {string} html
 * @returns {string}
 */
const stripPremiumEmoji = (html = '') =>
  String(html).replace(/<tg-emoji[^>]*>(.*?)<\/tg-emoji>/gis, '$1');

/**
 * Return an icon_custom_emoji_id for a button based on its style.
 * @param {'primary'|'success'|'danger'|string|undefined|null} style
 * @returns {string|undefined}
 */
const buttonEmojiId = (style) => getStyleEmojiId(style);

module.exports = {
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
