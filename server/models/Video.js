const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  duration: { type: String, default: '' },
  views: { type: String, default: '0' },
  category: { type: String, required: true },
  thumbnail: { type: String, default: '' },
  description: { type: String, default: '' },
  url: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Video', videoSchema);
