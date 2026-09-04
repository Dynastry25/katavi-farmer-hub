const CACHE_TTL = 60 * 60 * 1000; // 1 hour
const cache = new Map();

const WMO_CODES = {
  0: 'Clear sky',
  1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
  45: 'Fog', 48: 'Rime fog',
  51: 'Light drizzle', 53: 'Moderate drizzle', 55: 'Dense drizzle',
  56: 'Freezing drizzle', 57: 'Heavy freezing drizzle',
  61: 'Slight rain', 63: 'Moderate rain', 65: 'Heavy rain',
  66: 'Light freezing rain', 67: 'Heavy freezing rain',
  71: 'Slight snow', 73: 'Moderate snow', 75: 'Heavy snow',
  77: 'Snow grains',
  80: 'Slight rain showers', 81: 'Moderate rain showers', 82: 'Violent rain showers',
  85: 'Slight snow showers', 86: 'Heavy snow showers',
  95: 'Thunderstorm', 96: 'Thunderstorm with slight hail', 99: 'Thunderstorm with heavy hail',
};

const WEATHER_DESCRIPTIONS = {
  0: 'Anga wazi',
  1: 'Anga wazi kwa sehemu', 2: 'Anga na mawingu', 3: 'Mawingu mengi',
  45: 'Ukungu', 48: 'Ukungu baridi',
  51: 'Mvua nyepesi', 53: 'Mvua wastani', 55: 'Mvua nzito',
  61: 'Mvua kidogo', 63: 'Mvua wastani', 65: 'Mvua kubwa',
  71: 'Theluji kidogo', 73: 'Theluji wastani', 75: 'Theluji nzito',
  80: 'Mvua chache', 81: 'Mvua wastani', 82: 'Mvua kubwa sana',
  95: 'Dondoko la umeme', 96: 'Dondoko la umeme na mvua',
};

const getWeatherDescription = (code) => WEATHER_DESCRIPTIONS[code] || 'Hali ya hewa haijulikani';

const fetchWeatherByCoords = async (lat, lon) => {
  const cacheKey = `weather_${lat}_${lon}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.time < CACHE_TTL) return cached.data;

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code,uv_index,precipitation&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max&timezone=Africa/Dar_es_Salaam&forecast_days=7`;

  const response = await fetch(url);
  if (!response.ok) throw new Error(`Weather API error: ${response.status}`);

  const data = await response.json();

  const result = {
    current: {
      temperature: data.current?.temperature_2m,
      humidity: data.current?.relative_humidity_2m,
      windSpeed: data.current?.wind_speed_10m,
      weatherCode: data.current?.weather_code,
      description: getWeatherDescription(data.current?.weather_code),
      uvIndex: data.current?.uv_index,
      precipitation: data.current?.precipitation,
    },
    daily: data.daily?.time?.map((date, i) => ({
      date,
      maxTemp: data.daily.temperature_2m_max[i],
      minTemp: data.daily.temperature_2m_min[i],
      precipitation: data.daily.precipitation_sum[i],
      precipitationProbability: data.daily.precipitation_probability_max[i],
      windSpeed: data.daily.wind_speed_10m_max[i],
      weatherCode: data.daily.weather_code[i],
      description: getWeatherDescription(data.daily.weather_code[i]),
    })) || [],
  };

  cache.set(cacheKey, { data: result, time: Date.now() });
  return result;
};

const getFarmingAdvisory = (weatherCode, temperature) => {
  const advisories = [];

  if ([0, 1].includes(weatherCode)) {
    advisories.push({ type: 'info', message: 'Ni wakati mzuri wa shughuli za nje za kilimo' });
  } else if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(weatherCode)) {
    advisories.push({ type: 'warning', message: 'Kuna mvua - epuka kufanya matumizi ya dawa za kilimo' });
  } else if ([95, 96, 99].includes(weatherCode)) {
    advisories.push({ type: 'danger', message: 'Dondoko la umeme - omba nafasi salama!' });
  }

  if (temperature > 35) {
    advisories.push({ type: 'warning', message: 'Joto kubwa - hakikisha mimea ina maji ya kutosha' });
  } else if (temperature < 10) {
    advisories.push({ type: 'info', message: 'Baridi - kulinda miche mipya' });
  }

  return advisories;
};

module.exports = { fetchWeatherByCoords, getWeatherDescription, getFarmingAdvisory, WMO_CODES, WEATHER_DESCRIPTIONS };
