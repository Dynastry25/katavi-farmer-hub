const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'Jina kamili linahitajika'], trim: true },
  email: { type: String, required: [true, 'Barua pepe inahitajika'], unique: true, lowercase: true, trim: true },
  phone: { type: String, required: [true, 'Namba ya simu inahitajika'], trim: true },
  password: { type: String, required: [true, 'Nenosiri linahitajika'], minlength: 6 },
  role: { type: String, enum: ['farmer', 'buyer', 'expert', 'admin'], default: 'farmer' },
  isActive: { type: Boolean, default: true },
  profilePicture: { type: String, default: '' },
  location: { type: String, default: '' },
  district: { type: String, default: '' },
  ward: { type: String, default: '' },
  village: { type: String, default: '' },
  idNumber: { type: String, default: '' },
  dateOfBirth: { type: String, default: '' },
  rating: { type: Number, default: 5.0 },
  farmSize: { type: String, default: '' },
  farmLocation: { type: String, default: '' },
  crops: [{ type: String }],
  businessType: { type: String, default: '' },
  businessLocation: { type: String, default: '' },
  expertise: { type: String, default: '' },
  experience: { type: String, default: '' },
}, { timestamps: true });

userSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
