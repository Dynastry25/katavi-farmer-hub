const express = require('express');
const router = express.Router();
const Crop = require('../models/Crop');
const InputProduct = require('../models/InputProduct');
const Supplier = require('../models/Supplier');
const FarmServiceOffer = require('../models/FarmServiceOffer');
const Opportunity = require('../models/Opportunity');
const TrainingCourse = require('../models/TrainingCourse');
const NewsArticle = require('../models/NewsArticle');
const AdviceArticle = require('../models/AdviceArticle');
const Warehouse = require('../models/Warehouse');
const { ProcessingOffer } = require('../models/Processing');
const {
  normalizeQuery,
  isSearchable,
  buildPattern,
  rankResults,
  parseTypes,
} = require('../services/search.service');

const GROUPS = [
  'products', 'inputs', 'suppliers', 'services', 'opportunities',
  'training', 'news', 'warehouses', 'processing',
];

const FETCH_LIMIT = 25;

const trimText = (value, size = 160) => String(value || '').slice(0, size);

const searches = {
  async products({ pattern, limit, query }) {
    const rows = await Crop.find({
      status: 'available',
      $or: [{ name: pattern }, { description: pattern }, { location: pattern }, { farmerName: pattern }],
    }).select('name price unit location farmerName image fallback').sort({ createdAt: -1 }).limit(FETCH_LIMIT).lean();
    return rankResults(rows, query, {
      limit,
      getText: (row) => `${row.name} ${row.location} ${row.farmerName}`,
    }).map((row) => ({
      id: row._id,
      title: row.name,
      subtitle: `${row.price} TZS / ${row.unit}`,
      location: row.location,
      image: row.image,
      fallback: row.fallback,
    }));
  },

  async inputs({ pattern, limit, query }) {
    const rows = await InputProduct.find({
      $or: [{ name: pattern }, { description: pattern }, { category: pattern }, { supplierName: pattern }, { location: pattern }],
    }).select('name category price unit location supplierName image').sort({ createdAt: -1 }).limit(FETCH_LIMIT).lean();
    return rankResults(rows, query, {
      limit,
      getText: (row) => `${row.name} ${row.category} ${row.supplierName}`,
    }).map((row) => ({
      id: row._id,
      title: row.name,
      subtitle: `${row.price} TZS / ${row.unit}`,
      location: row.location,
      category: row.category,
      image: row.image,
    }));
  },

  async suppliers({ pattern, limit, query }) {
    const rows = await Supplier.find({
      $or: [{ name: pattern }, { category: pattern }, { location: pattern }, { description: pattern }],
    }).select('name category location rating verified description').limit(FETCH_LIMIT).lean();
    return rankResults(rows, query, {
      limit,
      getText: (row) => `${row.name} ${row.category}`,
    }).map((row) => ({
      id: row._id,
      title: row.name,
      subtitle: row.category,
      location: row.location,
      rating: row.rating,
      verified: row.verified,
    }));
  },

  async services({ pattern, limit, query }) {
    const rows = await FarmServiceOffer.find({
      status: 'active',
      $or: [{ title: pattern }, { description: pattern }, { serviceType: pattern }, { providerName: pattern }, { district: pattern }],
    }).select('title serviceType description providerName priceAmount priceUnit district').sort({ createdAt: -1 }).limit(FETCH_LIMIT).lean();
    return rankResults(rows, query, {
      limit,
      getText: (row) => `${row.title} ${row.serviceType} ${row.providerName}`,
    }).map((row) => ({
      id: row._id,
      title: row.title,
      subtitle: `${row.priceAmount} TZS (${row.priceUnit})`,
      location: row.district,
      provider: row.providerName,
    }));
  },

  async opportunities({ pattern, limit, query }) {
    const rows = await Opportunity.find({
      status: 'open',
      $or: [{ title: pattern }, { description: pattern }, { requirements: pattern }, { district: pattern }],
    }).select('title kind category employmentType district payAmount payUnit ownerName').sort({ posterVerified: -1, createdAt: -1 }).limit(FETCH_LIMIT).lean();
    return rankResults(rows, query, {
      limit,
      getText: (row) => `${row.title} ${row.category} ${row.ownerName}`,
    }).map((row) => ({
      id: row._id,
      title: row.title,
      subtitle: `${row.kind === 'business' ? 'Biashara' : 'Ajira'} · ${row.payAmount} TZS (${row.payUnit})`,
      location: row.district,
      employer: row.ownerName,
    }));
  },

  async training({ pattern, limit, query }) {
    const rows = await TrainingCourse.find({
      status: 'published',
      $or: [{ title: pattern }, { description: pattern }, { category: pattern }, { providerName: pattern }, { district: pattern }],
    }).select('title category level price currency district online providerName coverImage').sort({ createdAt: -1 }).limit(FETCH_LIMIT).lean();
    return rankResults(rows, query, {
      limit,
      getText: (row) => `${row.title} ${row.category} ${row.providerName}`,
    }).map((row) => ({
      id: row._id,
      title: row.title,
      subtitle: `${row.price} ${row.currency} · ${row.online ? 'Mtandaoni' : row.district}`,
      provider: row.providerName,
      image: row.coverImage,
    }));
  },

  async news({ pattern, limit, query }) {
    const [articles, advice] = await Promise.all([
      NewsArticle.find({
        status: 'approved',
        $or: [{ title: pattern }, { excerpt: pattern }, { category: pattern }],
      }).select('title excerpt category image').sort({ createdAt: -1 }).limit(FETCH_LIMIT).lean(),
      AdviceArticle.find({
        status: 'approved',
        $or: [{ title: pattern }, { excerpt: pattern }, { category: pattern }],
      }).select('title excerpt category image').sort({ createdAt: -1 }).limit(FETCH_LIMIT).lean(),
    ]);
    const rows = [
      ...articles.map((row) => ({ ...row, kind: 'news' })),
      ...advice.map((row) => ({ ...row, kind: 'advice' })),
    ];
    return rankResults(rows, query, {
      limit,
      getText: (row) => `${row.title} ${row.category}`,
    }).map((row) => ({
      id: row._id,
      title: row.title,
      subtitle: row.category,
      kind: row.kind,
      excerpt: trimText(row.excerpt, 140),
      image: row.image,
    }));
  },

  async warehouses({ pattern, limit, query }) {
    const rows = await Warehouse.find({
      available: true,
      $or: [{ name: pattern }, { location: pattern }],
    }).select('name location capacityBags feePerBagPerDay feePerBagPerMonth').sort({ createdAt: -1 }).limit(FETCH_LIMIT).lean();
    return rankResults(rows, query, {
      limit,
      getText: (row) => `${row.name} ${row.location}`,
    }).map((row) => ({
      id: row._id,
      title: row.name,
      subtitle: `${row.capacityBags} mifuko · ${row.feePerBagPerDay} TZS/siku`,
      location: row.location,
    }));
  },

  async processing({ pattern, limit, query }) {
    const rows = await ProcessingOffer.find({
      status: 'active',
      $or: [{ businessName: pattern }, { description: pattern }, { serviceType: pattern }, { district: pattern }, { crops: pattern }],
    }).select('businessName serviceType crops district pricePerKg providerName').sort({ createdAt: -1 }).limit(FETCH_LIMIT).lean();
    return rankResults(rows, query, {
      limit,
      getText: (row) => `${row.businessName} ${row.serviceType} ${(row.crops || []).join(' ')}`,
    }).map((row) => ({
      id: row._id,
      title: row.businessName,
      subtitle: `${row.serviceType} · ${row.pricePerKg} TZS/kg`,
      location: row.district,
      crops: row.crops,
    }));
  },
};

// GET /api/v1/search?q=mahindi&limit=5&types=products,training
router.get('/', async (req, res) => {
  try {
    const query = normalizeQuery(req.query.q);
    if (!isSearchable(query)) {
      return res.status(400).json({ message: 'Andika angalau herufi mbili za utafutaji' });
    }
    const limit = Math.min(Math.max(Number(req.query.limit) || 5, 1), 10);
    const selected = parseTypes(req.query.types, GROUPS);
    const pattern = buildPattern(query);

    const entries = await Promise.all(selected.map(async (group) => {
      try {
        const results = await searches[group]({ pattern, limit, query });
        return [group, results];
      } catch (error) {
        console.error(`Search group "${group}" failed:`, error.message);
        return [group, []];
      }
    }));

    const groups = Object.fromEntries(entries);
    const counts = Object.fromEntries(entries.map(([group, results]) => [group, results.length]));
    const total = entries.reduce((sum, [, results]) => sum + results.length, 0);

    res.json({ query, groups, counts, total });
  } catch (error) {
    console.error('Global search error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

module.exports = router;
