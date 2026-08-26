const express = require('express');
const router = express.Router();
const Crop = require('../models/Crop');
const { auth, optionalAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');
const cloudinary = require('../config/cloudinary');

const uploadToCloudinary = (file) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'katavi-ekilimo', resource_type: 'image', transformation: [{ width: 800, height: 800, crop: 'limit' }] },
      (error, result) => { if (error) reject(error); else resolve(result); }
    );
    stream.end(file.buffer);
  });
};

// GET /api/crops - Get all crops
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
    res.json(crops);
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
    res.json(crop);
  } catch (error) {
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// POST /api/crops
router.post('/', auth, async (req, res) => {
  try {
    const crop = await Crop.create({
      ...req.body,
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

    Object.assign(crop, req.body);
    await crop.save();
    res.json(crop);
  } catch (error) {
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
