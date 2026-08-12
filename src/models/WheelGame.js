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

// Weighted random prize. Returns the prize plus its index among ACTIVE prizes
// so the customer strip (which also hides inactive prizes) lands correctly.
wheelGameSchema.methods.pickPrize = function () {
  const active = [];
  this.prizes.forEach((prize, rawIndex) => {
    if (prize.isActive !== false) {
      active.push({ prize, activeIndex: active.length, rawIndex });
    }
  });
  if (!active.length) {
    return { prize: this.prizes[0], activeIndex: 0, rawIndex: 0 };
  }

  const totalWeight = active.reduce((sum, item) => sum + (item.prize.weight || 1), 0);
  let random = Math.random() * totalWeight;

  for (const item of active) {
    random -= (item.prize.weight || 1);
    if (random <= 0) return item;
  }
  return active[active.length - 1];
};

module.exports = mongoose.model('WheelGame', wheelGameSchema);
