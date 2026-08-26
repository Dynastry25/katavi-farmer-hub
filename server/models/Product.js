const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  category: { type: String, required: true },
  quantity: { type: String, required: true },
  price: { type: String, required: true },
  description: { type: String, default: '' },
  processingMethod: { type: String, default: '' },
  shelfLife: { type: String, default: '' },
  image: { type: String, default: '' },
  farmer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, enum: ['available', 'sold'], default: 'available' },
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);
