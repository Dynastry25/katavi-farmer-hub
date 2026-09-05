const mongoose = require('mongoose');

const weatherConfigSchema = new mongoose.Schema({
  key: { type: String, default: 'config', unique: true },
  source: { type: String, enum: ['open-meteo', 'openweather'], default: 'open-meteo' },
  baseUrl: { type: String, default: '' },
  apiKey: { type: String, default: '' },
  cacheMinutes: { type: Number, default: 60 },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('WeatherConfig', weatherConfigSchema);