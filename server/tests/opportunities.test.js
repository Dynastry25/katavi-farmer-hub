const { test } = require('node:test');
const assert = require('node:assert');
const {
  buildListFilter,
  isExpired,
  ageFromDateOfBirth,
  canTransition,
  nextOpportunityStatus,
} = require('../services/opportunity.service');

test('buildListFilter only lists open postings and applies known filters', () => {
  const filter = buildListFilter({
    kind: 'job',
    category: 'harvest_labor',
    district: 'Katavi',
    q: 'mahindi (msimu)',
  });

  assert.strictEqual(filter.status, 'open');
  assert.strictEqual(filter.kind, 'job');
  assert.strictEqual(filter.category, 'harvest_labor');
  assert.strictEqual(filter.district, 'Katavi');
  assert.strictEqual(filter.$or.length, 3);
  assert.ok(filter.$or[0].title instanceof RegExp);
  // Regex metacharacters are escaped, so the search cannot break the query.
  assert.ok(filter.$or[0].title.test('mahindi (msimu)'));
});

test('buildListFilter ignores unknown kinds', () => {
  const filter = buildListFilter({ kind: 'malicious' });
  assert.strictEqual(filter.kind, undefined);
});

test('isExpired compares deadlines against now', () => {
  assert.strictEqual(isExpired(null), false);
  assert.strictEqual(isExpired(new Date(Date.now() - 60 * 1000)), true);
  assert.strictEqual(isExpired(new Date(Date.now() + 60 * 60 * 1000)), false);
});

test('ageFromDateOfBirth handles the birthday boundary', () => {
  const now = new Date('2026-05-10T12:00:00Z');
  assert.strictEqual(ageFromDateOfBirth('2008-05-10', now), 18);
  assert.strictEqual(ageFromDateOfBirth('2008-05-11', now), 17);
  assert.strictEqual(ageFromDateOfBirth('2008-05-09', now), 18);
  assert.strictEqual(ageFromDateOfBirth(null, now), null);
});

test('application transitions move forward only', () => {
  assert.strictEqual(canTransition('pending', 'shortlisted'), true);
  assert.strictEqual(canTransition('pending', 'accepted'), true);
  assert.strictEqual(canTransition('pending', 'withdrawn'), true);
  assert.strictEqual(canTransition('shortlisted', 'completed'), false);
  assert.strictEqual(canTransition('accepted', 'completed'), true);
  assert.strictEqual(canTransition('completed', 'pending'), false);
  assert.strictEqual(canTransition('rejected', 'accepted'), false);
});

test('nextOpportunityStatus fills, reopens and never reopens closed', () => {
  assert.strictEqual(
    nextOpportunityStatus({ status: 'open', positions: 2, acceptedCount: 2 }),
    'filled'
  );
  assert.strictEqual(
    nextOpportunityStatus({ status: 'filled', positions: 2, acceptedCount: 1 }),
    'open'
  );
  assert.strictEqual(
    nextOpportunityStatus({ status: 'closed', positions: 1, acceptedCount: 5 }),
    'closed'
  );
});
