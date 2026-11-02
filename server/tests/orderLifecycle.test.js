const { test } = require('node:test');
const assert = require('node:assert');

const Order = require('../models/Order');
const {
  resolveApprovedQuantity,
  canMarkDelivered,
  normalizePaymentMethod,
  orderAmount,
  canPayOrder,
  canDeleteOrder,
  canCancelOrder,
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

test('only the order parties or staff can delete an unpaid order', () => {
  const order = {
    buyer: 'buyer-1',
    farmer: 'farmer-1',
    status: 'pending',
    paymentStatus: 'unpaid',
  };

  assert.strictEqual(
    canDeleteOrder(order, { _id: 'buyer-1', role: 'buyer' }),
    true
  );
  assert.strictEqual(
    canDeleteOrder(order, { _id: 'farmer-1', role: 'farmer' }),
    true
  );
  assert.strictEqual(
    canDeleteOrder(order, { _id: 'staff-1', role: 'support' }),
    true
  );
  assert.strictEqual(
    canDeleteOrder(order, { _id: 'stranger', role: 'buyer' }),
    false
  );
  assert.strictEqual(
    canDeleteOrder(order, { _id: 'stranger', role: 'logistics' }),
    false
  );
});

test('paid or processing orders cannot be deleted', () => {
  for (const paymentStatus of ['paid', 'processing']) {
    assert.strictEqual(
      canDeleteOrder(
        {
          buyer: 'buyer-1',
          farmer: 'farmer-1',
          status: 'pending',
          paymentStatus,
        },
        { _id: 'buyer-1', role: 'buyer' }
      ),
      false,
      paymentStatus
    );
  }
});

test('parties cannot delete an order after it left pending', () => {
  for (const status of ['approved', 'partially_approved', 'delivered', 'completed']) {
    assert.strictEqual(
      canDeleteOrder(
        {
          buyer: 'buyer-1',
          farmer: 'farmer-1',
          status,
          paymentStatus: 'unpaid',
        },
        { _id: 'buyer-1', role: 'buyer' }
      ),
      false,
      status
    );
  }
});

test('buyer and farmer can cancel an order until delivery starts', () => {
  for (const status of ['pending', 'approved', 'partially_approved']) {
    for (const deliveryStatus of ['none', 'requested', 'pending', 'rejected']) {
      for (const id of ['buyer-1', 'farmer-1']) {
        assert.strictEqual(
          canCancelOrder(
            { buyer: 'buyer-1', farmer: 'farmer-1', status, deliveryStatus },
            { _id: id, role: id === 'buyer-1' ? 'buyer' : 'farmer' }
          ),
          true,
          `${status}/${deliveryStatus}/${id}`
        );
      }
    }
  }
});

test('a party cannot cancel once the carrier has the goods', () => {
  for (const deliveryStatus of ['accepted', 'in_transit']) {
    assert.strictEqual(
      canCancelOrder(
        { buyer: 'buyer-1', farmer: 'farmer-1', status: 'approved', deliveryStatus },
        { _id: 'buyer-1', role: 'buyer' }
      ),
      false,
      deliveryStatus
    );
  }
});

test('staff can cancel a shipment already on the road', () => {
  assert.strictEqual(
    canCancelOrder(
      { buyer: 'buyer-1', farmer: 'farmer-1', status: 'approved', deliveryStatus: 'in_transit' },
      { _id: 'staff-1', role: 'support' }
    ),
    true
  );
});

test('terminal orders and strangers cannot be cancelled', () => {
  for (const status of ['delivered', 'completed', 'rejected', 'expired', 'disputed', 'cancelled']) {
    assert.strictEqual(
      canCancelOrder(
        { buyer: 'buyer-1', farmer: 'farmer-1', status, deliveryStatus: 'none' },
        { _id: 'admin-1', role: 'admin' }
      ),
      false,
      status
    );
  }
  assert.strictEqual(
    canCancelOrder(
      { buyer: 'buyer-1', farmer: 'farmer-1', status: 'approved', deliveryStatus: 'none' },
      { _id: 'stranger', role: 'buyer' }
    ),
    false
  );
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
