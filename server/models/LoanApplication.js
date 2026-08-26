const mongoose = require('mongoose');

const loanApplicationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  loan: { type: mongoose.Schema.Types.ObjectId, ref: 'Loan' },
  loanName: { type: String, required: true },
  amount: { type: String, required: true },
  date: { type: String, default: () => new Date().toISOString().split('T')[0] },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'completed'], default: 'pending' },
  remaining: { type: String, default: '' },
  nextPayment: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('LoanApplication', loanApplicationSchema);
