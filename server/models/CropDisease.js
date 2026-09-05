const mongoose = require('mongoose');

// Reference library of common crop diseases per crop (symptoms, prevention,
// treatment). Complements the AI crop-disease detection endpoint.
const cropDiseaseSchema = new mongoose.Schema({
  cropName: { type: String, required: true, trim: true },
  name: { type: String, required: true },
  symptoms: { type: String, default: '' },
  prevention: { type: String, default: '' },
  treatment: { type: String, default: '' },
  severity: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
}, { timestamps: true });

cropDiseaseSchema.index({ cropName: 1 });

module.exports = mongoose.model('CropDisease', cropDiseaseSchema);