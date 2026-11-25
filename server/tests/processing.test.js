const { test } = require('node:test');
const assert = require('node:assert');
const {
  quoteProcessing,
  canTransitionBooking,
  ACTION_TARGETS,
} = require('../services/processing.service');

test('quoteProcessing prices a lot and enforces the minimum and capacity', () => {
  const offer = { pricePerKg: 120, minQuantityKg: 50, capacityKgPerDay: 2000 };

  assert.deepStrictEqual(quoteProcessing(offer, 500), { fee: 60000, blocker: null });
  assert.match(quoteProcessing(offer, 40).blocker, /Kiwango cha chini/);
  assert.match(quoteProcessing(offer, 2500).blocker, /Uwezo wa siku/);
  assert.match(quoteProcessing(offer, 0).blocker, /kiasi sahihi/);
  assert.match(quoteProcessing({ ...offer, pricePerKg: 0 }, 100).blocker, /bei/);
});

test('processing bookings follow the accept-to-complete flow', () => {
  assert.strictEqual(canTransitionBooking('requested', 'accepted'), true);
  assert.strictEqual(canTransitionBooking('requested', 'cancelled'), true);
  assert.strictEqual(canTransitionBooking('accepted', 'in_progress'), true);
  assert.strictEqual(canTransitionBooking('in_progress', 'completed'), true);
  assert.strictEqual(canTransitionBooking('requested', 'completed'), false);
  assert.strictEqual(canTransitionBooking('completed', 'cancelled'), false);
  assert.strictEqual(ACTION_TARGETS.cancel, 'cancelled');
});
