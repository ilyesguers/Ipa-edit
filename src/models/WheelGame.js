const mongoose = require('mongoose');

const prizeSchema = new mongoose.Schema({
  label: { type: String, required: true },
  labelAr: { type: String, default: '' },
  value: { type: Number, required: true, min: 0 },
  type: { type: String, enum: ['balance', 'nothing'], default: 'balance' },
  color: { type: String, default: '#10b981' },
  icon: { type: String, default: '' },
  weight: { type: Number, default: 1, min: 0.1 },
  isActive: { type: Boolean, default: true }
}, { _id: false });

const wheelGameSchema = new mongoose.Schema({
  name: { type: String, required: true },
  nameAr: { type: String, default: '' },
  costPerSpin: { type: Number, required: true, min: 0.01 },
  prizes: { type: [prizeSchema], validate: [(v) => v.length >= 2, 'At least 2 prizes required'] },
  isActive: { type: Boolean, default: true },
  isHidden: { type: Boolean, default: false },
  totalSpins: { type: Number, default: 0 },
  totalPayout: { type: Number, default: 0 },
  createdBy: { type: Number }
}, { timestamps: true });

// Instance method: weighted random prize selection
wheelGameSchema.methods.pickPrize = function () {
  const activePrizes = this.prizes.filter(p => p.isActive);
  if (!activePrizes.length) return this.prizes[0];

  const totalWeight = activePrizes.reduce((sum, p) => sum + (p.weight || 1), 0);
  let random = Math.random() * totalWeight;

  for (const prize of activePrizes) {
    random -= (prize.weight || 1);
    if (random <= 0) return prize;
  }
  return activePrizes[activePrizes.length - 1];
};

module.exports = mongoose.model('WheelGame', wheelGameSchema);
