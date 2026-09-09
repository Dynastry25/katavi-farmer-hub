const express = require('express');
const router = express.Router();
const Crop = require('../models/Crop');
const { auth, optionalAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');
const cloudinary = require('../config/cloudinary');
const { normalizeStock, ensureStockPersisted } = require('../services/crop.stock.service');

const uploadToCloudinary = (file) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'katavi-ekilimo', resource_type: 'image', transformation: [{ width: 800, height: 800, crop: 'limit' }] },
      (error, result) => { if (error) reject(error); else resolve(result); }
    );
    stream.end(file.buffer);
  });
};

// Normalize stock fields for display. Crops created before the stock-management
// schema store legacy quantities (e.g. "500" instead of "500 kg") with a defaulted
// stockQuantity of 0. Backfill source stock from the legacy quantity and persist
// it so old listings remain orderable and consistent with what is shown.
router.get('/', async (req, res) => {
  try {
    const { category, location, search, sort } = req.query;
    let query = {};

    if (category && category !== 'all') query.category = category;
    if (location && location !== 'all') query.location = location;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { farmerName: { $regex: search, $options: 'i' } },
      ];
    }

    let sortObj = { createdAt: -1 };
    if (sort === 'price-low') sortObj = { price: 1 };
    if (sort === 'price-high') sortObj = { price: -1 };
    if (sort === 'name') sortObj = { name: 1 };
    if (sort === 'rating') sortObj = { rating: -1 };

    const crops = await Crop.find(query).sort(sortObj);
    const out = [];
    for (const crop of crops) {
      const view = await ensureStockPersisted(Crop, crop);
      out.push(view);
    }
    res.json(out);
  } catch (error) {
    console.error('Get crops error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// GET /api/crops/:id
router.get('/:id', async (req, res) => {
  try {
    const crop = await Crop.findById(req.params.id);
    if (!crop) return res.status(404).json({ message: 'Zao hili halipatikani' });
    const view = await ensureStockPersisted(Crop, crop);
    res.json(view);
  } catch (error) {
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// POST /api/crops
router.post('/', auth, async (req, res) => {
  try {
    const unit = ['kg', 'gunia', 'debe', 'tani'].includes(req.body.unit) ? req.body.unit : 'kg';
    const stockQuantity = Math.max(0, Number(req.body.stockQuantity) || Number(req.body.quantity) || 0);
    const crop = await Crop.create({
      ...req.body,
      unit,
      stockQuantity,
      quantity: `${stockQuantity} ${unit}`,
      status: stockQuantity > 0 ? (stockQuantity < 100 ? 'low_stock' : 'available') : 'out_of_stock',
      farmer: req.user._id,
      farmerName: req.user.name,
    });
    res.status(201).json(crop);
  } catch (error) {
    console.error('Create crop error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// PUT /api/crops/:id
router.put('/:id', auth, async (req, res) => {
  try {
    const crop = await Crop.findById(req.params.id);
    if (!crop) return res.status(404).json({ message: 'Zao hili halipatikani' });

    if (req.body.stockQuantity !== undefined) {
      const stockQuantity = Math.max(0, Number(req.body.stockQuantity) || 0);
      const unit = ['kg', 'gunia', 'debe', 'tani'].includes(req.body.unit) ? req.body.unit : (crop.unit || 'kg');
      crop.stockQuantity = stockQuantity;
      crop.unit = unit;
      crop.quantity = `${stockQuantity} ${unit}`;
      crop.status = stockQuantity <= 0 ? 'out_of_stock' : (stockQuantity < 100 ? 'low_stock' : 'available');
    }
    if (req.body.name !== undefined) crop.name = req.body.name;
    if (req.body.category !== undefined) crop.category = req.body.category;
    if (req.body.price !== undefined) crop.price = req.body.price;
    if (req.body.description !== undefined) crop.description = req.body.description;
    if (req.body.harvestDate !== undefined) crop.harvestDate = req.body.harvestDate;
    if (req.body.location !== undefined) crop.location = req.body.location;
    if (req.body.image !== undefined) crop.image = req.body.image;

    await crop.save();
    res.json(crop);
  } catch (error) {
    console.error('Update crop error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// DELETE /api/crops/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const crop = await Crop.findByIdAndDelete(req.params.id);
    if (!crop) return res.status(404).json({ message: 'Zao hili halipatikani' });
    res.json({ message: 'Zao limefutwa' });
  } catch (error) {
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// POST /api/crops/:id/image
router.post('/:id/image', auth, upload.single('image'), async (req, res) => {
  try {
    const crop = await Crop.findById(req.params.id);
    if (!crop) return res.status(404).json({ message: 'Zao hili halipatikani' });

    const result = await uploadToCloudinary(req.file);
    crop.image = result.secure_url;
    await crop.save();
    res.json(crop);
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

module.exports = router;
