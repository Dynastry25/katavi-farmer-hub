const mongoose = require('mongoose');

const cropSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  category: { type: String, required: true, enum: ['cereals', 'legumes', 'vegetables', 'fruits', 'tubers', 'oilseeds'] },
  price: { type: Number, required: true },
  quantity: { type: String, required: true },
  unit: { type: String, default: 'kg' },
  location: { type: String, required: true },
  farmer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  farmerName: { type: String, required: true },
  description: { type: String, default: '' },
  image: { type: String, default: '' },
  fallback: { type: String, default: '🌾' },
  rating: { type: Number, default: 4.0 },
  reviews: { type: Number, default: 0 },
  status: { type: String, enum: ['available', 'sold', 'reserved'], default: 'available' },
  harvestDate: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Crop', cropSchema);
