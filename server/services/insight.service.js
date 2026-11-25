const { Groq } = require('groq-sdk');
const Farm = require('../models/Farm');
const Crop = require('../models/Crop');
const Order = require('../models/Order');
const FarmerExpense = require('../models/FarmerExpense');
const LoanApplication = require('../models/LoanApplication');
const TrainingEnrollment = require('../models/TrainingEnrollment');
const MarketPrice = require('../models/MarketPrice');
const WeatherZone = require('../models/WeatherZone');
const { fetchWeatherByCoords } = require('./weather.service');

const DAY_MS = 24 * 60 * 60 * 1000;
const RAIN_THRESHOLD_MM = 60;

const apiKey = process.env.GROQ_API_KEY;
const client = apiKey && apiKey !== 'your_groq_api_key_here'
  ? new Groq({ apiKey })
  : null;

const dayKey = (date = new Date()) => date.toISOString().slice(0, 10);

const round0 = (value) => Math.round(Number(value) || 0);

const orderCount = (orders = {}) => Number(orders.completed || 0) + Number(orders.active || 0);

// Weekly price readings, oldest first. The direction needs a full 2% move
// before it claims a trend, otherwise noise reads as advice.
const priceTrend = (prices) => {
  const clean = (Array.isArray(prices) ? prices : [])
    .map((price) => Number(price))
    .filter((price) => Number.isFinite(price) && price > 0);
  if (!clean.length) return null;

  const latest = clean[clean.length - 1];
  const first = clean[0];
  const average = clean.reduce((sum, price) => sum + price, 0) / clean.length;
  const changePct = first > 0 ? ((latest - first) / first) * 100 : 0;
  let direction = 'flat';
  if (changePct >= 2) direction = 'up';
  if (changePct <= -2) direction = 'down';

  return {
    latest: round0(latest),
    average: round0(average),
    min: round0(Math.min(...clean)),
    max: round0(Math.max(...clean)),
    changePct: Math.round(changePct * 10) / 10,
    direction,
    samples: clean.length,
  };
};

// Rule-first recommendations keep the report useful without an AI key and
// keep priorities stable for the UI.
const buildRecommendations = (snapshot = {}) => {
  const items = [];
  const farms = snapshot.farms || {};
  const listings = snapshot.listings || {};
  const orders = snapshot.orders || {};
  const loans = snapshot.loans || {};
  const weather = snapshot.weather || {};

  if (!farms.count) {
    items.push({
      code: 'register_farm',
      priority: 'high',
      title: 'Sajili shamba lako',
      message: 'Hakuna shamba lililosajiliwa. Sajili shamba ili kupata ushauri wa mbegu, pembejeo na mikopo kwa usahihi.',
    });
  }

  if (!listings.active) {
    items.push({
      code: 'publish_listing',
      priority: 'high',
      title: 'Tangaza mazao yako',
      message: orderCount(orders) > 0
        ? 'Huna tangazo hai. Tangaza mazao mapya ili wanunuzi waendelee kukupata.'
        : 'Huna tangazo hai. Tangaza mazao yako kwenye soko ili wanunuzi wakuone.',
    });
  }

  if (loans.pending > 0) {
    items.push({
      code: 'loan_pending',
      priority: 'medium',
      title: 'Fuatilia ombi la mkopo',
      message: `Una ombi ${loans.pending} la mkopo linalosubiri. Hakikisha taarifa zako na namba ya simu zilizothibitishwa ni sahihi.`,
    });
  }

  if (Number(weather.rainMm) < RAIN_THRESHOLD_MM && weather.resolved) {
    items.push({
      code: 'rain_low',
      priority: 'medium',
      title: 'Panga umwagiliaji',
      message: `Mvua inayotarajiwa siku 7 zijazo ni ~${round0(weather.rainMm)}mm. Panga umwagiliaji au tumia mbegu zinazostahimili ukame.`,
    });
  }

  if (Number(orders.completed) >= 3 && !(snapshot.trainingsCompleted > 0)) {
    items.push({
      code: 'training',
      priority: 'low',
      title: 'Jiongeze kwa mafunzo',
      message: 'Umekamilisha mauzo kadhaa. Jiunge na kozi fupi ya usimamizi wa shamba au biashara ili kuongeza tija.',
    });
  }

  if (Number(snapshot.expenses90d) === 0 && farms.count > 0) {
    items.push({
      code: 'track_expenses',
      priority: 'low',
      title: 'Rekodi matumizi',
      message: 'Hakuna matumizi yaliyorekodiwa katika siku 90. Rekodi pembejeo na vibarua ili kujua faida halisi.',
    });
  }

  return items;
};

