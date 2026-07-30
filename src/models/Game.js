const mongoose = require('mongoose');

const gameSchema = new mongoose.Schema({
  name: { type: String, required: true },
  nameAr: { type: String, default: '' },
  slug: { type: String, required: true, unique: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  icon: { type: String, default: null },
  image: { type: String, default: null },
  description: { type: String, default: '' },
  order: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  isHidden: { type: Boolean, default: false },
  isFeatured: { type: Boolean, default: false },
  productsCount: { type: Number, default: 0 },
  totalSales: { type: Number, default: 0 }
}, { timestamps: true });

gameSchema.index({ category: 1 });
gameSchema.index({ isActive: 1 });

module.exports = mongoose.model('Game', gameSchema);
