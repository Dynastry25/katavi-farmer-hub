const { test } = require('node:test');
const assert = require('node:assert');

const {
  INPUT_STATUSES,
  isInputStatus,
  canTransitionInputOrder,
  inputPaymentMethod,
} = require('../services/inputOrder.service');

test('input orders move forward one step at a time', () => {
  assert.strictEqual(canTransitionInputOrder('pending', 'confirmed'), true);
  assert.strictEqual(canTransitionInputOrder('confirmed', 'shipped'), true);
  assert.strictEqual(canTransitionInputOrder('shipped', 'delivered'), true);
});

test('input orders can be cancelled before shipment only', () => {
  assert.strictEqual(canTransitionInputOrder('pending', 'cancelled'), true);
  assert.strictEqual(canTransitionInputOrder('confirmed', 'cancelled'), true);
  assert.strictEqual(canTransitionInputOrder('shipped', 'cancelled'), false);
  assert.strictEqual(canTransitionInputOrder('delivered', 'cancelled'), false);
});

test('input orders cannot skip steps or move backwards', () => {
  assert.strictEqual(canTransitionInputOrder('pending', 'shipped'), false);
  assert.strictEqual(canTransitionInputOrder('pending', 'delivered'), false);
  assert.strictEqual(canTransitionInputOrder('confirmed', 'delivered'), false);
  assert.strictEqual(canTransitionInputOrder('delivered', 'shipped'), false);
  assert.strictEqual(canTransitionInputOrder('cancelled', 'pending'), false);
  assert.strictEqual(canTransitionInputOrder('pending', 'pending'), false);
});

test('only known input order statuses are accepted', () => {
  for (const status of INPUT_STATUSES) {
    assert.strictEqual(isInputStatus(status), true, status);
  }
  assert.strictEqual(isInputStatus('approved'), false);
  assert.strictEqual(isInputStatus(''), false);
});

test('input payment method falls back to the provider that was used', () => {
  assert.strictEqual(inputPaymentMethod({ paymentMethod: 'bank' }), 'bank');
  assert.strictEqual(inputPaymentMethod({ paymentMethod: 'cod' }), 'cod');
  assert.strictEqual(inputPaymentMethod({ paymentMethod: 'mm' }), 'mm');
  assert.strictEqual(inputPaymentMethod({ paymentProvider: 'M-Pesa' }), 'mm');
  assert.strictEqual(inputPaymentMethod({}), 'cod');
});
