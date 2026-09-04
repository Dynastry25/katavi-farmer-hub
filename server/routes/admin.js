const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Crop = require('../models/Crop');
const Order = require('../models/Order');
const Product = require('../models/Product');
const LoanApplication = require('../models/LoanApplication');
const FarmerGroup = require('../models/FarmerGroup');
const NewsArticle = require('../models/NewsArticle');
const Supplier = require('../models/Supplier');
const { auth, requireAdmin } = require('../middleware/auth');

// GET /api/admin/stats - dashboard overview stats
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const [farmers, buyers, experts, admins, totalUsers, totalCrops, totalOrders, totalProducts, totalLoans, totalGroups] =
      await Promise.all([
        User.countDocuments({ role: 'farmer' }),
        User.countDocuments({ role: 'buyer' }),
        User.countDocuments({ role: 'expert' }),
        User.countDocuments({ role: 'admin' }),
        User.countDocuments({}),
        Crop.countDocuments({}),
        Order.countDocuments({}),
        Product.countDocuments({}),
        LoanApplication.countDocuments({}),
        FarmerGroup.countDocuments({}),
      ]);

    // Monthly user signups (last 6 months)
    const now = new Date();
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ label: d.toLocaleString('en', { month: 'short' }), start: d });
    }
    const monthlyUsers = [];
    for (let i = 0; i < months.length; i++) {
      const start = months[i].start;
      const end = i + 1 < months.length ? months[i + 1].start : new Date();
      const count = await User.countDocuments({
        createdAt: { $gte: start, $lt: end },
      });
      monthlyUsers.push({ month: months[i].label, users: count });
    }

    // Recent users (latest 6)
    const recentUsers = await User.find().select('-password').sort({ createdAt: -1 }).limit(6);

    res.json({
      farmers,
      buyers,
      experts,
      admins,
      totalUsers,
      totalCrops,
      totalOrders,
      totalProducts,
      totalLoans,
      totalGroups,
      monthlyUsers,
      recentUsers,
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// GET /api/admin/users - list all users (optional role filter + search)
router.get('/users', requireAdmin, async (req, res) => {
  try {
    const { role, search } = req.query;

    const filter = {};
    if (role && role !== 'all') filter.role = role;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    const users = await User.find(filter).select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    console.error('Admin list users error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// GET /api/admin/users/:id - get single user
router.get('/users/:id', requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ message: 'Mtumiaji haupatikani' });
    res.json(user);
  } catch (error) {
    console.error('Admin get user error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// PUT /api/admin/users/:id/role - change user role
router.put('/users/:id/role', requireAdmin, async (req, res) => {
  try {
    const { role } = req.body;
    const validRoles = ['farmer', 'buyer', 'expert', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: 'Jukumu siyo sahihi' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Mtumiaji haupatikani' });

    if (user._id.toString() === req.user._id.toString() && role !== 'admin') {
      return res.status(400).json({ message: 'Huwezi kubadilisha jukumu lako mwenyewe' });
    }

    user.role = role;
    await user.save();

    res.json({ message: 'Jukumu limebadilishwa kikamilifu', user: { _id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    console.error('Admin change role error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// PUT /api/admin/users/:id - update user details
router.put('/users/:id', requireAdmin, async (req, res) => {
  try {
    const { name, phone, location, district, ward, village, businessType, expertise } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Mtumiaji haupatikani' });

    if (name !== undefined) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (location !== undefined) user.location = location;
    if (district !== undefined) user.district = district;
    if (ward !== undefined) user.ward = ward;
    if (village !== undefined) user.village = village;
    if (businessType !== undefined) user.businessType = businessType;
    if (expertise !== undefined) user.expertise = expertise;

    await user.save();
    res.json({ message: 'Mtumiaji amesasishwa kikamilifu' });
  } catch (error) {
    console.error('Admin update user error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// DELETE /api/admin/users/:id - delete user
router.delete('/users/:id', requireAdmin, async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ message: 'Huwezi kujifuta mwenyewe' });
    }

    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: 'Mtumiaji haupatikani' });

    res.json({ message: 'Mtumiaji amefutwa kikamilifu' });
  } catch (error) {
    console.error('Admin delete user error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// POST /api/admin/users - create a new user by admin
router.post('/users', requireAdmin, async (req, res) => {
  try {
    const { name, email, phone, password, role, location, district, ward, village, businessType, expertise } = req.body;

    if (!name || !email || !phone || !password) {
      return res.status(400).json({ message: 'Taarifa zote muhimu zinahitajika' });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: 'Barua pepe hii tayari imesajiliwa' });
    }

    const validRoles = ['farmer', 'buyer', 'expert', 'admin'];
    const userRole = validRoles.includes(role) ? role : 'farmer';

    const user = await User.create({
      name, email, phone, password,
      role: userRole,
      location: location || district || '',
      district, ward, village,
      businessType, expertise,
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      location: user.location,
    });
  } catch (error) {
    console.error('Admin create user error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

module.exports = router;
