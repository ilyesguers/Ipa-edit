const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  description: { type: String, default: '' },
  discountType: { type: String, enum: ['percentage', 'fixed'], required: true },
  discountValue: { type: Number, required: true, min: 0 },
  maxUses: { type: Number, default: null },
  currentUses: { type: Number, default: 0 },
  minOrderAmount: { type: Number, default: 0 },
  maxDiscountAmount: { type: Number, default: null },
  applicableProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  isActive: { type: Boolean, default: true },
  expiresAt: { type: Date, default: null },
  createdBy: { type: Number, required: true },
  usedBy: [{
    userId: Number,
    username: String,
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    usedAt: { type: Date, default: Date.now },
    discountApplied: Number
  }]
}, { timestamps: true });

couponSchema.methods.isValid = function () {
  if (!this.isActive) return { valid: false, reason: 'Coupon is inactive' };
  if (this.expiresAt && new Date() > this.expiresAt) return { valid: false, reason: 'Coupon has expired' };
  if (this.maxUses !== null && this.currentUses >= this.maxUses) return { valid: false, reason: 'Coupon usage limit reached' };
  return { valid: true };
};

couponSchema.methods.calculateDiscount = function (orderAmount) {
  if (this.discountType === 'percentage') {
    const discount = (orderAmount * this.discountValue) / 100;
    return this.maxDiscountAmount ? Math.min(discount, this.maxDiscountAmount) : discount;
  }
  return Math.min(this.discountValue, orderAmount);
};

module.exports = mongoose.model('Coupon', couponSchema);