const composeSummary = (snapshot, recommendations) => {
  const farms = snapshot.farms || {};
  const listings = snapshot.listings || {};
  const orders = snapshot.orders || {};
  const topCrop = listings.crops?.[0];
  const parts = [
    farms.count
      ? `Una shamba ${farms.count} (ekari ${round0(farms.acres)}).`
      : 'Bado hujasajili shamba.',
    listings.active
      ? `Una matangazo ${listings.active} sokoni${topCrop ? `, ikiwemo ${topCrop}` : ''}.`
      : 'Huna tangazo la zao sokoni kwa sasa.',
    orderCount(orders)
      ? `Mauzo yaliyokamilika: ${orders.completed}; agizo hai: ${orders.active}.`
      : 'Hakuna agizo lililofanyika bado.',
  ];
  if (recommendations.length) {
    parts.push(`Kipaumbele: ${recommendations[0].title.toLowerCase()}.`);
  }
  return parts.join(' ');
};

const summarizeWithAI = async (snapshot, recommendations) => {
  if (!client) return null;
  try {
    const response = await client.chat.completions.create({
      model: 'qwen/qwen3.8-27b',
      temperature: 0.4,
      max_tokens: 220,
      messages: [
        {
          role: 'system',
          content: 'Wewe ni mshauri wa kilimo wa Katavi E-Kilimo. Andika muhtasari mfupi wa sentensi 2-3 kwa Kiswahili rahisi kwa mkulima, ukitumia tu takwimu zilizotolewa. Usibuni namba mpya, usitaje jina la modeli, na usiandike orodha.',
        },
        {
          role: 'user',
          content: JSON.stringify({ snapshot, recommendations: recommendations.map((r) => r.title) }),
        },
      ],
    });
    const text = response.choices?.[0]?.message?.content?.trim();
    return text || null;
  } catch (error) {
    console.error('[Insights] AI summary error:', error.message);
    return null;
  }
};

