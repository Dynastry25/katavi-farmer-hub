const mongoose = require('mongoose');

// Admin-curated reference dataset for Katavi wards: which crops suit each
// ward's soil/climate, plus typical planting windows. Used to power the
// "Shamba Assistant" land/soil recommendation (no soil API needed initially).
const landGuidanceSchema = new mongoose.Schema({
  region: { type: String, default: 'Katavi' },
  district: { type: String, required: true, trim: true },
  ward: { type: String, required: true, trim: true },
  soilType: { type: String, default: '' },
  suitableCrops: [{ type: String }],
  notes: { type: String, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

landGuidanceSchema.index({ ward: 1, district: 1 });

module.exports = mongoose.model('LandGuidance', landGuidanceSchema);