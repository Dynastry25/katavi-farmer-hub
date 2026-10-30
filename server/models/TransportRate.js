const mongoose = require('mongoose');

// Admin-editable transport pricing per vehicle class (reference `VR`).
const transportRateSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true }, // boda | pickup | canter | lori
  base: { type: Number, default: 0 },
  perKm: { type: Number, default: 0 },
  perKg: { type: Number, default: 0 },
  capacityKg: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('TransportRate', transportRateSchema);
