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
}, { timestamps: true });

cropSchema.index({ status: 1, createdAt: -1 });
cropSchema.index({ category: 1, status: 1 });
cropSchema.index({ farmer: 1, createdAt: -1 });

module.exports = mongoose.model('Crop', cropSchema);
