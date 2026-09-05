const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { sendNotification } = require('../services/notification.service');
const { sendSms } = require('../services/sms.service');

const STAFF_ROLES = ['admin', 'support', 'content_moderator', 'finance_officer'];

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

const generateTwoFactorCode = () => {
  return String(Math.floor(100000 + Math.random() * 900000));
};

const hashTwoFactorCode = (code) => bcrypt.hash(code, 8);

const sendTwoFactorCode = async (user) => {
  const code = generateTwoFactorCode();
  user.twoFactorCodeHash = await hashTwoFactorCode(code);
  user.twoFactorCodeExpires = new Date(Date.now() + 5 * 60 * 1000);
  await user.save();

  await sendNotification(user._id, {
    title: 'Namba ya Uhakiki (2FA)',
    message: `Namba yako ya 2FA ni: ${code}. Inamalizika baada ya dakika 5.`,
    type: 'system',
    sentVia: ['in_app', 'sms'],
  });
  const smsResult = await sendSms(user.phone, `Katavi E-Kilimo: Namba yako ya 2FA ni ${code}. Inamalizika baada ya dakika 5.`);
  return smsResult;
};

const publicUser = (user, token) => ({
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
  creditScore: user.creditScore,
  trustScore: user.trustScore,
  isVerified: user.isVerified,
  twoFactorEnabled: user.twoFactorEnabled,
  registrationDate: user.createdAt,
  token,
});

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

    res.status(201).json(publicUser(user, token));
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

    // 2FA flow for staff accounts with 2FA enabled
    if (STAFF_ROLES.includes(user.role) && user.twoFactorEnabled) {
      await sendTwoFactorCode(user);
      return res.status(200).json({ requiresTwoFactor: true, email: user.email, twoFactorEnabled: true });
    }

    const token = generateToken(user._id);

    res.json(publicUser(user, token));
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// POST /api/auth/2fa/verify — complete login with the 6-digit code
router.post('/2fa/verify', async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ message: 'Barua pepe na namba ya 2FA zinahitajika' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Barua pepe au nenosiri siyo sahihi' });
    }

    if (!user.twoFactorCodeHash || !user.twoFactorCodeExpires) {
      return res.status(401).json({ message: 'Ombi la 2FA halipo. Ingia upya.' });
    }

    if (user.twoFactorCodeExpires < new Date()) {
      return res.status(401).json({ message: 'Namba ya 2FA imeisha muda. Ingia upya.' });
    }

    const isCodeValid = await bcrypt.compare(String(code).trim(), user.twoFactorCodeHash);
    if (!isCodeValid) {
      return res.status(401).json({ message: 'Namba ya 2FA siyo sahihi' });
    }

    user.twoFactorCodeHash = '';
    user.twoFactorCodeExpires = null;
    await user.save();

    const token = generateToken(user._id);
    res.json(publicUser(user, token));
  } catch (error) {
    console.error('2FA verify error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// POST /api/auth/2fa/resend — send a fresh 2FA code
router.post('/2fa/resend', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Barua pepe inahitajika' });

    const user = await User.findOne({ email });
    if (!user || !user.twoFactorEnabled) {
      return res.status(400).json({ message: 'Mtumiaji huyu hana 2FA' });
    }

    await sendTwoFactorCode(user);
    res.json({ message: 'Namba mpya ya 2FA imetumwa' });
  } catch (error) {
    console.error('2FA resend error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// POST /api/auth/2fa/setup — enable/disable 2FA (staff only)
router.post('/2fa/setup', auth, async (req, res) => {
  try {
    if (!STAFF_ROLES.includes(req.user.role)) {
      return res.status(403).json({ message: 'Wafanyakazi pekee wanaweza kuwezesha 2FA' });
    }

    const { enabled } = req.body;
    const user = await User.findById(req.user._id);

    if (enabled === false) {
      user.twoFactorEnabled = false;
      user.twoFactorCodeHash = '';
      user.twoFactorCodeExpires = null;
      await user.save();
      return res.json({ message: '2FA imezimwa', twoFactorEnabled: false });
    }

    // Enable: generate a test code so the user can store it immediately.
    user.twoFactorEnabled = true;
    await user.save();
    const code = generateTwoFactorCode();
    user.twoFactorCodeHash = await hashTwoFactorCode(code);
    user.twoFactorCodeExpires = new Date(Date.now() + 5 * 60 * 1000);
    await user.save();

    await sendNotification(user._id, {
      title: '2FA imewezeshwa',
      message: `2FA imewezeshwa. Namba yako ya kwanza ni: ${code}.`,
      type: 'system',
    });

    res.json({ message: '2FA imewezeshwa', twoFactorEnabled: true, testCode: code });
  } catch (error) {
    console.error('2FA setup error:', error);
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
