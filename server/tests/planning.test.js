const { test } = require('node:test');
const assert = require('node:assert');
const {
  isSeasonLabel,
  expectedYield,
  supplyGap,
  mergeCropPlanning,
  canTransitionPlan,
} = require('../services/planning.service');

test('expectedYield multiplies acres by the per-acre rate', () => {
  assert.strictEqual(expectedYield({ acres: 3, yieldPerAcreKg: 1200 }), 3600);
  assert.strictEqual(expectedYield({ acres: '2.5', yieldPerAcreKg: '800' }), 2000);
  assert.strictEqual(expectedYield({}), 0);
  assert.strictEqual(isSeasonLabel('2026/27'), true);
  assert.strictEqual(isSeasonLabel('ab'), false);
});

test('supplyGap compares buyer demand with planned output', () => {
  assert.deepStrictEqual(supplyGap(1000, 600), { gapKg: 400, status: 'shortage', fillPct: 60 });
  assert.deepStrictEqual(supplyGap(1000, 1000), { gapKg: 0, status: 'balanced', fillPct: 100 });
  assert.deepStrictEqual(supplyGap(1000, 1500), { gapKg: -500, status: 'surplus', fillPct: 150 });
  assert.deepStrictEqual(supplyGap(0, 0), { gapKg: 0, status: 'balanced', fillPct: 0 });
});

test('mergeCropPlanning joins demand and plans per crop name', () => {
  const crops = mergeCropPlanning({
    demand: [
      { _id: 'Mahindi', quantityKg: 5000, count: 2 },
      { _id: 'maharage', quantityKg: 1000, count: 1 },
    ],
    planned: [
      { _id: 'MAHINDI', expectedYieldKg: 2000, count: 3 },
      { _id: 'Mpunga', expectedYieldKg: 500, count: 1 },
    ],
  });

  const maize = crops.find((crop) => crop.cropName === 'Mahindi');
  assert.strictEqual(maize.demandKg, 5000);
  assert.strictEqual(maize.plannedKg, 2000);
  assert.strictEqual(maize.status, 'shortage');
  assert.strictEqual(maize.farmers, 3);
  assert.strictEqual(crops[0].cropName, 'Mahindi');

  const rice = crops.find((crop) => crop.cropName === 'Mpunga');
  assert.strictEqual(rice.demandKg, 0);
  assert.strictEqual(rice.status, 'surplus');
});

test('season plans follow their status transitions', () => {
  assert.strictEqual(canTransitionPlan('draft', 'active'), true);
  assert.strictEqual(canTransitionPlan('active', 'completed'), true);
  assert.strictEqual(canTransitionPlan('draft', 'completed'), false);
  assert.strictEqual(canTransitionPlan('completed', 'active'), false);
  assert.strictEqual(canTransitionPlan('cancelled', 'active'), false);
});
