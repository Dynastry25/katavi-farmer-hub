const { test } = require('node:test');
const assert = require('node:assert');
const {
  estimateAmount,
  canTransitionBooking,
  offerRating,
  nextRatingStats,
} = require('../services/farmService.service');

test('estimateAmount prices per acre, hour, day, trip and flat fee', () => {
  assert.strictEqual(estimateAmount({ priceAmount: 45000, priceUnit: 'per_acre' }, { acres: 2.5 }), 112500);
  assert.strictEqual(estimateAmount({ priceAmount: 8000, priceUnit: 'per_hour' }, { hours: 3 }), 24000);
  assert.strictEqual(estimateAmount({ priceAmount: 30000, priceUnit: 'per_day' }, { days: 2 }), 60000);
  assert.strictEqual(estimateAmount({ priceAmount: 12000, priceUnit: 'per_trip' }, { trips: 4 }), 48000);
  assert.strictEqual(estimateAmount({ priceAmount: 50000, priceUnit: 'fixed' }, {}), 50000);
});

test('estimateAmount is zero when the matching quantity is missing or invalid', () => {
  assert.strictEqual(estimateAmount({ priceAmount: 45000, priceUnit: 'per_acre' }, {}), 0);
  assert.strictEqual(estimateAmount({ priceAmount: 45000, priceUnit: 'per_acre' }, { acres: -3 }), 0);
  assert.strictEqual(estimateAmount({ priceAmount: 0, priceUnit: 'fixed' }), 0);
  assert.strictEqual(estimateAmount({ priceAmount: 1000, priceUnit: 'unknown_unit' }, { acres: 1 }), 0);
});

test('booking transitions follow the booking lifecycle', () => {
  assert.strictEqual(canTransitionBooking('requested', 'quoted'), true);
  assert.strictEqual(canTransitionBooking('quoted', 'accepted'), true);
  assert.strictEqual(canTransitionBooking('accepted', 'in_progress'), true);
  assert.strictEqual(canTransitionBooking('in_progress', 'completed'), true);
  assert.strictEqual(canTransitionBooking('completed', 'confirmed'), true);

  assert.strictEqual(canTransitionBooking('requested', 'accepted'), false);
  assert.strictEqual(canTransitionBooking('confirmed', 'cancelled'), false);
  assert.strictEqual(canTransitionBooking('cancelled', 'quoted'), false);
  assert.strictEqual(canTransitionBooking('quoted', 'in_progress'), false);
});

test('offerRating averages stored ratings and stays at zero without reviews', () => {
  assert.strictEqual(offerRating({}), 0);
  assert.strictEqual(offerRating({ ratingSum: 14, ratingCount: 4 }), 3.5);
});

test('nextRatingStats accumulates ratings and clamps values to 1..5', () => {
  assert.deepStrictEqual(
    nextRatingStats({ ratingSum: 10, ratingCount: 3 }, 5),
    { ratingSum: 15, ratingCount: 4, average: 3.75 }
  );
  assert.deepStrictEqual(
    nextRatingStats({ ratingSum: 0, ratingCount: 0 }, 9),
    { ratingSum: 5, ratingCount: 1, average: 5 }
  );
  assert.deepStrictEqual(
    nextRatingStats({ ratingSum: 0, ratingCount: 0 }, -2),
    { ratingSum: 1, ratingCount: 1, average: 1 }
  );
});
