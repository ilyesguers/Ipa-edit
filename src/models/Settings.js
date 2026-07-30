const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: { type: mongoose.Schema.Types.Mixed, required: true },
  description: { type: String, default: '' },
  isSecret: { type: Boolean, default: false },
  updatedBy: { type: Number, default: null }
}, { timestamps: true });

// Static helpers
settingsSchema.statics.get = async function (key, defaultValue = null) {
  const setting = await this.findOne({ key });
  return setting ? setting.value : defaultValue;
};

settingsSchema.statics.set = async function (key, value, adminId = null, description = '') {
  return this.findOneAndUpdate(
    { key },
    { value, updatedBy: adminId, description },
    { upsert: true, new: true }
  );
};

settingsSchema.statics.getAll = async function () {
  const settings = await this.find({});
  return settings.reduce((acc, s) => {
    acc[s.key] = s.isSecret ? '***hidden***' : s.value;
    return acc;
  }, {});
};

module.exports = mongoose.model('Settings', settingsSchema);
