const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { auth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleCheck');
const { sendNotification } = require('../services/notification.service');
const { Warehouse, StorageBooking } = require('../models/Warehouse');

const BOOKING_STATUSES = ['pending', 'active', 'completed', 'cancelled'];

const BOOKING_TRANSITIONS = {
  pending: ['active', 'cancelled'],
  active: ['completed'],
  completed: [],
  cancelled: [],
};

const canTransitionBooking = (from, to) =>
  Boolean(BOOKING_TRANSITIONS[from]?.includes(to));

const STATUS_MESSAGES = {
  active: 'Uhifadhi wako umeanza',
  completed: 'Uhifadhi umekamilika',
  cancelled: 'Uhifadhi umeghairiwa',
};

const numeric = (value, fallback) => {
  const num = Number(value);
  return Number.isFinite(num) && num >= 0 ? num : fallback;
};

const warehouseFields = (body) => {
  const data = {};
  if (body.name !== undefined) data.name = String(body.name).trim().slice(0, 120);
  if (body.location !== undefined) data.location = String(body.location).trim().slice(0, 120);
  if (body.sizeSqm !== undefined) data.sizeSqm = numeric(body.sizeSqm, 0);
  if (body.feePerBagPerDay !== undefined) data.feePerBagPerDay = numeric(body.feePerBagPerDay, 0);
  if (body.feePerBagPerMonth !== undefined) data.feePerBagPerMonth = numeric(body.feePerBagPerMonth, 0);
  if (body.capacityBags !== undefined) data.capacityBags = numeric(body.capacityBags, 0);
  if (body.available !== undefined) data.available = Boolean(body.available);
  return data;
};

const canManageWarehouse = (warehouse, user) =>
  user.role === 'admin' ||
  (warehouse.owner && String(warehouse.owner) === String(user._id));

// GET /api/v1/warehouses — public list of storage spaces.
router.get('/', async (req, res) => {
  try {
    const warehouses = await Warehouse.find().sort({ createdAt: -1 });
    res.json(warehouses);
  } catch (error) {
    console.error('Get warehouses error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// GET /api/v1/warehouses/mine — warehouses registered by the caller.
router.get('/mine', requireRole('logistics', 'admin'), async (req, res) => {
  try {
    const warehouses = await Warehouse.find({ owner: req.user._id }).sort({ createdAt: -1 });
    res.json(warehouses);
  } catch (error) {
    console.error('Get my warehouses error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// POST /api/v1/warehouses — register a warehouse (logistics partner or admin).
router.post('/', requireRole('logistics', 'admin'), async (req, res) => {
  try {
    const data = warehouseFields(req.body);
    if (!data.name) {
      return res.status(400).json({ message: 'Jina la ghala linahitajika' });
    }
    if (!data.location) {
      return res.status(400).json({ message: 'Mahali pa ghala linahitajika' });
    }
    if (!(data.feePerBagPerDay > 0) && !(data.feePerBagPerMonth > 0)) {
      return res.status(400).json({ message: 'Weka bei ya siku au ya mwezi' });
    }
    const warehouse = await Warehouse.create({ ...data, owner: req.user._id });
    res.status(201).json(warehouse);
  } catch (error) {
    console.error('Create warehouse error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// PATCH /api/v1/warehouses/:id — owner or admin.
router.patch('/:id', requireRole('logistics', 'admin'), async (req, res) => {
  try {
    const warehouse = await Warehouse.findById(req.params.id);
    if (!warehouse) return res.status(404).json({ message: 'Ghala halipo' });
    if (!canManageWarehouse(warehouse, req.user)) {
      return res.status(403).json({ message: 'Huna ruhusa ya kubadilisha ghala hili' });
    }
    Object.assign(warehouse, warehouseFields(req.body));
    if (!(warehouse.feePerBagPerDay > 0) && !(warehouse.feePerBagPerMonth > 0)) {
      return res.status(400).json({ message: 'Weka bei ya siku au ya mwezi' });
    }
    await warehouse.save();
    res.json(warehouse);
  } catch (error) {
    console.error('Update warehouse error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// DELETE /api/v1/warehouses/:id — owner or admin.
router.delete('/:id', requireRole('logistics', 'admin'), async (req, res) => {
  try {
    const warehouse = await Warehouse.findById(req.params.id);
    if (!warehouse) return res.status(404).json({ message: 'Ghala halipo' });
    if (!canManageWarehouse(warehouse, req.user)) {
      return res.status(403).json({ message: 'Huna ruhusa ya kuondoa ghala hili' });
    }
    await Warehouse.deleteOne({ _id: warehouse._id });
    res.json({ message: 'Ghala limeondolewa' });
  } catch (error) {
    console.error('Delete warehouse error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// GET /api/v1/warehouses/bookings — the caller's own storage requests.
router.get('/bookings', auth, async (req, res) => {
  try {
    const bookings = await StorageBooking.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json({ bookings });
  } catch (error) {
    console.error('Get storage bookings error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// GET /api/v1/warehouses/bookings/all — requests for the caller's warehouses
// (logistics), or everything for an admin.
router.get('/bookings/all', requireRole('logistics', 'admin'), async (req, res) => {
  try {
    let filter = {};
    if (req.user.role !== 'admin') {
      const owned = await Warehouse.find({ owner: req.user._id })
        .select('_id')
        .lean();
      filter = { warehouse: { $in: owned.map((w) => w._id) } };
    }
    const bookings = await StorageBooking.find(filter)
      .populate('user', 'name phone location district')
      .sort({ createdAt: -1 });
    res.json({ bookings });
  } catch (error) {
    console.error('Get all storage bookings error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// POST /api/v1/warehouses/bookings
router.post('/bookings', auth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.body.warehouse)) {
      return res.status(400).json({ message: 'Chagua ghala' });
    }
    const warehouse = await Warehouse.findById(req.body.warehouse);
    if (!warehouse) return res.status(404).json({ message: 'Ghala halipo' });
    if (warehouse.available === false) {
      return res.status(400).json({ message: 'Ghala hili halipatikani kwa sasa' });
    }

    const bags = Math.max(0, Math.round(numeric(req.body.bags, 0)));
    if (bags <= 0) {
      return res.status(400).json({ message: 'Weka idadi ya gunia' });
    }
    const days = Math.max(0, Math.round(numeric(req.body.days, 0)));
    const months = Math.max(0, Math.round(numeric(req.body.months, 0)));

    let totalFee = 0;
    if (days > 0 && warehouse.feePerBagPerDay > 0) {
      totalFee = warehouse.feePerBagPerDay * bags * days;
    } else if (warehouse.feePerBagPerMonth > 0) {
      totalFee = warehouse.feePerBagPerMonth * bags * Math.max(months, 1);
    } else {
      return res.status(400).json({ message: 'Ghala hili halina bei iliyowekwa' });
    }

    const booking = await StorageBooking.create({
      user: req.user._id,
      warehouse: warehouse._id,
      warehouseName: warehouse.name,
      bags,
      months: days > 0 ? 0 : Math.max(months, 1),
      days,
      totalFee,
      status: 'pending',
    });

    if (warehouse.owner && String(warehouse.owner) !== String(req.user._id)) {
      await sendNotification(warehouse.owner, {
        title: 'Ombi Jipya la Ghala',
        message: `${req.user.name || 'Mteja'}: ${warehouse.name} · gunia ${bags}` +
          (days > 0 ? ` kwa siku ${days}` : ` kwa miezi ${Math.max(months, 1)}`),
        type: 'order',
        link: '/logistics?tab=wh',
        metadata: { bookingId: String(booking._id) },
      });
    }

    res.status(201).json({ booking });
  } catch (error) {
    console.error('Create storage booking error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// PATCH /api/v1/warehouses/bookings/:id/status — warehouse owner or admin.
router.patch('/bookings/:id/status', requireRole('logistics', 'admin'), async (req, res) => {
  try {
    const { status } = req.body;
    if (!BOOKING_STATUSES.includes(status)) {
      return res.status(400).json({ message: 'Hali ya uhifadhi si sahihi' });
    }

    const booking = await StorageBooking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Uhifadhi haupo' });

    if (req.user.role !== 'admin') {
      const warehouse = await Warehouse.findById(booking.warehouse);
      if (!warehouse || !warehouse.owner || String(warehouse.owner) !== String(req.user._id)) {
        return res.status(403).json({ message: 'Uhifadhi huu si wa ghala lako' });
      }
    }

    if (!canTransitionBooking(booking.status, status)) {
      return res.status(400).json({
        message: `Uhifadhi huu hauwezi kubadilishwa kutoka "${booking.status}" kwenda "${status}"`,
      });
    }

    const reason = String(req.body.reason || '').trim().slice(0, 200);
    booking.status = status;
    await booking.save();

    const title = STATUS_MESSAGES[status];
    if (title) {
      await sendNotification(booking.user, {
        title,
        message: `${booking.warehouseName || 'Ghala'} · gunia ${booking.bags}` +
          (booking.days > 0 ? ` kwa siku ${booking.days}` : ` kwa miezi ${booking.months}`) +
          (status === 'cancelled' && reason ? `. Sababu: ${reason}` : ''),
        type: 'order',
        link: '/transport?tab=warehouse',
        metadata: { bookingId: String(booking._id) },
      });
    }

    res.json({ booking });
  } catch (error) {
    console.error('Update storage booking status error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// DELETE /api/v1/warehouses/bookings/:id — the customer cancels before the
// goods are in storage; the warehouse owner is told so they can free space.
router.delete('/bookings/:id', auth, async (req, res) => {
  try {
    const booking = await StorageBooking.findOne({
      _id: req.params.id,
      user: req.user._id,
    });
    if (!booking) return res.status(404).json({ message: 'Uhifadhi haupo' });
    if (booking.status === 'active') {
      return res.status(400).json({
        message: 'Mzigo umeanza kuhifadhiwa; wasiliana na mmiliki wa ghala',
      });
    }
    if (booking.status === 'completed') {
      return res.status(400).json({ message: 'Uhifadhi umekamilika; huwezi kughairi' });
    }
    if (booking.status === 'cancelled') {
      return res.json({ message: 'Uhifadhi umeghairiwa', booking });
    }

    const reason = String(req.body.reason || '').trim().slice(0, 200);
    booking.status = 'cancelled';
    await booking.save();

    const warehouse = booking.warehouse
      ? await Warehouse.findById(booking.warehouse).select('owner')
      : null;
    if (warehouse?.owner && String(warehouse.owner) !== String(req.user._id)) {
      await sendNotification(warehouse.owner, {
        title: 'Ombi la Ghala Limeghairiwa',
        message: `${req.user.name || 'Mteja'}: ${booking.warehouseName || 'Ghala'} · gunia ${booking.bags}` +
          (reason ? `. Sababu: ${reason}` : ''),
        type: 'order',
        link: '/logistics?tab=wh',
        metadata: { bookingId: String(booking._id) },
      });
    }

    res.json({ message: 'Uhifadhi umeghairiwa', booking });
  } catch (error) {
    console.error('Cancel storage booking error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

module.exports = router;
module.exports.expirePendingOrders = async () => 0;
module.exports.canTransitionBooking = canTransitionBooking;
