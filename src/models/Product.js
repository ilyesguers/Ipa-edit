const mongoose = require('mongoose');

const durationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  nameAr: { type: String, default: '' },
  days: { type: Number, required: true },
  price: { type: Number, required: true, min: 0 },
  originalPrice: { type: Number, default: null },
  isActive: { type: Boolean, default: true },
  stockCount: { type: Number, default: 0 },
  soldCount: { type: Number, default: 0 },
  order: { type: Number, default: 0 }
}, { timestamps: true });

const featureSchema = new mongoose.Schema({
  text: { type: String, required: true },
  icon: { type: String, default: '✅' },
  isHighlighted: { type: Boolean, default: false }
}, { _id: false });

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  nameAr: { type: String, default: '' },
  slug: { type: String, required: true, unique: true },
  game: { type: mongoose.Schema.Types.ObjectId, ref: 'Game', required: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  logo: { type: String, default: null },
  banner: { type: String, default: null },
  description: { type: String, default: '' },
  features: [featureSchema],
  durations: [durationSchema],
  productType: { type: String, enum: ['panel_key', 'subscription', 'service', 'other'], default: 'panel_key' },
  isActive: { type: Boolean, default: true },
  isHidden: { type: Boolean, default: false },
  isFeatured: { type: Boolean, default: false },
  totalSales: { type: Number, default: 0 },
  totalRevenue: { type: Number, default: 0 },
  rating: { type: Number, default: 5, min: 0, max: 5 },
  reviewsCount: { type: Number, default: 0 },
  order: { type: Number, default: 0 },
  tags: [{ type: String }],
  shareMessage: { type: String, default: '' }
}, { timestamps: true });

productSchema.index({ game: 1 });
productSchema.index({ category: 1 });
productSchema.index({ slug: 1 });
productSchema.index({ isActive: 1 });
productSchema.index({ isFeatured: 1 });

module.exports = mongoose.model('Product', productSchema);
