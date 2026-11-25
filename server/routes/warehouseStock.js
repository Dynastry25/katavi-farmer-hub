const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const { Warehouse, StorageBooking } = require('../models/Warehouse');
const WarehouseMovement = require('../models/WarehouseMovement');
const { auth } = require('../middleware/auth');
const { auditRoute } = require('../services/audit.service');
const { sendNotification } = require('../services/notification.service');
const {
  makeReceiptNumber,
  balanceFor,
  validateMovement,
} = require('../services/warehouseStock.service');

const isOperator = (warehouse, user) => user.role === 'admin'
  || (warehouse?.owner && String(warehouse.owner) === String(user._id));

const loadBooking = async (id) => {
  if (!mongoose.isValidObjectId(id)) return null;
  const booking = await StorageBooking.findById(id);
  if (!booking) return null;
  const warehouse = booking.warehouse ? await Warehouse.findById(booking.warehouse) : null;
  return { booking, warehouse };
};

const bookingBalance = async (bookingId) => {
  const rows = await WarehouseMovement.aggregate([
    { $match: { booking: new mongoose.Types.ObjectId(String(bookingId)) } },
    { $group: { _id: '$type', bags: { $sum: '$bags' } } },
  ]);
  return balanceFor(rows.map((row) => ({ type: row._id, bags: row.bags })));
};

