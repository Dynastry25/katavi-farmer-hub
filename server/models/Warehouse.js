const mongoose = require('mongoose');
const { Schema } = mongoose;

const WarehouseSchema = new Schema({
  owner: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  name: { type: String, required: true },
  location: { type: String, default: '' },
  sizeSqm: { type: Number, default: 0 },
  feePerBagPerDay: { type: Number, default: 0 },
  feePerBagPerMonth: { type: Number, default: 0 },
  capacityBags: { type: Number, default: 0 },
  available: { type: Boolean, default: true },
}, { timestamps: true });

WarehouseSchema.index({ createdAt: -1 });
WarehouseSchema.index({ owner: 1 });

const StorageBookingSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  warehouse: { type: Schema.Types.ObjectId, ref: 'Warehouse' },
  warehouseName: { type: String, default: '' },
  bags: { type: Number, default: 0 },
  months: { type: Number, default: 0 },
  days: { type: Number, default: 0 },
  totalFee: { type: Number, default: 0 },
  status: { type: String, default: 'active' },
}, { timestamps: true });

StorageBookingSchema.index({ user: 1, createdAt: -1 });
StorageBookingSchema.index({ warehouse: 1, createdAt: -1 });

module.exports = {
  Warehouse: mongoose.model('Warehouse', WarehouseSchema),
  StorageBooking: mongoose.model('StorageBooking', StorageBookingSchema),
};
