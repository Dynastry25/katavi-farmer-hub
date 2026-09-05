const WeatherConfig = require('../models/WeatherConfig');
const WeatherZone = require('../models/WeatherZone');
const { fetchWeatherByCoords, getFarmingAdvisory } = require('../services/weather.service');

exports.getForecast = async (req, res) => {
  try {
    const { lat, lon, days = 7 } = req.query;
    if (!lat || !lon) {
      return res.status(400).json({ message: 'Latitude na longitude zinahitajika' });
    }
    const data = await fetchWeatherByCoords(Number(lat), Number(lon), Math.min(Number(days) || 7, 7));
    const advisories = getFarmingAdvisory(data.current.weatherCode, data.current.temperature);
    res.json({ ...data, advisories });
  } catch (error) {
    console.error('Weather forecast error:', error);
    res.status(502).json({ message: 'Hitilafu imetokea wakati wa kupata hali ya hewa' });
  }
};

exports.getConfig = async (req, res) => {
  try {
    let config = await WeatherConfig.findOne({ key: 'config' });
    if (!config) {
      config = await WeatherConfig.create({ key: 'config' });
    }
    res.json({
      source: config.source,
      baseUrl: config.baseUrl,
      cacheMinutes: config.cacheMinutes,
    });
  } catch (error) {
    console.error('Weather config error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
};

exports.getConfigAdmin = async (req, res) => {
  try {
    let config = await WeatherConfig.findOne({ key: 'config' });
    if (!config) {
      config = await WeatherConfig.create({ key: 'config' });
    }
    res.json(config);
  } catch (error) {
    console.error('Weather admin config error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
};

exports.updateConfig = async (req, res) => {
  try {
    const { source, baseUrl, apiKey, cacheMinutes } = req.body;
    let config = await WeatherConfig.findOne({ key: 'config' });
    if (!config) {
      config = await WeatherConfig.create({ key: 'config' });
    }
    if (source && ['open-meteo', 'openweather'].includes(source)) config.source = source;
    if (baseUrl !== undefined) config.baseUrl = baseUrl;
    if (apiKey !== undefined) config.apiKey = apiKey;
    if (cacheMinutes !== undefined) config.cacheMinutes = Number(cacheMinutes) || 60;
    config.updatedBy = req.user._id;
    await config.save();
    res.json({ message: 'Mipangilio ya hali ya hewa imehifadhiwa', config });
  } catch (error) {
    console.error('Weather update config error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
};

exports.getZones = async (req, res) => {
  try {
    const zones = await WeatherZone.find().sort({ name: 1 });
    res.json({ zones });
  } catch (error) {
    console.error('Weather zones error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
};

exports.createZone = async (req, res) => {
  try {
    const { name, district, ward, lat, lon, active, alertEnabled, alertRainMm, alertTempC } = req.body;
    if (!name || lat === undefined || lon === undefined) {
      return res.status(400).json({ message: 'Jina, latitude na longitude zinahitajika' });
    }
    const zone = await WeatherZone.create({
      name, district, ward, lat, lon,
      active: active !== false,
      alertEnabled: alertEnabled !== false,
      alertRainMm: alertRainMm || 30,
      alertTempC: alertTempC || 35,
      createdBy: req.user._id,
    });
    res.status(201).json({ message: 'Eneo limeongezwa', zone });
  } catch (error) {
    console.error('Weather create zone error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
};

exports.updateZone = async (req, res) => {
  try {
    const zone = await WeatherZone.findById(req.params.id);
    if (!zone) return res.status(404).json({ message: 'Eneo halipatikani' });
    const { name, district, ward, lat, lon, active, alertEnabled, alertRainMm, alertTempC } = req.body;
    if (name !== undefined) zone.name = name;
    if (district !== undefined) zone.district = district;
    if (ward !== undefined) zone.ward = ward;
    if (lat !== undefined) zone.lat = lat;
    if (lon !== undefined) zone.lon = lon;
    if (active !== undefined) zone.active = active;
    if (alertEnabled !== undefined) zone.alertEnabled = alertEnabled;
    if (alertRainMm !== undefined) zone.alertRainMm = alertRainMm;
    if (alertTempC !== undefined) zone.alertTempC = alertTempC;
    await zone.save();
    res.json({ message: 'Eneo limerekebishwa', zone });
  } catch (error) {
    console.error('Weather update zone error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
};

exports.deleteZone = async (req, res) => {
  try {
    const zone = await WeatherZone.findByIdAndDelete(req.params.id);
    if (!zone) return res.status(404).json({ message: 'Eneo halipatikani' });
    res.json({ message: 'Eneo limefutwa' });
  } catch (error) {
    console.error('Weather delete zone error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
};