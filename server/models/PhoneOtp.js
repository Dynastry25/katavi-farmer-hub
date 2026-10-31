const mongoose = require('mongoose');

const phoneOtpSchema = new mongoose.Schema({
  phone: { type: String, required: true, unique: true, trim: true },
  purpose: { type: String, enum: ['register', 'login', 'reset'], required: true },
  role: { type: String, default: '' },
  codeHash: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  attempts: { type: Number, default: 0 },
  lastSentAt: { type: Date, default: Date.now },
  verifiedAt: { type: Date, default: null },
}, { timestamps: true });

phoneOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('PhoneOtp', phoneOtpSchema);
