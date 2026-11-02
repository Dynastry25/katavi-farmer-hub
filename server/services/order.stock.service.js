const Crop = require('../models/Crop');
const { deriveCropStatus } = require('./order.service');

// Statuses where approval already removed the goods from physical stock.
const DEDUCTED_STATUSES = ['approved', 'partially_approved', 'delivered', 'completed'];

const refreshCropStatus = async (cropId) => {
  const crop = await Crop.findById(cropId).select('stockQuantity').lean();
  if (!crop) return;
  await Crop.updateOne(
    { _id: cropId },
    { $set: { status: deriveCropStatus(crop.stockQuantity) } }
  );
};

// Undoes the stock effect of an order that will never be fulfilled.
// Pending orders only hold a reservation; approved orders already removed
// physical stock, so the accepted quantity goes back on the shelf.
const restoreOrderStock = async (order, fromStatus = '') => {
  if (!order || !order.crop) return false;
  const status = String(fromStatus || order.disputeFromStatus || order.status || '');

  if (status === 'pending') {
    await Crop.updateOne(
      { _id: order.crop, reservedQuantity: { $gte: order.requestedQuantity } },
      { $inc: { reservedQuantity: -order.requestedQuantity } }
    );
    return true;
  }

  if (!DEDUCTED_STATUSES.includes(status)) return false;
  const quantity = Number(order.approvedQuantity) || 0;
  if (quantity <= 0) return false;

  await Crop.updateOne({ _id: order.crop }, { $inc: { stockQuantity: quantity } });
  await refreshCropStatus(order.crop);
  return true;
};

module.exports = { restoreOrderStock, refreshCropStatus };
