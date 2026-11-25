const roundFee = (value) => Math.round((Number(value) || 0) / 500) * 500;

// Fare = base + per-km + per-kg. The provider's own per-km price wins over the
// platform rate card when they have set one.
const transportFare = ({ rate = {}, providerRatePerKm = 0, distanceKm = 0, weightKg = 0 }) => {
  const perKm = Number(providerRatePerKm) > 0
    ? Number(providerRatePerKm)
    : Number(rate.perKm) || 0;
  const total = (Number(rate.base) || 0)
    + perKm * Math.max(Number(distanceKm) || 0, 0)
    + (Number(rate.perKg) || 0) * Math.max(Number(weightKg) || 0, 0);
  return { perKm, totalAmount: roundFee(total) };
};

// A vehicle can only take one trip's load at a time; an unset capacity means
// the provider has not declared a limit.
const exceedsCapacity = ({ capacityKg = 0, weightKg = 0 }) => (
  Number(capacityKg) > 0 && Number(weightKg) > Number(capacityKg)
);

const makeTrackingCode = () => {
  const stamp = Date.now().toString(36).toUpperCase().slice(-5);
  const random = Math.random().toString(36).toUpperCase().slice(2, 5);
  return `TPK-${stamp}${random}`;
};

module.exports = {
  roundFee,
  transportFare,
  exceedsCapacity,
  makeTrackingCode,
};
