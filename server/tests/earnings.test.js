const { test } = require('node:test');
const assert = require('node:assert');
const {
  round2,
  orderPayable,
  bookingPayable,
  totalsFor,
  buildMonthlySeries,
} = require('../services/earnings.service');

test('orderPayable mirrors the approved-quantity pricing of crop orders', () => {
  assert.strictEqual(orderPayable({
    requestedQuantity: 10,
    approvedQuantity: 8,
    price: 1200,
    deliveryFee: 5000,
    status: 'approved',
  }), 14600);

  // Pending orders bill the requested quantity; delivery fee is additive.
  assert.strictEqual(orderPayable({
    requestedQuantity: 5,
    approvedQuantity: 0,
    price: 1000,
    status: 'pending',
  }), 5000);

  assert.strictEqual(orderPayable({}), 0);
  assert.strictEqual(orderPayable({ requestedQuantity: '3', price: '500', status: 'pending' }), 1500);
});

test('bookingPayable prefers the agreed amount over the estimate', () => {
  assert.strictEqual(bookingPayable({ totalAmount: 45000, quotedAmount: 40000, estimatedAmount: 30000 }), 45000);
  assert.strictEqual(bookingPayable({ totalAmount: 0, quotedAmount: 40000, estimatedAmount: 30000 }), 40000);
  assert.strictEqual(bookingPayable({ estimatedAmount: 30000 }), 30000);
  assert.strictEqual(bookingPayable({}), 0);
});

test('totalsFor sums paid, pending and counts across modules', () => {
  const totals = totalsFor([
    { paid: 100000, pending: 20000, count: 3 },
    { paid: 50000.555, pending: 0, count: 2 },
    { paid: 'invalid', pending: '1500', count: 1 },
  ]);
  assert.deepStrictEqual(totals, { paid: 150000.56, pending: 21500, count: 6 });
  assert.deepStrictEqual(totalsFor([]), { paid: 0, pending: 0, count: 0 });
});

test('buildMonthlySeries zero-fills quiet months and nets refunds', () => {
  const now = new Date('2026-11-25T10:00:00Z');
  const series = buildMonthlySeries([
    { _id: { month: '2026-09', type: 'payment' }, amount: 50000 },
    { _id: { month: '2026-09', type: 'refund' }, amount: 5000 },
    { _id: { month: '2026-11', type: 'payment' }, amount: 20000 },
    { _id: { month: '2025-01', type: 'payment' }, amount: 999 },
  ], 3, now);

  assert.deepStrictEqual(series.map((row) => row.month), ['2026-09', '2026-10', '2026-11']);
  assert.deepStrictEqual(series[0], { month: '2026-09', payments: 50000, refunds: 5000, net: 45000 });
  assert.deepStrictEqual(series[1], { month: '2026-10', payments: 0, refunds: 0, net: 0 });
  assert.strictEqual(series[2].net, 20000);
  assert.strictEqual(round2(1.234), 1.23);
});
