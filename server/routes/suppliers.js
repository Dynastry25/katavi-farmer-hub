const express = require('express');
const router = express.Router();
const Supplier = require('../models/Supplier');
const { auth } = require('../middleware/auth');

const STAFF_ROLES = ['admin', 'support', 'content_moderator', 'finance_officer'];

// GET /api/suppliers
router.get('/', async (req, res) => {
  try {
    const { category, search } = req.query;
    let query = {};
    if (category && category !== 'all') query.category = category;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { products: { $regex: search, $options: 'i' } },
      ];
    }
    const suppliers = await Supplier.find(query).sort({ rating: -1 });
    res.json(suppliers);
  } catch (error) {
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// GET /api/suppliers/me — current seller's own supplier profile
router.get('/me', auth, async (req, res) => {
  try {
    if (req.user.role !== 'seller' && !STAFF_ROLES.includes(req.user.role)) {
      return res.status(403).json({ message: 'Wauzaji pekee wanaweza kuona wasifu huu' });
    }
    const supplier = await Supplier.findOne({ owner: req.user._id });
    res.json(supplier || null);
  } catch (error) {
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// POST /api/suppliers — sellers create their own linked profile automatically
router.post('/', auth, async (req, res) => {
  try {
    const isSeller = req.user.role === 'seller';
    const isStaff = STAFF_ROLES.includes(req.user.role);

    if (!isSeller && !isStaff) {
      return res.status(403).json({ message: 'Huwezi kuunda wasifu wa muuzaji' });
    }

    if (isSeller) {
      const existing = await Supplier.findOne({ owner: req.user._id });
      if (existing) {
        return res.status(400).json({ message: 'Wasifu wako wa muuzaji tayari upo' });
      }
      const supplier = await Supplier.create({
        name: req.body.name || req.user.name,
        category: req.body.category,
        location: req.body.location || req.user.location || req.user.district || '',
        rating: 4.0,
        products: Array.isArray(req.body.products) ? req.body.products : [],
        contact: req.body.contact || req.user.phone,
        email: req.body.email || req.user.email,
        description: req.body.description || '',
        delivery: !!req.body.delivery,
        verified: false,
        owner: req.user._id,
      });
      return res.status(201).json(supplier);
    }

    const supplier = await Supplier.create({ ...req.body, owner: req.body.owner || null });
    res.status(201).json(supplier);
  } catch (error) {
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// PATCH /api/suppliers/:id/verify — staff toggle supplier profile verification
router.patch('/:id/verify', auth, async (req, res) => {
  try {
    if (!STAFF_ROLES.includes(req.user.role)) {
      return res.status(403).json({ message: 'Wafanyakazi pekee wanaweza kuthibitisha wasifu huu' });
    }
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) return res.status(404).json({ message: 'Msambazaji huyu haupatikani' });
    supplier.verified = !!req.body.verified;
    await supplier.save();
    res.json(supplier);
  } catch (error) {
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// PUT /api/suppliers/:id — sellers edit only their own profile
router.put('/:id', auth, async (req, res) => {
  try {
    if (req.user.role === 'seller') {
      const supplier = await Supplier.findById(req.params.id);
      if (!supplier) return res.status(404).json({ message: 'Msambazaji huyu haupatikani' });
      if (String(supplier.owner) !== String(req.user._id)) {
        return res.status(403).json({ message: 'Huwezi kuhariri wasifu usio wako' });
      }
      const allowed = ['name', 'category', 'location', 'products', 'description', 'delivery'];
      allowed.forEach(field => {
        if (req.body[field] !== undefined) supplier[field] = req.body[field];
      });
      await supplier.save();
      return res.json(supplier);
    }

    if (!STAFF_ROLES.includes(req.user.role)) {
      return res.status(403).json({ message: 'Huna ruhusa ya kuhariri wasifu huu' });
    }

    const supplier = await Supplier.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!supplier) return res.status(404).json({ message: 'Msambazaji huyu haupatikani' });
    res.json(supplier);
  } catch (error) {
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// DELETE /api/suppliers/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    if (req.user.role === 'seller') {
      const supplier = await Supplier.findById(req.params.id);
      if (!supplier) return res.status(404).json({ message: 'Msambazaji huyu haupatikani' });
      if (String(supplier.owner) !== String(req.user._id)) {
        return res.status(403).json({ message: 'Huwezi kufuta wasifu usio wako' });
      }
      await Supplier.findByIdAndDelete(req.params.id);
      return res.json({ message: 'Msambazaji amefutwa' });
    }

    if (!STAFF_ROLES.includes(req.user.role)) {
      return res.status(403).json({ message: 'Huna ruhusa ya kufuta wasifu huu' });
    }

    await Supplier.findByIdAndDelete(req.params.id);
    res.json({ message: 'Msambazaji amefutwa' });
  } catch (error) {
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

module.exports = router;