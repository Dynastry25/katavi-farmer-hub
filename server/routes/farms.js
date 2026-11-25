const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Farm = require('../models/Farm');
const FarmPlot = require('../models/FarmPlot');
const Planting = require('../models/Planting');
const FarmActivity = require('../models/FarmActivity');
const { auth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleCheck');
const { auditRoute } = require('../services/audit.service');
const {
  seasonOf,
  summarizeSeason,
  activityTotals,
  upcomingHarvests,
  buildSeasonHistory,
} = require('../services/farm.service');

const FARM_ROLES = ['farmer', 'seller', 'admin'];

const numberOr = (value, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : fallback;
};

const dateOrNull = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

// Admins may inspect another account's records on request; everyone else is
// always scoped to their own data.
const ownerFilter = (req) => (
  req.user.role === 'admin' && mongoose.isValidObjectId(req.query.userId)
    ? { user: req.query.userId }
    : { user: req.user._id }
);

const findOwned = (Model, req, id) => (
  mongoose.isValidObjectId(id) ? Model.findOne({ _id: id, ...ownerFilter(req) }) : null
);

const farmPayload = (body = {}) => {
  const payload = {};
  if (body.name !== undefined) payload.name = String(body.name).trim();
  if (body.district !== undefined) payload.district = String(body.district).trim();
  if (body.ward !== undefined) payload.ward = String(body.ward).trim();
  if (body.village !== undefined) payload.village = String(body.village).trim();
  if (body.sizeAcres !== undefined) payload.sizeAcres = numberOr(body.sizeAcres);
  if (body.soilType !== undefined) payload.soilType = body.soilType;
  if (body.latitude !== undefined) {
    const value = Number(body.latitude);
    payload.latitude = Number.isFinite(value) && Math.abs(value) <= 90 ? value : null;
  }
  if (body.longitude !== undefined) {
    const value = Number(body.longitude);
    payload.longitude = Number.isFinite(value) && Math.abs(value) <= 180 ? value : null;
  }
  if (body.notes !== undefined) payload.notes = String(body.notes).slice(0, 1000);
  if (body.isActive !== undefined) payload.isActive = Boolean(body.isActive);
  return payload;
};

// GET /api/v1/farms — farms with plot and active-planting counts
router.get('/', auth, requireRole(...FARM_ROLES), async (req, res) => {
  try {
    const filter = ownerFilter(req);
    const farms = await Farm.find(filter).sort({ isActive: -1, createdAt: -1 }).lean();
    if (!farms.length) return res.json([]);

    const farmIds = farms.map((farm) => farm._id);
    const [plotCounts, activePlantings] = await Promise.all([
      FarmPlot.aggregate([
        { $match: { farm: { $in: farmIds }, isActive: true } },
        { $group: { _id: '$farm', count: { $sum: 1 } } },
      ]),
      Planting.aggregate([
        {
          $match: {
            farm: { $in: farmIds },
            status: { $nin: ['harvested', 'failed'] },
          },
        },
        { $group: { _id: '$farm', count: { $sum: 1 } } },
      ]),
    ]);
    const plots = new Map(plotCounts.map((row) => [String(row._id), row.count]));
    const plantings = new Map(activePlantings.map((row) => [String(row._id), row.count]));

    res.json(farms.map((farm) => ({
      ...farm,
      plotCount: plots.get(String(farm._id)) || 0,
      activePlantings: plantings.get(String(farm._id)) || 0,
    })));
  } catch (error) {
    console.error('List farms error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// GET /api/v1/farms/summary — per-season cost and yield history
router.get('/summary', auth, requireRole(...FARM_ROLES), async (req, res) => {
  try {
    const filter = ownerFilter(req);
    const [plantings, activities] = await Promise.all([
      Planting.find(filter).select('cropName season acres plantingDate status estimatedYieldKg actualYieldKg').limit(2000).lean(),
      FarmActivity.find(filter).select('planting date type cost').limit(5000).lean(),
    ]);

    res.json({
      currentSeason: seasonOf(new Date()),
      seasons: buildSeasonHistory({ plantings, activities }),
    });
  } catch (error) {
    console.error('Farm summary error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// GET /api/v1/farms/reminders?days=14 — upcoming harvest dates
router.get('/reminders', auth, requireRole(...FARM_ROLES), async (req, res) => {
  try {
    const plantings = await Planting.find({
      ...ownerFilter(req),
      status: { $nin: ['harvested', 'failed'] },
      expectedHarvestDate: { $ne: null },
    }).select('farm cropName status expectedHarvestDate').limit(500).lean();
    res.json(upcomingHarvests(plantings, { days: req.query.days }));
  } catch (error) {
    console.error('Farm reminders error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// GET /api/v1/farms/plantings — planting schedule, newest first
router.get('/plantings', auth, requireRole(...FARM_ROLES), async (req, res) => {
  try {
    const filter = ownerFilter(req);
    if (mongoose.isValidObjectId(req.query.farmId)) filter.farm = req.query.farmId;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.season) filter.season = req.query.season;

    const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 300);
    const plantings = await Planting.find(filter)
      .sort({ plantingDate: -1, createdAt: -1 })
      .limit(limit)
      .lean();
    res.json(plantings);
  } catch (error) {
    console.error('List plantings error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// POST /api/v1/farms/plantings
router.post('/plantings', auth, requireRole(...FARM_ROLES), auditRoute({
  action: 'create_planting',
  category: 'farm',
  targetType: 'Planting',
}), async (req, res) => {
  try {
    const { farmId, plotId, cropName } = req.body;
    const farm = await findOwned(Farm, req, farmId);
    if (!farm) return res.status(404).json({ message: 'Shamba halipatikani' });
    if (!String(cropName || '').trim()) {
      return res.status(400).json({ message: 'Jina la zao linahitajika' });
    }

    let plot = null;
    if (plotId) {
      plot = await findOwned(FarmPlot, req, plotId);
      if (!plot || String(plot.farm) !== String(farm._id)) {
        return res.status(400).json({ message: 'Kipande cha shamba si cha shamba hili' });
      }
    }

    const plantingDate = dateOrNull(req.body.plantingDate) || new Date();
    const planting = await Planting.create({
      user: req.user._id,
      farm: farm._id,
      plot: plot ? plot._id : null,
      cropName: String(cropName).trim().slice(0, 120),
      season: String(req.body.season || seasonOf(plantingDate)).slice(0, 20),
      acres: numberOr(req.body.acres, numberOr(plot?.sizeAcres, 0)),
      plantingDate,
      expectedHarvestDate: dateOrNull(req.body.expectedHarvestDate),
      status: req.body.status || 'planned',
      estimatedYieldKg: numberOr(req.body.estimatedYieldKg),
      notes: String(req.body.notes || '').slice(0, 1000),
    });

    res.status(201).json(planting);
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: 'Taarifa za kupanda si sahihi' });
    }
    console.error('Create planting error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// PUT /api/v1/farms/plantings/:id — status, harvest and yield updates
router.put('/plantings/:id', auth, requireRole(...FARM_ROLES), auditRoute({
  action: 'update_planting',
  category: 'farm',
  targetType: 'Planting',
}), async (req, res) => {
  try {
    const planting = await findOwned(Planting, req, req.params.id);
    if (!planting) return res.status(404).json({ message: 'Kipindi cha kupanda hakipatikani' });

    const body = req.body || {};
    if (body.cropName !== undefined) planting.cropName = String(body.cropName).trim().slice(0, 120);
    if (body.season !== undefined) planting.season = String(body.season).slice(0, 20);
    if (body.acres !== undefined) planting.acres = numberOr(body.acres, planting.acres);
    if (body.status !== undefined) planting.status = body.status;
    if (body.plantingDate !== undefined) planting.plantingDate = dateOrNull(body.plantingDate);
    if (body.expectedHarvestDate !== undefined) {
      planting.expectedHarvestDate = dateOrNull(body.expectedHarvestDate);
    }
    if (body.harvestDate !== undefined) planting.harvestDate = dateOrNull(body.harvestDate);
    if (body.estimatedYieldKg !== undefined) {
      planting.estimatedYieldKg = numberOr(body.estimatedYieldKg, planting.estimatedYieldKg);
    }
    if (body.actualYieldKg !== undefined) {
      planting.actualYieldKg = numberOr(body.actualYieldKg, planting.actualYieldKg);
    }
    if (body.notes !== undefined) planting.notes = String(body.notes).slice(0, 1000);
    if (planting.status === 'harvested' && !planting.harvestDate) {
      planting.harvestDate = new Date();
    }

    await planting.save();
    res.json(planting);
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: 'Taarifa za kupanda si sahihi' });
    }
    console.error('Update planting error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// DELETE /api/v1/farms/plantings/:id
router.delete('/plantings/:id', auth, requireRole(...FARM_ROLES), auditRoute({
  action: 'delete_planting',
  category: 'farm',
  targetType: 'Planting',
}), async (req, res) => {
  try {
    const planting = await findOwned(Planting, req, req.params.id);
    if (!planting) return res.status(404).json({ message: 'Kipindi cha kupanda hakipatikani' });

    await FarmActivity.updateMany({ planting: planting._id }, { $set: { planting: null } });
    await planting.deleteOne();
    res.json({ message: 'Kipindi cha kupanda kimeondolewa' });
  } catch (error) {
    console.error('Delete planting error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// GET /api/v1/farms/activities — input usage and production-cost log
router.get('/activities', auth, requireRole(...FARM_ROLES), async (req, res) => {
  try {
    const filter = ownerFilter(req);
    if (mongoose.isValidObjectId(req.query.farmId)) filter.farm = req.query.farmId;
    if (mongoose.isValidObjectId(req.query.plantingId)) filter.planting = req.query.plantingId;
    if (req.query.type) filter.type = req.query.type;

    const from = dateOrNull(req.query.from);
    const to = dateOrNull(req.query.to);
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = from;
      if (to) filter.date.$lte = to;
    }

    const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500);
    const activities = await FarmActivity.find(filter)
      .sort({ date: -1, createdAt: -1 })
      .limit(limit)
      .lean();

    res.json({
      activities,
      totals: activityTotals(activities),
    });
  } catch (error) {
    console.error('List farm activities error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// POST /api/v1/farms/activities
router.post('/activities', auth, requireRole(...FARM_ROLES), auditRoute({
  action: 'create_farm_activity',
  category: 'farm',
  targetType: 'FarmActivity',
}), async (req, res) => {
  try {
    const { farmId, plotId, plantingId, type } = req.body;
    const farm = await findOwned(Farm, req, farmId);
    if (!farm) return res.status(404).json({ message: 'Shamba halipatikani' });

    let planting = null;
    if (plantingId) {
      planting = await findOwned(Planting, req, plantingId);
      if (!planting || String(planting.farm) !== String(farm._id)) {
        return res.status(400).json({ message: 'Kipindi cha kupanda si cha shamba hili' });
      }
    }

    let plot = null;
    if (plotId) {
      plot = await findOwned(FarmPlot, req, plotId);
      if (!plot || String(plot.farm) !== String(farm._id)) {
        return res.status(400).json({ message: 'Kipande cha shamba si cha shamba hili' });
      }
    }

    const activity = await FarmActivity.create({
      user: req.user._id,
      farm: farm._id,
      plot: plot ? plot._id : null,
      planting: planting ? planting._id : null,
      type: type || 'other',
      date: dateOrNull(req.body.date) || new Date(),
      description: String(req.body.description || '').slice(0, 500),
      inputName: String(req.body.inputName || '').slice(0, 120),
      quantity: numberOr(req.body.quantity),
      unit: String(req.body.unit || '').slice(0, 20),
      cost: numberOr(req.body.cost),
    });

    res.status(201).json(activity);
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: 'Taarifa za shughuli si sahihi' });
    }
    console.error('Create farm activity error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// DELETE /api/v1/farms/activities/:id
router.delete('/activities/:id', auth, requireRole(...FARM_ROLES), auditRoute({
  action: 'delete_farm_activity',
  category: 'farm',
  targetType: 'FarmActivity',
}), async (req, res) => {
  try {
    const activity = await findOwned(FarmActivity, req, req.params.id);
    if (!activity) return res.status(404).json({ message: 'Shughuli haipatikani' });
    await activity.deleteOne();
    res.json({ message: 'Shughuli imeondolewa' });
  } catch (error) {
    console.error('Delete farm activity error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// POST /api/v1/farms
router.post('/', auth, requireRole(...FARM_ROLES), auditRoute({
  action: 'create_farm',
  category: 'farm',
  targetType: 'Farm',
}), async (req, res) => {
  try {
    const payload = farmPayload(req.body);
    if (!payload.name) return res.status(400).json({ message: 'Jina la shamba linahitajika' });

    const farm = await Farm.create({ ...payload, user: req.user._id });
    res.status(201).json(farm);
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: 'Taarifa za shamba si sahihi' });
    }
    console.error('Create farm error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// GET /api/v1/farms/:id — farm with plots, plantings and season totals
router.get('/:id', auth, requireRole(...FARM_ROLES), async (req, res) => {
  try {
    const farm = await findOwned(Farm, req, req.params.id);
    if (!farm) return res.status(404).json({ message: 'Shamba halipatikani' });

    const [plots, plantings, activities] = await Promise.all([
      FarmPlot.find({ farm: farm._id, isActive: true }).sort({ createdAt: 1 }).lean(),
      Planting.find({ farm: farm._id }).sort({ plantingDate: -1, createdAt: -1 }).limit(200).lean(),
      FarmActivity.find({ farm: farm._id }).sort({ date: -1 }).limit(500).lean(),
    ]);

    const currentSeason = seasonOf(new Date());
    const seasonPlantings = plantings.filter(
      (planting) => (planting.season || seasonOf(planting.plantingDate)) === currentSeason
    );
    const seasonPlantingIds = new Set(seasonPlantings.map((planting) => String(planting._id)));

    res.json({
      farm,
      plots,
      plantings,
      currentSeason,
      seasonSummary: summarizeSeason({
        plantings: seasonPlantings,
        activities: activities.filter(
          (activity) => activity.planting && seasonPlantingIds.has(String(activity.planting))
        ),
      }),
    });
  } catch (error) {
    console.error('Farm detail error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// PUT /api/v1/farms/:id
router.put('/:id', auth, requireRole(...FARM_ROLES), auditRoute({
  action: 'update_farm',
  category: 'farm',
  targetType: 'Farm',
}), async (req, res) => {
  try {
    const farm = await findOwned(Farm, req, req.params.id);
    if (!farm) return res.status(404).json({ message: 'Shamba halipatikani' });

    Object.assign(farm, farmPayload(req.body));
    await farm.save();
    res.json(farm);
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: 'Taarifa za shamba si sahihi' });
    }
    console.error('Update farm error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// DELETE /api/v1/farms/:id — archived so planting history stays intact
router.delete('/:id', auth, requireRole(...FARM_ROLES), auditRoute({
  action: 'archive_farm',
  category: 'farm',
  targetType: 'Farm',
}), async (req, res) => {
  try {
    const farm = await findOwned(Farm, req, req.params.id);
    if (!farm) return res.status(404).json({ message: 'Shamba halipatikani' });

    farm.isActive = false;
    await farm.save();
    await FarmPlot.updateMany({ farm: farm._id }, { $set: { isActive: false } });
    res.json({ message: 'Shamba limewekwa kwenye kumbukumbu' });
  } catch (error) {
    console.error('Archive farm error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// POST /api/v1/farms/:id/plots
router.post('/:id/plots', auth, requireRole(...FARM_ROLES), auditRoute({
  action: 'create_farm_plot',
  category: 'farm',
  targetType: 'FarmPlot',
}), async (req, res) => {
  try {
    const farm = await findOwned(Farm, req, req.params.id);
    if (!farm) return res.status(404).json({ message: 'Shamba halipatikani' });

    const name = String(req.body.name || '').trim();
    if (!name) return res.status(400).json({ message: 'Jina la kipande linahitajika' });

    const plot = await FarmPlot.create({
      farm: farm._id,
      user: req.user._id,
      name: name.slice(0, 120),
      sizeAcres: numberOr(req.body.sizeAcres),
      soilType: req.body.soilType || '',
      notes: String(req.body.notes || '').slice(0, 500),
    });

    res.status(201).json(plot);
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: 'Taarifa za kipande si sahihi' });
    }
    console.error('Create farm plot error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// PUT /api/v1/farms/:id/plots/:plotId
router.put('/:id/plots/:plotId', auth, requireRole(...FARM_ROLES), auditRoute({
  action: 'update_farm_plot',
  category: 'farm',
  targetType: 'FarmPlot',
}), async (req, res) => {
  try {
    const farm = await findOwned(Farm, req, req.params.id);
    if (!farm) return res.status(404).json({ message: 'Shamba halipatikani' });
    const plot = await findOwned(FarmPlot, req, req.params.plotId);
    if (!plot || String(plot.farm) !== String(farm._id)) {
      return res.status(404).json({ message: 'Kipande cha shamba hakipatikani' });
    }

    const body = req.body || {};
    if (body.name !== undefined) plot.name = String(body.name).trim().slice(0, 120);
    if (body.sizeAcres !== undefined) plot.sizeAcres = numberOr(body.sizeAcres, plot.sizeAcres);
    if (body.soilType !== undefined) plot.soilType = body.soilType;
    if (body.notes !== undefined) plot.notes = String(body.notes).slice(0, 500);
    if (body.isActive !== undefined) plot.isActive = Boolean(body.isActive);
    await plot.save();

    res.json(plot);
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: 'Taarifa za kipande si sahihi' });
    }
    console.error('Update farm plot error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

module.exports = router;
