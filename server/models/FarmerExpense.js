const mongoose = require('mongoose');

const farmerExpenseSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  category: { type: String, enum: ['inputs', 'labor', 'seeds', 'transport', 'equipment', 'other'], default: 'other' },
  amount: { type: Number, required: true, min: 0 },
  description: { type: String, default: '' },
  date: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('FarmerExpense', farmerExpenseSchema);