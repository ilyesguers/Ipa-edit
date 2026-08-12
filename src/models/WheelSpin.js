const mongoose = require('mongoose');

const wheelSpinSchema = new mongoose.Schema({
  wheel: { type: mongoose.Schema.Types.ObjectId, ref: 'WheelGame', required: true, index: true },
  wheelName: { type: String, default: '' },
  telegramId: { type: Number, required: true, index: true },
  username: { type: String, default: '' },
  firstName: { type: String, default: '' },
  prizeLabel: { type: String, default: '' },
  prizeLabelAr: { type: String, default: '' },
  prizeValue: { type: Number, default: 0 },
  prizeType: { type: String, default: 'balance' },
  prizeIcon: { type: String, default: '' },
  prizeColor: { type: String, default: '' },
  costPaid: { type: Number, default: 0 },
  newBalance: { type: Number, default: 0 }
}, { timestamps: true });

wheelSpinSchema.index({ createdAt: -1 });
wheelSpinSchema.index({ wheel: 1, createdAt: -1 });

module.exports = mongoose.model('WheelSpin', wheelSpinSchema);
