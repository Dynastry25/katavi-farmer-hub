const express = require('express');
const router = express.Router();
const { getOpenApiSpec } = require('../services/docs.service');

// GET /api/v1/docs — OpenAPI 3 document generated from the mounted routers.
router.get('/', (req, res) => {
  try {
    res.json(getOpenApiSpec());
  } catch (error) {
    console.error('OpenAPI generation error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

module.exports = router;
