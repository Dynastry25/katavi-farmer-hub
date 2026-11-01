const { test } = require('node:test');
const assert = require('node:assert');

const { OFFER_TAGS, normalizeOfferTag } = require('../config/offerTags');

test('OFFER_TAGS keeps the four reference badge keys', () => {
  assert.deepStrictEqual(OFFER_TAGS, ['free', 'loan', 'price_up', 'new']);
});

test('normalizeOfferTag accepts known badges and trims/lowercases', () => {
  assert.strictEqual(normalizeOfferTag('free'), 'free');
  assert.strictEqual(normalizeOfferTag(' LOAN '), 'loan');
  assert.strictEqual(normalizeOfferTag('Price_Up'), 'price_up');
  assert.strictEqual(normalizeOfferTag('new'), 'new');
});

test('normalizeOfferTag clears empty and unknown badges', () => {
  assert.strictEqual(normalizeOfferTag(''), '');
  assert.strictEqual(normalizeOfferTag('   '), '');
  assert.strictEqual(normalizeOfferTag(null), '');
  assert.strictEqual(normalizeOfferTag(undefined), '');
  assert.strictEqual(normalizeOfferTag('PEMBEJEO'), '');
});
