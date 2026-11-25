const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_REMINDER_DAYS = 365;

const round2 = (value) => Math.round((Number(value) || 0) * 100) / 100;

// Katavi cropping calendar: season A is the Oct–Mar rains (named for the year
// it starts), season B is Apr–Sep.
const seasonOf = (date) => {
  const parsed = date instanceof Date ? date : new Date(date || '');
  if (Number.isNaN(parsed.getTime())) return '';
  const month = parsed.getUTCMonth() + 1;
  const year = parsed.getUTCFullYear();
  if (month >= 10) return `${year}-A`;
  if (month <= 3) return `${year - 1}-A`;
  return `${year}-B`;
};

const activityTotals = (activities = []) => {
  const byType = {};
  let total = 0;

  for (const activity of activities) {
    const cost = Number(activity.cost) || 0;
    const type = activity.type || 'other';
    if (!byType[type]) byType[type] = { type, count: 0, cost: 0 };
    byType[type].count += 1;
    byType[type].cost += cost;
    total += cost;
  }

  return {
    totalCost: round2(total),
    byType: Object.values(byType)
      .map((row) => ({ ...row, cost: round2(row.cost) }))
      .sort((a, b) => b.cost - a.cost),
  };
};

// Season roll-up used for the farm history and the cost/yield dashboard.
const summarizeSeason = ({ plantings = [], activities = [] }) => {
  const acres = plantings.reduce((sum, row) => sum + (Number(row.acres) || 0), 0);
  const estimated = plantings.reduce((sum, row) => sum + (Number(row.estimatedYieldKg) || 0), 0);
  const actual = plantings.reduce((sum, row) => sum + (Number(row.actualYieldKg) || 0), 0);
  const harvested = plantings.filter((row) => row.status === 'harvested').length;
  const { totalCost, byType } = activityTotals(activities);

  return {
    plantings: plantings.length,
    harvested,
    acres: round2(acres),
    estimatedYieldKg: round2(estimated),
    actualYieldKg: round2(actual),
    // Negative means the harvest fell short of the estimate.
    yieldGapKg: round2(actual - estimated),
    totalCost: round2(totalCost),
    costPerAcre: acres > 0 ? round2(totalCost / acres) : 0,
    costByType: byType,
  };
};

const upcomingHarvests = (plantings = [], { days = 14, from = new Date() } = {}) => {
  const window = Math.min(Math.max(Number(days) || 14, 1), MAX_REMINDER_DAYS);
  const start = new Date(from);
  if (Number.isNaN(start.getTime())) return [];
  const end = new Date(start.getTime() + window * DAY_MS);

  return plantings
    .filter((planting) => planting.expectedHarvestDate)
    .filter((planting) => !['harvested', 'failed'].includes(planting.status))
    .map((planting) => ({
      ...planting,
      expectedHarvestDate: new Date(planting.expectedHarvestDate),
    }))
    .filter((planting) => (
      planting.expectedHarvestDate >= start && planting.expectedHarvestDate <= end
    ))
    .sort((a, b) => a.expectedHarvestDate - b.expectedHarvestDate)
    .map((planting) => ({
      plantingId: planting._id,
      farmId: planting.farm,
      cropName: planting.cropName,
      status: planting.status,
      expectedHarvestDate: planting.expectedHarvestDate,
      daysLeft: Math.ceil((planting.expectedHarvestDate - start) / DAY_MS),
    }));
};

// Groups a farmer's plantings and activities into per-season report rows.
const buildSeasonHistory = ({ plantings = [], activities = [] }) => {
  const plantingsBySeason = new Map();
  const seasonByPlanting = new Map();

  for (const planting of plantings) {
    const season = planting.season || seasonOf(planting.plantingDate) || 'unknown';
    seasonByPlanting.set(String(planting._id), season);
    if (!plantingsBySeason.has(season)) plantingsBySeason.set(season, []);
    plantingsBySeason.get(season).push(planting);
  }

  const activitiesBySeason = new Map();
  for (const activity of activities) {
    const season = activity.planting
      ? seasonByPlanting.get(String(activity.planting))
      : seasonOf(activity.date);
    const key = season || 'unknown';
    if (!activitiesBySeason.has(key)) activitiesBySeason.set(key, []);
    activitiesBySeason.get(key).push(activity);
  }

  const seasons = new Set([...plantingsBySeason.keys(), ...activitiesBySeason.keys()]);
  return [...seasons]
    .filter((season) => season !== 'unknown')
    .sort()
    .reverse()
    .map((season) => ({
      season,
      ...summarizeSeason({
        plantings: plantingsBySeason.get(season) || [],
        activities: activitiesBySeason.get(season) || [],
      }),
    }));
};

module.exports = {
  seasonOf,
  summarizeSeason,
  activityTotals,
  upcomingHarvests,
  buildSeasonHistory,
};
