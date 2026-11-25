const test = require('node:test');
const assert = require('node:assert/strict');
const { capacityFit, rankCarriers } = require('../services/matching.service');

const carrier = (overrides = {}) => ({
  id: 'c1',
  available: true,
  capacityKg: 1000,
  averageRating: 4,
  fare: 20000,
  ...overrides,
});

test('capacity fit rewards fuller loads and stays neutral without data', () => {
  assert.equal(capacityFit(0, 800), 0.6);
  assert.equal(capacityFit(1000, 0), 0.6);
  assert.ok(capacityFit(1000, 800) > capacityFit(5000, 800));
  assert.equal(capacityFit(1000, 5000), 1);
});

test('rankCarriers drops unavailable and overweight vehicles', () => {
  const matches = rankCarriers([
    carrier({ id: 'ok', capacityKg: 1200 }),
    carrier({ id: 'busy', available: false }),
    carrier({ id: 'small', capacityKg: 500 }),
  ], { weightKg: 800 });
  assert.deepEqual(matches.map((m) => m.id), ['ok']);
});

test('cheaper and better-rated carrier wins the match', () => {
  const matches = rankCarriers([
    carrier({ id: 'great', fare: 20000, averageRating: 5 }),
    carrier({ id: 'weak', fare: 22000, averageRating: 2 }),
  ], { weightKg: 800 });
  assert.equal(matches[0].id, 'great');
  assert.ok(matches[0].matchScore > matches[1].matchScore);
  assert.ok(matches[0].matchScore <= 100);
});

test('tighter capacity breaks ties between equal fare and rating', () => {
  const matches = rankCarriers([
    carrier({ id: 'tight', capacityKg: 900 }),
    carrier({ id: 'huge', capacityKg: 6000 }),
  ], { weightKg: 800 });
  assert.equal(matches[0].id, 'tight');
});

test('limit is clamped and empty input returns no matches', () => {
  const many = Array.from({ length: 15 }, (_, i) => carrier({ id: `c${i}`, fare: 10000 + i * 1000 }));
  assert.equal(rankCarriers(many, { weightKg: 500, limit: 50 }).length, 10);
  assert.equal(rankCarriers(many, { weightKg: 500, limit: 0 }).length, 5);
  assert.deepEqual(rankCarriers([], { weightKg: 500 }), []);
});
