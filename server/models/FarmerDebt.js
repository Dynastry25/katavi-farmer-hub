const mongoose = require('mongoose');

const DEBT_TYPES = ['payable', 'receivable'];

const farmerDebtSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  creditor: { type: String, required: true, trim: true, maxlength: 120 },
  // payable = the farmer owes money; receivable = a buyer owes the farmer.
  type: { type: String, enum: DEBT_TYPES, default: 'payable' },
  principal: { type: Number, required: true, min: 0 },
  dueDate: { type: Date, default: null },
  note: { type: String, default: '', maxlength: 500 },
  payments: [{
    amount: { type: Number, required: true, min: 0 },
    date: { type: Date, default: Date.now },
    note: { type: String, default: '', maxlength: 200 },
  }],
  status: { type: String, enum: ['open', 'settled'], default: 'open' },
  settledAt: { type: Date, default: null },
}, { timestamps: true });

farmerDebtSchema.index({ user: 1, status: 1, dueDate: 1 });

module.exports = mongoose.model('FarmerDebt', farmerDebtSchema);
module.exports.DEBT_TYPES = DEBT_TYPES;
