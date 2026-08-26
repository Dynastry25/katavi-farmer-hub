const mongoose = require('mongoose');

const loanSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  provider: { type: String, required: true },
  amount: { type: String, required: true },
  interest: { type: String, required: true },
  duration: { type: String, required: true },
  requirements: [{ type: String }],
  description: { type: String, default: '' },
  category: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model('Loan', loanSchema);
