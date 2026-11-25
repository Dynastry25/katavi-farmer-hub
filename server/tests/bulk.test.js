const { test } = require('node:test');
const assert = require('node:assert');
const {
  remainingQuantity,
  progressPct,
  effectiveBulkStatus,
  commitBlocker,
} = require('../services/bulk.service');

test('remainingQuantity and progressPct follow the committed total', () => {
  assert.strictEqual(remainingQuantity({ quantityKg: 1000, committedKg: 250.5 }), 749.5);
  assert.strictEqual(remainingQuantity({ quantityKg: 1000, committedKg: 1200 }), 0);
  assert.strictEqual(progressPct({ quantityKg: 1000, committedKg: 250 }), 25);
  assert.strictEqual(progressPct({ quantityKg: 1000, committedKg: 2000 }), 100);
  assert.strictEqual(progressPct({ quantityKg: 0, committedKg: 5 }), 0);
});

test('open requests past their deadline read as expired', () => {
  const now = new Date('2026-11-25T12:00:00Z');
  assert.strictEqual(effectiveBulkStatus({ status: 'open', deadline: '2026-12-01' }, now), 'open');
  assert.strictEqual(effectiveBulkStatus({ status: 'open', deadline: '2026-11-01' }, now), 'expired');
  assert.strictEqual(effectiveBulkStatus({ status: 'fulfilled', deadline: '2026-11-01' }, now), 'fulfilled');
  assert.strictEqual(effectiveBulkStatus({ status: 'open', deadline: 'not-a-date' }, now), 'open');
});

test('commitBlocker explains why a pledge cannot be accepted', () => {
  const now = new Date('2026-11-25T12:00:00Z');
  const open = { status: 'open', deadline: '2026-12-01', quantityKg: 1000, committedKg: 800 };

  assert.strictEqual(commitBlocker(open, 200, now), null);
  assert.match(commitBlocker(open, 201, now), /200/);
  assert.match(commitBlocker(open, 0, now), /kiasi sahihi/);
  assert.match(commitBlocker({ ...open, deadline: '2026-11-01' }, 50, now), /umekwisha/);
  assert.match(commitBlocker({ ...open, status: 'fulfilled' }, 50, now), /hakipokei|halipokei/);
  assert.match(commitBlocker({ ...open, committedKg: 1000 }, 10, now), /limekamilika/);
});
