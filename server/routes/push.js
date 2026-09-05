const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const PushSubscription = require('../models/PushSubscription');

// POST /api/v1/push/subscribe
router.post('/subscribe', auth, async (req, res) => {
  try {
    const { endpoint, keys, userAgent } = req.body;
    if (!endpoint) {
      return res.status(400).json({ message: 'Subscription endpoint inahitajika' });
    }

    await PushSubscription.findOneAndUpdate(
      { endpoint },
      {
        user: req.user._id,
        endpoint,
        keys: keys || { p256dh: '', auth: '' },
        userAgent: userAgent || '',
        active: true,
      },
      { upsert: true, new: true }
    );

    res.status(201).json({ message: 'Umesajiliwa kwa arifa za push' });
  } catch (error) {
    console.error('Push subscribe error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// DELETE /api/v1/push/unsubscribe
router.delete('/unsubscribe', auth, async (req, res) => {
  try {
    const { endpoint } = req.body;
    const filter = { user: req.user._id };
    if (endpoint) filter.endpoint = endpoint;

    await PushSubscription.updateMany(filter, { active: false });
    res.json({ message: 'Umeondoa usajili wa arifa za push' });
  } catch (error) {
    console.error('Push unsubscribe error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

module.exports = router;