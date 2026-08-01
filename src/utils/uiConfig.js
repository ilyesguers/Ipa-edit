const Settings = require('../models/Settings');
const { buttonEmojiId, buttonLabel } = require('./customEmoji');

const THEME_PRESETS = {
  aurora: {
    key: 'aurora',
    nameAr: 'أورورا - جيمر',
    nameEn: 'Aurora Gamer',
    badge: '🚀',
    accent: '#00ff88',
    secondary: '#7c3aed',
    panelEmoji: '🎮',
    welcomeEmoji: '🔥'
  },
  emerald: {
    key: 'emerald',
    nameAr: 'نايترو',
    nameEn: 'Nitro',
    badge: '⚡',
    accent: '#00ff88',
    secondary: '#00cfff',
    panelEmoji: '⚡',
    welcomeEmoji: '💥'
  },
  velvet: {
    key: 'velvet',
    nameAr: 'نيون',
    nameEn: 'Neon',
    badge: '💜',
    accent: '#a855f7',
    secondary: '#f472b6',
    panelEmoji: '👾',
    welcomeEmoji: '👑'
  },
  sunset: {
    key: 'sunset',
    nameAr: 'فاير',
    nameEn: 'Fire',
    badge: '🔥',
    accent: '#ff8a00',
    secondary: '#ff3b5c',
    panelEmoji: '🔥',
    welcomeEmoji: '🚀'
  },
  midnight: {
    key: 'midnight',
    nameAr: 'دارك جيمر 🌙',
    nameEn: 'Dark Gamer 🌙',
    badge: '🌙',
    accent: '#00ff88',
    secondary: '#a855f7',
    panelEmoji: '🎮',
    welcomeEmoji: '💀'
  }
};

// Clean, minimal highlights — no emoji spam
const DEFAULT_HIGHLIGHTS = [
  { id: 'rocket', emojiKey: 'rocket', textAr: 'تسليم فوري', textEn: 'Instant delivery' },
  { id: 'shield', emojiKey: 'shield', textAr: 'مفاتيح أصلية 100%', textEn: '100% legit keys' },
  { id: 'fire', emojiKey: 'fire', textAr: 'أقوى العروض', textEn: 'Best deals' },
  { id: 'support', emojiKey: 'support', textAr: 'دعم 24/7', textEn: 'Support 24/7' }
];

// MINIMAL WEB-FOCUSED KEYBOARD - Bot focuses on website, not old shop callbacks
// The old keyboard with shop/mykeys/history/profile/balance/help is removed
// Now only 3-4 buttons max, all pointing to webapp or support
const DEFAULT_QUICK_LINKS = [
  { id: 'customer_app', emojiKey: 'rocket', textAr: '🚀 فتح المتجر - PLAY NOW', textEn: '🚀 Open Store - PLAY NOW', type: 'webapp', value: '/customer', row: 1, visibility: 'all', style: 'primary' },
  { id: 'support', emojiKey: 'fire', textAr: '🔥 الدعم السريع', textEn: '🔥 Fast Support', type: 'url', value: 'https://t.me/{support}', row: 2, visibility: 'all', style: 'danger' },
  { id: 'channel', emojiKey: 'explosion', textAr: '💥 قناة العروض', textEn: '💥 Deals Channel', type: 'url', value: 'https://t.me/{channel}', row: 2, visibility: 'all' },
  { id: 'language', emojiKey: 'target', textAr: '🌍 English', textEn: '🌍 العربية', type: 'callback', value: 'language', row: 3, visibility: 'all', style: 'primary' },
];

const clone = (value) => JSON.parse(JSON.stringify(value));

const parseJsonSetting = (value, fallback) => {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') return value;
  if (typeof value === 'string' && value.trim()) {
    try {
      return JSON.parse(value);
    } catch (_) {
      return clone(fallback);
    }
  }
  return clone(fallback);
};

const LEGACY_ICON_KEYS = {
  '🛍️': 'rocket', '🗂️': 'gamepad', '🔑': 'gem', '📋': 'trophy', '🧾': 'trophy', '👤': 'crown',
  '💰': 'wallet', '💳': 'wallet', '🆘': 'fire', '📱': 'rocket', '🛒': 'rocket', '💬': 'fire',
  '📣': 'explosion', '🌍': 'target'
};

const LEGACY_IDS = ['shop', 'keys', 'history', 'profile', 'balance', 'mykeys', 'my_activity', 'help'];

