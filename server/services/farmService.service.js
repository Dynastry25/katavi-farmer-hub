const round2 = (value) => Math.round((Number(value) || 0) * 100) / 100;

// Offers are priced per acre, hour, day, trip or as a flat fee; the booking
// stores an estimate from these units and the provider quotes the final figure.
const estimateAmount = (offer, { acres = 0, hours = 0, days = 0, trips = 0 } = {}) => {
  const price = Number(offer?.priceAmount) || 0;
  const unit = offer?.priceUnit || 'fixed';
  const units = {
    per_acre: acres,
    per_hour: hours,
    per_day: days,
    per_trip: trips,
    fixed: 1,
  }[unit];

  if (units === undefined) return 0;
  return round2(price * Math.max(Number(units) || 0, 0));
};

const BOOKING_TRANSITIONS = {
  requested: ['quoted', 'declined', 'cancelled'],
  quoted: ['accepted', 'declined', 'cancelled'],
  accepted: ['in_progress', 'cancelled'],
  in_progress: ['completed'],
  completed: ['confirmed'],
  confirmed: [],
  cancelled: [],
  declined: [],
};

const canTransitionBooking = (from, to) => Boolean(BOOKING_TRANSITIONS[from]?.includes(to));

const offerRating = ({ ratingSum = 0, ratingCount = 0 }) => (
  ratingCount > 0 ? round2(ratingSum / ratingCount) : 0
);

const nextRatingStats = ({ ratingSum = 0, ratingCount = 0 }, rating) => {
  const value = Math.min(Math.max(Number(rating) || 0, 1), 5);
  const sum = (Number(ratingSum) || 0) + value;
  const count = (Number(ratingCount) || 0) + 1;
  return { ratingSum: sum, ratingCount: count, average: round2(sum / count) };
};

module.exports = {
  estimateAmount,
  canTransitionBooking,
  offerRating,
  nextRatingStats,
  BOOKING_TRANSITIONS,
};
