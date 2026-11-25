const { test } = require('node:test');
const assert = require('node:assert');
const {
  makeReceiptNumber,
  balanceFor,
  validateMovement,
} = require('../services/warehouseStock.service');

test('balanceFor subtracts withdrawals and losses from the intake', () => {
  const balance = balanceFor([
    { type: 'in', bags: 100 },
    { type: 'in', bags: 50.5 },
    { type: 'out', bags: 30 },
    { type: 'loss', bags: 0.5 },
    { type: 'unknown', bags: 999 },
  ]);
  assert.deepStrictEqual(balance, { bagsIn: 150.5, bagsOut: 30, bagsLost: 0.5, balance: 120 });
  assert.deepStrictEqual(balanceFor([]), { bagsIn: 0, bagsOut: 0, bagsLost: 0, balance: 0 });
});

test('validateMovement refuses withdrawals beyond the stored balance', () => {
  assert.strictEqual(validateMovement({ type: 'in', bags: 100, balance: 0 }), null);
  assert.strictEqual(validateMovement({ type: 'out', bags: 40, balance: 100 }), null);
  assert.match(validateMovement({ type: 'out', bags: 101, balance: 100 }), /100/);
  assert.match(validateMovement({ type: 'loss', bags: 0, balance: 100 }), /idadi sahihi/);
  assert.match(validateMovement({ type: 'move', bags: 5, balance: 100 }), /Aina ya harakati/);
});

test('receipt numbers carry the direction prefix and month', () => {
  const rand = () => 0;
  assert.strictEqual(
    makeReceiptNumber({ type: 'in', date: new Date('2026-11-05T00:00:00Z'), rand }),
    'GR-2611-AAAAAA',
  );
  assert.strictEqual(
    makeReceiptNumber({ type: 'out', date: new Date('2026-01-31T00:00:00Z'), rand }),
    'GD-2601-AAAAAA',
  );
  assert.strictEqual(
    makeReceiptNumber({ type: 'loss', date: new Date('2026-12-01T00:00:00Z'), rand }),
    'HP-2612-AAAAAA',
  );
});