// POST /api/v1/warehouse-stock/bookings/:id/movements — stock in/out/loss.
router.post('/bookings/:id/movements', auth, auditRoute({
  action: 'record_warehouse_movement',
  category: 'warehouse',
  targetType: 'StorageBooking',
  details: (req) => ({ type: String(req.body?.type || '') }),
}), async (req, res) => {
  try {
    const loaded = await loadBooking(req.params.id);
    if (!loaded) return res.status(404).json({ message: 'Ombi la ghala halipo' });
    const { booking, warehouse } = loaded;
    if (!isOperator(warehouse, req.user)) {
      return res.status(403).json({ message: 'Kumbukumbu za ghala hili zinarekodiwa na mmiliki tu' });
    }

    const type = String(req.body.type || '');
    const balance = await bookingBalance(booking._id);
    const blocker = validateMovement({ type, bags: req.body.bags, balance: balance.balance });
    if (blocker) return res.status(400).json({ message: blocker });

    const lossReason = String(req.body.lossReason || '').trim();
    if (type === 'loss' && lossReason.length < 3) {
      return res.status(400).json({ message: 'Toa sababu ya upotezaji' });
    }
    const occurredAt = req.body.occurredAt ? new Date(req.body.occurredAt) : new Date();
    if (Number.isNaN(occurredAt.getTime())) {
      return res.status(400).json({ message: 'Tarehe ya harakati si sahihi' });
    }

    const base = {
      booking: booking._id,
      warehouse: booking.warehouse,
      user: booking.user,
      type,
      bags: Number(req.body.bags),
      grade: String(req.body.grade || '').trim(),
      note: String(req.body.note || '').trim(),
      lossReason,
      recordedBy: req.user._id,
      recordedByName: req.user.name || '',
      occurredAt,
    };

    let movement = null;
    for (let attempt = 0; attempt < 3 && !movement; attempt += 1) {
      try {
        movement = await WarehouseMovement.create({
          ...base,
          receiptNumber: makeReceiptNumber({ type, date: occurredAt }),
        });
      } catch (error) {
        if (error.code !== 11000) throw error;
      }
    }
    if (!movement) {
      return res.status(500).json({ message: 'Imeshindikana kutengeneza namba ya risiti' });
    }

    await sendNotification(booking.user, {
      title: type === 'in' ? 'Mazao yameingizwa ghalani' : type === 'out' ? 'Mazao yametolewa ghalani' : 'Upotezaji ghalani',
      message: `${booking.warehouseName || 'Ghala'}: gunia ${movement.bags} (risiti ${movement.receiptNumber}).`,
      type: 'order',
      link: '/warehouse',
      metadata: { bookingId: String(booking._id), movementId: String(movement._id) },
    });

    res.status(201).json({ movement, balance: await bookingBalance(booking._id) });
  } catch (error) {
    console.error('Record warehouse movement error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// GET /api/v1/warehouse-stock/bookings/:id/movements
router.get('/bookings/:id/movements', auth, async (req, res) => {
  try {
    const loaded = await loadBooking(req.params.id);
    if (!loaded) return res.status(404).json({ message: 'Ombi la ghala halipo' });
    const { booking, warehouse } = loaded;
    const isOwner = String(booking.user) === String(req.user._id);
    if (!isOwner && !isOperator(warehouse, req.user)) {
      return res.status(403).json({ message: 'Huna ruhusa ya kuona kumbukumbu hizi' });
    }

    const movements = await WarehouseMovement.find({ booking: booking._id })
      .sort({ occurredAt: -1 })
      .limit(200)
      .lean();
    res.json({
      booking: {
        _id: booking._id,
        warehouseName: booking.warehouseName,
        bags: booking.bags,
        status: booking.status,
      },
      balance: balanceFor(movements),
      movements,
    });
  } catch (error) {
    console.error('Warehouse movements error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// GET /api/v1/warehouse-stock/my — farmer's stored lots and their balances.
router.get('/my', auth, async (req, res) => {
  try {
    const bookings = await StorageBooking.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(30).lean();
    const rows = await WarehouseMovement.aggregate([
      { $match: { booking: { $in: bookings.map((booking) => booking._id) } } },
      { $group: { _id: { booking: '$booking', type: '$type' }, bags: { $sum: '$bags' } } },
    ]);
    const byBooking = new Map();
    for (const row of rows) {
      const key = String(row._id.booking);
      if (!byBooking.has(key)) byBooking.set(key, []);
      byBooking.get(key).push({ type: row._id.type, bags: row.bags });
    }
    res.json({
      bookings: bookings.map((booking) => ({
        ...booking,
        ...balanceFor(byBooking.get(String(booking._id)) || []),
      })),
    });
  } catch (error) {
    console.error('My warehouse stock error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// GET /api/v1/warehouse-stock/summary — operator totals per warehouse.
router.get('/summary', auth, async (req, res) => {
  try {
    const warehouseQuery = req.user.role === 'admin' ? {} : { owner: req.user._id };
    const warehouses = await Warehouse.find(warehouseQuery).select('name district capacityBags status').lean();
    if (!warehouses.length) {
      return res.json({ totals: balanceFor([]), warehouses: [] });
    }
    const ids = warehouses.map((warehouse) => warehouse._id);
    const [rows, bookingCounts] = await Promise.all([
      WarehouseMovement.aggregate([
        { $match: { warehouse: { $in: ids } } },
        { $group: { _id: { warehouse: '$warehouse', type: '$type' }, bags: { $sum: '$bags' } } },
      ]),
      StorageBooking.aggregate([
        { $match: { warehouse: { $in: ids }, status: { $in: ['pending', 'active'] } } },
        { $group: { _id: '$warehouse', count: { $sum: 1 } } },
      ]),
    ]);

    const balanceByWarehouse = new Map();
    for (const row of rows) {
      const key = String(row._id.warehouse);
      if (!balanceByWarehouse.has(key)) balanceByWarehouse.set(key, []);
      balanceByWarehouse.get(key).push({ type: row._id.type, bags: row.bags });
    }
    const activeByWarehouse = new Map(bookingCounts.map((row) => [String(row._id), row.count]));

    const result = warehouses.map((warehouse) => ({
      ...warehouse,
      ...balanceFor(balanceByWarehouse.get(String(warehouse._id)) || []),
      activeBookings: activeByWarehouse.get(String(warehouse._id)) || 0,
    }));
    const totals = result.reduce((acc, warehouse) => ({
      bagsIn: acc.bagsIn + warehouse.bagsIn,
      bagsOut: acc.bagsOut + warehouse.bagsOut,
      bagsLost: acc.bagsLost + warehouse.bagsLost,
      balance: acc.balance + warehouse.balance,
    }), { bagsIn: 0, bagsOut: 0, bagsLost: 0, balance: 0 });

    res.json({ totals, warehouses: result });
  } catch (error) {
    console.error('Warehouse stock summary error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

module.exports = router;
