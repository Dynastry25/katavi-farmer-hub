const mongoose = require('mongoose');

const SOIL_TYPES = ['loam', 'clay', 'sandy', 'silt', 'black_cotton', 'red', 'mixed', 'other'];

const farmSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  district: { type: String, default: 'Katavi', trim: true },
  ward: { type: String, default: '', trim: true },
  village: { type: String, default: '', trim: true },
  sizeAcres: { type: Number, default: 0, min: 0, max: 100000 },
  soilType: { type: String, enum: SOIL_TYPES, default: 'mixed' },
  latitude: { type: Number, default: null },
  longitude: { type: Number, default: null },
  notes: { type: String, default: '', maxlength: 1000 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

farmSchema.index({ user: 1, isActive: 1, createdAt: -1 });

module.exports = mongoose.model('Farm', farmSchema);
module.exports.SOIL_TYPES = SOIL_TYPES;
