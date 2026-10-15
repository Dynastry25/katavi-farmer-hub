const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { auth } = require('../middleware/auth');
const Favorite = require('../models/Favorite');
const Crop = require('../models/Crop');

// GET /api/v1/favorites/ids — crop ids favourited by the signed-in user.
router.get('/ids', auth, async (req, res) => {
  try {
    const favs = await Favorite.find({ user: req.user._id }).select('crop').lean();
    res.json({ ids: favs.map((f) => String(f.crop)) });
  } catch (error) {
    console.error('Get favourite ids error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// GET /api/v1/favorites — full crops favourited by the signed-in user.
router.get('/', auth, async (req, res) => {
  try {
    const favs = await Favorite.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .populate('crop');
    const crops = favs.map((f) => f.crop).filter(Boolean);
    res.json({ favorites: crops });
  } catch (error) {
    console.error('Get favourites error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// POST /api/v1/favorites/:cropId — add a crop to favourites (idempotent).
router.post('/:cropId', auth, async (req, res) => {
  try {
    const { cropId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(cropId)) {
      return res.status(400).json({ message: 'Zao si sahihi' });
    }
    const crop = await Crop.findById(cropId).select('_id').lean();
    if (!crop) return res.status(404).json({ message: 'Zao halipatikani' });

    await Favorite.updateOne(
      { user: req.user._id, crop: cropId },
      { $setOnInsert: { user: req.user._id, crop: cropId } },
      { upsert: true }
    );
    res.status(201).json({ message: 'Zao limeongezwa kwenye vipendwa', favorite: true });
  } catch (error) {
    console.error('Add favourite error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// DELETE /api/v1/favorites/:cropId — remove a crop from favourites.
router.delete('/:cropId', auth, async (req, res) => {
  try {
    await Favorite.deleteOne({ user: req.user._id, crop: req.params.cropId });
    res.json({ message: 'Zao limeondolewa kwenye vipendwa', favorite: false });
  } catch (error) {
    console.error('Remove favourite error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

module.exports = router;
