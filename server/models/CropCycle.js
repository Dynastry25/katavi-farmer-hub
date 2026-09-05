const mongoose = require('mongoose');

// Crop-cycle stage tracker: a per-crop cultivation timeline with tips and
// alerts for each stage (land prep → planting → weeding → disease watch →
// harvest → post-harvest → marketing).
const cropCycleSchema = new mongoose.Schema({
  cropName: { type: String, required: true, trim: true },
  stages: [{
    key: { type: String, required: true },
    label: { type: String, required: true },
    icon: { type: String, default: 'fas fa-list-check' },
    dayStart: { type: Number, default: 0 },
    dayEnd: { type: Number, default: 0 },
    tips: { type: String, default: '' },
    alert: { type: String, default: '' },
  }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

cropCycleSchema.index({ cropName: 1 });

module.exports = mongoose.model('CropCycle', cropCycleSchema);