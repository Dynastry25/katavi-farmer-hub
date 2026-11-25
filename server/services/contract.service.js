const escapeRegex = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const toDate = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const isExpired = (deadline, now = new Date()) => {
  const parsed = toDate(deadline);
  return Boolean(parsed) && parsed.getTime() < now.getTime();
};

const round2 = (value) => Math.round((Number(value) || 0) * 100) / 100;

const remainingQuantity = (contract) => Math.max(
  0,
  (Number(contract.quantityKg) || 0) - (Number(contract.committedKg) || 0)
);

const contractProgress = ({ quantityKg = 0, committedKg = 0, deliveredKg = 0, pricePerKg = 0 }) => {
  const total = Number(quantityKg) || 0;
  const percent = (value) => (total > 0 ? round2((Number(value) || 0) / total * 100) : 0);
  return {
    committedKg: round2(committedKg),
    deliveredKg: round2(deliveredKg),
    remainingKg: round2(Math.max(0, total - (Number(committedKg) || 0))),
    committedPct: percent(committedKg),
    deliveredPct: percent(deliveredKg),
    totalValue: round2(total * (Number(pricePerKg) || 0)),
  };
};

// The contract status follows its quantities: any accepted commitment makes it
// contracted, and delivering the full quantity fulfils it.
const deriveContractStatus = ({ status, quantityKg = 0, committedKg = 0, deliveredKg = 0 }) => {
  if (['cancelled', 'expired'].includes(status)) return status;
  const total = Number(quantityKg) || 0;
  if (total > 0 && (Number(deliveredKg) || 0) >= total) return 'fulfilled';
  if ((Number(committedKg) || 0) > 0) return 'contracted';
  return 'open';
};

const acceptedQuantity = ({ quantityKg = 0, rejectedKg = 0 }) => {
  const delivered = Number(quantityKg) || 0;
  const rejected = Math.min(Math.max(Number(rejectedKg) || 0, 0), delivered);
  return round2(delivered - rejected);
};

// Quality roll-up for the contract report: weighted moisture, grade mix and
// the share of delivered crop that passed inspection.
const qualitySummary = (deliveries = []) => {
  let accepted = 0;
  let rejected = 0;
  let moistureWeighted = 0;
  let moistureWeight = 0;
  const grades = {};

  for (const delivery of deliveries) {
    if (delivery.status !== 'accepted') continue;
    const weight = Number(delivery.acceptedKg) || 0;
    accepted += weight;
    rejected += Number(delivery.rejectedKg) || 0;
    if (delivery.moisturePct !== null && delivery.moisturePct !== undefined) {
      moistureWeighted += Number(delivery.moisturePct) * weight;
      moistureWeight += weight;
    }
    const grade = delivery.grade || 'mixed';
    grades[grade] = (grades[grade] || 0) + weight;
  }

  const total = accepted + rejected;
  return {
    acceptedKg: round2(accepted),
    rejectedKg: round2(rejected),
    acceptancePct: total > 0 ? round2(accepted / total * 100) : 0,
    avgMoisturePct: moistureWeight > 0 ? round2(moistureWeighted / moistureWeight) : null,
    gradeBreakdownKg: Object.fromEntries(
      Object.entries(grades).map(([grade, kg]) => [grade, round2(kg)])
    ),
  };
};

const buildListFilter = (query = {}) => {
  const filter = { status: 'open' };
  if (query.status && ['open', 'contracted', 'fulfilled', 'cancelled', 'expired'].includes(query.status)) {
    filter.status = query.status;
  }
  if (query.cropName) filter.cropName = new RegExp(`^${escapeRegex(query.cropName)}$`, 'i');
  if (query.district) filter.district = String(query.district);

  const search = String(query.q || '').trim();
  if (search) {
    const pattern = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ title: pattern }, { cropName: pattern }, { qualityRequirements: pattern }];
  }
  return filter;
};

module.exports = {
  escapeRegex,
  isExpired,
  remainingQuantity,
  contractProgress,
  deriveContractStatus,
  acceptedQuantity,
  qualitySummary,
  buildListFilter,
};
