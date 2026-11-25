const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const SeasonPlan = require('../models/SeasonPlan');
const { BulkRequest } = require('../models/BulkRequest');
const { requireRole, requireOwnershipOrAdmin } = require('../middleware/roleCheck');
const { auditRoute } = require('../services/audit.service');
const cache = require('../services/cache.service');
const {
  isSeasonLabel,
  expectedYield,
  mergeCropPlanning,
  canTransitionPlan,
} = require('../services/planning.service');

const planOwnerId = async (req) => {
  if (!mongoose.isValidObjectId(req.params.id)) return null;
  const plan = await SeasonPlan.findById(req.params.id).select('user');
  return plan?.user || null;
};

const planView = (plan) => ({
  ...plan,
  expectedYieldKg: Number(plan.expectedYieldKg) || expectedYield(plan),
});

// GET /api/v1/planning/demand?season=&district= — demand vs planned supply.
router.get('/demand', async (req, res) => {
  try {
    const season = String(req.query.season || '').trim();
    const district = String(req.query.district || '').trim();
    const now = new Date();

    const demandMatch = { status: 'open', deadline: { $gt: now } };
    if (district) demandMatch.district = district;
    const planMatch = { status: { $in: ['draft', 'active'] } };
    if (season) planMatch.season = season;
    if (district) planMatch.district = district;

    const key = `planning:demand:${season.toLowerCase()}:${district.toLowerCase()}`;
    const report = await cache.remember(key, cache.TTL.REFERENCE, async () => {
      const [demand, planned] = await Promise.all([
        BulkRequest.aggregate([
          { $match: demandMatch },
          { $group: { _id: '$cropName', quantityKg: { $sum: '$quantityKg' }, count: { $sum: 1 } } },
        ]),
        SeasonPlan.aggregate([
          { $match: planMatch },
          {
            $group: {
              _id: '$cropName',
              expectedYieldKg: { $sum: '$expectedYieldKg' },
              acres: { $sum: '$acres' },
              count: { $sum: 1 },
            },
          },
        ]),
      ]);
      return { season: season || null, district: district || null, crops: mergeCropPlanning({ demand, planned }) };
    });

    res.json(report);
  } catch (error) {
    console.error('Planning demand error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// GET /api/v1/planning/my — the farmer's own season plans.
router.get('/my', requireRole('farmer', 'admin'), async (req, res) => {
  try {
    const query = { user: req.user._id };
    if (req.query.season) query.season = String(req.query.season).trim();
    const plans = await SeasonPlan.find(query).sort({ season: -1, createdAt: -1 }).limit(60).lean();
    res.json({ plans: plans.map(planView) });
  } catch (error) {
    console.error('My season plans error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// POST /api/v1/planning — record a pre-season planting intention.
router.post('/', requireRole('farmer', 'admin'), auditRoute({
  action: 'create_season_plan',
  category: 'farm',
  targetType: 'SeasonPlan',
  details: (req) => ({
    season: String(req.body?.season || ''),
    cropName: String(req.body?.cropName || ''),
  }),
}), async (req, res) => {
  try {
    const season = String(req.body.season || '').trim();
    const cropName = String(req.body.cropName || '').trim();
    if (!isSeasonLabel(season)) return res.status(400).json({ message: 'Taja msimu (mfano 2026/27)' });
    if (cropName.length < 2) return res.status(400).json({ message: 'Taja zao unalopanga kupanda' });

    const acres = Math.max(0, Number(req.body.acres) || 0);
    const yieldPerAcreKg = Math.max(0, Number(req.body.yieldPerAcreKg) || 0);
    const plantingDate = req.body.plantingDate ? new Date(req.body.plantingDate) : null;
    const expectedHarvestDate = req.body.expectedHarvestDate ? new Date(req.body.expectedHarvestDate) : null;
    if (plantingDate && Number.isNaN(plantingDate.getTime())) {
      return res.status(400).json({ message: 'Tarehe ya kupanda si sahihi' });
    }
    if (expectedHarvestDate && Number.isNaN(expectedHarvestDate.getTime())) {
      return res.status(400).json({ message: 'Tarehe ya mavuno si sahihi' });
    }
    if (plantingDate && expectedHarvestDate && expectedHarvestDate < plantingDate) {
      return res.status(400).json({ message: 'Mavuno hayawezi kuwa kabla ya kupanda' });
    }

    const plan = await SeasonPlan.create({
      user: req.user._id,
      userName: req.user.name || '',
      season,
      cropName,
      district: String(req.body.district || req.user.district || '').trim(),
      acres,
      yieldPerAcreKg,
      expectedYieldKg: Number(req.body.expectedYieldKg) || expectedYield({ acres, yieldPerAcreKg }),
      plantingDate,
      expectedHarvestDate,
      notes: String(req.body.notes || '').trim(),
      status: 'draft',
    });
    await cache.delByPrefix('planning:demand:');
    res.status(201).json({ plan: planView(plan.toObject()) });
  } catch (error) {
    console.error('Create season plan error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// PUT /api/v1/planning/:id — owner edits the plan or moves its status.
router.put('/:id', requireOwnershipOrAdmin(planOwnerId), async (req, res) => {
  try {
    const plan = await SeasonPlan.findById(req.params.id);
    if (!plan) return res.status(404).json({ message: 'Mpango huu haupatikani' });

    if (req.body.status !== undefined && req.body.status !== plan.status) {
      if (!canTransitionPlan(plan.status, req.body.status)) {
        return res.status(400).json({ message: `Mpango hauwezi kubadilishwa kutoka "${plan.status}"` });
      }
      plan.status = req.body.status;
    }
    if (req.body.cropName !== undefined) plan.cropName = String(req.body.cropName).trim();
    if (req.body.season !== undefined) {
      const season = String(req.body.season).trim();
      if (!isSeasonLabel(season)) return res.status(400).json({ message: 'Msimu si sahihi' });
      plan.season = season;
    }
    if (req.body.acres !== undefined) plan.acres = Math.max(0, Number(req.body.acres) || 0);
    if (req.body.yieldPerAcreKg !== undefined) {
      plan.yieldPerAcreKg = Math.max(0, Number(req.body.yieldPerAcreKg) || 0);
    }
    if (req.body.expectedYieldKg !== undefined) {
      plan.expectedYieldKg = Math.max(0, Number(req.body.expectedYieldKg) || 0);
    } else if (req.body.acres !== undefined || req.body.yieldPerAcreKg !== undefined) {
      plan.expectedYieldKg = expectedYield(plan);
    }
    if (req.body.plantingDate !== undefined) plan.plantingDate = req.body.plantingDate ? new Date(req.body.plantingDate) : null;
    if (req.body.expectedHarvestDate !== undefined) {
      plan.expectedHarvestDate = req.body.expectedHarvestDate ? new Date(req.body.expectedHarvestDate) : null;
    }
    if (req.body.notes !== undefined) plan.notes = String(req.body.notes).trim();
    if (req.body.district !== undefined) plan.district = String(req.body.district).trim();

    await plan.save();
    await cache.delByPrefix('planning:demand:');
    res.json({ plan: planView(plan.toObject()) });
  } catch (error) {
    console.error('Update season plan error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// DELETE /api/v1/planning/:id — owner removes a plan that has not started.
router.delete('/:id', requireOwnershipOrAdmin(planOwnerId), async (req, res) => {
  try {
    const plan = await SeasonPlan.findById(req.params.id);
    if (!plan) return res.status(404).json({ message: 'Mpango huu haupatikani' });
    if (plan.status !== 'draft') {
      return res.status(400).json({ message: 'Unaweza kuondoa mpango wa rasimu tu' });
    }
    await plan.deleteOne();
    await cache.delByPrefix('planning:demand:');
    res.json({ message: 'Mpango umeondolewa' });
  } catch (error) {
    console.error('Delete season plan error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

module.exports = router;
