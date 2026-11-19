const { test } = require('node:test');
const assert = require('node:assert');

const {
  LIVESTOCK_CATEGORIES,
  ANIMALS,
  PRODUCTS,
  ALL_UNITS,
  isLivestockCategory,
  lowStockThreshold,
  normalizeUnit,
  normalizeAnimal,
} = require('../config/livestock');

test('livestock categories are recognised and crop categories are not', () => {
  assert.ok(LIVESTOCK_CATEGORIES.includes('livestock'));
  assert.ok(LIVESTOCK_CATEGORIES.includes('livestock_products'));
  assert.strictEqual(isLivestockCategory('livestock'), true);
  assert.strictEqual(isLivestockCategory('livestock_products'), true);
  assert.strictEqual(isLivestockCategory('cereals'), false);
  assert.strictEqual(isLivestockCategory(undefined), false);
});

test('animal catalog covers the requested species', () => {
  for (const animal of ['mbuzi', 'ngombe', 'nguruwe', 'kuku', 'bata', 'sungura', 'njiwa', 'kondoo', 'samaki']) {
    assert.ok(ANIMALS.includes(animal), `${animal} should be listed`);
  }
  assert.ok(PRODUCTS.includes('nyama'));
  assert.ok(PRODUCTS.includes('mayai'));
  assert.ok(PRODUCTS.includes('maziwa'));
});

test('livestock units extend the crop units', () => {
  for (const unit of ['kg', 'gunia', 'debe', 'tani', 'kichwa', 'lita', 'tray', 'ndoo', 'kipande']) {
    assert.ok(ALL_UNITS.includes(unit), `${unit} should be accepted`);
  }
});

test('normalizeUnit keeps known units and falls back for unknown ones', () => {
  assert.strictEqual(normalizeUnit('kichwa'), 'kichwa');
  assert.strictEqual(normalizeUnit('tray'), 'tray');
  assert.strictEqual(normalizeUnit('kg'), 'kg');
  assert.strictEqual(normalizeUnit('sack'), 'kg');
  assert.strictEqual(normalizeUnit(undefined, 'kichwa'), 'kichwa');
});

test('livestock has no low-stock threshold so small herds stay sellable', () => {
  assert.strictEqual(lowStockThreshold('livestock'), 0);
  assert.strictEqual(lowStockThreshold('livestock_products'), 0);
  assert.strictEqual(lowStockThreshold('cereals'), 100);
  assert.strictEqual(lowStockThreshold(undefined), 100);
});

test('normalizeAnimal is case-insensitive and rejects unknown species', () => {
  assert.strictEqual(normalizeAnimal('Mbuzi'), 'mbuzi');
  assert.strictEqual(normalizeAnimal('  KUKU '), 'kuku');
  assert.strictEqual(normalizeAnimal('dinosaur'), '');
  assert.strictEqual(normalizeAnimal(null), '');
});
