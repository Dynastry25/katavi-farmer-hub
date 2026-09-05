const LandGuidance = require('../models/LandGuidance');
const CropCycle = require('../models/CropCycle');
const CropDisease = require('../models/CropDisease');
const WeatherZone = require('../models/WeatherZone');
const { fetchWeatherByCoords } = require('./weather.service');

// Typical ~120mm/2-week threshold considered "mvua inakuja" for Katavi.
const RAIN_FORECAST_THRESHOLD_MM = 60;

// Planting-time recommendation: combine a 10-day weather forecast (when a
// zone can be resolved) with the crop's ideal window. Returns a message and
// a rating: go / caution / wait.
const getPlantingRecommendation = async ({ cropName, ward, district, zoneId } = {}) => {
  const crop = String(cropName || '').trim().toLowerCase();
  const cycle = await CropCycle.findOne({ cropName: new RegExp(`^${crop.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }).lean();

  let forecast = null;
  let zone = null;
  try {
    if (zoneId) {
      zone = await WeatherZone.findById(zoneId).lean();
    } else if (ward || district) {
      zone = await WeatherZone.findOne({
        $or: [
          { ward: new RegExp(String(ward || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
          { district: new RegExp(String(district || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
        ],
      }).lean();
    }
    if (zone && zone.lat && zone.lon) {
      forecast = await fetchWeatherByCoords(zone.lat, zone.lon, 10);
    }
  } catch (e) {
    console.error('[ShambaAdvisor] weather/map error:', e.message);
  }

  // Compute expected rain over the next 10 days.
  let rainMm = 0;
  if (forecast && Array.isArray(forecast.daily)) {
    rainMm = forecast.daily.reduce((s, d) => s + (d.precipitation || 0), 0);
  }

  let rating = 'neutral';
  let message;
  if (rainMm >= RAIN_FORECAST_THRESHOLD_MM) {
    rating = 'good';
    message = `Mvua inatarajiwa kiasi cha ~${Math.round(rainMm)}mm katika siku 10 zijazo (${zone?.ward || 'eneo lako'}) — huu ni wakati mzuri wa kupanda ${cropName || 'mazao'}.`;
  } else if (rainMm >= RAIN_FORECAST_THRESHOLD_MM * 0.4) {
    rating = 'caution';
    message = `Mvua inatarajiwa kidogo (~${Math.round(rainMm)}mm katika siku 10) — waweza kupanda lakini hakikisha kuna njia ya kumwagilia; tumia mbegu zinazostahimili ukame (Drought Tolerant).`;
  } else {
    rating = 'wait';
    message = `Mvua ndogo sana inatarajiwa (~${Math.round(rainMm)}mm katika siku 10). Bora subiri mvua za kuaminika kabla ya kupanda ${cropName || 'mazao'}; nyakati za kawaida za kupanda Katavi ni ~Novemba–Januari (msimu wa mvua).`;
  }

  if (!zone) {
    message = `Nyaraka za wakati wa kupanda kwa ${cropName || 'mazao'}: Msimu wa mvua Katavi kwa kawaida huanza ~Novemba. Thibitisha na hali ya hewa ya eneo lako kabla ya kupanda.`;
  }

  const idealWindow = cycle?.stages?.find(s => s.key === 'planting');
  return {
    cropName: cropName || '',
    rating,
    message,
    forecastRain10dMm: Math.round(rainMm),
    zone: zone ? { name: zone.name, ward: zone.ward, district: zone.district } : null,
    idealWindow: idealWindow
      ? { label: idealWindow.label, tip: idealWindow.tips, alert: idealWindow.alert }
      : null,
  };
};

// Stage tracker: given a planting date and the crop's cycle, return which
// stage the farmer is likely in today (relative to that date).
const getCycleStage = async ({ cropName, plantingDate } = {}) => {
  const crop = String(cropName || '').trim().toLowerCase();
  const cycle = await CropCycle.findOne({ cropName: new RegExp(`^${crop.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }).lean();
  if (!cycle || !cycle.stages || cycle.stages.length === 0) return null;

  const date = plantingDate ? new Date(plantingDate) : new Date();
  if (isNaN(date)) return null;
  const days = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (days < 0) return { label: 'Kabla ya kupanda', detail: 'Bado haujaweka tarehe ya kupanda.', days, stageKey: 'pre' };

  let current = cycle.stages.reduce((acc, s) => (days >= s.dayStart && days <= s.dayEnd ? s : acc), null);
  if (!current) current = days < cycle.stages[0].dayStart ? cycle.stages[0] : cycle.stages[cycle.stages.length - 1];

  return {
    stageKey: current.key,
    label: current.label,
    icon: current.icon,
    tip: current.tips,
    alert: current.alert,
    daysSincePlanting: days,
    cropName: cycle.cropName,
  };
};

// Disease library for a crop (with optional AI hint appended by the caller).
const getDiseaseLibrary = async (cropName) => {
  const crop = String(cropName || '').trim().toLowerCase();
  const query = crop ? { cropName: new RegExp(`^${crop.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } : {};
  return CropDisease.find(query).lean();
};

// Land/soil suitability for a ward (optionally filtered by crop).
const getLandGuidance = async ({ ward, district, cropName } = {}) => {
  const query = {};
  if (ward) query.ward = new RegExp(String(ward).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  if (district) query.district = new RegExp(String(district).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  let guidance = await LandGuidance.find(query).lean();
  if (guidance.length === 0) {
    guidance = await LandGuidance.find({ region: 'Katavi' }).lean();
  }
  if (cropName) {
    const c = String(cropName).trim().toLowerCase();
    guidance = guidance.filter(g => (g.suitableCrops || []).some(n => String(n).toLowerCase().includes(c) || c.includes(String(n).toLowerCase())));
  }
  return guidance;
};

module.exports = {
  getPlantingRecommendation,
  getCycleStage,
  getDiseaseLibrary,
  getLandGuidance,
  RAIN_FORECAST_THRESHOLD_MM,
};