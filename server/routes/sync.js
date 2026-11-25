const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const FarmerExpense = require('../models/FarmerExpense');
const FarmerDebt = require('../models/FarmerDebt');
const CropType = require('../models/CropType');
const MarketPrice = require('../models/MarketPrice');
const SyncMutation = require('../models/SyncMutation');
const cache = require('../services/cache.service');
const {
  normalizeClientId,
  isValidClientId,
  validateMutation,
  MUTATION_KINDS,
} = require('../services/sync.service');
const { EXPENSE_CATEGORIES } = require('../services/financePlan.service');

const MAX_BATCH = 50;

const applyMutation = (userId, kind, value) => {
  if (kind === 'expense') {
    return FarmerExpense.create({ user: userId, ...value });
  }
  return FarmerDebt.create({ user: userId, ...value, payments: [], status: 'open' });
};

const recordExisting = (row) => ({
  clientId: row.clientId,
  status: row.status === 'applied' ? 'duplicate' : 'failed',
  resourceId: row.resourceId ? String(row.resourceId) : null,
  error: row.error || '',
});

// Offline clients replay the queue until they see a terminal status, so every
// clientId must resolve to exactly one local record even after retries.
router.post('/push', auth, async (req, res) => {
  try {
    const mutations = Array.isArray(req.body?.mutations) ? req.body.mutations.slice(0, MAX_BATCH) : [];
    if (!mutations.length) {
      return res.status(400).json({ message: 'Hakuna mabadiliko ya kusawazisha' });
    }

    const results = [];
    for (const mutation of mutations) {
      const clientId = normalizeClientId(mutation?.clientId);
      if (!isValidClientId(clientId)) {
        results.push({ clientId, status: 'failed', error: 'clientId si sahihi' });
        continue;
      }

      const existing = await SyncMutation.findOne({ user: req.user._id, clientId }).lean();
      if (existing) {
        results.push(recordExisting(existing));
        continue;
      }

      const kind = String(mutation?.kind || '');
      const checked = MUTATION_KINDS.includes(kind)
        ? validateMutation(kind, mutation.payload)
        : { ok: false, error: `Aina ya mabadiliko "${kind}" haitumiki` };

      if (!checked.ok) {
        const failed = await SyncMutation.create({
          user: req.user._id,
          clientId,
          kind: MUTATION_KINDS.includes(kind) ? kind : 'expense',
          payload: mutation?.payload || {},
          status: 'failed',
          error: checked.error,
        });
        results.push(recordExisting(failed));
        continue;
      }

      let created = null;
      try {
        created = await applyMutation(req.user._id, kind, checked.value);
      } catch (error) {
        console.error('Sync apply error:', error);
        const failed = await SyncMutation.create({
          user: req.user._id,
          clientId,
          kind,
          payload: mutation.payload,
          status: 'failed',
          error: 'Imeshindikana kuhifadhi taarifa',
        });
        results.push(recordExisting(failed));
        continue;
      }

      try {
        await SyncMutation.create({
          user: req.user._id,
          clientId,
          kind,
          payload: mutation.payload,
          status: 'applied',
          resourceId: created._id,
          appliedAt: new Date(),
        });
      } catch (error) {
        // A concurrent retry already recorded this clientId; report the winner
        // and drop the extra row so the local device never sees a duplicate.
        if (error.code === 11000) {
          await created.deleteOne();
          const winner = await SyncMutation.findOne({ user: req.user._id, clientId }).lean();
          if (winner) {
            results.push(recordExisting(winner));
            continue;
          }
        }
        throw error;
      }

      results.push({ clientId, status: 'applied', resourceId: String(created._id) });
    }

    res.json({
      results,
      applied: results.filter((item) => item.status === 'applied').length,
      failed: results.filter((item) => item.status === 'failed').length,
    });
  } catch (error) {
    console.error('Sync push error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea wakati wa kusawazisha' });
  }
});

// Reference data changes rarely, so phones can refresh it on reconnect without
// hitting MongoDB every time.
router.get('/bootstrap', auth, async (req, res) => {
  try {
    const data = await cache.remember('sync:bootstrap', cache.TTL.REFERENCE, async () => {
      const [crops, prices] = await Promise.all([
        CropType.find({ active: true }).sort({ order: 1, name: 1 }).select('slug name nameEn icon').lean(),
        MarketPrice.find({ isBaseline: { $ne: true } })
          .sort({ dateRecorded: -1, createdAt: -1 })
          .limit(60)
          .select('cropName pricePerUnit unit currency district region dateRecorded')
          .lean(),
      ]);
      return {
        crops,
        prices,
        expenseCategories: EXPENSE_CATEGORIES,
        generatedAt: new Date().toISOString(),
      };
    });
    res.json(data);
  } catch (error) {
    console.error('Sync bootstrap error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

router.get('/status', auth, async (req, res) => {
  try {
    const rows = await SyncMutation.aggregate([
      { $match: { user: req.user._id } },
      { $group: { _id: '$status', count: { $sum: 1 }, lastAt: { $max: '$createdAt' } } },
    ]);
    const byStatus = rows.reduce((acc, row) => {
      acc[row._id] = { count: row.count, lastAt: row.lastAt };
      return acc;
    }, {});
    const lastApplied = await SyncMutation.findOne({ user: req.user._id, status: 'applied' })
      .sort({ appliedAt: -1 })
      .select('appliedAt')
      .lean();
    res.json({
      applied: byStatus.applied?.count || 0,
      failed: byStatus.failed?.count || 0,
      lastAppliedAt: lastApplied?.appliedAt || null,
    });
  } catch (error) {
    console.error('Sync status error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

module.exports = router;
