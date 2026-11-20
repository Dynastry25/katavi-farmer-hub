// Lightweight learning recommender. It learns a taste profile from the user's
// real activity (orders, favourites, input orders, transport/storage bookings,
// loan applications and declared farm crops), blends it with marketplace
// popularity and produces ranked crops, inputs and services with a reason.
// No DB access here: the route loads the signals, these functions stay pure
// and unit-testable.

const DAY_MS = 24 * 60 * 60 * 1000;
const HALF_LIFE_DAYS = 45;

// How strongly each order state counts as a purchase signal.
const ORDER_WEIGHTS = {
  completed: 5,
  delivered: 5,
  approved: 4,
  partially_approved: 3,
  pending: 1.5,
  disputed: 2,
  expired: -0.5,
  rejected: -0.5,
  cancelled: -0.5,
};

const INPUT_ORDER_WEIGHTS = {
  delivered: 5,
  shipped: 4,
  confirmed: 3,
  pending: 1.5,
  cancelled: -0.5,
  expired: -0.5,
};

const FAVORITE_WEIGHT = 3;
const SERVICE_WEIGHT = 2.5;

const CATEGORY_LABELS = {
  cereals: 'Nafaka',
  legumes: 'Kunde',
  vegetables: 'Mboga',
  fruits: 'Matunda',
  tubers: 'Mizizi',
  oilseeds: 'Mbegu za mafuta',
  livestock: 'Mifugo',
  livestock_products: 'Mazao ya mifugo',
};

const ANIMAL_LABELS = {
  mbuzi: 'Mbuzi',
  ngombe: 'Ng\'ombe',
  nguruwe: 'Nguruwe',
  kuku: 'Kuku',
  bata: 'Bata',
  sungura: 'Sungura',
  njiwa: 'Njiwa',
  kondoo: 'Kondoo',
  samaki: 'Samaki',
  wengine: 'Wanyama wengine',
};

const INPUT_CATEGORY_LABELS = {
  seeds: 'Mbegu',
  fertilizers: 'Mbolea',
  pesticides: 'Dawa',
  tools: 'Zana',
  irrigation: 'Umwagiliaji',
  other: 'Nyingine',
};

// Services the platform offers; `route` is the Flutter path to open.
const SERVICE_CATALOG = [
  { key: 'transport', title: 'Usafiri', emoji: '🚚', route: '/transport', roles: ['farmer', 'buyer', 'seller'] },
  { key: 'storage', title: 'Ghala', emoji: '🏠', route: '/transport?tab=wh', roles: ['farmer', 'buyer', 'seller'] },
  { key: 'loans', title: 'Mikopo', emoji: '💰', route: '/farmer/loans', roles: ['farmer'] },
  { key: 'inputs', title: 'Pembejeo', emoji: '🧰', route: '/inputs', roles: ['farmer', 'buyer', 'seller'] },
  { key: 'plantDoctor', title: 'Daktari wa Mimea', emoji: '🌿', route: '/plant-doctor', roles: ['farmer', 'expert'] },
  { key: 'advice', title: 'Ushauri', emoji: '📖', route: '/learn', roles: ['farmer', 'buyer', 'seller', 'expert'] },
  { key: 'groups', title: 'Vikundi', emoji: '👥', route: '/farmer/groups', roles: ['farmer'] },
  { key: 'market', title: 'Soko', emoji: '🛒', route: '/marketplace', roles: ['farmer', 'buyer', 'seller'] },
];

const toNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const asDate = (value) => {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

// Exponential time decay: a signal loses half its weight every half-life.
const decayWeight = (createdAt, now = new Date(), halfLifeDays = HALF_LIFE_DAYS) => {
  const date = asDate(createdAt);
  if (!date) return 0.6;
  const ageDays = Math.max(0, (now.getTime() - date.getTime()) / DAY_MS);
  return Math.pow(0.5, ageDays / Math.max(1, halfLifeDays));
};

const priceBand = (price) => {
  const value = toNumber(price);
  if (value <= 0) return 'unknown';
  if (value < 20000) return 'low';
  if (value <= 100000) return 'mid';
  return 'high';
};

const emptyAffinity = () => ({
  categories: {},
  animals: {},
  priceBands: {},
  districts: {},
  sellers: {},
  inputCategories: {},
  services: {},
});

const addWeight = (map, key, weight) => {
  if (!key || !Number.isFinite(weight) || weight === 0) return;
  map[key] = (map[key] || 0) + weight;
};

const cropIdOf = (crop) => {
  if (!crop) return '';
  if (typeof crop === 'string') return crop;
  return String(crop._id || crop.id || '');
};

// Adds one crop-shaped signal (category, animal, price band, district, seller).
const addCropAffinity = (affinity, crop, weight) => {
  if (!crop || weight === 0) return;
  addWeight(affinity.categories, crop.category, weight);
  addWeight(affinity.animals, crop.animal, weight);
  addWeight(affinity.priceBands, priceBand(crop.price), weight * 0.6);
  addWeight(affinity.districts, crop.location, weight * 0.5);
  addWeight(affinity.sellers, cropIdOf(crop.farmer) || null, weight * 0.4);
};

const addCropByName = (affinity, name, weight) => {
  const key = String(name || '').trim().toLowerCase();
  if (!key) return;
  const aliases = {
    mahindi: 'cereals', mpunga: 'cereals', mchele: 'cereals', ngano: 'cereals',
    mtama: 'cereals', uwele: 'cereals', shayiri: 'cereals',
    maharage: 'legumes', kunde: 'legumes', njegere: 'legumes', soya: 'legumes',
    karanga: 'legumes', choroko: 'legumes',
    mboga: 'vegetables', nyanya: 'vegetables', vitunguu: 'vegetables',
    kabichi: 'vegetables', pilipili: 'vegetables', matango: 'vegetables',
    viazi: 'tubers', muhogo: 'tubers', ndizi: 'fruits', embe: 'fruits',
    parachichi: 'fruits', maparachichi: 'fruits', michikichi: 'oilseeds',
    alizeti: 'oilseeds', karafuu: 'oilseeds',
    mbuzi: 'livestock', ngombe: 'livestock', kuku: 'livestock',
    nguruwe: 'livestock', samaki: 'livestock', kondoo: 'livestock',
  };
  addWeight(affinity.categories, aliases[key], weight);
  if (ANIMAL_LABELS[key]) addWeight(affinity.animals, key, weight);
};

// Builds the learned taste profile. Every signal is time-decayed, so recent
// behaviour dominates while old behaviour fades out.
const buildProfile = ({
  user = null,
  orders = [],
  favorites = [],
  inputOrders = [],
  transportBookings = [],
  storageBookings = [],
  loanApplications = [],
  now = new Date(),
} = {}) => {
  const affinity = emptyAffinity();
  let signalCount = 0;

  orders.forEach((order) => {
    const base = ORDER_WEIGHTS[order.status] ?? 1;
    const weight = base * decayWeight(order.createdAt, now);
    if (weight === 0) return;
    addCropAffinity(affinity, order.crop, weight);
    if (weight > 0) signalCount += 1;
  });

  favorites.forEach((favorite) => {
    const weight = FAVORITE_WEIGHT * decayWeight(favorite.createdAt, now);
    addCropAffinity(affinity, favorite.crop, weight);
    if (weight > 0) signalCount += 1;
  });

  inputOrders.forEach((order) => {
    const base = INPUT_ORDER_WEIGHTS[order.status] ?? 1;
    const weight = base * decayWeight(order.createdAt, now);
    if (weight === 0) return;
    (order.items || []).forEach((item) => {
      const product = item.product && typeof item.product === 'object' ? item.product : null;
      const category = product ? product.category : item.category;
      addWeight(affinity.inputCategories, category, weight);
    });
    if (weight > 0) signalCount += 1;
  });

  transportBookings.forEach((booking) => {
    addWeight(affinity.services, 'transport', SERVICE_WEIGHT * decayWeight(booking.createdAt, now));
    if ((booking.status || '') !== 'cancelled') signalCount += 1;
  });
  storageBookings.forEach((booking) => {
    addWeight(affinity.services, 'storage', SERVICE_WEIGHT * decayWeight(booking.createdAt, now));
    if ((booking.status || '') !== 'cancelled') signalCount += 1;
  });
  loanApplications.forEach((application) => {
    addWeight(affinity.services, 'loans', SERVICE_WEIGHT * decayWeight(application.createdAt, now));
    if ((application.status || '') !== 'rejected') signalCount += 1;
  });

  // Structural needs: what the user grows and where they farm. Declared crops
  // are stable intent (not time-decayed) and seed the cold-start profile.
  if (user) {
    (user.crops || []).forEach((name) => addCropByName(affinity, name, 1.5));
    addWeight(affinity.districts, user.district || user.location, 1.5);
    if (user.role === 'farmer') {
      addWeight(affinity.services, 'loans', 0.8);
      addWeight(affinity.services, 'inputs', 1.0);
      addWeight(affinity.services, 'plantDoctor', 0.8);
      addWeight(affinity.inputCategories, 'seeds', 1.0);
      addWeight(affinity.inputCategories, 'fertilizers', 0.8);
    } else if (user.role === 'buyer') {
      addWeight(affinity.services, 'transport', 0.6);
      addWeight(affinity.services, 'market', 0.8);
    }
    if ((user.crops || []).length > 0) signalCount += 1;
  }

  return { affinity, signalCount };
};

// Normalizes each affinity map to 0..1 so map sizes don't dominate scoring.
const normalizeAffinity = (affinity = {}) => {
  const normalize = (map) => {
    if (!map) return {};
    const values = Object.values(map).filter((v) => v > 0);
    const max = values.length ? Math.max(...values) : 0;
    if (max <= 0) return {};
    const out = {};
    Object.entries(map).forEach(([key, value]) => {
      if (value > 0) out[key] = value / max;
    });
    return out;
  };
  return {
    categories: normalize(affinity.categories),
    animals: normalize(affinity.animals),
    priceBands: normalize(affinity.priceBands),
    districts: normalize(affinity.districts),
    sellers: normalize(affinity.sellers),
    inputCategories: normalize(affinity.inputCategories),
    services: normalize(affinity.services),
  };
};

// Marketplace popularity: recent purchases weighted by order state and decay.
const buildCropPopularity = ({
  orders = [],
  favoriteCounts = {},
  now = new Date(),
} = {}) => {
  const raw = {};
  orders.forEach((order) => {
    const id = cropIdOf(order.crop);
    if (!id) return;
    const base = ORDER_WEIGHTS[order.status] ?? 1;
    raw[id] = (raw[id] || 0) + base * decayWeight(order.createdAt, now);
  });
  Object.entries(favoriteCounts || {}).forEach(([id, count]) => {
    raw[id] = (raw[id] || 0) + toNumber(count) * 2;
  });
  return normalizeScores(raw);
};

const buildInputPopularity = ({ purchaseTotals = {} } = {}) => {
  const raw = {};
  Object.entries(purchaseTotals || {}).forEach(([id, qty]) => {
    const value = toNumber(qty);
    if (value > 0) raw[id] = value;
  });
  return normalizeScores(raw);
};

// Global service usage (bookings, applications) normalized to 0..1.
const buildServicePopularity = (counts = {}) => normalizeScores(counts);

const normalizeScores = (raw) => {
  const max = Math.max(0, ...Object.values(raw || {}).map(toNumber));
  if (max <= 0) return {};
  const out = {};
  Object.entries(raw).forEach(([key, value]) => {
    const n = toNumber(value);
    if (n > 0) out[key] = n / max;
  });
  return out;
};

const round = (value, places = 3) => {
  const f = Math.pow(10, places);
  return Math.round(value * f) / f;
};

const cropReason = (crop, strengths, popularity, locality) => {
  const category = strengths.categories[crop.category] || 0;
  const animal = crop.animal ? strengths.animals[crop.animal] || 0 : 0;
  const district = strengths.districts[crop.location] || 0;
  if (animal >= 0.55 && crop.category === 'livestock_products') {
    return `Bidhaa za ${ANIMAL_LABELS[crop.animal] || crop.animal} unazofuga`;
  }
  if (animal >= 0.55) return `${ANIMAL_LABELS[crop.animal] || crop.animal} unayefuga`;
  if (category >= 0.55) return `Unapenda ${CATEGORY_LABELS[crop.category] || 'mazao haya'}`;
  if (district >= 0.4) return `Ipo ${crop.location}`;
  if ((popularity[crop.id] || 0) >= 0.5) return 'Inapendwa sana sokoni';
  if (locality && crop.location === locality) return 'Ipo wilayani kwako';
  return 'Tangazo jipya sokoni';
};

const scoreCrop = (crop, { strengths, popularity, userLocation, now = new Date() }) => {
  const id = String(crop.id || crop._id || '');
  const category = strengths.categories[crop.category] || 0;
  const animal = crop.animal ? strengths.animals[crop.animal] || 0 : 0;
  const band = strengths.priceBands[priceBand(crop.price)] || 0;
  const district = strengths.districts[crop.location] || 0;
  const seller = strengths.sellers[cropIdOf(crop.farmer)] || 0;
  const popularityScore = popularity[id] || 0;
  const quality = Math.min(1, toNumber(crop.rating) / 5);
  const freshness = crop.createdAt ? decayWeight(crop.createdAt, now, 30) : 0.4;
  const localBonus = userLocation && crop.location === userLocation ? 0.25 : 0;
  return round(
    2.2 * popularityScore +
    1.6 * category +
    1.2 * animal +
    0.7 * band +
    0.8 * district +
    0.5 * seller +
    0.5 * quality +
    0.4 * freshness +
    localBonus,
  );
};

const scoreInput = (product, { strengths, popularity, userLocation }) => {
  const id = String(product.id || product._id || '');
  const category = strengths.inputCategories[product.category] || 0;
  const popularityScore = popularity[id] || 0;
  const quality = Math.min(1, toNumber(product.averageRating) / 5);
  const localBonus = userLocation && product.location === userLocation ? 0.2 : 0;
  const stockBonus = toNumber(product.stockQuantity) > 0 ? 0.15 : 0;
  return round(
    2.0 * popularityScore +
    1.8 * category +
    0.6 * quality +
    0.4 * localBonus +
    stockBonus,
  );
};

const inputReason = (product, strengths, popularity) => {
  const category = strengths.inputCategories[product.category] || 0;
  if (category >= 0.5) return 'Unaagiza mara kwa mara';
  if ((popularity[String(product.id || product._id)] || 0) >= 0.5) {
    return 'Inapendwa sana';
  }
  if (category > 0) return `Inafaa ${INPUT_CATEGORY_LABELS[product.category] || 'shughuli zako'}`;
  return 'Bidhaa inayopendekezwa';
};

const serviceReason = (service, strengths, popularity, role) => {
  const learned = strengths.services[service.key] || 0;
  if (learned >= 0.3) return 'Unaitumia mara kwa mara';
  if ((popularity[service.key] || 0) >= 0.5) return 'Inapendwa sana';
  if (service.roles.includes(role)) return 'Inafaa shughuli zako';
  return 'Huduma muhimu';
};

const rankServices = ({
  strengths = emptyAffinity(),
  role = 'farmer',
  popularity = {},
  limit = 4,
} = {}) => {
  return SERVICE_CATALOG.map((service) => {
    const learned = strengths.services[service.key] || 0;
    const popular = popularity[service.key] || 0;
    const roleBonus = service.roles.includes(role) ? 1.0 : 0.3;
    return {
      ...service,
      score: round(roleBonus + 2.0 * learned + 0.8 * popular),
      reason: serviceReason(service, strengths, popularity, role),
    };
  })
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(0, limit));
};

