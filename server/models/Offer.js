const mongoose = require('mongoose');

// Admin-managed promotional offers (ofa) rendered as home-screen deal cards.
const offerSchema = new mongoose.Schema({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  emoji: { type: String, default: '🎁' },
  image: { type: String, default: '' },
  // In-app route (e.g. /marketplace, /inputs) or an external URL.
  link: { type: String, default: '/marketplace' },
  active: { type: Boolean, default: true },
  // Reference `S.ban[].aud`: all | farmer | buyer | expert.
  audience: {
    type: String,
    enum: ['all', 'farmer', 'buyer', 'expert'],
    default: 'all',
  },
  // Reference card palette keys (green, orange, blue, blue-green, light green, earth).
  color: {
    type: String,
    enum: ['g', 'o', 't', 'd', 'l', 'e'],
    default: 'g',
  },
  order: { type: Number, default: 0 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Offer', offerSchema);
