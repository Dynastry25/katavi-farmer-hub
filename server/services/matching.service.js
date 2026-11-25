const { exceedsCapacity } = require('./transport.service');

const clamp = (value) => Math.min(Math.max(Number(value) || 0, 0), 1);

// A load that fills more of the vehicle is a better fit than one that leaves
// most of the trailer empty; unknown capacities stay neutral.
const capacityFit = (capacityKg, weightKg) => {
  const capacity = Number(capacityKg) || 0;
  const weight = Math.max(Number(weightKg) || 0, 0);
  if (capacity <= 0 || weight <= 0) return 0.6;
  return 0.6 + 0.4 * clamp(weight / capacity);
};

const MATCH_WEIGHTS = { price: 0.4, rating: 0.3, fit: 0.3 };

// Rank carriers that are available and can take the load. Price and rating
// drive most of the score; capacity fit only breaks close races.
const rankCarriers = (carriers = [], { weightKg = 0, limit = 5 } = {}) => {
  const eligible = carriers.filter((carrier) => (
    carrier.available !== false
    && !exceedsCapacity({ capacityKg: carrier.capacityKg, weightKg })
  ));
  if (!eligible.length) return [];

  const fares = eligible
    .map((carrier) => Number(carrier.fare) || 0)
    .filter((fare) => fare > 0);
  const cheapest = fares.length ? Math.min(...fares) : 0;

  const scored = eligible.map((carrier) => {
    const fare = Number(carrier.fare) || 0;
    const priceScore = fare > 0 && cheapest > 0 ? cheapest / fare : 0;
    const ratingScore = clamp((Number(carrier.averageRating) || 0) / 5);
    const fitScore = capacityFit(carrier.capacityKg, weightKg);
    const score = Math.round(100 * (
      MATCH_WEIGHTS.price * priceScore
      + MATCH_WEIGHTS.rating * ratingScore
      + MATCH_WEIGHTS.fit * fitScore
    ));
    return { ...carrier, matchScore: score };
  });

  scored.sort((a, b) => (
    b.matchScore - a.matchScore
    || (Number(a.fare) || 0) - (Number(b.fare) || 0)
    || (Number(b.averageRating) || 0) - (Number(a.averageRating) || 0)
  ));

  const size = Math.min(Math.max(Math.floor(Number(limit) || 5), 1), 10);
  return scored.slice(0, size);
};

module.exports = {
  capacityFit,
  rankCarriers,
};
