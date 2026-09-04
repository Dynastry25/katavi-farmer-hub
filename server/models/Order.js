const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  crop: { type: mongoose.Schema.Types.ObjectId, ref: 'Crop' },
  cropName: { type: String, required: true },
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  buyerName: { type: String, required: true },
  farmer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  farmerName: { type: String, default: '' },
  quantity: { type: String, required: true },
  price: { type: String, required: true },
  status: { type: String, enum: ['pending', 'completed', 'cancelled', 'disputed'], default: 'pending' },
  orderDate: { type: String, default: () => new Date().toISOString().split('T')[0] },
  deliveryDate: { type: String, default: '' },
  contact: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
