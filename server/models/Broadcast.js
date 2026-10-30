const mongoose = require('mongoose');

const broadcastSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  message: { type: String, required: true },
  type: { type: String, default: 'system' },
  audience: { type: String, enum: ['all', 'farmer', 'buyer', 'expert', 'seller'], default: 'all' },
  district: { type: String, default: '' },
  channels: { type: [String], enum: ['in_app', 'sms', 'push'], default: ['in_app', 'sms'] },
  recipientCount: { type: Number, default: 0 },
  sentBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

broadcastSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Broadcast', broadcastSchema);
