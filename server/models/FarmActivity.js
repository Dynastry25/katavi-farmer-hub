const mongoose = require('mongoose');

const ACTIVITY_TYPES = [
  'land_prep',
  'planting',
  'fertilizer',
  'pesticide',
  'weeding',
  'irrigation',
  'harvest',
  'transport',
  'other',
];

const farmActivitySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  farm: { type: mongoose.Schema.Types.ObjectId, ref: 'Farm', required: true },
  plot: { type: mongoose.Schema.Types.ObjectId, ref: 'FarmPlot', default: null },
  planting: { type: mongoose.Schema.Types.ObjectId, ref: 'Planting', default: null },
  type: { type: String, enum: ACTIVITY_TYPES, default: 'other' },
  date: { type: Date, default: Date.now },
  description: { type: String, default: '', maxlength: 500 },
  // Inputs used by the activity (seed, fertiliser, pesticide...) for the
  // per-season cost and input-usage history.
  inputName: { type: String, default: '', maxlength: 120 },
  quantity: { type: Number, default: 0, min: 0 },
  unit: { type: String, default: '', maxlength: 20 },
  cost: { type: Number, default: 0, min: 0 },
}, { timestamps: true });

farmActivitySchema.index({ user: 1, date: -1 });
farmActivitySchema.index({ planting: 1, date: -1 });
farmActivitySchema.index({ farm: 1, type: 1 });

module.exports = mongoose.model('FarmActivity', farmActivitySchema);
module.exports.ACTIVITY_TYPES = ACTIVITY_TYPES;
