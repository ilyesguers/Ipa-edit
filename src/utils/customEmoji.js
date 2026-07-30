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
  const map = { primary: EMOJI.star, success: EMOJI.sparkle, danger: EMOJI.fire };
  return map[style] || undefined;
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

  if (!id) {
    // Unknown key — output the raw unicode so nothing breaks
    return `${glyph}${text ? ` ${text}` : ''}`;
  }

  return `<tg-emoji emoji-id="${id}">${glyph}</tg-emoji>${text ? ` ${text}` : ''}`;
};

/**
 * Return an icon_custom_emoji_id for a button based on its style.
 * @param {'primary'|'success'|'danger'|string|undefined|null} style
 * @returns {string|undefined}
 */
const buttonEmojiId = (style) => getStyleEmojiId(style);

module.exports = {
  EMOJI,
  UNICODE_FALLBACK,
  getEmojiId,
  getStyleEmojiId,
  emojiHtml,
  buttonEmojiId,
};
