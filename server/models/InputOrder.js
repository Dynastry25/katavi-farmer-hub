const mongoose = require('mongoose');

const inputOrderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'InputProduct', required: true },
  productName: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true },
  unit: { type: String, default: 'kilo' },
  image: { type: String, default: '' },
}, { _id: false });

const inputOrderSchema = new mongoose.Schema({
  items: [inputOrderItemSchema],
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  buyerName: { type: String, required: true },
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', default: null },
  supplierName: { type: String, default: '' },
  totalAmount: { type: Number, required: true, min: 0 },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'],
    default: 'pending',
  },
  paymentStatus: {
    type: String,
    enum: ['unpaid', 'processing', 'paid', 'refunded'],
    default: 'unpaid',
  },
  paymentTransactionId: { type: String, default: '' },
  paymentProvider: { type: String, default: '' },
  deliveryMethod: { type: String, enum: ['pickup', 'delivery'], default: 'pickup' },
  deliveryLocation: { type: String, default: '' },
  contact: { type: String, default: '' },
  notes: { type: String, default: '' },
}, { timestamps: true });

inputOrderSchema.index({ buyer: 1, createdAt: -1 });
inputOrderSchema.index({ status: 1 });

module.exports = mongoose.model('InputOrder', inputOrderSchema);
