const express = require('express');
const router = express.Router();
const MarketPrice = require('../models/MarketPrice');
const User = require('../models/User');
const UssdLog = require('../models/UssdLog');
const { handleUssd, phoneVariants } = require('../services/ussd.service');

const latestPrices = async (limit = 30) => {
  const rows = await MarketPrice.find({ isBaseline: { $ne: true } })
    .sort({ dateRecorded: -1, createdAt: -1 })
    .limit(limit * 4)
    .select('cropName pricePerUnit unit currency district region')
    .lean();
  const seen = new Set();
  const unique = [];
  for (const row of rows) {
    const name = String(row.cropName || '').trim();
    if (!name || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    unique.push(row);
    if (unique.length >= limit) break;
  }
  return unique;
};

const findUserByPhone = async (phone) => {
  const variants = phoneVariants(phone);
  if (!variants.length) return null;
  return User.findOne({ phone: { $in: variants } }).select('name role district').lean();
};

// Africa's Talking posts form-encoded fields and expects a plain-text reply.
// The request is unauthenticated by design; the menu only exposes data the
// caller could already get from the public price list.
router.post('/', async (req, res) => {
  const { sessionId = '', phoneNumber = '', text = '', serviceCode = '' } = req.body || {};
  const expectedCode = process.env.USSD_SERVICE_CODE;

  let result;
  try {
    if (expectedCode && serviceCode && serviceCode !== expectedCode) {
      result = { body: 'Huduma hii haipatikani kwa sasa.', end: true };
    } else {
      result = await handleUssd({
        text,
        phone: phoneNumber,
        deps: {
          listPrices: latestPrices,
          getUserByPhone: findUserByPhone,
          supportPhone: process.env.USSD_SUPPORT_PHONE,
        },
      });
    }
  } catch (error) {
    console.error('USSD handler error:', error);
    result = { body: 'Hitilafu imetokea. Jaribu tena baadaye.', end: true };
  }

  res.type('text/plain').send(`${result.end ? 'END' : 'CON'} ${result.body}`);

  UssdLog.create({
    sessionId: String(sessionId).slice(0, 100),
    phone: String(phoneNumber).slice(0, 30),
    serviceCode: String(serviceCode).slice(0, 30),
    text: String(text).slice(0, 300),
    response: result.body.slice(0, 500),
    ended: result.end,
  }).catch((error) => console.error('USSD log error:', error.message));
});

module.exports = router;
