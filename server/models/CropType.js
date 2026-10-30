const mongoose = require('mongoose');

// Admin-managed crop types shown in the home "Aina za mazao" section.
const cropTypeSchema = new mongoose.Schema({
  slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
  name: { type: String, required: true, trim: true },
  nameEn: { type: String, default: '' },
  image: { type: String, default: '' },
  // Emoji fallback rendered when the photo is missing or cannot load.
  icon: { type: String, default: '🌾' },
  order: { type: Number, default: 0 },
  active: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('CropType', cropTypeSchema);
