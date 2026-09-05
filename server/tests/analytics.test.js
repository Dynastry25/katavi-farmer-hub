const { test } = require('node:test');
const assert = require('node:assert');

const { movingAverage } = require('../services/analytics.service');

test('movingAverage produces correct 3-point windows', () => {
  assert.deepStrictEqual(movingAverage([1, 2, 3, 4, 5], 3), [1, 1.5, 2, 3, 4]);
});

test('movingAverage window limited to series length', () => {
  assert.deepStrictEqual(movingAverage([4, 6], 3), [4, 5]);
});

test('movingAverage handles empty input', () => {
  assert.deepStrictEqual(movingAverage([], 3), []);
  assert.deepStrictEqual(movingAverage(null, 3), []);
});

test('movingAverage gives stable forecast-tail used by admin forecast', () => {
  const series = [10, 12, 11, 13, 15, 14, 16, 17];
  const ma = movingAverage(series, 3);
  const last = ma[ma.length - 1];
  // (14+16+17)/3 = 15.667 -> rounds to 16 in the service
  assert.strictEqual(Math.round(last), 16);
});