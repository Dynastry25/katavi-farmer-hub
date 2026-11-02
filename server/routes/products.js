const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const { auth } = require('../middleware/auth');
const { requireRole, requireOwnershipOrAdmin } = require('../middleware/roleCheck');

const productOwnerId = async (req) => {
  const product = await Product.findById(req.params.id).select('farmer').lean();
  return product && product.farmer;
};

// The farmer who listed the crop owns the record; clients may only change the
// listing details, never its owner or moderation state.
const PRODUCT_FIELDS = [
  'name', 'category', 'quantity', 'price', 'description',
  'processingMethod', 'shelfLife', 'image', 'status',
];

const productFields = (body) => {
  const data = {};
  for (const key of PRODUCT_FIELDS) {
    if (body[key] !== undefined) data[key] = body[key];
  }
  return data;
};

// GET /api/products
router.get('/', async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// GET /api/products/my
router.get('/my', auth, async (req, res) => {
  try {
    const products = await Product.find({ farmer: req.user._id }).sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// POST /api/products — farmers (and admins) only
router.post('/', requireRole('farmer', 'admin'), async (req, res) => {
  try {
    const product = await Product.create({
      ...productFields(req.body),
      farmer: req.user._id,
    });
    res.status(201).json(product);
  } catch (error) {
    if (error?.name === 'ValidationError') {
      return res.status(400).json({ message: 'Taarifa za bidhaa hazijakamilika' });
    }
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// PUT /api/products/:id — owner (or admin) only
router.put('/:id', requireOwnershipOrAdmin(productOwnerId), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Bidhaa hii haipatikani' });
    const updates = productFields(req.body);
    if (!Object.keys(updates).length) {
      return res.status(400).json({ message: 'Hakuna taarifa za kubadilisha' });
    }
    Object.assign(product, updates);
    await product.save();
    res.json(product);
  } catch (error) {
    if (error?.name === 'ValidationError') {
      return res.status(400).json({ message: 'Taarifa za bidhaa si sahihi' });
    }
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// DELETE /api/products/:id — owner (or admin) only
router.delete('/:id', requireOwnershipOrAdmin(productOwnerId), async (req, res) => {
  try {
    const deleted = await Product.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Bidhaa hii haipatikani' });
    res.json({ message: 'Bidhaa imefutwa' });
  } catch (error) {
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

module.exports = router;
