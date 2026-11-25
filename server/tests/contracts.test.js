const { test } = require('node:test');
const assert = require('node:assert');
const {
  buildListFilter,
  isExpired,
  remainingQuantity,
  contractProgress,
  deriveContractStatus,
  acceptedQuantity,
  qualitySummary,
} = require('../services/contract.service');

test('buildListFilter defaults to open contracts and matches crop names exactly', () => {
  const filter = buildListFilter({ cropName: 'Mahindi (msimu)', district: 'Katavi', q: 'tani' });

  assert.strictEqual(filter.status, 'open');
  assert.ok(filter.cropName instanceof RegExp);
  assert.ok(filter.cropName.test('mahindi (msimu)'));
  assert.strictEqual(filter.cropName.test('Mahindi ya msimu'), false);
  assert.strictEqual(filter.district, 'Katavi');
  assert.ok(filter.$or[0].title instanceof RegExp);
});

test('isExpired only flags deadlines in the past', () => {
  assert.strictEqual(isExpired(undefined), false);
  assert.strictEqual(isExpired('not-a-date'), false);
  assert.strictEqual(isExpired(new Date(Date.now() - 1000)), true);
  assert.strictEqual(isExpired(new Date(Date.now() + 60000)), false);
});

test('remainingQuantity never goes negative', () => {
  assert.strictEqual(remainingQuantity({ quantityKg: 1000, committedKg: 250 }), 750);
  assert.strictEqual(remainingQuantity({ quantityKg: 1000, committedKg: 1200 }), 0);
});

test('contractProgress computes percentages and contract value', () => {
  const progress = contractProgress({
    quantityKg: 1000,
    committedKg: 400,
    deliveredKg: 250,
    pricePerKg: 800,
  });

  assert.strictEqual(progress.remainingKg, 600);
  assert.strictEqual(progress.committedPct, 40);
  assert.strictEqual(progress.deliveredPct, 25);
  assert.strictEqual(progress.totalValue, 800000);
});

test('deriveContractStatus follows commitments and deliveries', () => {
  assert.strictEqual(
    deriveContractStatus({ status: 'open', quantityKg: 1000, committedKg: 0, deliveredKg: 0 }),
    'open'
  );
  assert.strictEqual(
    deriveContractStatus({ status: 'open', quantityKg: 1000, committedKg: 300, deliveredKg: 0 }),
    'contracted'
  );
  assert.strictEqual(
    deriveContractStatus({ status: 'contracted', quantityKg: 1000, committedKg: 300, deliveredKg: 1000 }),
    'fulfilled'
  );
  assert.strictEqual(
    deriveContractStatus({ status: 'cancelled', quantityKg: 1000, committedKg: 300, deliveredKg: 1000 }),
    'cancelled'
  );
});

test('acceptedQuantity clamps rejections to what was delivered', () => {
  assert.strictEqual(acceptedQuantity({ quantityKg: 500, rejectedKg: 50 }), 450);
  assert.strictEqual(acceptedQuantity({ quantityKg: 500, rejectedKg: 900 }), 0);
  assert.strictEqual(acceptedQuantity({ quantityKg: 500, rejectedKg: -10 }), 500);
});

test('qualitySummary weights moisture by accepted weight and mixes grades', () => {
  const summary = qualitySummary([
    { status: 'accepted', acceptedKg: 100, rejectedKg: 10, moisturePct: 12, grade: 'A' },
    { status: 'accepted', acceptedKg: 300, rejectedKg: 0, moisturePct: 14, grade: 'B' },
    { status: 'rejected', acceptedKg: 0, rejectedKg: 200, moisturePct: 20, grade: 'mixed' },
    { status: 'pending', acceptedKg: 0, rejectedKg: 0, moisturePct: 10, grade: 'A' },
  ]);

  assert.strictEqual(summary.acceptedKg, 400);
  assert.strictEqual(summary.rejectedKg, 10);
  assert.strictEqual(summary.acceptancePct, 97.56);
  assert.strictEqual(summary.avgMoisturePct, 13.5);
  assert.deepStrictEqual(summary.gradeBreakdownKg, { A: 100, B: 300 });
});
