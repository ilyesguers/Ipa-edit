const Settings = require('../models/Settings');
const { buttonEmojiId, emojiHtml } = require('./customEmoji');

const THEME_PRESETS = {
  aurora: {
    key: 'aurora',
    nameAr: 'أورورا',
    nameEn: 'Aurora',
    badge: '🫧',
    accent: '#00d4ff',
    secondary: '#7c3aed',
    panelEmoji: '🪄',
    welcomeEmoji: '💠'
  },
  emerald: {
    key: 'emerald',
    nameAr: 'زمردي',
    nameEn: 'Emerald',
    badge: '💚',
    accent: '#00ff88',
    secondary: '#00cfff',
    panelEmoji: '🌿',
    welcomeEmoji: '✨'
  },
  velvet: {
    key: 'velvet',
    nameAr: 'فيلفت',
    nameEn: 'Velvet',
    badge: '🪻',
    accent: '#a855f7',
    secondary: '#f472b6',
    panelEmoji: '🎛️',
    welcomeEmoji: '🌙'
  },
  sunset: {
    key: 'sunset',
    nameAr: 'غروب',
    nameEn: 'Sunset',
    badge: '🌇',
    accent: '#ff8a00',
    secondary: '#ff3b5c',
    panelEmoji: '☀️',
    welcomeEmoji: '🔥'
  },
  midnight: {
    key: 'midnight',
    nameAr: 'منتصف الليل 🌙',
    nameEn: 'Midnight 🌙',
    badge: '🌙',
    accent: '#00ff88',
    secondary: '#a855f7',
    panelEmoji: '🌙',
    welcomeEmoji: '🌟'
  }
};

const DEFAULT_HIGHLIGHTS = [
  { icon: '⚡', textAr: 'تسليم فوري بعد تأكيد الدفع', textEn: 'Instant delivery right after payment confirmation' },
  { icon: '🛡️', textAr: 'واجهة مرتبة وتجربة احترافية', textEn: 'Organized interface with a premium experience' },
  { icon: '🎯', textAr: 'إدارة كاملة للمخزون والطلبات', textEn: 'Complete control over stock and orders' }
];

