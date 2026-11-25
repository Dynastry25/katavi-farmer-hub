const crypto = require('crypto');
const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Contract = require('../models/Contract');
const ContractCommitment = require('../models/ContractCommitment');
const ContractDelivery = require('../models/ContractDelivery');
const { auth, optionalAuth } = require('../middleware/auth');
const { STAFF_ROLES } = require('../middleware/roleCheck');
const { auditRoute } = require('../services/audit.service');
const { sendNotification } = require('../services/notification.service');
const cache = require('../services/cache.service');
const {
  buildListFilter,
  isExpired,
  remainingQuantity,
  contractProgress,
  deriveContractStatus,
  acceptedQuantity,
  qualitySummary,
} = require('../services/contract.service');

const LIST_PREFIX = 'contracts:list:';
const PAGE_LIMIT = 30;
const CONTRACT_ROLES = ['buyer', 'farmer', 'seller', 'admin'];

const listKey = (query) => {
  const signature = JSON.stringify({
    cropName: query.cropName || '',
    district: query.district || '',
    q: query.q || '',
    page: query.page || '',
  });
  const digest = crypto.createHash('md5').update(signature).digest('hex');
  return `${LIST_PREFIX}${digest}`;
};

const notify = async (userId, payload) => {
  if (!userId) return;
  try {
    await sendNotification(userId, { type: 'system', ...payload });
  } catch (e) { /* best effort */ }
};

const isBuyerOrStaff = (contract, user) => (
  String(contract.buyer) === String(user._id) || STAFF_ROLES.includes(user.role)
);

const numberOr = (value, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : fallback;
};

const dateOrNull = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const withProgress = (contract) => ({
  ...contract,
  progress: contractProgress({
    quantityKg: contract.quantityKg,
    committedKg: contract.committedKg,
    deliveredKg: contract.deliveredKg,
    pricePerKg: contract.pricePerKg,
  }),
});

