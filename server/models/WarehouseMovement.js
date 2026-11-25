const mongoose = require('mongoose');

const MOVEMENT_TYPES = ['in', 'out', 'loss'];

// Every bag entering, leaving or lost on a storage booking is recorded here so
// the receipt balance is provable.
const warehouseMovementSchema = new mongoose.Schema({
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'StorageBooking', required: true },
  warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: MOVEMENT_TYPES, required: true },
  bags: { type: Number, required: true, min: 0.1 },
  grade: { type: String, default: '', trim: true, maxlength: 20 },
  note: { type: String, default: '', maxlength: 300 },
  lossReason: { type: String, default: '', maxlength: 200 },
  receiptNumber: { type: String, default: '' },
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  recordedByName: { type: String, default: '' },
  occurredAt: { type: Date, default: () => new Date() },
}, { timestamps: true });

warehouseMovementSchema.index({ booking: 1, createdAt: -1 });
warehouseMovementSchema.index({ warehouse: 1, type: 1, createdAt: -1 });
warehouseMovementSchema.index({ user: 1, createdAt: -1 });
warehouseMovementSchema.index({ receiptNumber: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('WarehouseMovement', warehouseMovementSchema);
module.exports.MOVEMENT_TYPES = MOVEMENT_TYPES;
