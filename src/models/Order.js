const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderNumber: { type: String, unique: true, required: true },
  user: { type: Number, required: true, index: true },
  username: { type: String, default: null },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  productName: { type: String, required: true },
  duration: { type: mongoose.Schema.Types.ObjectId, required: true },
  durationName: { type: String, required: true },
  quantity: { type: Number, default: 1, min: 1 },
  unitPrice: { type: Number, required: true },
  totalPrice: { type: Number, required: true },
  discountAmount: { type: Number, default: 0 },
  finalPrice: { type: Number, required: true },
  couponCode: { type: String, default: null },
  keys: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Key' }],
  keyValues: [{ type: String }],
  paymentMethod: {
    type: String,
    enum: ['wallet', 'binance', 'manual_crypto', 'admin_gift', 'telegram_stars', 'paypal'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'],
    default: 'pending',
    index: true
  },
  paymentTxHash: { type: String, default: null },
  paymentOrderId: { type: String, default: null },
  binancePayId: { type: String, default: null },
  // Exact on-chain amount the customer should send for USDT (TRC20) payments.
  // Used by the automatic TronGrid verification to match incoming transfers.
  paymentAmount: { type: Number, default: null },
  // Telegram Stars payment fields (currency is always 'XTR')
  starsAmount: { type: Number, default: null },
  telegramPaymentChargeId: { type: String, default: null },
  providerPaymentChargeId: { type: String, default: null },
  starsRefundedAt: { type: Date, default: null },
  paymentProof: { type: String, default: null },
  paymentVerifiedAt: { type: Date, default: null },
  paymentVerifiedBy: { type: Number, default: null },
  deliveredAt: { type: Date, default: null },
  notes: { type: String, default: '' },
  adminNotes: { type: String, default: '' },
  refundedAt: { type: Date, default: null },
  refundReason: { type: String, default: null }
}, { timestamps: true });

// Auto-generate order number
orderSchema.pre('save', async function (next) {
  if (this.isNew) {
    const count = await this.constructor.countDocuments();
    this.orderNumber = `ORD-${Date.now()}-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

orderSchema.index({ createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ paymentTxHash: 1 });

module.exports = mongoose.model('Order', orderSchema);
