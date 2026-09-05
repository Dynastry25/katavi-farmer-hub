const mongoose = require('mongoose');

const priceAlertSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  crop: { type: String, required: true, trim: true },
  thresholdPct: { type: Number, default: 10, min: 1, max: 100 },
  lastNotifiedPrice: { type: Number, default: null },
  active: { type: Boolean, default: true },
}, { timestamps: true });

priceAlertSchema.index({ user: 1, crop: 1 }, { unique: true });

module.exports = mongoose.model('PriceAlert', priceAlertSchema);