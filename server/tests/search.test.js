const test = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeQuery,
  isSearchable,
  buildPattern,
  scoreMatch,
  rankResults,
  parseTypes,
} = require('../services/search.service');

test('queries are trimmed, capped and require two characters', () => {
  assert.equal(normalizeQuery('  mahindi  '), 'mahindi');
  assert.equal(isSearchable('m'), false);
  assert.equal(isSearchable(' m '), false);
  assert.equal(isSearchable('ma'), true);
  assert.equal(normalizeQuery('x'.repeat(200)).length, 60);
});

test('regex patterns escape user input', () => {
  const pattern = buildPattern('bei (TZS) 5%');
  assert.equal(pattern.test('bei (TZS) 5%'), true);
  assert.equal(pattern.test('bei TZS 5'), false);
});

test('exact and prefix matches outrank body hits', () => {
  assert.equal(scoreMatch('mahindi', 'Mahindi'), 4);
  assert.equal(scoreMatch('mahi', 'Mahindi ya Katavi'), 3);
  assert.equal(scoreMatch('katavi', 'Mahindi ya Katavi'), 2);
  assert.equal(scoreMatch('hind', 'Mahindi'), 1);
  assert.equal(scoreMatch('mpunga', 'Mahindi'), 0);
});

test('ranking filters misses and honors the limit', () => {
  const items = [
    { name: 'Mahindi ya Katavi' },
    { name: 'Mahindi' },
    { name: 'Mpunga' },
    { name: 'Bei ya mahindi sokoni' },
  ];
  const ranked = rankResults(items, 'mahindi', { limit: 2, getText: (row) => row.name });
  assert.deepEqual(ranked.map((row) => row.name), ['Mahindi', 'Mahindi ya Katavi']);
  assert.ok(ranked.every((row) => row._score > 0));
});

test('type filters fall back to every group when unknown', () => {
  const allowed = ['products', 'training'];
  assert.deepEqual(parseTypes('training', allowed), ['training']);
  assert.deepEqual(parseTypes('money', allowed), allowed);
  assert.deepEqual(parseTypes('products,nope', allowed), ['products']);
});
