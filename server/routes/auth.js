const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, phone, password, role, district, ward, village, idNumber, dateOfBirth, farmSize, farmLocation, crops, businessType, businessLocation, expertise, experience } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Barua pepe hii tayari imesajiliwa' });
    }

    const user = await User.create({
      name, email, phone, password, role,
      location: district,
      district, ward, village, idNumber, dateOfBirth,
      farmSize, farmLocation, crops,
      businessType, businessLocation,
      expertise, experience,
      registrationDate: new Date().toISOString(),
    });

    const token = generateToken(user._id);

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      location: user.location,
      district: user.district,
      ward: user.ward,
      village: user.village,
      farmSize: user.farmSize,
      farmLocation: user.farmLocation,
      crops: user.crops,
      businessType: user.businessType,
      businessLocation: user.businessLocation,
      expertise: user.expertise,
      experience: user.experience,
      profilePicture: user.profilePicture,
      rating: user.rating,
      registrationDate: user.createdAt,
      token,
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea wakati wa kusajili' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Barua pepe au nenosiri siyo sahihi' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Barua pepe au nenosiri siyo sahihi' });
    }

    if (user.isActive === false) {
      return res.status(403).json({ message: 'Akaunti yako imesimamishwa. Wasiliana na msimamizi.' });
    }

    const token = generateToken(user._id);

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      location: user.location,
      district: user.district,
      ward: user.ward,
      village: user.village,
      farmSize: user.farmSize,
      farmLocation: user.farmLocation,
      crops: user.crops,
      businessType: user.businessType,
      businessLocation: user.businessLocation,
      expertise: user.expertise,
      experience: user.experience,
      profilePicture: user.profilePicture,
      rating: user.rating,
      registrationDate: user.createdAt,
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// GET /api/auth/me
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// PUT /api/auth/profile
router.put('/profile', auth, async (req, res) => {
  try {
    const { name, phone, location, district, ward, village, farmSize, farmLocation, crops, businessType, businessLocation, expertise, experience, profilePicture } = req.body;
    
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'Mtumiaji huyu haupatikani' });
    }

    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (location) user.location = location;
    if (district) user.district = district;
    if (ward) user.ward = ward;
    if (village) user.village = village;
    if (farmSize !== undefined) user.farmSize = farmSize;
    if (farmLocation !== undefined) user.farmLocation = farmLocation;
    if (crops !== undefined) user.crops = crops;
    if (businessType !== undefined) user.businessType = businessType;
    if (businessLocation !== undefined) user.businessLocation = businessLocation;
    if (expertise !== undefined) user.expertise = expertise;
    if (experience !== undefined) user.experience = experience;
    if (profilePicture !== undefined) user.profilePicture = profilePicture;

    await user.save();

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      location: user.location,
      district: user.district,
      ward: user.ward,
      village: user.village,
      farmSize: user.farmSize,
      farmLocation: user.farmLocation,
      crops: user.crops,
      businessType: user.businessType,
      businessLocation: user.businessLocation,
      expertise: user.expertise,
      experience: user.experience,
      profilePicture: user.profilePicture,
      rating: user.rating,
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

module.exports = router;