const normalizeQuickLinks = (value) => {
  const parsed = parseJsonSetting(value, DEFAULT_QUICK_LINKS);
  if (!Array.isArray(parsed) || !parsed.length) return clone(DEFAULT_QUICK_LINKS);

  // If old database still has legacy shop/mykeys/history buttons, reset to new minimal gaming menu
  const hasLegacy = parsed.some(item => LEGACY_IDS.includes(item.id) || LEGACY_IDS.includes(item.value));
  if (hasLegacy && parsed.length > 4) {
    // Force migration to new web-focused menu
    return clone(DEFAULT_QUICK_LINKS);
  }

  const seen = new Set();
  const normalized = parsed
    .map((item, index) => ({
      id: item.id || `link_${index + 1}`,
      emojiKey: item.emojiKey || item.iconKey || LEGACY_ICON_KEYS[item.icon] || 'rocket',
      icon: item.icon || '',
      textAr: item.textAr || item.text || 'زر',
      textEn: item.textEn || item.text || 'Button',
      type: ['callback', 'webapp', 'url'].includes(item.type) ? item.type : 'callback',
      value: item.value || '/customer',
      row: Number(item.row) > 0 ? Number(item.row) : 1,
      visibility: ['all', 'admin'].includes(item.visibility) ? item.visibility : 'all',
      style: ['primary', 'success', 'danger'].includes(item.style) ? item.style : null
    }))
    .filter((item) => {
      const signature = `${item.type}:${item.value}:${item.textAr}:${item.textEn}`;
      if (seen.has(signature)) return false;
      seen.add(signature);
      return true;
    })
    .sort((a, b) => a.row - b.row);

  if (!normalized.some((item) => item.id === 'language')) {
    normalized.push(clone(DEFAULT_QUICK_LINKS.find((item) => item.id === 'language')));
  }
  if (!normalized.some((item) => item.id === 'customer_app')) {
    normalized.unshift(clone(DEFAULT_QUICK_LINKS.find((item) => item.id === 'customer_app')));
  }
  return normalized.sort((a, b) => a.row - b.row);
};

const normalizeHighlights = (value) => {
  const parsed = parseJsonSetting(value, DEFAULT_HIGHLIGHTS);
  if (!Array.isArray(parsed) || !parsed.length) return clone(DEFAULT_HIGHLIGHTS);

  // Migrate old corporate highlights to gaming ones if they look old
  const isOldStyle = parsed.some(h => (h.textAr || '').includes('واجهة مرتبة') || (h.textAr || '').includes('إدارة كاملة'));
  if (isOldStyle) return clone(DEFAULT_HIGHLIGHTS);

  return parsed.map((item, index) => ({
    id: item.id || `highlight_${index + 1}`,
    emojiKey: item.emojiKey || item.iconKey || 'rocket',
    icon: item.icon || '',
    textAr: item.textAr || item.text || 'ميزة',
    textEn: item.textEn || item.text || 'Highlight'
  }));
};

const withProtocol = (url) => {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  return `https://${url}`;
};

const buildAbsoluteUrl = (baseUrl, value = '') => {
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  return `${(baseUrl || '').replace(/\/$/, '')}${value.startsWith('/') ? value : `/${value}`}`;
};

const interpolateValue = ({ value, baseUrl, supportUsername, channelUsername }) => {
  if (!value) return '';
  return value
    .replaceAll('{base_url}', (baseUrl || '').replace(/\/$/, ''))
    .replaceAll('{support}', supportUsername || 'support')
    .replaceAll('{channel}', channelUsername || '');
};

const getAdminPortalUrl = (page = 'dashboard', query = {}) => {
  const baseUrl = (process.env.BASE_URL || '').replace(/\/$/, '');
  const params = new URLSearchParams(
    Object.entries(query).filter(([, value]) => value !== undefined && value !== null && value !== '')
  );
  const hash = params.toString() ? `#${page}?${params.toString()}` : `#${page}`;
  return `${baseUrl}/admin${hash}`;
};

