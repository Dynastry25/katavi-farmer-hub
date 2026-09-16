const mongoose = require('mongoose');

const priceLimitSchema = new mongoose.Schema({
  cropName: { type: String, required: true, trim: true, unique: true },
  category: { type: String, required: true, enum: ['cereals', 'legumes', 'vegetables', 'fruits', 'tubers', 'oilseeds'] },
  minPrice: { type: Number, required: true, min: 0 },
  maxPrice: { type: Number, required: true, min: 0 },
  unit: { type: String, default: 'kg', enum: ['kg', 'gunia', 'debe', 'tani', 'bundle'] },
  active: { type: Boolean, default: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

priceLimitSchema.index({ category: 1 });

module.exports = mongoose.model('PriceLimit', priceLimitSchema);
