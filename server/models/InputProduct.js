const mongoose = require('mongoose');

const inputProductSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  category: {
    type: String,
    required: true,
    enum: ['seeds', 'fertilizers', 'pesticides', 'tools', 'irrigation', 'other'],
    default: 'other',
  },
  price: { type: Number, required: true, min: 0 },
  unit: { type: String, default: 'kilo' },
  stockQuantity: { type: Number, default: 0, min: 0 },
  description: { type: String, default: '' },
  image: { type: String, default: '' },
  usageInstructions: { type: String, default: '' },
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', default: null },
  supplierName: { type: String, default: '' },
  location: { type: String, default: '' },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, enum: ['available', 'out_of_stock', 'discontinued'], default: 'available' },
  averageRating: { type: Number, default: 0 },
  totalReviews: { type: Number, default: 0 },
}, { timestamps: true });

inputProductSchema.index({ name: 'text', description: 'text' });
inputProductSchema.index({ category: 1, status: 1 });
inputProductSchema.index({ owner: 1 });

module.exports = mongoose.model('InputProduct', inputProductSchema);
