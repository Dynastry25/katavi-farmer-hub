const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
  title: { type: String, required: true },
  date: { type: String, required: true },
  location: { type: String, required: true },
  type: { type: String, enum: ['training', 'weather', 'support', 'event'], default: 'event' },
}, { timestamps: true });

module.exports = mongoose.model('Announcement', announcementSchema);
