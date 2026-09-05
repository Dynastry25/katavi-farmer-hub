const mongoose = require('mongoose');

const weatherZoneSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  district: { type: String, default: '' },
  ward: { type: String, default: '' },
  lat: { type: Number, required: true },
  lon: { type: Number, required: true },
  active: { type: Boolean, default: true },
  alertEnabled: { type: Boolean, default: true },
  alertRainMm: { type: Number, default: 30 },
  alertTempC: { type: Number, default: 35 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('WeatherZone', weatherZoneSchema);