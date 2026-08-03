const mongoose = require('mongoose');
const { SUPPORTED_LANGUAGES } = require('../utils/languages');

const purchaseHistorySchema = new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  productName: String,
  duration: String,
  price: Number,
  key: String,
  purchasedAt: { type: Date, default: Date.now }
}, { _id: false });

const balanceTransactionSchema = new mongoose.Schema({
  type: { type: String, enum: ['credit', 'debit', 'purchase', 'refund'], required: true },
  amount: { type: Number, required: true },
  description: String,
  adminId: Number,
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  createdAt: { type: Date, default: Date.now }
}, { _id: false });

const userSchema = new mongoose.Schema({
  telegramId: { type: Number, required: true, unique: true, index: true },
  username: { type: String, default: null },
  firstName: { type: String, default: '' },
  lastName: { type: String, default: '' },
  languageCode: { type: String, default: 'ar' },
  phone: { type: String, default: null },
  currency: { type: String, default: 'USD' },
  role: { type: String, enum: ['customer', 'admin', 'superadmin'], default: 'customer' },
  // Granular admin permissions. Empty array = full access (legacy admin).
  // Only meaningful when role === 'admin'.
  permissions: [{ type: String, enum: ['dashboard', 'products', 'inventory', 'orders', 'users', 'coupons', 'broadcast', 'settings'] }],
  balance: { type: Number, default: 0, min: 0 },
  totalSpent: { type: Number, default: 0 },
  totalDeposited: { type: Number, default: 0 },
  totalOrders: { type: Number, default: 0 },
  isBanned: { type: Boolean, default: false },
  banReason: { type: String, default: null },
  isActive: { type: Boolean, default: true },
  lastSeen: { type: Date, default: Date.now },
  purchaseHistory: [purchaseHistorySchema],
  balanceHistory: [balanceTransactionSchema],
  referredBy: { type: Number, default: null },
  referralCount: { type: Number, default: 0 },
  // `languageSelected` lets us distinguish an explicit choice from the
  // fallback language assigned when Telegram creates the account.
  preferredLanguage: { type: String, enum: SUPPORTED_LANGUAGES, default: 'ar' },
  languageSelected: { type: Boolean, default: false },
  notificationsEnabled: { type: Boolean, default: true },
  captchaPassed: { type: Boolean, default: false },
  captchaPassedAt: { type: Date, default: null },
  // Private admin-only notes about this account (support context, warnings…).
  // Never exposed through any customer-facing endpoint.
  adminNotes: { type: String, default: '', maxlength: 1000 }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

userSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName || ''}`.trim();
});

userSchema.methods.addBalance = async function (amount, description = 'Balance added', adminId = null) {
  this.balance += amount;
  this.totalDeposited += amount;
  this.balanceHistory.push({ type: 'credit', amount, description, adminId });
  return this.save();
};

userSchema.methods.deductBalance = async function (amount, description = 'Balance deducted', adminId = null) {
  if (this.balance < amount) throw new Error('Insufficient balance');
  this.balance -= amount;
  this.balanceHistory.push({ type: 'debit', amount, description, adminId });
  return this.save();
};

userSchema.index({ username: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ isBanned: 1 });

module.exports = mongoose.model('User', userSchema);
