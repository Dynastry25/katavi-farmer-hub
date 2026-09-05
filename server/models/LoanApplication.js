const mongoose = require('mongoose');

const loanApplicationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  loan: { type: mongoose.Schema.Types.ObjectId, ref: 'Loan' },
  loanName: { type: String, required: true },
  amount: { type: String, required: true },
  date: { type: String, default: () => new Date().toISOString().split('T')[0] },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'completed'], default: 'pending' },
  repaymentStatus: { type: String, enum: ['none', 'partial', 'paid', 'overdue'], default: 'none' },
  remaining: { type: String, default: '' },
  nextPayment: { type: String, default: '' },
  repayments: [{
    amount: { type: String, default: '' },
    date: { type: String, default: '' },
    method: { type: String, default: '' },
    note: { type: String, default: '' },
  }],
}, { timestamps: true });

module.exports = mongoose.model('LoanApplication', loanApplicationSchema);
