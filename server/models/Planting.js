const mongoose = require('mongoose');

const PLANTING_STATUSES = ['planned', 'planted', 'growing', 'harvested', 'failed'];

const plantingSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  farm: { type: mongoose.Schema.Types.ObjectId, ref: 'Farm', required: true },
  plot: { type: mongoose.Schema.Types.ObjectId, ref: 'FarmPlot', default: null },
  cropName: { type: String, required: true, trim: true, maxlength: 120 },
  season: { type: String, default: '', trim: true, maxlength: 20 },
  acres: { type: Number, default: 0, min: 0, max: 100000 },
  plantingDate: { type: Date, default: null },
  expectedHarvestDate: { type: Date, default: null },
  harvestDate: { type: Date, default: null },
  status: { type: String, enum: PLANTING_STATUSES, default: 'planned' },
  // Yield is recorded in kilograms; the API converts to bags for display.
  estimatedYieldKg: { type: Number, default: 0, min: 0 },
  actualYieldKg: { type: Number, default: 0, min: 0 },
  notes: { type: String, default: '', maxlength: 1000 },
}, { timestamps: true });

plantingSchema.index({ user: 1, season: 1, plantingDate: -1 });
plantingSchema.index({ farm: 1, status: 1 });
plantingSchema.index({ user: 1, expectedHarvestDate: 1 });

module.exports = mongoose.model('Planting', plantingSchema);
module.exports.PLANTING_STATUSES = PLANTING_STATUSES;
