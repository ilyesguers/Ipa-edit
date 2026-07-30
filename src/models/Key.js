const mongoose = require('mongoose');

const keySchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  durationId: { type: mongoose.Schema.Types.ObjectId, required: true },
  durationName: { type: String, required: true },
  keyValue: { type: String, required: true },
  status: {
    type: String,
    enum: ['available', 'sold', 'reserved', 'expired', 'invalid'],
    default: 'available',
    index: true
  },
  soldTo: { type: Number, default: null },
  soldToUsername: { type: String, default: null },
  soldAt: { type: Date, default: null },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
  reservedAt: { type: Date, default: null },
  reservedUntil: { type: Date, default: null },
  addedBy: { type: Number, required: true },
  source: { type: String, enum: ['manual', 'bulk_import', 'api'], default: 'manual' },
  notes: { type: String, default: '' }
}, { timestamps: true });

keySchema.index({ product: 1, durationId: 1, status: 1 });
keySchema.index({ soldTo: 1 });
keySchema.index({ orderId: 1 });

// Static method to get available key for product+duration
keySchema.statics.getAvailableKey = async function (productId, durationId) {
  return this.findOneAndUpdate(
    { product: productId, durationId: durationId, status: 'available' },
    { status: 'reserved', reservedAt: new Date(), reservedUntil: new Date(Date.now() + 10 * 60 * 1000) },
    { new: true }
  );
};

module.exports = mongoose.model('Key', keySchema);
