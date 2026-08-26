const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const cloudinary = require('../config/cloudinary');
const { auth } = require('../middleware/auth');

const uploadToCloudinary = (file) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'katavi-ekilimo',
        resource_type: 'image',
        transformation: [{ width: 800, height: 800, crop: 'limit' }],
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    stream.end(file.buffer);
  });
};

// POST /api/upload
router.post('/', auth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Hakuna faili lililopakiwa' });
    }
    const result = await uploadToCloudinary(req.file);
    res.json({ url: result.secure_url, filename: result.public_id });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea wakati wa kupakia picha' });
  }
});

// POST /api/upload/multiple
router.post('/multiple', auth, upload.array('images', 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'Hakuna faili lililopakiwa' });
    }
    const uploadPromises = req.files.map(file => uploadToCloudinary(file));
    const results = await Promise.all(uploadPromises);
    const files = results.map(result => ({ url: result.secure_url, filename: result.public_id }));
    res.json(files);
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea wakati wa kupakia picha' });
  }
});

module.exports = router;
