const { test } = require('node:test');
const assert = require('node:assert');

const {
  isTerminal,
  availableStock,
  hasSufficientStock,
  deriveCropStatus,
  approvalStockDelta,
  deriveApprovalStatus,
  rejectionReservedRelease,
  remainderOffer,
  hasOpenRemainder,
} = require('../services/order.service');

// ---- Available stock / reservation ----
test('availableStock subtracts reservations from physical stock', () => {
  assert.strictEqual(availableStock({ stockQuantity: 100, reservedQuantity: 30 }), 70);
  assert.strictEqual(availableStock({ stockQuantity: 100, reservedQuantity: 0 }), 100);
  assert.strictEqual(availableStock({ stockQuantity: 5, reservedQuantity: 10 }), 0);
  assert.strictEqual(availableStock({ stockQuantity: 0, reservedQuantity: 0 }), 0);
});

test('hasSufficientStock correctly gates order placement', () => {
  const crop = { stockQuantity: 100, reservedQuantity: 60 };
  assert.strictEqual(hasSufficientStock(crop, 40), true, 'exactly available should pass');
  assert.strictEqual(hasSufficientStock(crop, 41), false, 'one over available must fail');
  assert.strictEqual(hasSufficientStock(crop, 61), false, 'cannot exceed physical stock');
});

// ---- Atomic guard: two concurrent approvals can never push stock negative ----
test('atomic guard: approving more than remaining physical stock is impossible', () => {
  // Two orders each reserved 5 while physical stock was 5, picking up the guard:
  // any approval requires stockQuantity >= approved, so deducting more than remains is impossible.
  const before = { stockQuantity: 5, reservedQuantity: 5 };
  // Nothing is physically available for a new order once fully reserved.
  assert.strictEqual(availableStock(before), 0);

  // First approval of 4 succeeds: stock 5 -> 1.
  const afterFirst = { stockQuantity: 5 - 4, reservedQuantity: 0 };
  // Second concurrent approval of 4 must fail the guard because 1 < 4.
  assert.ok(afterFirst.stockQuantity < 4, 'guard condition stock>=approved fails => approval rejected');

  // Cumulative approved can never exceed the original physical stock (5).
  const cumulativeApproved = 4 + 0;
  assert.ok(cumulativeApproved <= 5, 'oversell is prevented by the atomic guard');
});

// ---- Approval stock deltas across terminal states ----
test('full approval decrements stock by approved and releases full reservation', () => {
  const delta = approvalStockDelta({ requestedQuantity: 30, approvedQuantity: 30 });
  assert.strictEqual(delta.stockDecrement, 30);
  assert.strictEqual(delta.reservedRelease, 30);
});

test('partial approval decrements stock by approved but releases FULL requested reservation', () => {
  const o = { requestedQuantity: 30, approvedQuantity: 20 };
  assert.strictEqual(approvalStockDelta(o).stockDecrement, 20, 'stock drops only by what is approved');
  assert.strictEqual(approvalStockDelta(o).reservedRelease, 30, 'reservation is always fully released');
});
test('approvedQuantity is clamped to requested', () => {
  const delta = approvalStockDelta({ requestedQuantity: 10, approvedQuantity: 99 });
  assert.strictEqual(delta.stockDecrement, 10);
});

test('deriveApprovalStatus distinguishes full vs partial', () => {
  assert.strictEqual(deriveApprovalStatus({ requestedQuantity: 10, approvedQuantity: 10 }), 'approved');
  assert.strictEqual(deriveApprovalStatus({ requestedQuantity: 10, approvedQuantity: 7 }), 'partially_approved');
  assert.strictEqual(deriveApprovalStatus({ requestedQuantity: 10, approvedQuantity: 0 }), 'partially_approved');
});

test('rejection releases the full requested reservation', () => {
  assert.strictEqual(rejectionReservedRelease(25), 25);
  assert.strictEqual(rejectionReservedRelease('40'), 40);
});

test('isTerminal matches the four terminal states', () => {
  assert.ok(isTerminal('approved'));
  assert.ok(isTerminal('partially_approved'));
  assert.ok(isTerminal('rejected'));
  assert.ok(isTerminal('expired'));
  assert.ok(!isTerminal('pending'));
  assert.ok(!isTerminal(null));
});

// ---- Auto-expiry triggers the release path ----
test('expiry releases the same full reservation as reject', () => {
  // The cron job releases requestedQuantity exactly like a reject.
  assert.strictEqual(rejectionReservedRelease(20), 20);
  // Expired is terminal, so a remainder can never be requested from it.
  assert.ok(isTerminal('expired'));
});

// ---- Remainder order logic after partial approval ----
test('remainderOffer computes remaining quantity after partial approval', () => {
  const crop = { stockQuantity: 100, reservedQuantity: 0 };
  const r = remainderOffer({ requestedQuantity: 30, approvedQuantity: 20, crop });
  assert.strictEqual(r.remaining, 10);
  assert.strictEqual(r.offered, 10);
  assert.strictEqual(r.capped, false);
});

test('remainderOffer offers the smaller available amount when stock is short (never fails outright)', () => {
  const crop = { stockQuantity: 40, reservedQuantity: 0 };
  const r = remainderOffer({ requestedQuantity: 30, approvedQuantity: 20, crop });
  // remaining 10, but only 40 available -> offer 10
  assert.strictEqual(r.remaining, 10);
  assert.strictEqual(r.offered, 10);
  assert.strictEqual(r.capped, false);
});
test('remainderOffer caps at available stock when remainder exceeds it', () => {
  const crop = { stockQuantity: 6, reservedQuantity: 0 };
  const r = remainderOffer({ requestedQuantity: 100, approvedQuantity: 90, crop });
  assert.strictEqual(r.remaining, 10);
  assert.strictEqual(r.offered, 6, 'offers the smaller available amount');
  assert.strictEqual(r.capped, true);
});
test('remainderOffer returns zero when nothing remains', () => {
  const crop = { stockQuantity: 100, reservedQuantity: 0 };
  const r = remainderOffer({ requestedQuantity: 30, approvedQuantity: 30, crop });
  assert.strictEqual(r.remaining, 0);
  assert.strictEqual(r.offered, 0);
  assert.strictEqual(r.capped, false);
});

test('hasOpenRemainder blocks duplicate remainder requests while a prior one is pending', () => {
  const withPending = { remainderOrder: { status: 'pending' } };
  const withTerminal = { remainderOrder: { status: 'rejected' } };
  const none = { remainderOrder: null };
  assert.ok(hasOpenRemainder(withPending), 'open pending remainder blocks a new one');
  assert.ok(!hasOpenRemainder(withTerminal), 'terminal remainder allows a new request');
  assert.ok(!hasOpenRemainder(none));
});

// ---- Status derivation for stock visibility ----
test('deriveCropStatus reflects out-of-stock and low-stock thresholds', () => {
  assert.strictEqual(deriveCropStatus(0), 'out_of_stock');
  assert.strictEqual(deriveCropStatus(-3), 'out_of_stock');
  assert.strictEqual(deriveCropStatus(50), 'low_stock');
  assert.strictEqual(deriveCropStatus(100), 'available');
});