const summaryOf = (affinity) => {
  const top = (map, labels, count = 3) =>
    Object.entries(map || {})
      .filter(([, value]) => value > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, count)
      .map(([key, value]) => ({
        key,
        label: labels[key] || key,
        score: round(value, 2),
      }));

  return {
    topCategories: top(affinity.categories, CATEGORY_LABELS),
    topAnimals: top(affinity.animals, ANIMAL_LABELS),
    topInputCategories: top(affinity.inputCategories, INPUT_CATEGORY_LABELS),
    priceBand: top(affinity.priceBands, { low: 'Bei ndogo', mid: 'Bei ya kati', high: 'Bei kubwa', unknown: '—' }, 1)[0] || null,
  };
};

// Ranks candidate crops/inputs/services for a user (or a guest when `user` is
// null). Excludes the user's own listings as recommendations.
const recommend = ({
  crops = [],
  inputs = [],
  profile = null,
  affinity = emptyAffinity(),
  user = null,
  role = 'farmer',
  cropPopularity = {},
  inputPopularity = {},
  servicePopularity = {},
  limits = {},
  now = new Date(),
} = {}) => {
  const strengths = normalizeAffinity(affinity);
  const userLocation = user ? (user.district || user.location || '') : '';
  const ownId = user ? String(user._id || user.id || '') : '';
  const cropLimit = limits.crops || 8;
  const inputLimit = limits.inputs || 6;
  const serviceLimit = limits.services || 4;

  const rankedCrops = crops
    .filter((crop) => {
      const farmer = cropIdOf(crop.farmer);
      return !ownId || farmer !== ownId;
    })
    .map((crop) => ({
      ...crop,
      score: scoreCrop(crop, { strengths, popularity: cropPopularity, userLocation, now }),
      reason: cropReason(crop, strengths, cropPopularity, userLocation),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(0, cropLimit));

  const rankedInputs = inputs
    .map((product) => ({
      ...product,
      score: scoreInput(product, {
        strengths,
        popularity: inputPopularity,
        userLocation,
      }),
      reason: inputReason(product, strengths, inputPopularity),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(0, inputLimit));

  const services = rankServices({
    strengths,
    role,
    popularity: servicePopularity,
    limit: serviceLimit,
  });

  return {
    personalized: Boolean(profile && profile.signalCount > 0),
    summary: summaryOf(affinity),
    crops: rankedCrops,
    inputs: rankedInputs,
    services,
  };
};

module.exports = {
  ORDER_WEIGHTS,
  INPUT_ORDER_WEIGHTS,
  SERVICE_CATALOG,
  CATEGORY_LABELS,
  ANIMAL_LABELS,
  INPUT_CATEGORY_LABELS,
  decayWeight,
  priceBand,
  buildProfile,
  normalizeAffinity,
  buildCropPopularity,
  buildInputPopularity,
  buildServicePopularity,
  scoreCrop,
  scoreInput,
  rankServices,
  summaryOf,
  recommend,
};
