const mongoose = require('mongoose');

const walletTopupSchema = new mongoose.Schema({
  topupNumber: { type: String, unique: true, index: true },
  user: { type: Number, required: true, index: true },
  username: { type: String, default: null },
  amount: { type: Number, required: true, min: 1, max: 10000 },
  method: { type: String, enum: ['telegram_stars', 'usdt', 'paypal'], required: true },
  status: { type: String, enum: ['pending', 'processing', 'completed', 'rejected', 'cancelled'], default: 'pending', index: true },
  starsAmount: { type: Number, default: null },
  transactionReference: { type: String, default: null },
  telegramPaymentChargeId: { type: String, default: null },
  providerPaymentChargeId: { type: String, default: null },
  paidByTelegramId: { type: Number, default: null },
  adminNotes: { type: String, default: '' },
  verifiedBy: { type: Number, default: null },
  verifiedAt: { type: Date, default: null },
  creditedAt: { type: Date, default: null }
}, { timestamps: true });

walletTopupSchema.pre('validate', function (next) {
  if (!this.topupNumber) {
    this.topupNumber = `TOP-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
  }
  next();
});

walletTopupSchema.index({ transactionReference: 1 }, { unique: true, partialFilterExpression: { transactionReference: { $type: 'string' } } });
walletTopupSchema.index({ user: 1, createdAt: -1 });
walletTopupSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('WalletTopup', walletTopupSchema);
