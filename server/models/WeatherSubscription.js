const mongoose = require('mongoose');

const weatherSubscriptionSchema = new mongoose.Schema({
  phone: { type: String, required: true, trim: true },
  zone: { type: String, default: '' },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  active: { type: Boolean, default: true },
  lastSentAt: { type: Date, default: null },
}, { timestamps: true });

weatherSubscriptionSchema.index({ phone: 1, active: 1 });

module.exports = mongoose.model('WeatherSubscription', weatherSubscriptionSchema);
