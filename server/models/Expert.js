const mongoose = require('mongoose');

const expertSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name: { type: String, required: true },
  specialization: { type: String, required: true },
  experience: { type: String, default: '' },
  image: { type: String, default: '' },
  available: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Expert', expertSchema);
