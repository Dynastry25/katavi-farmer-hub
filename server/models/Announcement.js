const mongoose = require('mongoose');

// Admin-managed public announcements (matangazo) shown on the app home/news
// screen, and surfaced to the Shamba chatbot as extra context.
const announcementSchema = new mongoose.Schema({
  title: { type: String, required: true },
  message: { type: String, default: '' },
  date: { type: String, default: '' },
  location: { type: String, default: '' },
  type: {
    type: String,
    enum: ['general', 'training', 'weather', 'support', 'event', 'market', 'offer', 'news'],
    default: 'general',
  },
  image: { type: String, default: '' },
  active: { type: Boolean, default: true },
  // Reference `S.ann[].aud`: all | farmer | buyer | expert.
  audience: {
    type: String,
    enum: ['all', 'farmer', 'buyer', 'expert', 'logistics'],
    default: 'all',
  },
  order: { type: Number, default: 0 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Announcement', announcementSchema);
