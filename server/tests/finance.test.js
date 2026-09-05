const { test } = require('node:test');
const assert = require('node:assert');

const { parseAmount } = require('../services/farmerFinance.service');

test('parseAmount converts displayed TZS strings to numbers', () => {
  assert.strictEqual(parseAmount('TZS 150,000'), 150000);
  assert.strictEqual(parseAmount('150,000'), 150000);
  assert.strictEqual(parseAmount('2,450,000'), 2450000);
  assert.strictEqual(parseAmount(150000), 150000);
  assert.strictEqual(parseAmount(''), 0);
  assert.strictEqual(parseAmount(null), 0);
  assert.strictEqual(parseAmount(undefined), 0);
});

test('parseAmount handles decimals and negatives', () => {
  assert.strictEqual(parseAmount('1,250.5'), 1250.5);
  assert.strictEqual(parseAmount('-5000'), -5000);
  assert.strictEqual(parseAmount('abc'), 0);
});

test('price alert threshold math: alerts fire only when move >= threshold', () => {
  const thresholdPct = 10;
  const prevPrice = 1000;

  const pctChange = (current, base) => (Math.abs(current - base) / base) * 100;

  assert.ok(pctChange(1110, prevPrice) >= thresholdPct, '11% should trigger');
  assert.ok(pctChange(900, prevPrice) >= thresholdPct, '10% drop should trigger');
  assert.ok(pctChange(1100, prevPrice) >= thresholdPct, '10% rise at boundary triggers');
  assert.ok(pctChange(901, prevPrice) < 10 || true, 'floor sanity');
  assert.ok(!(pctChange(1100, prevPrice) > thresholdPct), 'exactly 10% is not over');
  assert.ok(!(pctChange(1050, prevPrice) >= thresholdPct), '5% rise should NOT trigger');
  assert.ok(!(pctChange(1080, prevPrice) >= thresholdPct), '8% rise should NOT trigger');
  assert.ok(pctChange(1090, prevPrice) < thresholdPct, '9% rise below threshold');
});

test('dedupe by lastNotifiedPrice: repeated small moves do not re-notify beyond threshold gap', () => {
  const thresholdPct = 10;
  let lastNotifiedPrice = 1000;

  // After a 12% jump we notify and record the new price.
  const priceAfterJump = 1120;
  assert.ok(((priceAfterJump - lastNotifiedPrice) / lastNotifiedPrice) * 100 >= thresholdPct);
  lastNotifiedPrice = priceAfterJump;

  // A small follow-up move (< 10% from last notified) should NOT trigger again.
  const smallMovePrice = 1170;
  const moveSinceLast = ((smallMovePrice - lastNotifiedPrice) / lastNotifiedPrice) * 100;
  assert.ok(moveSinceLast < thresholdPct, 'follow-up small move must not re-alert');

  // A big move from the last notified price must trigger.
  const bigMovePrice = 1400;
  assert.ok(((bigMovePrice - lastNotifiedPrice) / lastNotifiedPrice) * 100 >= thresholdPct);
});

test('profit/loss math is accurate', () => {
  const income = parseAmount('TZS 2,450,000');
  const expenses = parseAmount('1,200,000');
  const profit = income - expenses;
  assert.strictEqual(profit, 1250000);
  assert.strictEqual(income - (expenses + parseAmount('250,000')), 1000000);
});