const getUiSettings = async () => {
  const [
    botName,
    welcomeMessage,
    supportUsername,
    channelUsername,
    themeKey,
    welcomeBadgeAr,
    welcomeBadgeEn,
    welcomeTitleAr,
    welcomeTitleEn,
    welcomeSubtitleAr,
    welcomeSubtitleEn,
    footerNoteAr,
    footerNoteEn,
    quickLinksRaw,
    highlightsRaw,
    adminPortalLabelAr,
    adminPortalLabelEn
  ] = await Promise.all([
    Settings.get('bot_name', 'GAMER STORE 🔥'),
    Settings.get('welcome_message', ''),
    Settings.get('support_username', 'support'),
    Settings.get('channel_username', process.env.CHANNEL_USERNAME || ''),
    Settings.get('ui_theme_preset', 'midnight'),
    Settings.get('ui_welcome_badge_ar', '🔥 للجيمرز المحترفين فقط'),
    Settings.get('ui_welcome_badge_en', '🔥 For Pro Gamers Only'),
    Settings.get('ui_welcome_title_ar', 'متجر الجيمرز الأسطوري 🎮'),
    Settings.get('ui_welcome_title_en', 'Legendary Gamer Store 🎮'),
    Settings.get('ui_welcome_subtitle_ar', 'أسرع متجر للألعاب والشحنات والبوستات - كل شي في مكان واحد مع تسليم فوري 🚀'),
    Settings.get('ui_welcome_subtitle_en', 'Fastest game keys, boosts & top-ups - all in one place with rocket delivery 🚀'),
    Settings.get('ui_footer_note_ar', '💥 عروض يومية + جوائز للمتابعين'),
    Settings.get('ui_footer_note_en', '💥 Daily deals + giveaways for followers'),
    Settings.get('bot_quick_links', DEFAULT_QUICK_LINKS),
    Settings.get('ui_home_highlights', DEFAULT_HIGHLIGHTS),
    Settings.get('admin_portal_label_ar', 'لوحة التحكم 👑'),
    Settings.get('admin_portal_label_en', 'Admin Portal 👑')
  ]);

  const theme = THEME_PRESETS[themeKey] || THEME_PRESETS.midnight;

  return {
    botName,
    welcomeMessage,
    supportUsername,
    channelUsername,
    theme,
    quickLinks: normalizeQuickLinks(quickLinksRaw),
    highlights: normalizeHighlights(highlightsRaw),
    welcome: {
      ar: {
        badge: welcomeBadgeAr,
        title: welcomeTitleAr,
        subtitle: welcomeSubtitleAr,
        footer: footerNoteAr
      },
      en: {
        badge: welcomeBadgeEn,
        title: welcomeTitleEn,
        subtitle: welcomeSubtitleEn,
        footer: footerNoteEn
      }
    },
    adminPortalLabel: {
      ar: adminPortalLabelAr,
      en: adminPortalLabelEn
    }
  };
};

const groupRows = (items = []) => {
  const rows = new Map();
  for (const item of items) {
    const row = Number(item.row) > 0 ? Number(item.row) : 1;
    if (!rows.has(row)) rows.set(row, []);
    rows.get(row).push(item);
  }
  return [...rows.entries()].sort((a, b) => a[0] - b[0]).map(([, value]) => value);
};

const buildBotInlineKeyboard = ({ Markup, lang = 'ar', isAdmin = false, quickLinks = [], supportUsername = 'support', channelUsername = '', baseUrl = '', adminPortalLabel = { ar: 'لوحة التحكم 👑', en: 'Admin Portal 👑' } }) => {
  const visibleLinks = quickLinks.filter((item) => item.visibility === 'all' || (item.visibility === 'admin' && isAdmin));
  const rows = groupRows(visibleLinks)
    .map((row) => row
      .map((item) => {
        const label = lang === 'en' ? (item.textEn || item.textAr) : (item.textAr || item.textEn);
        const emojiKey = item.emojiKey || 'rocket';
        const style = ['primary', 'success', 'danger'].includes(item.style) ? item.style : undefined;
        const emojiId = buttonEmojiId(emojiKey) || (style && buttonEmojiId(style));
        const text = buttonLabel(emojiKey, label, { emojiId, hasIcon: Boolean(emojiId) });
        const buttonExtra = emojiId ? { icon_custom_emoji_id: emojiId } : {};
        if (style) buttonExtra.style = style;
        const rawValue = interpolateValue({ value: item.value, baseUrl, supportUsername, channelUsername });

        if (item.type === 'url') {
          if (!rawValue || rawValue.includes('{channel}') && !channelUsername) return null;
          if (rawValue.endsWith('/{channel}')) return null;
          return { text, url: withProtocol(rawValue), ...buttonExtra };
        }

        if (item.type === 'webapp') {
          const target = buildAbsoluteUrl(baseUrl, rawValue);
          if (!target) return null;
          return { text, web_app: { url: target }, ...buttonExtra };
        }

        return { text, callback_data: rawValue || 'main_menu', ...buttonExtra };
      })
      .filter(Boolean))
    .filter((row) => row.length > 0);

  if (isAdmin && !rows.flat().some((button) => button.web_app?.url?.includes('/admin'))) {
    const emojiKey = 'crown';
    const emojiId = buttonEmojiId(emojiKey) || buttonEmojiId('primary');
    rows.push([
      {
        text: buttonLabel(emojiKey, lang === 'en' ? adminPortalLabel.en : adminPortalLabel.ar, { emojiId }),
        web_app: { url: getAdminPortalUrl('dashboard') },
        style: 'primary',
        ...(emojiId ? { icon_custom_emoji_id: emojiId } : {})
      }
    ]);
  }

  return Markup.inlineKeyboard(rows);
};

module.exports = {
  THEME_PRESETS,
  DEFAULT_HIGHLIGHTS,
  DEFAULT_QUICK_LINKS,
  getUiSettings,
  getAdminPortalUrl,
  buildBotInlineKeyboard,
  normalizeQuickLinks,
  normalizeHighlights
};
