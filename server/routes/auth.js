const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const PhoneOtp = require('../models/PhoneOtp');
const { auth } = require('../middleware/auth');
const { sendNotification } = require('../services/notification.service');
const { sendSms } = require('../services/sms.service');

const STAFF_ROLES = ['admin', 'support', 'content_moderator', 'finance_officer'];
const PUBLIC_ROLES = ['farmer', 'buyer', 'seller', 'expert', 'logistics'];

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
  bio: user.bio,
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
  phoneVerified: user.phoneVerified,
  twoFactorEnabled: user.twoFactorEnabled,
  registrationDate: user.createdAt,
  token,
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, phone, password, role, district, ward, village, idNumber, dateOfBirth, farmSize, farmLocation, crops, businessType, businessLocation, expertise, experience } = req.body;

    if (!PUBLIC_ROLES.includes(role)) {
      return res.status(400).json({ message: 'Aina hii ya akaunti haijaruhusiwa kujiandikisha' });
    }

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
    const { password } = req.body;
    const identifier = String(req.body.identifier || '').trim();
    const emailInput = String(req.body.email || '').trim().toLowerCase();
    const phoneInput = String(req.body.phone || '').trim();

    // Accept a phone number or an email address in any of the legacy fields.
    const candidates = [];
    if (emailInput) candidates.push({ kind: 'email', value: emailInput });
    if (identifier) {
      candidates.push({
        kind: identifier.includes('@') ? 'email' : 'phone',
        value: identifier,
      });
    }
    if (phoneInput) candidates.push({ kind: 'phone', value: phoneInput });

    let user = null;
    for (const candidate of candidates) {
      if (candidate.kind === 'email') {
        user = await User.findOne({ email: candidate.value.toLowerCase() });
      } else {
        user = await findUserByPhone(normalizePhone(candidate.value));
      }
      if (user) break;
    }

    if (!user) {
      return res.status(401).json({ message: 'Namba ya simu, barua pepe au nenosiri siyo sahihi' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Namba ya simu, barua pepe au nenosiri siyo sahihi' });
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
    const { name, phone, location, district, ward, village, bio, farmSize, farmLocation, crops, businessType, businessLocation, expertise, experience, profilePicture } = req.body;
    
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
    if (bio !== undefined) user.bio = bio;
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

// ──────────────────────────────────────────────
// Phone OTP Verification
// ──────────────────────────────────────────────
const generatePhoneOtp = () => String(Math.floor(100000 + Math.random() * 900000));

// POST /api/v1/auth/phone/send-otp
router.post('/phone/send-otp', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'Mtumiaji haupatikani' });
    if (user.phoneVerified) return res.json({ message: 'Simu yako imeshathibitishwa' });

    const code = generatePhoneOtp();
    user.phoneOtpHash = await bcrypt.hash(code, 8);
    user.phoneOtpExpires = new Date(Date.now() + 5 * 60 * 1000);
    await user.save();

    const smsResult = await sendSms(user.phone, `Katavi E-Kilimo: Namba ya uthibitisho wa simu ni ${code}. Inamalizika baada ya dakika 5.`);
    await sendNotification(user._id, {
      title: 'Uthibitisho wa Simu',
      message: `Namba yako ya uthibitisho ni: ${code}.`,
      type: 'system',
      sentVia: ['in_app', 'sms'],
    });

    res.json({ message: 'Namba ya uthibitisho imetumwa kwenye simu yako', mock: smsResult.mock || false });
  } catch (error) {
    console.error('Phone OTP send error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// POST /api/v1/auth/phone/verify
router.post('/phone/verify', auth, async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ message: 'Namba ya uthibitisho inahitajika' });

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'Mtumiaji haupatikani' });
    if (user.phoneVerified) return res.json({ message: 'Simu yako imeshathibitishwa', phoneVerified: true });

    if (!user.phoneOtpHash || !user.phoneOtpExpires) {
      return res.status(400).json({ message: 'Ombi la uthibitisho halipo. Tuma namba upya.' });
    }
    if (user.phoneOtpExpires < new Date()) {
      return res.status(400).json({ message: 'Namba imeisha muda. Tuma namba upya.' });
    }

    const isValid = await bcrypt.compare(String(code).trim(), user.phoneOtpHash);
    if (!isValid) return res.status(400).json({ message: 'Namba ya uthibitisho siyo sahihi' });

    user.phoneVerified = true;
    user.phoneOtpHash = '';
    user.phoneOtpExpires = null;
    await user.save();

    // Boost credit score for phone verification
    try {
      const { refreshCreditData } = require('../services/creditScore.service');
      await refreshCreditData(user._id);
    } catch (e) { /* optional */ }

    res.json({ message: 'Simu imethibitishwa kikamilifu', phoneVerified: true });
  } catch (error) {
    console.error('Phone OTP verify error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// ──────────────────────────────────────────────
// Phone-first registration + OTP login
// ──────────────────────────────────────────────
const REGISTRATION_SCOPE = 'phone-registration';
const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_RESEND_MS = 30 * 1000;

const normalizePhone = (phone) => {
  let digits = String(phone || '').replace(/[^\d]/g, '');
  if (digits.startsWith('0')) digits = `255${digits.slice(1)}`;
  if (digits.length === 9) digits = `255${digits}`;
  if (digits.startsWith('255') && digits.length === 12) return `+${digits}`;
  return digits ? `+${digits}` : '';
};

const phoneTail = (phone) => String(phone || '').replace(/[^\d]/g, '').slice(-9);

const findUserByPhone = async (phone) => {
  const tail = phoneTail(phone);
  if (tail.length < 9) return null;
  return User.findOne({ phone: { $regex: `${tail}$` } });
};

const issueRegistrationTicket = (phone) => jwt.sign(
  { phone, scope: REGISTRATION_SCOPE },
  process.env.JWT_SECRET,
  { expiresIn: '20m' },
);

const sendPhoneOtp = async ({ phone, purpose, role = '' }) => {
  const code = generatePhoneOtp();
  const now = new Date();
  await PhoneOtp.findOneAndUpdate(
    { phone },
    {
      phone,
      purpose,
      role,
      codeHash: await bcrypt.hash(code, 8),
      expiresAt: new Date(now.getTime() + OTP_TTL_MS),
      attempts: 0,
      verifiedAt: null,
      lastSentAt: now,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  const sms = await sendSms(
    phone,
    `Katavi E-Kilimo: Namba yako ya uthibitisho ni ${code}. Inaisha baada ya dakika 5. Usimpe mtu.`,
  );
  return sms;
};

const otpTooSoon = async (phone) => {
  const existing = await PhoneOtp.findOne({ phone });
  if (!existing || !existing.lastSentAt) return null;
  const waitMs = OTP_RESEND_MS - (Date.now() - existing.lastSentAt.getTime());
  return waitMs > 0 ? Math.ceil(waitMs / 1000) : null;
};

const checkOtp = async ({ phone, code, purpose }) => {
  const record = await PhoneOtp.findOne({ phone });
  if (!record || record.purpose !== purpose) {
    return { error: 'Ombi la uthibitisho halipo. Tuma namba upya.' };
  }
  if (!record.expiresAt || record.expiresAt < new Date()) {
    return { error: 'Namba imeisha muda. Tuma namba upya.' };
  }
  if (record.attempts >= 5) {
    return { error: 'Umejaribu mara nyingi. Tuma namba mpya.' };
  }
  const valid = await bcrypt.compare(String(code).trim(), record.codeHash);
  if (!valid) {
    record.attempts += 1;
    await record.save();
    return { error: 'Namba ya uthibitisho si sahihi.' };
  }
  return { record };
};

// POST /api/v1/auth/phone/register/request
router.post('/phone/register/request', async (req, res) => {
  try {
    const phone = normalizePhone(req.body.phone);
    const role = String(req.body.role || 'farmer');
    if (phoneTail(phone).length < 9) {
      return res.status(400).json({ message: 'Weka namba ya simu sahihi.' });
    }
    if (!PUBLIC_ROLES.includes(role)) {
      return res.status(400).json({ message: 'Aina hii ya akaunti haijaruhusiwa.' });
    }
    const existing = await findUserByPhone(phone);
    if (existing) {
      return res.status(409).json({
        message: 'Namba hii tayari ina akaunti. Ingia kwa namba ya simu.',
        code: 'PHONE_EXISTS',
      });
    }
    const wait = await otpTooSoon(phone);
    if (wait) {
      return res.status(429).json({
        message: `Subiri sekunde ${wait} kabla ya kutuma tena.`,
        retryAfter: wait,
      });
    }
    const sms = await sendPhoneOtp({ phone, purpose: 'register', role });
    res.json({
      message: 'Namba ya uthibitisho imetumwa kwenye simu yako.',
      phone,
      mock: Boolean(sms?.mock),
    });
  } catch (error) {
    console.error('Phone registration request error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// POST /api/v1/auth/phone/register/verify
router.post('/phone/register/verify', async (req, res) => {
  try {
    const phone = normalizePhone(req.body.phone);
    const code = String(req.body.code || '').trim();
    if (!code) return res.status(400).json({ message: 'Weka namba ya uthibitisho.' });

    const result = await checkOtp({ phone, code, purpose: 'register' });
    if (result.error) return res.status(400).json({ message: result.error });

    const record = result.record;
    record.verifiedAt = new Date();
    // Consume the code without leaving an empty required field behind.
    record.codeHash = await bcrypt.hash(crypto.randomBytes(24).toString('hex'), 10);
    record.expiresAt = new Date(Date.now() + 20 * 60 * 1000);
    await record.save();

    res.json({
      message: 'Simu imethibitishwa.',
      phone,
      registrationToken: issueRegistrationTicket(phone),
    });
  } catch (error) {
    console.error('Phone registration verify error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// POST /api/v1/auth/phone/register/complete
router.post('/phone/register/complete', async (req, res) => {
  try {
    const { registrationToken, name, district, ward, village, bio } = req.body;
    const emailInput = String(req.body.email || '').trim().toLowerCase();
    const role = String(req.body.role || 'farmer');

    let ticket;
    try {
      ticket = jwt.verify(registrationToken, process.env.JWT_SECRET);
    } catch (_) {
      return res.status(401).json({ message: 'Kikao cha uthibitisho kimeisha. Thibitisha simu upya.' });
    }
    if (ticket.scope !== REGISTRATION_SCOPE) {
      return res.status(401).json({ message: 'Kikao cha uthibitisho si sahihi.' });
    }

    const phone = ticket.phone;
    const record = await PhoneOtp.findOne({ phone });
    if (!record || !record.verifiedAt) {
      return res.status(401).json({ message: 'Thibitisha namba ya simu kwanza.' });
    }
    if (await findUserByPhone(phone)) {
      return res.status(409).json({
        message: 'Akaunti ya namba hii imeshasajiliwa. Ingia kwa OTP.',
        code: 'PHONE_EXISTS',
      });
    }

    const cleanName = String(name || '').trim();
    if (cleanName.length < 2) {
      return res.status(400).json({ message: 'Jina kamili linahitajika.' });
    }
    if (!PUBLIC_ROLES.includes(role)) {
      return res.status(400).json({ message: 'Aina hii ya akaunti haijaruhusiwa.' });
    }
    if (!String(district || '').trim()) {
      return res.status(400).json({ message: 'Chagua mkoa na wilaya.' });
    }

    const phoneDigits = phone.replace(/\D/g, '');
    const email = emailInput || `${phoneDigits}@phone.katavi.tz`;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: 'Barua pepe si sahihi.' });
    }
    if (await User.findOne({ email })) {
      return res.status(400).json({ message: 'Barua pepe hii tayari imesajiliwa.' });
    }

    const user = await User.create({
      name: cleanName,
      email,
      phone,
      password: crypto.randomBytes(24).toString('hex'),
      role,
      phoneVerified: true,
      location: district,
      district,
      ward,
      village: String(village || '').trim(),
      bio: String(bio || '').trim(),
      registrationDate: new Date().toISOString(),
    });

    await PhoneOtp.deleteOne({ phone });

    res.status(201).json(publicUser(user, generateToken(user._id)));
  } catch (error) {
    console.error('Phone registration complete error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea wakati wa kusajili' });
  }
});

// POST /api/v1/auth/phone/login/request
router.post('/phone/login/request', async (req, res) => {
  try {
    const phone = normalizePhone(req.body.phone);
    const user = await findUserByPhone(phone);
    if (!user) {
      return res.status(404).json({
        message: 'Hakuna akaunti yenye namba hii. Jisajili kwanza.',
        code: 'PHONE_NOT_FOUND',
      });
    }
    if (user.isActive === false) {
      return res.status(403).json({ message: 'Akaunti yako imesimamishwa. Wasiliana na msimamizi.' });
    }
    const key = normalizePhone(user.phone);
    const wait = await otpTooSoon(key);
    if (wait) {
      return res.status(429).json({
        message: `Subiri sekunde ${wait} kabla ya kutuma tena.`,
        retryAfter: wait,
      });
    }
    const sms = await sendPhoneOtp({ phone: key, purpose: 'login' });
    res.json({
      message: 'Namba ya uthibitisho imetumwa kwenye simu yako.',
      phone: key,
      mock: Boolean(sms?.mock),
    });
  } catch (error) {
    console.error('Phone login request error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// POST /api/v1/auth/phone/login/verify
router.post('/phone/login/verify', async (req, res) => {
  try {
    const phone = normalizePhone(req.body.phone);
    const code = String(req.body.code || '').trim();
    if (!code) return res.status(400).json({ message: 'Weka namba ya uthibitisho.' });

    const user = await findUserByPhone(phone);
    if (!user) {
      return res.status(404).json({ message: 'Hakuna akaunti yenye namba hii.' });
    }
    if (user.isActive === false) {
      return res.status(403).json({ message: 'Akaunti yako imesimamishwa.' });
    }

    const result = await checkOtp({
      phone: normalizePhone(user.phone),
      code,
      purpose: 'login',
    });
    if (result.error) return res.status(400).json({ message: result.error });

    await PhoneOtp.deleteOne({ phone: normalizePhone(user.phone) });
    if (!user.phoneVerified) {
      user.phoneVerified = true;
      await user.save();
    }

    res.json(publicUser(user, generateToken(user._id)));
  } catch (error) {
    console.error('Phone login verify error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// POST /api/v1/auth/phone/password/request
router.post('/phone/password/request', async (req, res) => {
  try {
    const phone = normalizePhone(req.body.phone);
    if (phoneTail(phone).length < 9) {
      return res.status(400).json({ message: 'Weka namba ya simu sahihi.' });
    }
    const user = await findUserByPhone(phone);
    if (!user) {
      return res.status(404).json({
        message: 'Hakuna akaunti yenye namba hii. Jisajili kwanza.',
        code: 'PHONE_NOT_FOUND',
      });
    }
    if (user.isActive === false) {
      return res.status(403).json({ message: 'Akaunti yako imesimamishwa. Wasiliana na msimamizi.' });
    }
    const key = normalizePhone(user.phone);
    const wait = await otpTooSoon(key);
    if (wait) {
      return res.status(429).json({
        message: `Subiri sekunde ${wait} kabla ya kutuma tena.`,
        retryAfter: wait,
      });
    }
    const sms = await sendPhoneOtp({ phone: key, purpose: 'reset' });
    res.json({
      message: 'Namba ya kuthibitisha kubadilisha nenosiri imetumwa kwenye simu yako.',
      phone: key,
      mock: Boolean(sms?.mock),
    });
  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// POST /api/v1/auth/phone/password/reset
router.post('/phone/password/reset', async (req, res) => {
  try {
    const phone = normalizePhone(req.body.phone);
    const code = String(req.body.code || '').trim();
    const password = String(req.body.password || '');

    if (!code) return res.status(400).json({ message: 'Weka namba ya uthibitisho.' });
    if (password.length < 6) {
      return res.status(400).json({ message: 'Nenosiri liwe angalau herufi 6.' });
    }

    const user = await findUserByPhone(phone);
    if (!user) return res.status(404).json({ message: 'Hakuna akaunti yenye namba hii.' });
    if (user.isActive === false) {
      return res.status(403).json({ message: 'Akaunti yako imesimamishwa.' });
    }

    const key = normalizePhone(user.phone);
    const result = await checkOtp({ phone: key, code, purpose: 'reset' });
    if (result.error) return res.status(400).json({ message: result.error });

    user.password = password;
    user.phoneVerified = true;
    await user.save();
    await PhoneOtp.deleteOne({ phone: key });

    res.json({
      message: 'Nenosiri limebadilishwa.',
      ...publicUser(user, generateToken(user._id)),
    });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

module.exports = router;
