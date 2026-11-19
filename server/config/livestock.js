// Livestock listings reuse the Crop collection so they flow through the same
// marketplace, order and payment pipeline as crops. These constants keep the
// animal species, product types and units in one place.

const LIVESTOCK_CATEGORIES = ['livestock', 'livestock_products'];

const ANIMALS = [
  'mbuzi',
  'ngombe',
  'nguruwe',
  'kuku',
  'bata',
  'sungura',
  'njiwa',
  'kondoo',
  'samaki',
  'wengine',
];

const PRODUCTS = [
  'nyama',
  'mayai',
  'maziwa',
  'samadi',
  'ngozi',
  'manyoya',
  'asali',
  'wengine',
];

const CROP_UNITS = ['kg', 'gunia', 'debe', 'tani'];
const LIVESTOCK_UNITS = ['kichwa', 'lita', 'tray', 'ndoo', 'kipande'];
const ALL_UNITS = [...CROP_UNITS, ...LIVESTOCK_UNITS];

const isLivestockCategory = (category) =>
  LIVESTOCK_CATEGORIES.includes(category);

// Crops are flagged low_stock under 100 units, but livestock is counted in
// heads/portions: any positive number must stay orderable.
const lowStockThreshold = (category) =>
  isLivestockCategory(category) ? 0 : 100;

const normalizeUnit = (unit, fallback = 'kg') =>
  ALL_UNITS.includes(unit) ? unit : fallback;

const normalizeAnimal = (animal) => {
  const value = String(animal || '').trim().toLowerCase();
  return ANIMALS.includes(value) ? value : '';
};

module.exports = {
  LIVESTOCK_CATEGORIES,
  ANIMALS,
  PRODUCTS,
  CROP_UNITS,
  LIVESTOCK_UNITS,
  ALL_UNITS,
  isLivestockCategory,
  lowStockThreshold,
  normalizeUnit,
  normalizeAnimal,
};
