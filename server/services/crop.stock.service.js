// Stock backfill + normalization shared by the crops and orders routes.
// Crops created before the stock-management schema store legacy quantities
// (e.g. "500" instead of "500 kg") with a defaulted stockQuantity of 0.
// Backfill the physical stock from the legacy quantity and persist it once so
// displays, availability checks and the atomic reservation guard all agree.

const UNITS = ['kg', 'gunia', 'debe', 'tani'];
const unitRegex = new RegExp(`^\\s*\\d+(\\.\\d+)?\\s+(${UNITS.join('|')})\\s*$`, 'i');

const normalizeStock = (crop) => {
  const raw = crop && crop.toObject ? crop.toObject() : (crop ? { ...crop } : {});
  raw._patched = false;

  const stockNum = raw.stockQuantity != null && Number.isFinite(Number(raw.stockQuantity))
    ? Number(raw.stockQuantity)
    : null;
  const qtyStr = String(raw.quantity != null ? raw.quantity : '');
  const newFormatQty = unitRegex.test(qtyStr);

  if (stockNum === null || (!newFormatQty && stockNum === 0)) {
    const parsed = Number(qtyStr.replace(/[^0-9.]/g, ''));
    if (Number.isFinite(parsed) && parsed > 0) {
      raw.stockQuantity = parsed;
      raw.reservedQuantity = Number(raw.reservedQuantity) || 0;
      raw.quantity = `${parsed} ${raw.unit || 'kg'}`;
      raw._patched = true;
    } else {
      raw.stockQuantity = stockNum || 0;
    }
  }

  raw.reservedQuantity = Number(raw.reservedQuantity) || 0;
  const stock = Math.max(0, Number(raw.stockQuantity) || 0);
  const reserved = Math.max(0, raw.reservedQuantity);
  raw.availableQuantity = Math.max(0, stock - reserved);
  raw.id = String(raw._id || raw.id || '');
  return raw;
};

// Persist a backfilled stock value so routes that read the raw stored doc
// (orders, remainder) see the same stock that the UI displays.
const ensureStockPersisted = async (CropModel, crop) => {
  const view = normalizeStock(crop);
  if (view._patched) {
    await CropModel.updateOne(
      { _id: crop._id },
      { $set: { stockQuantity: view.stockQuantity, reservedQuantity: view.reservedQuantity, quantity: view.quantity } }
    );
  }
  return view;
};

module.exports = { normalizeStock, ensureStockPersisted, UNITS };