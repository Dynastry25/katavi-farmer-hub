const { test } = require('node:test');
const assert = require('node:assert');
const {
  seasonOf,
  summarizeSeason,
  activityTotals,
  upcomingHarvests,
  buildSeasonHistory,
} = require('../services/farm.service');

test('seasonOf maps dates to Katavi cropping seasons', () => {
  assert.strictEqual(seasonOf('2025-11-10'), '2025-A');
  assert.strictEqual(seasonOf('2026-02-01'), '2025-A');
  assert.strictEqual(seasonOf('2026-06-15'), '2026-B');
  assert.strictEqual(seasonOf('2026-10-01'), '2026-A');
  assert.strictEqual(seasonOf('not-a-date'), '');
});

test('summarizeSeason adds acres, costs and yield gap', () => {
  const summary = summarizeSeason({
    plantings: [
      { acres: 2, status: 'harvested', estimatedYieldKg: 1200, actualYieldKg: 1000 },
      { acres: 3, status: 'growing', estimatedYieldKg: 1800, actualYieldKg: 0 },
    ],
    activities: [
      { type: 'fertilizer', cost: 80000 },
      { type: 'harvest', cost: 20000 },
      { type: 'land_prep', cost: 0 },
    ],
  });

  assert.strictEqual(summary.plantings, 2);
  assert.strictEqual(summary.harvested, 1);
  assert.strictEqual(summary.acres, 5);
  assert.strictEqual(summary.estimatedYieldKg, 3000);
  assert.strictEqual(summary.actualYieldKg, 1000);
  assert.strictEqual(summary.yieldGapKg, -2000);
  assert.strictEqual(summary.totalCost, 100000);
  assert.strictEqual(summary.costPerAcre, 20000);
});

test('activityTotals groups production costs by activity type', () => {
  const totals = activityTotals([
    { type: 'fertilizer', cost: 5000 },
    { type: 'fertilizer', cost: 2500 },
    { type: 'pesticide', cost: 1000 },
  ]);

  assert.strictEqual(totals.totalCost, 8500);
  assert.deepStrictEqual(totals.byType[0], { type: 'fertilizer', count: 2, cost: 7500 });
});

test('upcomingHarvests only lists open plantings inside the window', () => {
  const from = new Date('2026-05-01T00:00:00Z');
  const reminders = upcomingHarvests([
    { _id: 'a', cropName: 'Mahindi', status: 'growing', expectedHarvestDate: '2026-05-10T00:00:00Z' },
    { _id: 'b', cropName: 'Mpunga', status: 'harvested', expectedHarvestDate: '2026-05-05T00:00:00Z' },
    { _id: 'c', cropName: 'Maharage', status: 'growing', expectedHarvestDate: '2026-06-30T00:00:00Z' },
    { _id: 'd', cropName: 'Alizeti', status: 'planted', expectedHarvestDate: null },
  ], { days: 14, from });

  assert.strictEqual(reminders.length, 1);
  assert.strictEqual(reminders[0].cropName, 'Mahindi');
  assert.strictEqual(reminders[0].daysLeft, 9);
});

test('buildSeasonHistory rolls plantings and activities into seasons', () => {
  const history = buildSeasonHistory({
    plantings: [
      { _id: 'p1', cropName: 'Mahindi', season: '2025-A', acres: 2, plantingDate: '2025-11-01', status: 'harvested', actualYieldKg: 900, estimatedYieldKg: 1000 },
      { _id: 'p2', cropName: 'Mpunga', season: '2026-B', acres: 1, plantingDate: '2026-05-01', status: 'growing' },
    ],
    activities: [
      { planting: 'p1', type: 'fertilizer', cost: 30000 },
      { planting: null, date: '2025-12-01', type: 'weeding', cost: 10000 },
      { planting: 'p2', type: 'planting', cost: 5000 },
    ],
  });

  assert.strictEqual(history.length, 2);
  assert.strictEqual(history[0].season, '2026-B');
  assert.strictEqual(history[0].totalCost, 5000);
  assert.strictEqual(history[1].season, '2025-A');
  assert.strictEqual(history[1].totalCost, 40000);
  assert.strictEqual(history[1].yieldGapKg, -100);
});
