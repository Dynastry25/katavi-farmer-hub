const { test } = require('node:test');
const assert = require('node:assert');

const {
  decayWeight,
  priceBand,
  buildProfile,
  normalizeAffinity,
  buildCropPopularity,
  buildServicePopularity,
  recommend,
  rankServices,
  summaryOf,
} = require('../services/recommender.service');

const daysAgo = (days) => new Date(Date.now() - days * 86400000);
const now = new Date();

const cropDoc = (id, category, extra = {}) => ({
  _id: id,
  id,
  name: extra.name || id,
  category,
  animal: extra.animal || '',
  price: extra.price || 1000,
  location: extra.location || 'Mpanda',
  farmer: extra.farmer || 'seller-1',
  rating: extra.rating || 4,
  createdAt: extra.createdAt || daysAgo(1),
});

test('decayWeight halves after one half-life and never exceeds 1', () => {
  const half = decayWeight(daysAgo(45), now, 45);
  assert.ok(Math.abs(half - 0.5) < 0.01, `expected ~0.5, got ${half}`);
  const recent = decayWeight(daysAgo(0), now, 45);
  assert.ok(recent > 0.99);
  const future = decayWeight(new Date(now.getTime() + 86400000), now, 45);
  assert.ok(future <= 1, 'future timestamps are clamped, not boosted');
  assert.ok(decayWeight(daysAgo(90), now, 45) < 0.3);
});

test('priceBand splits low, mid and high prices', () => {
  assert.strictEqual(priceBand(5000), 'low');
  assert.strictEqual(priceBand(20000), 'mid');
  assert.strictEqual(priceBand(100000), 'mid');
  assert.strictEqual(priceBand(100001), 'high');
  assert.strictEqual(priceBand(0), 'unknown');
});

test('buildProfile learns categories, animals and services from real activity', () => {
  const { affinity, signalCount } = buildProfile({
    user: { role: 'farmer', crops: ['mahindi'], district: 'Mpanda' },
    orders: [
      { status: 'completed', createdAt: daysAgo(3), crop: cropDoc('c1', 'cereals', { price: 900 }) },
      { status: 'pending', createdAt: daysAgo(10), crop: cropDoc('c2', 'cereals', { price: 800 }) },
    ],
    favorites: [
      { createdAt: daysAgo(2), crop: cropDoc('c3', 'livestock', { animal: 'mbuzi', price: 120000 }) },
    ],
    transportBookings: [{ status: 'pending', createdAt: daysAgo(5) }],
    inputOrders: [{ status: 'delivered', createdAt: daysAgo(4), items: [{ product: { category: 'seeds' } }] }],
    now,
  });

  assert.ok(signalCount >= 4);
  assert.ok(affinity.categories.cereals > affinity.categories.livestock);
  assert.ok(affinity.animals.mbuzi > 0);
  assert.ok(affinity.inputCategories.seeds > 0);
  assert.ok(affinity.services.transport > 0);
  assert.ok(affinity.services.loans > 0, 'farmer structural need boosts loans');
  assert.ok(affinity.districts.Mpanda > 0);
});

test('recency wins: a recent purchase outweighs an older one of the same size', () => {
  const { affinity } = buildProfile({
    orders: [
      { status: 'completed', createdAt: daysAgo(1), crop: cropDoc('recent', 'vegetables') },
      { status: 'completed', createdAt: daysAgo(200), crop: cropDoc('old', 'cereals') },
    ],
    now,
  });
  assert.ok(affinity.categories.vegetables > affinity.categories.cereals);
});

test('normalizeAffinity maps the strongest signal to 1', () => {
  const strengths = normalizeAffinity({
    categories: { cereals: 10, fruits: 5 },
    animals: {},
    priceBands: {},
    districts: {},
    sellers: {},
    inputCategories: {},
    services: {},
  });
  assert.strictEqual(strengths.categories.cereals, 1);
  assert.strictEqual(strengths.categories.fruits, 0.5);
});

