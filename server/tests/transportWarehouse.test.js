const { test } = require('node:test');
const assert = require('node:assert');
const {
  transportFare,
  exceedsCapacity,
  makeTrackingCode,
  roundFee,
} = require('../services/transport.service');
const { freeSpaceBags, storageFee } = require('../services/warehouse.service');

test('transportFare uses the provider rate when set, otherwise the rate card', () => {
  const card = { base: 15000, perKm: 220, perKg: 2 };

  const platform = transportFare({ rate: card, distanceKm: 40, weightKg: 500 });
  assert.strictEqual(platform.perKm, 220);
  assert.strictEqual(platform.totalAmount, roundFee(15000 + 220 * 40 + 2 * 500));

  const own = transportFare({ rate: card, providerRatePerKm: 300, distanceKm: 10, weightKg: 0 });
  assert.strictEqual(own.perKm, 300);
  assert.strictEqual(own.totalAmount, roundFee(15000 + 3000));
});

test('transportFare ignores negative distance and weight', () => {
  const { totalAmount } = transportFare({
    rate: { base: 10000, perKm: 100, perKg: 5 },
    distanceKm: -20,
    weightKg: -100,
  });
  assert.strictEqual(totalAmount, 10000);
});

test('exceedsCapacity only fails when a limit is declared and exceeded', () => {
  assert.strictEqual(exceedsCapacity({ capacityKg: 0, weightKg: 5000 }), false);
  assert.strictEqual(exceedsCapacity({ capacityKg: 1000, weightKg: 1000 }), false);
  assert.strictEqual(exceedsCapacity({ capacityKg: 1000, weightKg: 1001 }), true);
});

test('tracking codes are prefixed and unique enough for display', () => {
  const a = makeTrackingCode();
  const b = makeTrackingCode();
  assert.match(a, /^TPK-[A-Z0-9]+$/);
  assert.notStrictEqual(a, b);
});

test('freeSpaceBags treats zero capacity as unlimited and never goes negative', () => {
  assert.strictEqual(freeSpaceBags({ capacityBags: 0 }, 50), Infinity);
  assert.strictEqual(freeSpaceBags({ capacityBags: 100 }, 30), 70);
  assert.strictEqual(freeSpaceBags({ capacityBags: 100 }, 150), 0);
});

test('storageFee prefers the daily price and falls back to months', () => {
  const both = storageFee(
    { feePerBagPerDay: 200, feePerBagPerMonth: 4000 },
    { bags: 10, days: 5, months: 2 }
  );
  assert.deepStrictEqual(both, { totalFee: 10000, days: 5, months: 0 });

  const monthly = storageFee(
    { feePerBagPerDay: 0, feePerBagPerMonth: 4000 },
    { bags: 3, days: 0, months: 0 }
  );
  assert.deepStrictEqual(monthly, { totalFee: 12000, days: 0, months: 1 });

  assert.strictEqual(storageFee({ feePerBagPerDay: 0, feePerBagPerMonth: 0 }, { bags: 3 }), null);
});
