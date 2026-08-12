const mongoose = require('mongoose');
const logger = require('../utils/logger');

let isConnected = false;

const connectDB = async () => {
  if (isConnected) return;

  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/digital_keys_store';

  try {
    await mongoose.connect(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    isConnected = true;
    logger.info('✅ MongoDB connected successfully');

    mongoose.connection.on('disconnected', () => {
      isConnected = false;
      logger.warn('⚠️ MongoDB disconnected. Retrying...');
    });

    mongoose.connection.on('reconnected', () => {
      isConnected = true;
      logger.info('✅ MongoDB reconnected');
    });

  } catch (error) {
    // IMPORTANT: do NOT process.exit here — src/index.js wraps this call in a
    // retry loop and falls back to a degraded server (healthcheck still up) so
    // Railway doesn't kill the container on a temporary DB hiccup.
    logger.error('❌ MongoDB connection failed:', error.message);
    throw error;
  }
};

const seedDefaults = async () => {
  const Settings = require('../models/Settings');
  const Category = require('../models/Category');

  // Default settings — professional wording, kept in sync with src/utils/uiConfig.js
  const defaults = [
    { key: 'bot_name', value: 'GAMER STORE', description: 'Bot display name' },
    { key: 'bot_username', value: 'your_bot', description: 'Bot username' },
    { key: 'welcome_message', value: 'منتجات أصلية 100% وتسليم فوري على مدار الساعة.\nاختر «فتح المتجر» للبدء.', description: 'Welcome message' },
    { key: 'maintenance_mode', value: false, description: 'Maintenance mode toggle' },
    { key: 'maintenance_message', value: '🔧 المتجر تحت الصيانة مؤقتاً — نعود للعمل خلال دقائق. / Maintenance in progress — back shortly.', description: 'Maintenance message' },
    { key: 'support_username', value: 'support', description: 'Support username' },
    { key: 'channel_username', value: '', description: 'Telegram channel username' },
    { key: 'currency', value: 'USD', description: 'Default currency' },
    { key: 'min_deposit', value: 1, description: 'Minimum deposit amount' },
    { key: 'binance_api_key', value: '', description: 'Binance API Key', isSecret: true },
    { key: 'binance_secret_key', value: '', description: 'Binance Secret Key', isSecret: true },
    { key: 'binance_merchant_id', value: '', description: 'Binance Merchant ID' },
    { key: 'usdt_wallet_trc20', value: '', description: 'USDT TRC20 Wallet' },
    { key: 'payment_timeout_minutes', value: 15, description: 'Payment timeout in minutes' },
    { key: 'auto_verify_payments', value: true, description: 'Auto verify Binance payments' },
    // ⭐ Telegram Stars payments — price is fully controlled by the admin here
    { key: 'stars_enabled', value: true, description: 'Enable Telegram Stars (XTR) payments' },
    { key: 'stars_per_usd', value: 50, description: 'How many Telegram Stars equal 1 USD' },
    // 🎁 Balance-for-offers: customers trade accounts/keys for wallet balance with support
    { key: 'balance_offers_enabled', value: true, description: 'Show the "balance for offers" support button in checkout' },
    { key: 'balance_offers_note_ar', value: 'رصيد مقابل عروض — تواصل مع الدعم', description: 'Offers button label (Arabic)' },
    { key: 'balance_offers_note_en', value: 'Balance for offers — contact support', description: 'Offers button label (English)' },
    // ✨ Premium emoji pack (admin-panel managed)
    { key: 'premium_emoji_enabled', value: false, description: 'Render bot emojis with the owner premium pack' },
    { key: 'premium_emoji_map', value: {}, description: 'Custom premium emoji IDs per emoji key' },
    { key: 'referral_bonus', value: 0.5, description: 'Referral bonus in USD' },
    { key: 'shop_title', value: '🔑 متجر المفاتيح الرقمية', description: 'Shop title' },
    { key: 'shop_description', value: 'أفضل الأسعار وأسرع التسليم', description: 'Shop description' },
    { key: 'footer_text', value: 'شكراً لثقتكم بنا', description: 'Footer text' },
    { key: 'admin_notification_on_order', value: true, description: 'Notify admin on new order' },
    { key: 'admin_notification_on_payment', value: true, description: 'Notify admin on payment proof' },
    { key: 'channel_id', value: '', description: 'Telegram channel ID for announcements' },
    { key: 'banner_image_url', value: '', description: 'Welcome banner image URL used by the bot' },
    { key: 'force_join_channel', value: false, description: 'Force users to join channel' },
    { key: 'ui_theme_preset', value: 'midnight', description: 'Visual theme preset for bot and mini apps' },
    { key: 'ui_welcome_badge_ar', value: 'كل ما يحتاجه اللاعب في مكان واحد', description: 'Arabic welcome badge' },
    { key: 'ui_welcome_badge_en', value: 'Everything a player needs in one place', description: 'English welcome badge' },
    { key: 'ui_welcome_title_ar', value: 'متجر الألعاب الرقمي 🎮', description: 'Arabic welcome title' },
    { key: 'ui_welcome_title_en', value: 'Digital Game Store 🎮', description: 'English welcome title' },
    { key: 'ui_welcome_subtitle_ar', value: 'مفاتيح وشحنات وخدمات الألعاب في مكان واحد — تسليم فوري ودعم متواصل.', description: 'Arabic welcome subtitle' },
    { key: 'ui_welcome_subtitle_en', value: 'Game keys, top-ups and services in one place — instant delivery and continuous support.', description: 'English welcome subtitle' },
    { key: 'ui_footer_note_ar', value: 'عروض وتحديثات يومية في القناة', description: 'Arabic footer note' },
    { key: 'ui_footer_note_en', value: 'Daily deals and updates in the channel', description: 'English footer note' },
    { key: 'admin_portal_label_ar', value: 'لوحة التحكم 👑', description: 'Admin portal button label in Arabic' },
    { key: 'admin_portal_label_en', value: 'Admin Portal 👑', description: 'Admin portal button label in English' },
    {
      key: 'ui_home_highlights',
      value: [
        { id: 'rocket', emojiKey: 'rocket', textAr: 'تسليم فوري', textEn: 'Instant delivery' },
        { id: 'shield', emojiKey: 'shield', textAr: 'منتجات أصلية 100%', textEn: '100% genuine products' },
        { id: 'fire', emojiKey: 'fire', textAr: 'أسعار منافسة', textEn: 'Competitive prices' },
        { id: 'support', emojiKey: 'support', textAr: 'دعم متواصل', textEn: 'Continuous support' }
      ],
      description: 'Highlights shown across bot and mini app'
    },
    {
      key: 'bot_quick_links',
      value: [
        { id: 'customer_app', emojiKey: 'rocket', textAr: '🛍️ فتح المتجر', textEn: '🛍️ Open Store', type: 'webapp', value: '/customer', row: 1, visibility: 'all', style: 'primary' },
        { id: 'support', emojiKey: 'support', textAr: '💬 الدعم الفني', textEn: '💬 Support', type: 'url', value: 'https://t.me/{support}', row: 2, visibility: 'all', style: 'danger' },
        { id: 'channel', emojiKey: 'megaphone', textAr: '📣 قناة العروض', textEn: '📣 Deals Channel', type: 'url', value: 'https://t.me/{channel}', row: 2, visibility: 'all', style: 'secondary' },
        { id: 'language', emojiKey: 'globe', textAr: '🌍 English', textEn: '🌍 العربية', type: 'callback', value: 'language', row: 3, visibility: 'all', style: 'secondary' }
      ],
      description: 'Configurable bot quick links'
    }
  ];

  for (const s of defaults) {
    const exists = await Settings.findOne({ key: s.key });
    if (!exists) {
      await Settings.create({ key: s.key, value: s.value, description: s.description, isSecret: s.isSecret || false });
    }
  }

  // ── Legacy migration: upgrade old "Digital Keys Store" branding to Gamer Edition ──
  // Only touches installs that still carry the untouched legacy defaults, so a
  // store owner who customized values keeps their customization.
  const legacyBranding = [
    { key: 'bot_name', old: 'Digital Keys Store', value: 'GAMER STORE 🔥' },
    { key: 'welcome_message', old: 'أهلاً {name}!\n\nمتجر ألعاب رقمي بمخزون حي وتسليم فوري.', value: '🔥 للجيمرز المحترفين فقط\n\nهلا والله يا أسطورة 👑\nأسرع متجر للألعاب والشحنات - تسليم فوري 🚀' },
    { key: 'ui_welcome_badge_ar', old: 'واجهة جديدة • بوت أذكى', value: '🔥 للجيمرز المحترفين فقط' },
    { key: 'ui_welcome_badge_en', old: 'Fresh look • Smarter bot', value: '🔥 For Pro Gamers Only' },
    { key: 'ui_welcome_title_ar', old: 'متجر رقمي منظم وسريع', value: 'متجر الجيمرز الأسطوري 🎮' },
    { key: 'ui_welcome_title_en', old: 'A cleaner, faster digital storefront', value: 'Legendary Gamer Store 🎮' },
    { key: 'ui_welcome_subtitle_ar', old: 'تسوّق بسرعة، راقب طلباتك، وافتح المتجر أو لوحة التحكم من مكان واحد.', value: 'أسرع متجر للألعاب والشحنات والبوستات - كل شي في مكان واحد مع تسليم فوري 🚀' },
    { key: 'ui_welcome_subtitle_en', old: 'Shop faster, track orders, and jump into the store or control panel from one place.', value: 'Fastest game keys, boosts & top-ups - all in one place with rocket delivery 🚀' }
  ];
  let migratedAny = false;
  for (const item of legacyBranding) {
    const setting = await Settings.findOne({ key: item.key });
    if (setting && String(setting.value) === item.old) {
      setting.value = item.value;
      setting.description = defaults.find((d) => d.key === item.key)?.description || setting.description;
      await setting.save();
      migratedAny = true;
      logger.info(`🔄 Migrated setting ${item.key} to Gamer Edition value`);
    }
  }
  // Only bump the theme when the rest of the branding was still legacy, so an
  // admin who intentionally picked the aurora theme keeps it.
  if (migratedAny) {
    const theme = await Settings.findOne({ key: 'ui_theme_preset' });
    if (theme && String(theme.value) === 'aurora') {
      theme.value = 'midnight';
      await theme.save();
      logger.info('🔄 Migrated ui_theme_preset aurora → midnight (legacy branding detected)');
    }
  }

  // ── v5 migration: replace slang-heavy wording with professional copy ──
  // Each entry lists every previously-seeded variant so untouched defaults get
  // the new professional text, while admin-customized values stay untouched.
  const professionalWording = [
    {
      key: 'welcome_message',
      olds: [
        '🔥 للجيمرز المحترفين فقط\n\nهلا والله يا أسطورة 👑\nأسرع متجر للألعاب والشحنات - تسليم فوري 🚀',
        'أهلاً {name}!\n\nمتجر ألعاب رقمي بمخزون حي وتسليم فوري.'
      ],
      value: defaults.find((d) => d.key === 'welcome_message').value
    },
    {
      key: 'ui_welcome_badge_ar',
      olds: ['🔥 للجيمرز المحترفين فقط', 'واجهة جديدة • بوت أذكى'],
      value: defaults.find((d) => d.key === 'ui_welcome_badge_ar').value
    },
    {
      key: 'ui_welcome_badge_en',
      olds: ['🔥 For Pro Gamers Only', 'Fresh look • Smarter bot'],
      value: defaults.find((d) => d.key === 'ui_welcome_badge_en').value
    },
    {
      key: 'ui_welcome_title_ar',
      olds: ['متجر الجيمرز الأسطوري 🎮', 'متجر رقمي منظم وسريع'],
      value: defaults.find((d) => d.key === 'ui_welcome_title_ar').value
    },
    {
      key: 'ui_welcome_title_en',
      olds: ['Legendary Gamer Store 🎮', 'A cleaner, faster digital storefront'],
      value: defaults.find((d) => d.key === 'ui_welcome_title_en').value
    },
    {
      key: 'ui_welcome_subtitle_ar',
      olds: [
        'أسرع متجر للألعاب والشحنات والبوستات - كل شي في مكان واحد مع تسليم فوري 🚀',
        'تسوّق بسرعة، راقب طلباتك، وافتح المتجر أو لوحة التحكم من مكان واحد.'
      ],
      value: defaults.find((d) => d.key === 'ui_welcome_subtitle_ar').value
    },
    {
      key: 'ui_welcome_subtitle_en',
      olds: [
        'Fastest game keys, boosts & top-ups - all in one place with rocket delivery 🚀',
        'Shop faster, track orders, and jump into the store or control panel from one place.'
      ],
      value: defaults.find((d) => d.key === 'ui_welcome_subtitle_en').value
    },
    {
      key: 'ui_footer_note_ar',
      olds: ['💥 عروض يومية + جوائز للمتابعين'],
      value: defaults.find((d) => d.key === 'ui_footer_note_ar').value
    },
    {
      key: 'maintenance_message',
      olds: ['🔧 المتجر تحت الصيانة السريعة - بنرجع بسرعة الصاروخ 🚀 / Quick maintenance - coming back rocket fast'],
      value: defaults.find((d) => d.key === 'maintenance_message').value
    },
    {
      key: 'footer_text',
      olds: ['💎 شكراً لثقتكم بنا'],
      value: defaults.find((d) => d.key === 'footer_text').value
    }
  ];
  for (const item of professionalWording) {
    const setting = await Settings.findOne({ key: item.key });
    if (setting && item.olds.includes(String(setting.value))) {
      setting.value = item.value;
      setting.description = defaults.find((d) => d.key === item.key)?.description || setting.description;
      await setting.save();
      logger.info(`🔄 Migrated setting ${item.key} to professional wording`);
    }
  }

  // Quick links that still carry "PLAY NOW"-style seeds get the clean labels once.
  const seededQuickLinks = await Settings.findOne({ key: 'bot_quick_links' });
  if (seededQuickLinks && JSON.stringify(seededQuickLinks.value).includes('PLAY NOW')) {
    seededQuickLinks.value = defaults.find((d) => d.key === 'bot_quick_links').value;
    await seededQuickLinks.save();
    logger.info('🔄 Migrated bot_quick_links to clean professional labels');
  }

  // Default categories
  const cats = [
    { name: 'Android', nameAr: 'اندرويد', slug: 'android', icon: '📱', order: 1 },
    { name: 'iPhone', nameAr: 'ايفون', slug: 'iphone', icon: '🍎', order: 2 },
    { name: 'PC', nameAr: 'كمبيوتر', slug: 'pc', icon: '💻', order: 3 },
  ];

  for (const cat of cats) {
    const exists = await Category.findOne({ slug: cat.slug });
    if (!exists) {
      await Category.create(cat);
    }
  }

  logger.info('✅ Default settings & categories seeded');
};

module.exports = { connectDB, seedDefaults };