test('buildCropPopularity ranks frequently ordered crops higher', () => {
  const popularity = buildCropPopularity({
    orders: [
      { crop: { _id: 'c1' }, status: 'completed', createdAt: daysAgo(1) },
      { crop: { _id: 'c1' }, status: 'delivered', createdAt: daysAgo(2) },
      { crop: { _id: 'c2' }, status: 'pending', createdAt: daysAgo(1) },
    ],
    favoriteCounts: { c2: 1 },
    now,
  });
  assert.strictEqual(popularity.c1, 1);
  assert.ok(popularity.c2 < popularity.c1);
});

test('buildServicePopularity normalizes usage counts', () => {
  const popularity = buildServicePopularity({ transport: 10, storage: 5, loans: 0 });
  assert.strictEqual(popularity.transport, 1);
  assert.strictEqual(popularity.storage, 0.5);
  assert.strictEqual(popularity.loans, undefined);
});

test('recommend ranks an affinity match above a generic popular crop', () => {
  const profile = buildProfile({
    orders: [
      { status: 'completed', createdAt: daysAgo(1), crop: cropDoc('seed', 'cereals', { price: 500 }) },
    ],
    now,
  });
  const crops = [
    cropDoc('cereal-deal', 'cereals', { price: 900, location: 'Mpanda' }),
    cropDoc('popular-fruit', 'fruits', { price: 150000, location: 'Mpanda' }),
  ];
  const result = recommend({
    crops,
    inputs: [],
    profile,
    affinity: profile.affinity,
    cropPopularity: { 'popular-fruit': 0.8 },
    limits: { crops: 2 },
    now,
  });
  assert.strictEqual(result.personalized, true);
  assert.strictEqual(result.crops[0].id, 'cereal-deal');
  assert.match(result.crops[0].reason, /Unapenda/);
});

test('recommend never suggests the user their own listings', () => {
  const user = { _id: 'me', role: 'farmer', location: 'Mpanda' };
  const result = recommend({
    crops: [
      cropDoc('mine', 'cereals', { farmer: 'me' }),
      cropDoc('theirs', 'cereals', { farmer: 'other' }),
    ],
    inputs: [],
    profile: { signalCount: 0 },
    affinity: {},
    user,
    now,
  });
  assert.deepStrictEqual(result.crops.map((c) => c.id), ['theirs']);
});

test('cold start falls back to marketplace popularity with an honest reason', () => {
  const crops = [
    cropDoc('quiet', 'cereals'),
    cropDoc('hot', 'fruits'),
  ];
  const result = recommend({
    crops,
    inputs: [],
    profile: { signalCount: 0 },
    affinity: {},
    cropPopularity: { hot: 1 },
    limits: { crops: 2 },
    now,
  });
  assert.strictEqual(result.personalized, false);
  assert.strictEqual(result.crops[0].id, 'hot');
  assert.strictEqual(result.crops[0].reason, 'Inapendwa sana sokoni');
});

test('services put learned usage first and explain it', () => {
  const profile = buildProfile({
    transportBookings: [
      { status: 'completed', createdAt: daysAgo(2) },
      { status: 'completed', createdAt: daysAgo(4) },
    ],
    now,
  });
  const services = rankServices({
    strengths: normalizeAffinity(profile.affinity),
    role: 'farmer',
    limit: 4,
  });
  assert.strictEqual(services[0].key, 'transport');
  assert.strictEqual(services[0].reason, 'Unaitumia mara kwa mara');
  assert.ok(services.every((s) => s.route && s.emoji && s.title));
});

test('summary lists the strongest tastes with Swahili labels', () => {
  const summary = summaryOf({
    categories: { livestock: 5, cereals: 2 },
    animals: { mbuzi: 5 },
    inputCategories: { seeds: 3 },
    priceBands: { mid: 4 },
  });
  assert.strictEqual(summary.topCategories[0].label, 'Mifugo');
  assert.strictEqual(summary.topAnimals[0].label, 'Mbuzi');
  assert.strictEqual(summary.topInputCategories[0].label, 'Mbegu');
  assert.strictEqual(summary.priceBand.label, 'Bei ya kati');
});
