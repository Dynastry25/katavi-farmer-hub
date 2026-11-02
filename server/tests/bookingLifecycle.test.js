const { test } = require('node:test');
const assert = require('node:assert');

const { canTransitionBooking: canMoveTransport } = require('../routes/transport');
const { canTransitionBooking: canMoveStorage } = require('../routes/warehouses');

test('a transport request is accepted before the trip starts', () => {
  assert.strictEqual(canMoveTransport('pending', 'accepted'), true);
  assert.strictEqual(canMoveTransport('pending', 'in_transit'), false);
  assert.strictEqual(canMoveTransport('pending', 'completed'), false);
  assert.strictEqual(canMoveTransport('accepted', 'in_transit'), true);
  assert.strictEqual(canMoveTransport('accepted', 'completed'), false);
  assert.strictEqual(canMoveTransport('in_transit', 'completed'), true);
});

test('a transport request is cancelled only before the trip starts', () => {
  assert.strictEqual(canMoveTransport('pending', 'cancelled'), true);
  assert.strictEqual(canMoveTransport('accepted', 'cancelled'), true);
  assert.strictEqual(canMoveTransport('in_transit', 'cancelled'), false);
  assert.strictEqual(canMoveTransport('completed', 'cancelled'), false);
  assert.strictEqual(canMoveTransport('cancelled', 'accepted'), false);
});

test('completed and cancelled transport requests are final', () => {
  for (const to of ['pending', 'accepted', 'in_transit', 'completed', 'cancelled']) {
    assert.strictEqual(canMoveTransport('completed', to), false);
    assert.strictEqual(canMoveTransport('cancelled', to), false);
  }
});

test('a storage request starts active and is cancelled only before storage', () => {
  assert.strictEqual(canMoveStorage('pending', 'active'), true);
  assert.strictEqual(canMoveStorage('pending', 'cancelled'), true);
  assert.strictEqual(canMoveStorage('pending', 'completed'), false);
  assert.strictEqual(canMoveStorage('active', 'completed'), true);
  assert.strictEqual(canMoveStorage('active', 'cancelled'), false);
});

test('completed storage is final and repeated moves are rejected', () => {
  assert.strictEqual(canMoveStorage('completed', 'active'), false);
  assert.strictEqual(canMoveStorage('completed', 'cancelled'), false);
  assert.strictEqual(canMoveStorage('cancelled', 'active'), false);
  assert.strictEqual(canMoveStorage('active', 'active'), false);
  assert.strictEqual(canMoveTransport('unknown', 'accepted'), false);
  assert.strictEqual(canMoveStorage('unknown', 'active'), false);
});
