const mongoose = require('mongoose');

const ORG_TYPES = ['cooperative', 'ngo', 'company', 'government', 'financial', 'other'];
const ORG_ROLES = ['owner', 'manager', 'member'];

const organizationSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 160 },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  type: { type: String, enum: ORG_TYPES, default: 'cooperative' },
  description: { type: String, default: '', maxlength: 1000 },
  district: { type: String, default: 'Katavi', trim: true },
  ward: { type: String, default: '', trim: true },
  contactPhone: { type: String, default: '', maxlength: 30 },
  email: { type: String, default: '', lowercase: true, trim: true, maxlength: 160 },
  status: { type: String, enum: ['active', 'suspended'], default: 'active' },
  members: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ORG_ROLES, default: 'member' },
    title: { type: String, default: '', maxlength: 80 },
    joinedAt: { type: Date, default: Date.now },
  }],
}, { timestamps: true });

organizationSchema.index({ 'members.user': 1 });
organizationSchema.index({ district: 1, type: 1 });

module.exports = mongoose.model('Organization', organizationSchema);
module.exports.ORG_TYPES = ORG_TYPES;
module.exports.ORG_ROLES = ORG_ROLES;