const DEFAULT_QUICK_LINKS = [
  { id: 'shop', icon: '🛍️', textAr: 'تصفح المنتجات', textEn: 'Browse Products', type: 'callback', value: 'shop', row: 1, visibility: 'all', style: 'primary' },
  { id: 'keys', icon: '🔑', textAr: 'مفاتيحي', textEn: 'My Keys', type: 'callback', value: 'mykeys', row: 1, visibility: 'all', style: 'success' },
  { id: 'history', icon: '📋', textAr: 'طلباتي', textEn: 'My Orders', type: 'callback', value: 'history', row: 2, visibility: 'all' },
  { id: 'profile', icon: '👤', textAr: 'حسابي', textEn: 'Profile', type: 'callback', value: 'profile', row: 2, visibility: 'all', style: 'success' },
  { id: 'balance', icon: '💰', textAr: 'شحن الرصيد', textEn: 'Top Up Balance', type: 'callback', value: 'addbalance', row: 3, visibility: 'all', style: 'success' },
  { id: 'help', icon: '🆘', textAr: 'الدعم والمساعدة', textEn: 'Help & Support', type: 'callback', value: 'help', row: 3, visibility: 'all', style: 'danger' },
  { id: 'customer_app', icon: '🛒', textAr: 'فتح المتجر', textEn: 'Open Store', type: 'webapp', value: '/customer', row: 4, visibility: 'all', style: 'primary' },
  { id: 'support', icon: '💬', textAr: 'التواصل مع الدعم', textEn: 'Contact Support', type: 'url', value: 'https://t.me/{support}', row: 4, visibility: 'all', style: 'danger' },
  { id: 'channel', icon: '📣', textAr: 'القناة الرسمية', textEn: 'Official Channel', type: 'url', value: 'https://t.me/{channel}', row: 5, visibility: 'all' }
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

const normalizeQuickLinks = (value) => {
  const parsed = parseJsonSetting(value, DEFAULT_QUICK_LINKS);
  if (!Array.isArray(parsed) || !parsed.length) return clone(DEFAULT_QUICK_LINKS);

  return parsed
    .map((item, index) => ({
      id: item.id || `link_${index + 1}`,
      icon: item.icon || '✨',
      textAr: item.textAr || item.text || 'زر',
      textEn: item.textEn || item.text || 'Button',
      type: ['callback', 'webapp', 'url'].includes(item.type) ? item.type : 'callback',
      value: item.value || 'shop',
      row: Number(item.row) > 0 ? Number(item.row) : 1,
      visibility: ['all', 'admin'].includes(item.visibility) ? item.visibility : 'all',
      style: ['primary', 'success', 'danger'].includes(item.style) ? item.style : null
    }))
    .sort((a, b) => a.row - b.row);
};

const normalizeHighlights = (value) => {
  const parsed = parseJsonSetting(value, DEFAULT_HIGHLIGHTS);
  if (!Array.isArray(parsed) || !parsed.length) return clone(DEFAULT_HIGHLIGHTS);

  return parsed.map((item, index) => ({
    id: item.id || `highlight_${index + 1}`,
    icon: item.icon || '✨',
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
    Settings.get('bot_name', 'Digital Keys Store'),
    Settings.get('welcome_message', ''),
    Settings.get('support_username', 'support'),
    Settings.get('channel_username', process.env.CHANNEL_USERNAME || ''),
    Settings.get('ui_theme_preset', 'aurora'),
    Settings.get('ui_welcome_badge_ar', 'واجهة جديدة • بوت أذكى'),
    Settings.get('ui_welcome_badge_en', 'Fresh look • Smarter bot'),
    Settings.get('ui_welcome_title_ar', 'متجر رقمي منظم وسريع'),
    Settings.get('ui_welcome_title_en', 'A cleaner, faster digital storefront'),
    Settings.get('ui_welcome_subtitle_ar', 'تسوّق بسرعة، راقب طلباتك، وافتح المتجر أو لوحة التحكم من مكان واحد.'),
    Settings.get('ui_welcome_subtitle_en', 'Shop faster, track orders, and jump into the store or control panel from one place.'),
    Settings.get('ui_footer_note_ar', 'جاهز دائماً للتحديثات والعروض الجديدة.'),
    Settings.get('ui_footer_note_en', 'Always ready for new updates and fresh offers.'),
    Settings.get('bot_quick_links', DEFAULT_QUICK_LINKS),
    Settings.get('ui_home_highlights', DEFAULT_HIGHLIGHTS),
    Settings.get('admin_portal_label_ar', 'لوحة التحكم'),
    Settings.get('admin_portal_label_en', 'Admin Portal')
  ]);

  const theme = THEME_PRESETS[themeKey] || THEME_PRESETS.aurora;

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

const buildBotInlineKeyboard = ({ Markup, lang = 'ar', isAdmin = false, quickLinks = [], supportUsername = 'support', channelUsername = '', baseUrl = '', adminPortalLabel = { ar: 'لوحة التحكم', en: 'Admin Portal' } }) => {
  const visibleLinks = quickLinks.filter((item) => item.visibility === 'all' || (item.visibility === 'admin' && isAdmin));
  const rows = groupRows(visibleLinks)
    .map((row) => row
      .map((item) => {
        const text = `${item.icon || '✨'} ${lang === 'en' ? (item.textEn || item.textAr) : (item.textAr || item.textEn)}`;
        const rawValue = interpolateValue({ value: item.value, baseUrl, supportUsername, channelUsername });

        // Build button with optional style (Telegram Bot API 9.4+)
        // Styles: 'primary' (blue), 'success' (green), 'danger' (red)
        const style = ['primary', 'success', 'danger'].includes(item.style) ? item.style : undefined;
        const buttonExtra = style ? { style, icon_custom_emoji_id: buttonEmojiId(style) } : {};

        if (item.type === 'url') {
          if (rawValue.includes('{channel}') || rawValue.endsWith('/')) return null;
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

  if (isAdmin) {
    rows.push([
      {
        text: `👑 ${lang === 'en' ? adminPortalLabel.en : adminPortalLabel.ar}`,
        web_app: { url: getAdminPortalUrl('dashboard') },
        style: 'primary',
        icon_custom_emoji_id: buttonEmojiId('primary')
      }
    ]);
  }

  return Markup.inlineKeyboard(rows);
};

const buildMainReplyKeyboard = (lang = 'ar', isAdmin = false) => {
  const arRows = [
    [{ text: '🛍️ المتجر' }, { text: '🗂️ مفاتيحي' }],
    [{ text: '🧾 طلباتي' }, { text: '👤 حسابي' }],
    [{ text: '💳 شحن الرصيد' }, { text: '🆘 الدعم' }],
    [{ text: '🌐 تغيير اللغة' }]
  ];

  const enRows = [
    [{ text: '🛍️ Store' }, { text: '🗂️ My Keys' }],
    [{ text: '🧾 Orders' }, { text: '👤 Profile' }],
    [{ text: '💳 Balance' }, { text: '🆘 Support' }],
    [{ text: '🌐 Change Language' }]
  ];

  const keyboard = lang === 'en' ? enRows : arRows;
  if (isAdmin) {
    keyboard.push([{ text: lang === 'en' ? '👑 Admin Portal' : '👑 لوحة التحكم' }]);
  }

  return {
    reply_markup: {
      keyboard,
      resize_keyboard: true,
      is_persistent: true,
      input_field_placeholder: lang === 'en' ? 'Use the smart menu below' : 'استخدم القائمة الذكية بالأسفل'
    }
  };
};

module.exports = {
  THEME_PRESETS,
  DEFAULT_HIGHLIGHTS,
  DEFAULT_QUICK_LINKS,
  getUiSettings,
  getAdminPortalUrl,
  buildBotInlineKeyboard,
  buildMainReplyKeyboard,
  normalizeQuickLinks,
  normalizeHighlights
};