// GET /api/v1/contracts — open buyer contracts, newest first
router.get('/', optionalAuth, async (req, res) => {
  try {
    const filter = buildListFilter(req.query);
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || PAGE_LIMIT, 1), 50);

    const load = async () => {
      const [items, total] = await Promise.all([
        Contract.find(filter)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        Contract.countDocuments(filter),
      ]);
      return {
        items: items.map(withProgress),
        total,
        page,
        pages: Math.ceil(total / limit) || 1,
      };
    };

    const result = req.user
      ? await load()
      : await cache.remember(listKey(req.query), cache.TTL.LISTING, load);

    if (!req.user || !result.items.length) return res.json(result);

    const commitments = await ContractCommitment.find({
      farmer: req.user._id,
      contract: { $in: result.items.map((item) => item._id) },
    }).select('contract status').lean();
    const byContract = new Map(commitments.map((row) => [String(row.contract), row.status]));

    res.json({
      ...result,
      items: result.items.map((item) => ({
        ...item,
        myCommitment: byContract.get(String(item._id)) || '',
        isBuyer: String(item.buyer) === String(req.user._id),
      })),
    });
  } catch (error) {
    console.error('List contracts error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// GET /api/v1/contracts/my — contracts the caller published as buyer
router.get('/my', auth, async (req, res) => {
  try {
    const items = await Contract.find({ buyer: req.user._id })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    res.json(items.map(withProgress));
  } catch (error) {
    console.error('My contracts error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// GET /api/v1/contracts/commitments/my — commitments the caller made as farmer
router.get('/commitments/my', auth, async (req, res) => {
  try {
    const commitments = await ContractCommitment.find({ farmer: req.user._id })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    if (!commitments.length) return res.json([]);

    const contracts = await Contract.find({
      _id: { $in: commitments.map((row) => row.contract) },
    }).select('title cropName quantityKg pricePerKg deadline status buyerName').lean();
    const byId = new Map(contracts.map((row) => [String(row._id), row]));

    res.json(commitments.map((row) => ({
      ...row,
      contract: withProgress(byId.get(String(row.contract)) || {}),
    })));
  } catch (error) {
    console.error('My commitments error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// POST /api/v1/contracts — verified buyers publish a contract before the season
router.post('/', auth, auditRoute({
  action: 'create_contract',
  category: 'contract',
  targetType: 'Contract',
}), async (req, res) => {
  try {
    const user = req.user;
    const verified = user.phoneVerified || user.isVerified || STAFF_ROLES.includes(user.role);
    if (!verified) {
      return res.status(403).json({
        message: 'Thibitisha namba yako ya simu kabla ya kutangaza mkataba',
      });
    }
    if (!CONTRACT_ROLES.includes(user.role)) {
      return res.status(403).json({ message: 'Huna ruhusa kutangaza mkataba wa kilimo' });
    }

    const body = req.body || {};
    const title = String(body.title || '').trim();
    const cropName = String(body.cropName || '').trim();
    const quantityKg = Number(body.quantityKg);
    if (title.length < 6) {
      return res.status(400).json({ message: 'Kichwa cha mkataba kifafanue mahitaji' });
    }
    if (!cropName) {
      return res.status(400).json({ message: 'Jina la zao linahitajika' });
    }
    if (!Number.isFinite(quantityKg) || quantityKg <= 0) {
      return res.status(400).json({ message: 'Weka kiasi sahihi cha mazao (kg)' });
    }
    const deadline = dateOrNull(body.deadline);
    if (deadline && isExpired(deadline)) {
      return res.status(400).json({ message: 'Tarehe ya mwisho imekwisha' });
    }

    const contract = await Contract.create({
      buyer: user._id,
      buyerName: user.name || '',
      title: title.slice(0, 160),
      cropName: cropName.slice(0, 120),
      quantityKg,
      pricePerKg: numberOr(body.pricePerKg),
      qualityRequirements: String(body.qualityRequirements || '').slice(0, 1000),
      moistureMaxPct: Math.min(Math.max(numberOr(body.moistureMaxPct, 14), 0), 100),
      grade: body.grade || 'mixed',
      district: String(body.district || user.district || 'Katavi'),
      ward: String(body.ward || user.ward || ''),
      village: String(body.village || user.village || ''),
      deliveryLocation: String(body.deliveryLocation || '').slice(0, 300),
      startDate: dateOrNull(body.startDate),
      deadline,
      paymentPlan: body.paymentPlan || 'on_delivery',
      paymentTerms: String(body.paymentTerms || '').slice(0, 1000),
      notes: String(body.notes || '').slice(0, 1000),
    });

    await cache.delByPrefix(LIST_PREFIX);
    res.status(201).json(contract);
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: 'Taarifa za mkataba si sahihi' });
    }
    console.error('Create contract error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// GET /api/v1/contracts/:id
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: 'Mkataba haupatikani' });
    }
    const contract = await Contract.findById(req.params.id).lean();
    if (!contract) return res.status(404).json({ message: 'Mkataba haupatikani' });

    const payload = withProgress(contract);
    if (req.user) {
      payload.isBuyer = String(contract.buyer) === String(req.user._id);
      payload.myCommitment = await ContractCommitment.findOne({
        contract: contract._id,
        farmer: req.user._id,
      }).select('status quantityKg deliveredKg').lean();
    }
    res.json(payload);
  } catch (error) {
    console.error('Contract detail error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// PUT /api/v1/contracts/:id — buyer edits or cancels before fulfilment
router.put('/:id', auth, auditRoute({
  action: 'update_contract',
  category: 'contract',
  targetType: 'Contract',
}), async (req, res) => {
  try {
    const contract = mongoose.isValidObjectId(req.params.id)
      ? await Contract.findById(req.params.id)
      : null;
    if (!contract) return res.status(404).json({ message: 'Mkataba haupatikani' });
    if (!isBuyerOrStaff(contract, req.user)) {
      return res.status(403).json({ message: 'Huna ruhusa kubadilisha mkataba huu' });
    }
    if (['fulfilled', 'cancelled', 'expired'].includes(contract.status)) {
      return res.status(400).json({ message: 'Mkataba huu umekwisha kufungwa' });
    }

    const body = req.body || {};
    if (body.title !== undefined) contract.title = String(body.title).trim().slice(0, 160);
    if (body.cropName !== undefined) contract.cropName = String(body.cropName).trim().slice(0, 120);
    if (body.quantityKg !== undefined) {
      const quantityKg = Number(body.quantityKg);
      if (!Number.isFinite(quantityKg) || quantityKg < contract.committedKg) {
        return res.status(400).json({
          message: 'Kiasi hakiwezi kuwa kidogo kuliko kilichokwisha ahidiwa',
        });
      }
      contract.quantityKg = quantityKg;
    }
    if (body.pricePerKg !== undefined) {
      contract.pricePerKg = numberOr(body.pricePerKg, contract.pricePerKg);
    }
    if (body.qualityRequirements !== undefined) {
      contract.qualityRequirements = String(body.qualityRequirements).slice(0, 1000);
    }
    if (body.moistureMaxPct !== undefined) {
      contract.moistureMaxPct = Math.min(Math.max(numberOr(body.moistureMaxPct, contract.moistureMaxPct), 0), 100);
    }
    if (body.grade !== undefined) contract.grade = body.grade;
    if (body.district !== undefined) contract.district = String(body.district);
    if (body.ward !== undefined) contract.ward = String(body.ward);
    if (body.village !== undefined) contract.village = String(body.village);
    if (body.deliveryLocation !== undefined) {
      contract.deliveryLocation = String(body.deliveryLocation).slice(0, 300);
    }
    if (body.startDate !== undefined) contract.startDate = dateOrNull(body.startDate);
    if (body.deadline !== undefined) contract.deadline = dateOrNull(body.deadline);
    if (body.paymentPlan !== undefined) contract.paymentPlan = body.paymentPlan;
    if (body.paymentTerms !== undefined) contract.paymentTerms = String(body.paymentTerms).slice(0, 1000);
    if (body.notes !== undefined) contract.notes = String(body.notes).slice(0, 1000);
    if (body.status !== undefined) {
      if (!['open', 'cancelled'].includes(body.status)) {
        return res.status(400).json({ message: 'Unaweza tu kufungua au kufuta mkataba' });
      }
      contract.status = body.status;
    }

    await contract.save();
    await cache.delByPrefix(LIST_PREFIX);
    if (body.status === 'cancelled') {
      const accepted = await ContractCommitment.find({
        contract: contract._id,
        status: 'accepted',
      }).select('farmer').lean();
      for (const row of accepted) {
        await notify(row.farmer, {
          title: 'Mkataba Umefutwa',
          message: `Mkataba "${contract.title}" umefutwa na mnunuzi.`,
          link: '/contracts',
          metadata: { contractId: contract._id },
        });
      }
    }

    res.json(withProgress(contract.toObject()));
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: 'Taarifa za mkataba si sahihi' });
    }
    console.error('Update contract error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// DELETE /api/v1/contracts/:id — cancels the contract
router.delete('/:id', auth, auditRoute({
  action: 'cancel_contract',
  category: 'contract',
  targetType: 'Contract',
}), async (req, res) => {
  try {
    const contract = mongoose.isValidObjectId(req.params.id)
      ? await Contract.findById(req.params.id)
      : null;
    if (!contract) return res.status(404).json({ message: 'Mkataba haupatikani' });
    if (!isBuyerOrStaff(contract, req.user)) {
      return res.status(403).json({ message: 'Huna ruhusa kufuta mkataba huu' });
    }
    if (contract.status === 'fulfilled') {
      return res.status(400).json({ message: 'Mkataba uliokamilika hauwezi kufutwa' });
    }

    contract.status = 'cancelled';
    await contract.save();
    await cache.delByPrefix(LIST_PREFIX);
    res.json({ message: 'Mkataba umefutwa' });
  } catch (error) {
    console.error('Cancel contract error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// POST /api/v1/contracts/:id/commit — a farmer commits part of the quantity
router.post('/:id/commit', auth, auditRoute({
  action: 'commit_contract',
  category: 'contract',
  targetType: 'Contract',
}), async (req, res) => {
  try {
    const contract = mongoose.isValidObjectId(req.params.id)
      ? await Contract.findById(req.params.id)
      : null;
    if (!contract) return res.status(404).json({ message: 'Mkataba haupatikani' });
    if (String(contract.buyer) === String(req.user._id)) {
      return res.status(400).json({ message: 'Hauwezi kuahidi mkataba wako mwenyewe' });
    }
    if (!['open', 'contracted'].includes(contract.status)) {
      return res.status(400).json({ message: 'Mkataba huu haupokei ahadi mpya' });
    }
    if (isExpired(contract.deadline)) {
      return res.status(400).json({ message: 'Muda wa kuahidi umekwisha' });
    }

    const quantityKg = Number(req.body.quantityKg);
    if (!Number.isFinite(quantityKg) || quantityKg <= 0) {
      return res.status(400).json({ message: 'Weka kiasi sahihi unachoweza kuwasilisha (kg)' });
    }
    const remaining = remainingQuantity(contract);
    if (quantityKg > remaining) {
      return res.status(400).json({
        message: `Kiasi kinachobaki kwenye mkataba ni kilo ${remaining}`,
      });
    }

    const existing = await ContractCommitment.findOne({
      contract: contract._id,
      farmer: req.user._id,
    });
    if (existing) {
      return res.status(409).json({ message: 'Tayari umeahidi mkataba huu' });
    }

    // Atomic guard: two farmers cannot promise the same remaining quantity.
    const updated = await Contract.findOneAndUpdate(
      {
        _id: contract._id,
        status: { $in: ['open', 'contracted'] },
        $expr: { $lte: [{ $add: ['$committedKg', quantityKg] }, '$quantityKg'] },
      },
      { $inc: { committedKg: quantityKg }, $set: { status: 'contracted' } },
      { new: true }
    );
    if (!updated) {
      return res.status(409).json({ message: 'Kiasi hicho kimekwisha ahidiwa na wakulima wengine' });
    }

    let commitment;
    try {
      commitment = await ContractCommitment.create({
        contract: contract._id,
        farmer: req.user._id,
        farmerName: req.user.name || '',
        quantityKg,
        message: String(req.body.message || '').slice(0, 1000),
      });
    } catch (error) {
      await Contract.updateOne({ _id: contract._id }, { $inc: { committedKg: -quantityKg } });
      if (error.code === 11000) {
        return res.status(409).json({ message: 'Tayari umeahidi mkataba huu' });
      }
      throw error;
    }

    await notify(contract.buyer, {
      title: 'Ahadi Mpya ya Mkataba',
      message: `${commitment.farmerName} ameahidi kilo ${quantityKg} kwa "${contract.title}".`,
      link: '/contracts',
      metadata: { contractId: contract._id, commitmentId: commitment._id },
    });

    await cache.delByPrefix(LIST_PREFIX);
    res.status(201).json(commitment);
  } catch (error) {
    console.error('Commit contract error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// GET /api/v1/contracts/:id/commitments — buyer or staff
router.get('/:id/commitments', auth, async (req, res) => {
  try {
    const contract = mongoose.isValidObjectId(req.params.id)
      ? await Contract.findById(req.params.id).lean()
      : null;
    if (!contract) return res.status(404).json({ message: 'Mkataba haupatikani' });
    if (!isBuyerOrStaff(contract, req.user)) {
      return res.status(403).json({ message: 'Huna ruhusa kuona ahadi za mkataba huu' });
    }

    const commitments = await ContractCommitment.find({ contract: contract._id })
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();
    res.json(commitments);
  } catch (error) {
    console.error('Contract commitments error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// PUT /api/v1/contracts/commitments/:id — buyer accepts/rejects, farmer withdraws
router.put('/commitments/:id', auth, auditRoute({
  action: 'review_contract_commitment',
  category: 'contract',
  targetType: 'ContractCommitment',
}), async (req, res) => {
  try {
    const commitment = mongoose.isValidObjectId(req.params.id)
      ? await ContractCommitment.findById(req.params.id)
      : null;
    if (!commitment) return res.status(404).json({ message: 'Ahadi haipatikani' });
    const contract = await Contract.findById(commitment.contract);
    if (!contract) return res.status(404).json({ message: 'Mkataba haupatikani' });

    const next = String(req.body.status || '');
    const isFarmer = String(commitment.farmer) === String(req.user._id);
    const isBuyer = isBuyerOrStaff(contract, req.user);

    if (isFarmer && !isBuyer) {
      if (next !== 'withdrawn' || commitment.status !== 'pending') {
        return res.status(403).json({ message: 'Unaweza kuondoa ahadi iliyosubiri tu' });
      }
    } else if (isBuyer) {
      if (!['accepted', 'rejected'].includes(next) || commitment.status !== 'pending') {
        return res.status(400).json({ message: 'Ahadi hii imekwisha Shughulikiwa' });
      }
    } else {
      return res.status(403).json({ message: 'Huna ruhusa kubadilisha ahadi hii' });
    }

    commitment.status = next;
    commitment.statusUpdatedAt = new Date();
    if (next === 'accepted') commitment.acceptedAt = new Date();
    await commitment.save();

    if (next === 'withdrawn' || next === 'rejected') {
      await Contract.updateOne({ _id: contract._id }, { $inc: { committedKg: -commitment.quantityKg } });
      const fresh = await Contract.findById(contract._id).lean();
      const status = deriveContractStatus(fresh);
      if (status !== fresh.status) {
        await Contract.updateOne({ _id: contract._id }, { $set: { status } });
      }
    }
    await cache.delByPrefix(LIST_PREFIX);

    await notify(commitment.farmer, {
      title: 'Hali ya Ahadi Yako Imebadilika',
      message: `Ahadi yako ya "${contract.title}": ${next}.`,
      link: '/contracts',
      metadata: { contractId: contract._id, commitmentId: commitment._id, status: next },
    });

    res.json(commitment);
  } catch (error) {
    console.error('Review commitment error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// POST /api/v1/contracts/:id/deliveries — accepted farmer records a delivery
router.post('/:id/deliveries', auth, auditRoute({
  action: 'record_contract_delivery',
  category: 'contract',
  targetType: 'ContractDelivery',
}), async (req, res) => {
  try {
    const contract = mongoose.isValidObjectId(req.params.id)
      ? await Contract.findById(req.params.id)
      : null;
    if (!contract) return res.status(404).json({ message: 'Mkataba haupatikani' });
    if (!['open', 'contracted'].includes(contract.status)) {
      return res.status(400).json({ message: 'Mkataba huu haupokei mazao zaidi' });
    }

    const commitment = await ContractCommitment.findOne({
      contract: contract._id,
      farmer: req.user._id,
    });
    if (!commitment) {
      return res.status(403).json({ message: 'Hauna ahadi iliyokubaliwa kwenye mkataba huu' });
    }
    if (commitment.status !== 'accepted') {
      return res.status(400).json({ message: 'Ahadi yako bado haijakubaliwa na mnunuzi' });
    }

    const quantityKg = Number(req.body.quantityKg);
    if (!Number.isFinite(quantityKg) || quantityKg <= 0) {
      return res.status(400).json({ message: 'Weka kiasi sahihi kilichowasilishwa (kg)' });
    }
    const outstanding = commitment.quantityKg - commitment.deliveredKg;
    if (quantityKg > outstanding) {
      return res.status(400).json({
        message: `Unaweza kuwasilisha kiasi kinachobaki tu (kilo ${outstanding})`,
      });
    }

    const photoUrls = Array.isArray(req.body.photoUrls)
      ? req.body.photoUrls.filter((url) => typeof url === 'string').slice(0, 6)
      : [];

    const delivery = await ContractDelivery.create({
      contract: contract._id,
      commitment: commitment._id,
      farmer: req.user._id,
      farmerName: commitment.farmerName || req.user.name || '',
      quantityKg,
      moisturePct: req.body.moisturePct !== undefined ? numberOr(req.body.moisturePct) : null,
      grade: req.body.grade || 'mixed',
      photoUrls,
      batchRef: String(req.body.batchRef || '').slice(0, 60),
      notes: String(req.body.notes || '').slice(0, 500),
    });

    await notify(contract.buyer, {
      title: 'Mazao Yamewasilishwa',
      message: `${delivery.farmerName} amewasilisha kilo ${quantityKg} kwa "${contract.title}". Thibitisha ubora.`,
      link: '/contracts',
      metadata: { contractId: contract._id, deliveryId: delivery._id },
    });

    res.status(201).json(delivery);
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: 'Taarifa za uwasilishaji si sahihi' });
    }
    console.error('Record delivery error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// GET /api/v1/contracts/:id/deliveries — buyer/staff see all, farmers see their own
router.get('/:id/deliveries', auth, async (req, res) => {
  try {
    const contract = mongoose.isValidObjectId(req.params.id)
      ? await Contract.findById(req.params.id).lean()
      : null;
    if (!contract) return res.status(404).json({ message: 'Mkataba haupatikani' });

    const filter = { contract: contract._id };
    if (!isBuyerOrStaff(contract, req.user)) {
      filter.farmer = req.user._id;
    }
    const deliveries = await ContractDelivery.find(filter)
      .sort({ createdAt: -1 })
      .limit(300)
      .lean();
    res.json(deliveries);
  } catch (error) {
    console.error('Contract deliveries error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// PUT /api/v1/contracts/deliveries/:id — buyer inspects and accepts/rejects
router.put('/deliveries/:id', auth, auditRoute({
  action: 'review_contract_delivery',
  category: 'contract',
  targetType: 'ContractDelivery',
}), async (req, res) => {
  try {
    const delivery = mongoose.isValidObjectId(req.params.id)
      ? await ContractDelivery.findById(req.params.id)
      : null;
    if (!delivery) return res.status(404).json({ message: 'Uwasilishaji haupatikani' });
    if (delivery.status !== 'pending') {
      return res.status(400).json({ message: 'Uwasilishaji huu umekwisha kupitiwa' });
    }
    const contract = await Contract.findById(delivery.contract);
    if (!contract) return res.status(404).json({ message: 'Mkataba haupatikani' });
    if (!isBuyerOrStaff(contract, req.user)) {
      return res.status(403).json({ message: 'Mnunuzi pekee anathibitisha ubora' });
    }

    const next = String(req.body.status || 'accepted');
    if (!['accepted', 'rejected'].includes(next)) {
      return res.status(400).json({ message: 'Chagua kukubali au kukataa mazao' });
    }

    delivery.status = next;
    delivery.reviewedAt = new Date();
    delivery.reviewedBy = req.user._id;
    if (req.body.moisturePct !== undefined) delivery.moisturePct = numberOr(req.body.moisturePct);
    if (req.body.grade !== undefined) delivery.grade = req.body.grade;
    if (req.body.notes !== undefined) delivery.notes = String(req.body.notes).slice(0, 500);

    let acceptedKg = 0;
    if (next === 'accepted') {
      delivery.rejectedKg = Math.min(
        Math.max(numberOr(req.body.rejectedKg), 0),
        delivery.quantityKg
      );
      acceptedKg = acceptedQuantity({
        quantityKg: delivery.quantityKg,
        rejectedKg: delivery.rejectedKg,
      });
      delivery.acceptedKg = acceptedKg;
    }

    await delivery.save();

    if (next === 'accepted' && acceptedKg > 0) {
      const commitment = await ContractCommitment.findById(delivery.commitment);
      if (commitment) {
        commitment.deliveredKg = Math.min(
          commitment.deliveredKg + acceptedKg,
          commitment.quantityKg
        );
        if (commitment.deliveredKg >= commitment.quantityKg) {
          commitment.status = 'completed';
          commitment.statusUpdatedAt = new Date();
        }
        await commitment.save();
      }

      const updated = await Contract.findOneAndUpdate(
        { _id: contract._id },
        { $inc: { deliveredKg: acceptedKg } },
        { new: true }
      );
      const status = deriveContractStatus(updated);
      if (status !== updated.status) {
        await Contract.updateOne({ _id: updated._id }, { $set: { status } });
      }
      await cache.delByPrefix(LIST_PREFIX);
    }

    await notify(delivery.farmer, {
      title: next === 'accepted' ? 'Mazao Yamekubaliwa' : 'Mazao Yamekataliwa',
      message: next === 'accepted'
        ? `Kilo ${delivery.acceptedKg} zimekubaliwa kwa "${contract.title}".`
        : `Mazao ya "${contract.title}" hayakukidhi ubora. Angalia maelezo.`,
      link: '/contracts',
      metadata: { contractId: contract._id, deliveryId: delivery._id, status: next },
    });

    res.json(delivery);
  } catch (error) {
    console.error('Review delivery error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// GET /api/v1/contracts/:id/quality-report
router.get('/:id/quality-report', auth, async (req, res) => {
  try {
    const contract = mongoose.isValidObjectId(req.params.id)
      ? await Contract.findById(req.params.id).lean()
      : null;
    if (!contract) return res.status(404).json({ message: 'Mkataba haupatikani' });

    const isFarmer = Boolean(await ContractCommitment.exists({
      contract: contract._id,
      farmer: req.user._id,
    }));
    if (!isBuyerOrStaff(contract, req.user) && !isFarmer) {
      return res.status(403).json({ message: 'Huna ruhusa kuona ripoti hii' });
    }

    const deliveries = await ContractDelivery.find({ contract: contract._id }).lean();
    res.json({
      contractId: contract._id,
      cropName: contract.cropName,
      status: contract.status,
      moistureMaxPct: contract.moistureMaxPct,
      ...qualitySummary(deliveries),
      deliveries: deliveries.length,
    });
  } catch (error) {
    console.error('Quality report error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

module.exports = router;
