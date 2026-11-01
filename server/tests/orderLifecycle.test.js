const { test } = require('node:test');
const assert = require('node:assert');

const {
  resolveApprovedQuantity,
  canMarkDelivered,
} = require('../services/order.service');

test('approval defaults to the full requested quantity when omitted', () => {
  assert.strictEqual(
    resolveApprovedQuantity({ requestedQuantity: 40 }),
    40
  );
  assert.strictEqual(
    resolveApprovedQuantity({ requestedQuantity: 40, approvedQuantity: null }),
    40
  );
  assert.strictEqual(
    resolveApprovedQuantity({ requestedQuantity: 40, approvedQuantity: '' }),
    40
  );
});

test('approval accepts a partial quantity and clamps to the request', () => {
  assert.strictEqual(
    resolveApprovedQuantity({ requestedQuantity: 40, approvedQuantity: 15 }),
    15
  );
  assert.strictEqual(
    resolveApprovedQuantity({ requestedQuantity: 40, approvedQuantity: 90 }),
    40
  );
});

test('approval rejects zero, negative and unknown quantities', () => {
  assert.strictEqual(
    resolveApprovedQuantity({ requestedQuantity: 40, approvedQuantity: 0 }),
    0
  );
  assert.strictEqual(
    resolveApprovedQuantity({ requestedQuantity: 40, approvedQuantity: -2 }),
    0
  );
  assert.strictEqual(resolveApprovedQuantity({ requestedQuantity: 0 }), 0);
});

test('only accepted orders can be handed over to the buyer', () => {
  assert.strictEqual(canMarkDelivered('approved'), true);
  assert.strictEqual(canMarkDelivered('partially_approved'), true);
  for (const status of [
    'pending',
    'delivered',
    'completed',
    'rejected',
    'expired',
    'disputed',
    'cancelled',
  ]) {
    assert.strictEqual(canMarkDelivered(status), false, status);
  }
});
