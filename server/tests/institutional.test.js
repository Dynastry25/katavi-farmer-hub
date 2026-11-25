const { test } = require('node:test');
const assert = require('node:assert');
const {
  DAY_MS,
  percentageChange,
  clampDays,
  periodFor,
} = require('../services/institutional.service');

test('percentageChange compares periods without inventing a baseline', () => {
  assert.strictEqual(percentageChange(150, 100), 50);
  assert.strictEqual(percentageChange(50, 100), -50);
  assert.strictEqual(percentageChange(133, 121), 9.9);
  assert.strictEqual(percentageChange(10, 0), null);
  assert.strictEqual(percentageChange(0, 0), 0);
});

test('clampDays keeps the reporting window sane', () => {
  assert.strictEqual(clampDays(undefined), 30);
  assert.strictEqual(clampDays('7'), 7);
  assert.strictEqual(clampDays(0), 30);
  assert.strictEqual(clampDays(-5), 30);
  assert.strictEqual(clampDays('abc'), 30);
  assert.strictEqual(clampDays(9999), 365);
  assert.strictEqual(clampDays(12.6), 13);
});

test('periodFor returns adjacent windows of the requested length', () => {
  const now = new Date('2026-11-25T12:00:00.000Z');
  const { start, end, previousStart, previousEnd } = periodFor(30, now);

  assert.strictEqual(end.getTime(), now.getTime());
  assert.strictEqual(start.getTime(), now.getTime() - 30 * DAY_MS);
  assert.strictEqual(previousEnd.getTime(), start.getTime());
  assert.strictEqual(previousStart.getTime(), start.getTime() - 30 * DAY_MS);
});
