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
    logger.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

const seedDefaults = async () => {
  const Settings = require('../models/Settings');
  const Category = require('../models/Category');

  // Default settings
  const defaults = [
    { key: 'bot_name', value: 'Digital Keys Store', description: 'Bot display name' },
    { key: 'bot_username', value: 'your_bot', description: 'Bot username' },
    { key: 'welcome_message', value: '👋 أهلاً {name}!\n\n🛒 مرحباً بك في متجر مفاتيح الباندل الرقمية 🔑\n\n🔥 مخزون حي\n⚡ تسليم فوري', description: 'Welcome message' },
    { key: 'maintenance_mode', value: false, description: 'Maintenance mode toggle' },
    { key: 'maintenance_message', value: '🔧 الموقع تحت الصيانة، يرجى المحاولة لاحقاً', description: 'Maintenance message' },
    { key: 'support_username', value: 'support', description: 'Support username' },
    { key: 'currency', value: 'USD', description: 'Default currency' },
    { key: 'min_deposit', value: 1, description: 'Minimum deposit amount' },
    { key: 'binance_api_key', value: '', description: 'Binance API Key', isSecret: true },
    { key: 'binance_secret_key', value: '', description: 'Binance Secret Key', isSecret: true },
    { key: 'binance_merchant_id', value: '', description: 'Binance Merchant ID' },
    { key: 'usdt_wallet_trc20', value: '', description: 'USDT TRC20 Wallet' },
    { key: 'payment_timeout_minutes', value: 15, description: 'Payment timeout in minutes' },
    { key: 'auto_verify_payments', value: true, description: 'Auto verify Binance payments' },
    { key: 'referral_bonus', value: 0.5, description: 'Referral bonus in USD' },
    { key: 'shop_title', value: '🔑 متجر المفاتيح الرقمية', description: 'Shop title' },
    { key: 'shop_description', value: 'أفضل الأسعار وأسرع التسليم', description: 'Shop description' },
    { key: 'footer_text', value: '💎 شكراً لثقتكم بنا', description: 'Footer text' },
    { key: 'admin_notification_on_order', value: true, description: 'Notify admin on new order' },
    { key: 'admin_notification_on_payment', value: true, description: 'Notify admin on payment proof' },
    { key: 'channel_id', value: '', description: 'Telegram channel ID for announcements' },
    { key: 'force_join_channel', value: false, description: 'Force users to join channel' },
  ];

  for (const s of defaults) {
    const exists = await Settings.findOne({ key: s.key });
    if (!exists) {
      await Settings.create({ key: s.key, value: s.value, description: s.description, isSecret: s.isSecret || false });
    }
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
