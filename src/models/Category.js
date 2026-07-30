const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  nameAr: { type: String, default: '' },
  slug: { type: String, required: true, unique: true },
  icon: { type: String, default: '🎮' },
  image: { type: String, default: null },
  description: { type: String, default: '' },
  order: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  isHidden: { type: Boolean, default: false },
  gamesCount: { type: Number, default: 0 }
}, { timestamps: true });

categorySchema.index({ order: 1 });
categorySchema.index({ isActive: 1 });

module.exports = mongoose.model('Category', categorySchema);
