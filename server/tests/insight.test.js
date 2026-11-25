const { test } = require('node:test');
const assert = require('node:assert');
const {
  dayKey,
  priceTrend,
  buildRecommendations,
  composeSummary,
  marketAdvice,
} = require('../services/insight.service');

test('priceTrend reports direction only past a 2% move', () => {
  const up = priceTrend([100, 105, 120]);
  assert.strictEqual(up.latest, 120);
  assert.strictEqual(up.average, 108);
  assert.strictEqual(up.changePct, 20);
  assert.strictEqual(up.direction, 'up');

  const flat = priceTrend([100, 101]);
  assert.strictEqual(flat.direction, 'flat');

  const down = priceTrend([500, 450]);
  assert.strictEqual(down.direction, 'down');

  assert.strictEqual(priceTrend([]), null);
  assert.strictEqual(priceTrend(['abc', 0, -4]), null);
});

test('buildRecommendations prioritises the missing basics', () => {
  const empty = buildRecommendations({});
  assert.deepStrictEqual(empty.map((item) => item.code), ['register_farm', 'publish_listing']);

  const busy = buildRecommendations({
    farms: { count: 1, acres: 3 },
    listings: { active: 2 },
    orders: { completed: 4, active: 1 },
    loans: { pending: 1 },
    trainingsCompleted: 0,
    expenses90d: 12000,
    weather: { resolved: true, rainMm: 10 },
  });
  const codes = busy.map((item) => item.code);
  assert.strictEqual(codes.includes('register_farm'), false);
  assert.strictEqual(codes.includes('loan_pending'), true);
  assert.strictEqual(codes.includes('rain_low'), true);
  assert.strictEqual(codes.includes('training'), true);
});

test('composeSummary reads back the snapshot in plain Swahili', () => {
  const text = composeSummary({
    farms: { count: 2, acres: 5 },
    listings: { active: 1, crops: ['Mahindi'] },
    orders: { completed: 3, active: 1 },
  }, [{ title: 'Tangaza mazao yako' }]);

  assert.match(text, /shamba 2/);
  assert.match(text, /Matangazo 1|matangazo 1/);
  assert.match(text, /Mahindi/);
  assert.match(text, /Kipaumbele/);
});

test('marketAdvice changes with trend and seller competition', () => {
  assert.match(marketAdvice(null), /Hakuna bei/);
  assert.match(
    marketAdvice({ direction: 'up' }, { listings: 2 }),
    /kuongeza kiasi/,
  );
  assert.match(marketAdvice({ direction: 'down' }, { listings: 2 }), /Bei zinashuka/);
  assert.match(marketAdvice({ direction: 'flat' }, { listings: 12 }), /wauzaji ni wengi/);
  assert.match(marketAdvice({ direction: 'flat' }, { listings: 1 }), /Bei ziko tulivu/);
});

test('dayKey uses the UTC date for daily cache keys', () => {
  assert.strictEqual(dayKey(new Date('2026-11-25T21:00:00.000Z')), '2026-11-25');
});
