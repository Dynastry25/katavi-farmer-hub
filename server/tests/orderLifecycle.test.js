const { test } = require('node:test');
const assert = require('node:assert');

const Order = require('../models/Order');
const {
  resolveApprovedQuantity,
  canMarkDelivered,
  normalizePaymentMethod,
  orderAmount,
  canPayOrder,
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

test('order amount charges requested quantity until approval', () => {
  assert.strictEqual(
    orderAmount({ status: 'pending', requestedQuantity: 40, price: 3000, deliveryFee: 12000 }),
    132000
  );
  assert.strictEqual(
    orderAmount({ status: 'pending', requestedQuantity: 40, price: '3000' }),
    120000
  );
});

test('order amount charges the approved quantity after a partial approval', () => {
  assert.strictEqual(
    orderAmount({
      status: 'partially_approved',
      requestedQuantity: 40,
      approvedQuantity: 15,
      price: 3000,
      deliveryFee: 5000,
    }),
    50000
  );
  assert.strictEqual(
    orderAmount({ status: 'completed', requestedQuantity: 0, price: 3000, deliveryFee: -500 }),
    0
  );
});

test('only live, unpaid orders can be paid', () => {
  assert.strictEqual(canPayOrder({ status: 'pending', paymentStatus: 'unpaid' }), true);
  assert.strictEqual(canPayOrder({ status: 'approved', paymentStatus: 'failed' }), true);
  assert.strictEqual(canPayOrder({ status: 'pending', paymentStatus: 'processing' }), false);
  assert.strictEqual(canPayOrder({ status: 'approved', paymentStatus: 'paid' }), false);
  for (const status of ['delivered', 'completed', 'rejected', 'expired', 'disputed', 'cancelled']) {
    assert.strictEqual(canPayOrder({ status, paymentStatus: 'unpaid' }), false, status);
  }
});

test('payment methods are normalised to the supported set', () => {
  assert.strictEqual(normalizePaymentMethod('mm'), 'mm');
  assert.strictEqual(normalizePaymentMethod('bank'), 'bank');
  assert.strictEqual(normalizePaymentMethod('cod'), 'cod');
  assert.strictEqual(normalizePaymentMethod('cash'), 'cod');
  assert.strictEqual(normalizePaymentMethod(undefined), 'cod');
});

test('Order documents expose the total amount as a virtual', () => {
  const order = new Order({
    cropName: 'Maharage',
    quantity: '40 kg',
    price: '3000',
    requestedQuantity: 40,
    expiresAt: new Date(),
    deliveryFee: 12000,
  });
  assert.strictEqual(order.totalAmount, 132000);
  assert.strictEqual(order.toJSON().totalAmount, 132000);
  assert.strictEqual(order.paymentStatus, 'unpaid');
  assert.strictEqual(order.paymentMethod, 'cod');
});
