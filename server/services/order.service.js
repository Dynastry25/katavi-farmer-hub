// Pure inventory/order decision functions. No DB access so they are unit-testable
// without Mongo. Routes apply these decisions + atomic Mongo updates.

const TERMINAL_STATES = ['approved', 'partially_approved', 'rejected', 'expired'];

const isTerminal = (status) => TERMINAL_STATES.includes(status);

// Step 3: validate an order placement / remainder reservation against available stock.
// available = stockQuantity - reservedQuantity
const availableStock = (crop) => {
  const stock = Number(crop.stockQuantity) || 0;
  const reserved = Number(crop.reservedQuantity) || 0;
  return Math.max(0, stock - reserved);
};

const hasSufficientStock = (crop, requested) => availableStock(crop) >= requested;

// Determine the crop status based on remaining physical stock.
const deriveCropStatus = (stockQuantity) => {
  const stock = Number(stockQuantity) || 0;
  if (stock <= 0) return 'out_of_stock';
  if (stock < 100) return 'low_stock';
  return 'available';
};

// Step 4: after approval, stock is decremented by approvedQuantity and the FULL
// requestedQuantity is released from reservedQuantity.
const approvalStockDelta = ({ requestedQuantity, approvedQuantity }) => {
  const requested = Number(requestedQuantity) || 0;
  const approved = Math.min(Number(approvedQuantity) || 0, requested);
  return {
    stockDecrement: approved,
    reservedRelease: requested,
  };
};

// Farmer approval defaults to the full requested quantity when the client
// omits it (older app builds), and is clamped to what was requested.
const resolveApprovedQuantity = ({ requestedQuantity, approvedQuantity }) => {
  const requested = Number(requestedQuantity) || 0;
  if (requested <= 0) return 0;
  if (approvedQuantity === undefined || approvedQuantity === null || approvedQuantity === '') {
    return requested;
  }
  const approved = Number(approvedQuantity) || 0;
  if (approved < 1) return 0;
  return Math.min(approved, requested);
};

// Only accepted orders can be handed over to the buyer.
const canMarkDelivered = (status) =>
  status === 'approved' || status === 'partially_approved';

// ── Payments ────────────────────────────────────────────────
const PAYMENT_METHODS = ['mm', 'cod', 'bank'];
const PAYABLE_STATUSES = ['pending', 'approved', 'partially_approved'];
const SETTLED_STATUSES = ['approved', 'partially_approved', 'delivered', 'completed'];

const normalizePaymentMethod = (method) =>
  PAYMENT_METHODS.includes(method) ? method : 'cod';

// Quantity the buyer pays for: the accepted quantity once the farmer responded,
// otherwise what was requested (pending orders can be paid up-front).
const payableQuantity = (order) => {
  const approved = Number(order.approvedQuantity) || 0;
  if (SETTLED_STATUSES.includes(order.status) && approved > 0) return approved;
  return Number(order.requestedQuantity) || 0;
};

const orderAmount = (order) => {
  const quantity = payableQuantity(order);
  const price = Number(order.price) || 0;
  const fee = Number(order.deliveryFee) || 0;
  return Math.max(0, quantity * price + fee);
};

// An order can be paid while it is still live and not already settled.
const canPayOrder = (order) =>
  PAYABLE_STATUSES.includes(order.status) &&
  order.paymentStatus !== 'paid' &&
  order.paymentStatus !== 'processing';

// The approval status after a (possibly partial) approval.
const deriveApprovalStatus = ({ requestedQuantity, approvedQuantity }) => {
  const requested = Number(requestedQuantity) || 0;
  const approved = Number(approvedQuantity) || 0;
  if (approved >= requested) return 'approved';
  return 'partially_approved';
};

// Step 4 reject: release the FULL requested reservation.
const rejectionReservedRelease = (requestedQuantity) => Number(requestedQuantity) || 0;

// Step 6: remaining quantity after a partial approval, and the offered amount
// (capped at current available stock if the remainder exceeds it).
const remainderOffer = ({ requestedQuantity, approvedQuantity, crop }) => {
  const requested = Number(requestedQuantity) || 0;
  const approved = Number(approvedQuantity) || 0;
  const remaining = Math.max(0, requested - approved);
  const available = availableStock(crop);
  if (remaining <= 0) {
    return { remaining: 0, offered: 0, capped: false };
  }
  const offered = remaining <= available ? remaining : available;
  return { remaining, offered, capped: remaining > available };
};

// Does a partial order already have a (non-terminal) remainder order from it?
const hasOpenRemainder = (order) => {
  const remainder = order.remainderOrder;
  if (!remainder) return false;
  return !isTerminal(remainder.status);
};

// Only the parties can withdraw a pending order; staff may remove any unpaid
// order. Paid or in-flight payments always block deletion.
const canDeleteOrder = (order, user) => {
  if (!order || !user) return false;
  if (['paid', 'processing'].includes(order.paymentStatus)) return false;

  const isStaff = ['admin', 'support', 'content_moderator', 'finance_officer']
    .includes(user.role);
  if (isStaff) return true;

  const isParty = String(order.buyer) === String(user._id) ||
    String(order.farmer) === String(user._id);
  return isParty && order.status === 'pending';
};

// ── Cancellation ────────────────────────────────────────────
const CANCELLABLE_STATUSES = ['pending', 'approved', 'partially_approved'];
const STAFF_ROLES = ['admin', 'support', 'content_moderator', 'finance_officer'];

// Buyer or farmer may withdraw an order until the carrier takes the goods.
// Staff can cancel anything still in the delivery window.
const canCancelOrder = (order, user) => {
  if (!order || !user) return false;
  if (!CANCELLABLE_STATUSES.includes(order.status)) return false;

  const isStaff = STAFF_ROLES.includes(user.role);
  if (isStaff) return true;

  const isParty = String(order.buyer) === String(user._id) ||
    String(order.farmer) === String(user._id);
  if (!isParty) return false;

  return !['accepted', 'in_transit'].includes(order.deliveryStatus);
};

module.exports = {
  TERMINAL_STATES,
  isTerminal,
  availableStock,
  hasSufficientStock,
  deriveCropStatus,
  approvalStockDelta,
  resolveApprovedQuantity,
  canMarkDelivered,
  PAYMENT_METHODS,
  PAYABLE_STATUSES,
  normalizePaymentMethod,
  payableQuantity,
  orderAmount,
  canPayOrder,
  deriveApprovalStatus,
  rejectionReservedRelease,
  remainderOffer,
  hasOpenRemainder,
  canDeleteOrder,
  CANCELLABLE_STATUSES,
  STAFF_ROLES,
  canCancelOrder,
};
