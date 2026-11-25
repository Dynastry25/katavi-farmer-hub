const StorageBooking = require('../models/Warehouse').StorageBooking;

const RESERVING_STATUSES = ['pending', 'active'];

// Bags already held by requests that have not finished or been cancelled.
const reservedBagsFor = async (warehouseId) => {
  const rows = await StorageBooking.aggregate([
    { $match: { warehouse: warehouseId, status: { $in: RESERVING_STATUSES } } },
    { $group: { _id: null, bags: { $sum: '$bags' } } },
  ]);
  return rows[0]?.bags || 0;
};

// A warehouse can be oversubscribed unless pending and active bookings reserve
// their bags up front, so both the listing detail and new requests use these.
const freeSpaceBags = (warehouse, reservedBags = 0) => {
  const capacity = Math.max(Number(warehouse?.capacityBags) || 0, 0);
  if (capacity === 0) return Infinity;
  return Math.max(capacity - Math.max(Number(reservedBags) || 0, 0), 0);
};

const storageFee = (warehouse, { bags = 0, days = 0, months = 0 } = {}) => {
  const bagCount = Math.max(Math.round(Number(bags) || 0), 0);
  const dayCount = Math.max(Math.round(Number(days) || 0), 0);
  const monthCount = Math.max(Math.round(Number(months) || 0), 0);

  if (dayCount > 0 && Number(warehouse?.feePerBagPerDay) > 0) {
    return {
      totalFee: warehouse.feePerBagPerDay * bagCount * dayCount,
      days: dayCount,
      months: 0,
    };
  }
  if (Number(warehouse?.feePerBagPerMonth) > 0) {
    const billedMonths = Math.max(monthCount, 1);
    return {
      totalFee: warehouse.feePerBagPerMonth * bagCount * billedMonths,
      days: 0,
      months: billedMonths,
    };
  }
  return null;
};

module.exports = { freeSpaceBags, storageFee, reservedBagsFor };
