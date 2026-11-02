const mongoose = require('mongoose');

const farmerGroupSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  location: { type: String, required: true },
  cropType: { type: String, default: '' },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  maxMembers: { type: Number, default: 50 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  creatorName: { type: String, default: '' },
  budget: {
    akiba: { type: Number, default: 0 },
    uendeshaji: { type: Number, default: 0 },
    mkopo: { type: Number, default: 0 },
  },
  createdDate: { type: String, default: () => new Date().toISOString().split('T')[0] },
}, { timestamps: true });

farmerGroupSchema.index({ createdAt: -1 });
farmerGroupSchema.index({ members: 1 });

module.exports = mongoose.model('FarmerGroup', farmerGroupSchema);
