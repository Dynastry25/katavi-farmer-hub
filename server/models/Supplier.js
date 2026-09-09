const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  category: { type: String, required: true },
  location: { type: String, required: true },
  rating: { type: Number, default: 4.0 },
  products: [{ type: String }],
  contact: { type: String, required: true },
  email: { type: String, default: '' },
  description: { type: String, default: '' },
  delivery: { type: Boolean, default: false },
  verified: { type: Boolean, default: false },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

module.exports = mongoose.model('Supplier', supplierSchema);
