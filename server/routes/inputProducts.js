const express = require('express');
const router = express.Router();
const InputProduct = require('../models/InputProduct');
const { auth, optionalAuth } = require('../middleware/auth');

const STAFF_ROLES = ['admin', 'support', 'content_moderator', 'finance_officer'];

// GET /api/v1/input-products — public listing with search + filter
router.get('/', async (req, res) => {
  try {
    const { category, search, sort, minPrice, maxPrice } = req.query;
    const query = { status: 'available' };

    if (category && category !== 'all') query.category = category;
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { supplierName: { $regex: search, $options: 'i' } },
      ];
    }

    let sortObj = { createdAt: -1 };
    if (sort === 'price_asc') sortObj = { price: 1 };
    else if (sort === 'price_desc') sortObj = { price: -1 };
    else if (sort === 'rating') sortObj = { averageRating: -1 };
    else if (sort === 'name') sortObj = { name: 1 };

    const products = await InputProduct.find(query).sort(sortObj).limit(100);
    res.json(products);
  } catch (error) {
    console.error('Get input products error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// GET /api/v1/input-products/:id
router.get('/:id', async (req, res) => {
  try {
    const product = await InputProduct.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Bidhaa haipatikani' });
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// POST /api/v1/input-products — seller/staff creates input product
router.post('/', auth, async (req, res) => {
  try {
    const isSeller = req.user.role === 'seller';
    const isStaff = STAFF_ROLES.includes(req.user.role);

    if (!isSeller && !isStaff) {
      return res.status(403).json({ message: 'Wauzaji pekee wanaweza kuunda bidhaa' });
    }

    const { name, category, price, unit, stockQuantity, description, usageInstructions, image, supplier, supplierName, location } = req.body;
    if (!name || !category || price == null) {
      return res.status(400).json({ message: 'Jina, aina na bei vinahitajika' });
    }

    const product = await InputProduct.create({
      name, category, price: Number(price), unit: unit || 'kilo',
      stockQuantity: Number(stockQuantity) || 0, description, usageInstructions,
      image: image || '', supplier: supplier || null, supplierName: supplierName || '',
      location: location || req.user.location || req.user.district || '',
      owner: req.user._id,
    });

    res.status(201).json(product);
  } catch (error) {
    console.error('Create input product error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// PUT /api/v1/input-products/:id — owner or staff updates
router.put('/:id', auth, async (req, res) => {
  try {
    const product = await InputProduct.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Bidhaa haipatikani' });

    if (String(product.owner) !== String(req.user._id) && !STAFF_ROLES.includes(req.user.role)) {
      return res.status(403).json({ message: 'Huna ruhusa ya kuhariri bidhaa hii' });
    }

    const allowed = ['name', 'category', 'price', 'unit', 'stockQuantity', 'description', 'usageInstructions', 'image', 'status'];
    allowed.forEach(field => {
      if (req.body[field] !== undefined) product[field] = req.body[field];
    });
    if (product.stockQuantity <= 0) product.status = 'out_of_stock';
    else if (product.status === 'out_of_stock') product.status = 'available';

    await product.save();
    res.json(product);
  } catch (error) {
    console.error('Update input product error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// DELETE /api/v1/input-products/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const product = await InputProduct.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Bidhaa haipatikani' });

    if (String(product.owner) !== String(req.user._id) && !STAFF_ROLES.includes(req.user.role)) {
      return res.status(403).json({ message: 'Huna ruhusa ya kufuta bidhaa hii' });
    }

    await InputProduct.findByIdAndDelete(req.params.id);
    res.json({ message: 'Bidhaa imefutwa' });
  } catch (error) {
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// GET /api/v1/input-products/my — seller's own products
router.get('/my/products', auth, async (req, res) => {
  try {
    const products = await InputProduct.find({ owner: req.user._id }).sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

module.exports = router;