const resolveRain = async ({ ward, district }) => {
  try {
    const zone = ward || district
      ? await WeatherZone.findOne({
        $or: [
          { ward: new RegExp(String(ward || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
          { district: new RegExp(String(district || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
        ],
      }).lean()
      : null;
    if (!zone || !zone.lat || !zone.lon) return { resolved: false, rainMm: 0 };
    const forecast = await fetchWeatherByCoords(zone.lat, zone.lon, 7);
    const rainMm = (forecast?.daily || [])
      .reduce((sum, day) => sum + (Number(day.precipitation) || 0), 0);
    return { resolved: true, rainMm: Math.round(rainMm) };
  } catch (error) {
    console.error('[Insights] weather error:', error.message);
    return { resolved: false, rainMm: 0 };
  }
};

const getFarmInsight = async (user) => {
  const since = new Date(Date.now() - 90 * DAY_MS);

  const [farms, listings, orders, expenseRows, loans, trainingsCompleted] = await Promise.all([
    Farm.find({ user: user._id, isActive: true }).select('name sizeAcres district ward').lean(),
    Crop.find({ farmer: user._id }).select('name status').lean(),
    Order.find({ farmer: user._id }).select('status paymentAmount').lean(),
    FarmerExpense.aggregate([
      { $match: { user: user._id, date: { $gte: since } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    LoanApplication.find({ user: user._id }).select('status').lean(),
    TrainingEnrollment.countDocuments({ learner: user._id, status: 'completed' }),
  ]);

  const activeListings = listings.filter((item) => item.status === 'available');
  const completedOrders = orders.filter((item) => item.status === 'completed');
  const activeOrders = orders.filter((item) => (
    ['pending', 'approved', 'partially_approved', 'delivered'].includes(item.status)
  ));
  const weather = await resolveRain({
    ward: farms[0]?.ward || user.ward,
    district: farms[0]?.district || user.district,
  });

  const snapshot = {
    district: user.district || '',
    ward: user.ward || '',
    farms: {
      count: farms.length,
      acres: farms.reduce((sum, farm) => sum + (Number(farm.sizeAcres) || 0), 0),
    },
    listings: {
      active: activeListings.length,
      total: listings.length,
      crops: [...new Set(activeListings.map((item) => item.name))].slice(0, 3),
    },
    orders: {
      completed: completedOrders.length,
      active: activeOrders.length,
      value: completedOrders.reduce((sum, order) => sum + (Number(order.paymentAmount) || 0), 0),
    },
    expenses90d: expenseRows[0]?.total || 0,
    loans: {
      pending: loans.filter((loan) => loan.status === 'pending').length,
      approved: loans.filter((loan) => ['approved', 'completed'].includes(loan.status)).length,
    },
    trainingsCompleted,
    weather,
  };

  const recommendations = buildRecommendations(snapshot);
  const aiSummary = await summarizeWithAI(snapshot, recommendations);

  return {
    generatedAt: new Date().toISOString(),
    snapshot,
    recommendations,
    summary: aiSummary || composeSummary(snapshot, recommendations),
    aiAssisted: Boolean(aiSummary),
  };
};

const marketAdvice = (trend, supply = {}) => {
  if (!trend) {
    return 'Hakuna bei za kutosha kwa zao hili wiki za karibuni. Rekodi bei za soko mara kwa mara ili kupata mwelekeo.';
  }
  if (trend.direction === 'up' && Number(supply.listings) < 5) {
    return 'Bei zinapanda na ushindani wa wauzaji ni mdogo — ni wakati mzuri wa kuongeza kiasi sokoni.';
  }
  if (trend.direction === 'down') {
    return 'Bei zinashuka. Fikiria kuuza kwa hatua, kuhifadhi kwenye ghala, au kuongeza thamani (usindikaji) badala ya kuuza ghafi.';
  }
  if (Number(supply.listings) >= 10) {
    return 'Bei ziko tulivu lakini wauzaji ni wengi. Boresha ubora na ufungashaji ili kutofautisha zao lako.';
  }
  return 'Bei ziko tulivu. Fuatilia gharama za pembejeo na uza kwa kasi inayolingana na mahitaji ya wanunuzi.';
};

const getMarketInsight = async (cropName) => {
  const name = String(cropName || '').trim();
  if (!name) return null;

  const match = new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
  const since = new Date(Date.now() - 8 * 7 * DAY_MS);

  const [rows, listings, completedOrders] = await Promise.all([
    MarketPrice.find({ cropName: match, dateRecorded: { $gte: since } })
      .sort({ dateRecorded: 1 })
      .select('pricePerUnit unit dateRecorded')
      .lean(),
    Crop.countDocuments({ name: match, status: 'available' }),
    Order.countDocuments({
      status: 'completed',
      createdAt: { $gte: new Date(Date.now() - 30 * DAY_MS) },
    }),
  ]);

  const trend = priceTrend(rows.map((row) => row.pricePerUnit));
  return {
    cropName: name,
    unit: rows[rows.length - 1]?.unit || 'kg',
    trend,
    supply: { listings, completedOrders },
    advice: marketAdvice(trend, { listings }),
    samples: rows.length,
  };
};

module.exports = {
  DAY_MS,
  dayKey,
  priceTrend,
  buildRecommendations,
  composeSummary,
  marketAdvice,
  getFarmInsight,
  getMarketInsight,
};
