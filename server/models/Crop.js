const mongoose = require('mongoose');
const { ALL_UNITS, ANIMALS } = require('../config/livestock');

const cropSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  category: { type: String, required: true, enum: ['cereals', 'legumes', 'vegetables', 'fruits', 'tubers', 'oilseeds', 'livestock', 'livestock_products'] },
  // Species for livestock listings (mbuzi, ngombe, kuku...) and the source
  // animal for livestock products (nyama, mayai, maziwa...).
  animal: { type: String, enum: [...ANIMALS, ''], default: '' },
  price: { type: Number, required: true },
  quantity: { type: String, required: true },
  unit: { type: String, enum: ALL_UNITS, default: 'kg' },
  location: { type: String, required: true },
  farmer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  farmerName: { type: String, required: true },
  description: { type: String, default: '' },
  image: { type: String, default: '' },
  fallback: { type: String, default: '🌾' },
  rating: { type: Number, default: 4.0 },
  reviews: { type: Number, default: 0 },
  stockQuantity: { type: Number, required: true, min: 0, default: 0 },
  reservedQuantity: { type: Number, default: 0 },
  status: { type: String, enum: ['available', 'sold', 'reserved', 'rejected', 'low_stock', 'out_of_stock'], default: 'available' },
  harvestDate: { type: String, default: '' },
  // Self-declared post-harvest measurements; the score and grade are derived
  // server-side so listings cannot pick their own grade.
  quality: {
    grade: { type: String, enum: ['', 'A', 'B', 'C'], default: '' },
    score: { type: Number, default: 0, min: 0, max: 100 },
    moisturePct: { type: Number, default: null },
    foreignMatterPct: { type: Number, default: null },
    cleanlinessPct: { type: Number, default: null },
    declaredAt: { type: Date, default: null },
  },
  // Certification is granted by staff after reviewing the declared quality.
  certification: {
    status: { type: String, enum: ['none', 'pending', 'verified', 'rejected', 'expired'], default: 'none' },
    certificateNumber: { type: String, default: '', trim: true },
    issuer: { type: String, default: '', trim: true },
    issuedAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null },
    requestedAt: { type: Date, default: null },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null },
    rejectionReason: { type: String, default: '', maxlength: 300 },
    // Evidence the reviewing officer recorded: lot photos, lab reference and
    // the grade the inspection produced. Kept with the certificate so buyers
    // can trace why a lot was certified.
    inspection: {
      photos: { type: [String], default: [] },
      labReference: { type: String, default: '', maxlength: 120 },
      notes: { type: String, default: '', maxlength: 500 },
      grade: { type: String, enum: ['', 'A', 'B', 'C'], default: '' },
      sampledAt: { type: Date, default: null },
      inspector: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      recordedAt: { type: Date, default: null },
    },
  },
}, { timestamps: true });

cropSchema.index({ status: 1, createdAt: -1 });
cropSchema.index({ category: 1, status: 1 });
cropSchema.index({ farmer: 1, createdAt: -1 });
cropSchema.index({ 'certification.status': 1, 'quality.grade': 1 });

module.exports = mongoose.model('Crop', cropSchema);
