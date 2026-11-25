const round2 = (value) => Math.round((Number(value) || 0) * 100) / 100;

const MIN_SEASON_LENGTH = 3;

const isSeasonLabel = (season) => String(season || '').trim().length >= MIN_SEASON_LENGTH;

const expectedYield = ({ acres, yieldPerAcreKg } = {}) => {
  const area = Number(acres) || 0;
  const rate = Number(yieldPerAcreKg) || 0;
  return Math.max(0, round2(area * rate));
};

// Demand and planned supply are compared per crop to guide planting.
const supplyGap = (demandKg = 0, plannedKg = 0) => {
  const demand = Number(demandKg) || 0;
  const planned = Number(plannedKg) || 0;
  const gapKg = round2(demand - planned);
  let status = 'balanced';
  if (gapKg > 0) status = 'shortage';
  else if (gapKg < 0) status = 'surplus';
  const fillPct = demand > 0 ? Math.min(999, Math.round((planned / demand) * 100)) : (planned > 0 ? 100 : 0);
  return { gapKg, status, fillPct };
};

// Merges buyer demand rows and farmer plan rows into one crop comparison.
const mergeCropPlanning = ({ demand = [], planned = [] } = {}) => {
  const crops = new Map();
  const rowFor = (cropName) => {
    const key = String(cropName || '').trim().toLowerCase();
    if (!key) return null;
    if (!crops.has(key)) {
      crops.set(key, { cropName: String(cropName).trim(), demandKg: 0, plannedKg: 0, buyers: 0, farmers: 0 });
    }
    return crops.get(key);
  };

  for (const item of demand) {
    const row = rowFor(item._id);
    if (!row) continue;
    row.demandKg = round2(row.demandKg + (Number(item.quantityKg) || 0));
    row.buyers += Number(item.count) || 0;
  }
  for (const item of planned) {
    const row = rowFor(item._id);
    if (!row) continue;
    const plannedKg = Number(item.expectedYieldKg) || expectedYield({ acres: item.acres, yieldPerAcreKg: item.yieldPerAcreKg });
    row.plannedKg = round2(row.plannedKg + plannedKg);
    row.farmers += Number(item.count) || 0;
  }

  return [...crops.values()]
    .map((row) => ({ ...row, ...supplyGap(row.demandKg, row.plannedKg) }))
    .sort((a, b) => b.gapKg - a.gapKg);
};

const PLAN_TRANSITIONS = {
  draft: ['active', 'cancelled'],
  active: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

const canTransitionPlan = (from, to) => Boolean(PLAN_TRANSITIONS[from]?.includes(to));

module.exports = {
  round2,
  isSeasonLabel,
  expectedYield,
  supplyGap,
  mergeCropPlanning,
  canTransitionPlan,
};
