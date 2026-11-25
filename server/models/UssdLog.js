const mongoose = require('mongoose');

const ussdLogSchema = new mongoose.Schema({
  sessionId: { type: String, default: '' },
  phone: { type: String, default: '' },
  serviceCode: { type: String, default: '' },
  text: { type: String, default: '' },
  response: { type: String, default: '' },
  ended: { type: Boolean, default: false },
  expiresAt: { type: Date, default: () => new Date(Date.now() + 30 * 86400000) },
}, { timestamps: true });

ussdLogSchema.index({ createdAt: -1 });
ussdLogSchema.index({ phone: 1, createdAt: -1 });
ussdLogSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('UssdLog', ussdLogSchema);
