const mongoose = require('mongoose');

const marketPriceSchema = new mongoose.Schema({
  cropName: { type: String, required: true, trim: true },
  category: { type: String, required: true, enum: ['cereals', 'legumes', 'vegetables', 'fruits', 'tubers', 'oilseeds'] },
  region: { type: String, required: true, trim: true },
  district: { type: String, default: '', trim: true },
  pricePerUnit: { type: Number, required: true, min: 0 },
  unit: { type: String, default: 'kg', enum: ['kg', 'bag', 'piece', 'tonne', 'bundle'] },
  currency: { type: String, default: 'TZS' },
  source: { type: String, default: 'market_average' },
  season: { type: String, enum: ['masika', 'vuli', 'masika_july', 'vuli_october', 'general'], default: 'general' },
  dateRecorded: { type: Date, default: Date.now },
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isBaseline: { type: Boolean, default: false },
  notes: { type: String, default: '' },
}, { timestamps: true });

marketPriceSchema.index({ cropName: 1, region: 1, dateRecorded: -1 });
marketPriceSchema.index({ category: 1, region: 1 });

module.exports = mongoose.model('MarketPrice', marketPriceSchema);
