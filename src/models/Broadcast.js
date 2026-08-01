const mongoose = require('mongoose');

const broadcastSchema = new mongoose.Schema({
  // Title is optional: the API auto-generates it from the message when missing,
  // so old clients can never trigger "Path 'title' is required".
  title: { type: String, default: '' },
  message: { type: String, required: true },
  imageUrl: { type: String, default: null },
  buttons: [{
    text: String,
    url: String,
    callbackData: String
  }],
  targetAudience: {
    type: String,
    enum: ['all', 'buyers', 'with_balance', 'specific'],
    default: 'all'
  },
  specificUserIds: [{ type: Number }],
  status: {
    type: String,
    enum: ['draft', 'sending', 'completed', 'failed'],
    default: 'draft'
  },
  sentCount: { type: Number, default: 0 },
  failedCount: { type: Number, default: 0 },
  totalTargets: { type: Number, default: 0 },
  createdBy: { type: Number, required: true },
  sentAt: { type: Date, default: null },
  completedAt: { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.model('Broadcast', broadcastSchema);
