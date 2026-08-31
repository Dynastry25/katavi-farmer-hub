import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './WeatherWidget.css';

const LOCATIONS = [
  { id: 'Mpanda', label: 'Mpanda', lat: -6.3438, lon: 31.0695 },
  { id: 'Mlele', label: 'Mlele', lat: -6.5903, lon: 31.7646 },
  { id: 'Nsimbo', label: 'Nsimbo', lat: -6.3727, lon: 31.1840 },
];

const OPEN_METEO_URL = import.meta.env.VITE_WEATHER_API_URL || 'https://api.open-meteo.com/v1/forecast';

// Map Open-Meteo WMO weather codes -> Swahili condition + icon
const WMO = {
  0: { sw: 'Sunny', icon: 'fas fa-sun' },
  1: { sw: 'Mainly sunny', icon: 'fas fa-sun' },
  2: { sw: 'Partly sunny', icon: 'fas fa-cloud-sun' },
  3: { sw: 'Cloudy', icon: 'fas fa-cloud' },
  45: { sw: 'Foggy', icon: 'fas fa-smog' },
  48: { sw: 'Fog', icon: 'fas fa-smog' },
  51: { sw: 'Drizzle', icon: 'fas fa-cloud-rain' },
  53: { sw: 'Drizzle', icon: 'fas fa-cloud-rain' },
  55: { sw: 'Drizzle', icon: 'fas fa-cloud-rain' },
  61: { sw: 'Rain', icon: 'fas fa-cloud-showers-heavy' },
  63: { sw: 'Rain', icon: 'fas fa-cloud-showers-heavy' },
  65: { sw: 'Heavy rain', icon: 'fas fa-cloud-showers-heavy' },
  66: { sw: 'Freezing rain', icon: 'fas fa-cloud-rain' },
  67: { sw: 'Freezing rain', icon: 'fas fa-cloud-rain' },
  71: { sw: 'Snow', icon: 'fas fa-snowflake' },
  73: { sw: 'Snow', icon: 'fas fa-snowflake' },
  75: { sw: 'Heavy snow', icon: 'fas fa-snowflake' },
  80: { sw: 'Rain showers', icon: 'fas fa-cloud-showers-heavy' },
  81: { sw: 'Rain showers', icon: 'fas fa-cloud-showers-heavy' },
  82: { sw: 'Heavy rain', icon: 'fas fa-cloud-showers-heavy' },
  95: { sw: 'Thunderstorm', icon: 'fas fa-bolt' },
  96: { sw: 'Thunderstorm', icon: 'fas fa-bolt' },
  99: { sw: 'Severe storm', icon: 'fas fa-bolt' },
};

const getWMO = (code) => WMO[code] || { sw: 'Cloudy', icon: 'fas fa-cloud' };

const getAdvisory = (code) => {
  if ([95, 96, 99].includes(code)) {
    return 'Dhoruba inatarajiwa. Usiende shambani na hakikisha mifugo ipo salama, na epuka kupanda mimea hadi mvua ikome.';
  }
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
    return 'Hali nzuri ya kupanda mimea. Tumia fursa ya mvua kupanda na kutia mbolea kwenye udongo wenye unyevu.';
  }
  if ([51, 53, 55].includes(code)) {
    return 'Mvua nyeupe ndogo. Uso ni wa mvua — ni wakati mzuri wa kuandaa shamba na kuweka mbolea kabla ya mvua kubwa.';
  }
  if ([0, 1].includes(code)) {
    return 'Jua kali. Kumwagilia mimea mara kwa mara kwani hakuna mvua, na epuka kupalilia wakati wa jua kali.';
  }
  if ([45, 48].includes(code)) {
    return 'Ukungu unatarajiwa. Subiri ukungu kuondoka kabla ya kufanya kazi ya kilimo usiku.';
  }
  return 'Mawingu yametanda. Hali ni nzuri kwa kazi za shambani; tayarisha udongo kwa msimu ujao.';
};

// Temperature conversion helpers
const toF = (c) => Math.round((c * 9) / 5 + 32);
const formatTemp = (c, unit) => `${unit === 'F' ? toF(c) : Math.round(c)}°`;
const formatWind = (kmh, unit) =>
  unit === 'F' ? `${Math.round(kmh / 1.609)} mph` : `${Math.round(kmh)} km/h`;

const WeatherWidget = ({ onPageChange }) => {
  const [locationId, setLocationId] = useState('Mpanda');
  const [unit, setUnit] = useState('C');
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const timerRef = useRef(null);

  const fetchWeather = useCallback(async (lat, lon) => {
    setRefreshing(true);
    try {
      const params = new URLSearchParams({
        latitude: lat,
        longitude: lon,
        current: 'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,precipitation',
        hourly: 'temperature_2m,precipitation_probability,weather_code',
        daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
        timezone: 'Africa/Dar_es_Salaam',
        past_days: '0',
        forecast_days: '7',
      });
      const res = await fetch(`${OPEN_METEO_URL}?${params}`);
      if (!res.ok) throw new Error(`Msimbo ${res.status}`);
      const d = await res.json();

      setData(d);
      setError(null);
      setLastUpdated(new Date());
    } catch (e) {
      setError('Imeshindwa kupata hali ya hewa. Jaribu tena baadaye.');
      console.error('Weather fetch error:', e);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const loc = LOCATIONS.find(l => l.id === locationId);
    fetchWeather(loc.lat, loc.lon);

    timerRef.current = setInterval(() => {
      const locNow = LOCATIONS.find(l => l.id === locationId);
      fetchWeather(locNow.lat, locNow.lon);
    }, 10 * 60 * 1000);

    return () => clearInterval(timerRef.current);
  }, [locationId, fetchWeather]);

  const activeLocation = LOCATIONS.find(l => l.id === locationId) || LOCATIONS[0];

  // Build derived values from raw data
  const current = data?.current
    ? {
        temperature: data.current.temperature_2m,
        apparent: data.current.apparent_temperature ?? data.current.temperature_2m,
        humidity: Math.round(data.current.relative_humidity_2m ?? 0),
        wind: data.current.wind_speed_10m ?? 0,
        weatherCode: data.current.weather_code,
        condition: getWMO(data.current.weather_code).sw,
        icon: getWMO(data.current.weather_code).icon,
      }
    : null;

  // Hourly: take from current hour onward, next 24 entries
  const hourlyTimes = data?.hourly?.time || [];
  const nowHour = new Date();
  let hourIndex = hourlyTimes.findIndex(t => new Date(t) > nowHour);
  if (hourIndex === -1) hourIndex = 0;
  const hourly = hourlyTimes.slice(hourIndex, hourIndex + 24).map((t, i) => ({
    time: t,
    hourLabel: new Date(t).toLocaleTimeString('sw-TZ', { hour: '2-digit', minute: '2-digit' }),
    temp: data.hourly.temperature_2m[hourIndex + i],
    precip: data.hourly.precipitation_probability[hourIndex + i] ?? 0,
    code: data.hourly.weather_code[hourIndex + i],
  }));

  // Current precip prob from first hourly entry
  const currentPrecip = hourly.length ? hourly[0].precip : 0;

  // Daily forecast list (exclude today, show next 7)
  const dailyDays = (data?.daily?.time || []).map((date, i) => ({
    date,
    max: data.daily.temperature_2m_max[i],
    min: data.daily.temperature_2m_min[i],
    precip: data.daily.precipitation_probability_max[i] ?? 0,
    code: data.daily.weather_code[i],
    condition: getWMO(data.daily.weather_code[i]).sw,
    icon: getWMO(data.daily.weather_code[i]).icon,
    isToday: date === data.daily.time[0],
  }));

  const weekly = dailyDays.filter(d => !d.isToday).slice(0, 7);

  const dayLabel = (dateStr, isToday) => {
    const d = new Date(dateStr + 'T00:00:00');
    return isToday
      ? d.toLocaleDateString('en-GB', { weekday: 'long' })
      : d.toLocaleDateString('en-GB', { weekday: 'long' });
  };

  if (isLoading) {
    return (
      <section className="weather-widget">
        <div className="container">
          <div className="weather-loading">
            <motion.i
              className="fas fa-sync-alt"
              animate={{ rotate: 360 }}
              transition={{ rotate: { duration: 1.2, repeat: Infinity, ease: 'linear' } }}
            />
            <p>Inapakua hali ya hewa halisi ya {activeLocation.label}...</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="weather-widget">
      <div className="weather-decor decor-1"></div>
      <div className="weather-decor decor-2"></div>

      <div className="container">
        <div className="weather-header">
          <div>
            <span className="weather-eyebrow">Hali ya Hewa ya Wakati Halisi</span>
            <h2>Hali ya Hewa ya Mkoa wa Katavi</h2>
            <p>Taarifa za hali ya hewa halisi za maeneo mbalimbali ya mkoa wa Katavi</p>
          </div>
          <motion.button
            className="weather-refresh"
            onClick={() => fetchWeather(activeLocation.lat, activeLocation.lon)}
            whileTap={{ scale: 0.92 }}
            disabled={refreshing}
          >
            <motion.i
              className="fas fa-sync-alt"
              animate={refreshing ? { rotate: 360 } : { rotate: 0 }}
              transition={refreshing ? { rotate: { duration: 1, repeat: Infinity, ease: 'linear' } } : {}}
            />
            Sasisha
          </motion.button>
        </div>

        {error && <div className="weather-error"><i className="fas fa-exclamation-triangle"></i> {error}</div>}

        <motion.div
          className="weather-content"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {/* Top row: location selector + unit toggle */}
          <div className="weather-toolbar">
            <div className="location-selector">
              {LOCATIONS.map(loc => (
                <button
                  key={loc.id}
                  className={`location-btn ${activeLocation.id === loc.id ? 'active' : ''}`}
                  onClick={() => setLocationId(loc.id)}
                >
                  <i className="fas fa-map-marker-alt"></i>
                  {loc.label}
                </button>
              ))}
            </div>
            <div className="unit-toggle">
              <button
                className={unit === 'C' ? 'active' : ''}
                onClick={() => setUnit('C')}
              >
                °C
              </button>
              <button
                className={unit === 'F' ? 'active' : ''}
                onClick={() => setUnit('F')}
              >
                °F
              </button>
            </div>
          </div>

          {current && (
            <AnimatePresence mode="wait">
              <motion.div
                key={activeLocation.id + (lastUpdated?.getTime() || 0)}
                className="current-weather"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
              >
                <div className="current-main">
                  <div className="current-icon">
                    <i className={current.icon}></i>
                  </div>
                  <div className="current-big">
                    <div className="big-temp">
                      {formatTemp(current.temperature, unit)}
                      <span className="feels-like">
                        (jisikie {formatTemp(current.apparent, unit)})
                      </span>
                    </div>
                    <div className="current-location">
                      <i className="fas fa-map-marker-alt"></i>
                      {activeLocation.label}, Katavi
                    </div>
                  </div>
                </div>

                <div className="current-stats">
                  <div className="stat">
                    <span className="stat-value">{currentPrecip}%</span>
                    <span className="stat-label"><i className="fas fa-cloud-rain"></i> Precipitation</span>
                  </div>
                  <div className="stat">
                    <span className="stat-value">{current.humidity}%</span>
                    <span className="stat-label"><i className="fas fa-tint"></i> Humidity</span>
                  </div>
                  <div className="stat">
                    <span className="stat-value">{formatWind(current.wind, unit)}</span>
                    <span className="stat-label"><i className="fas fa-wind"></i> Wind</span>
                  </div>
                </div>

                <div className="current-meta">
                  <div className="current-condition">{current.condition}</div>
                  <div className="current-datetime">
                    {new Date().toLocaleDateString('en-GB', { weekday: 'long' })}{' '}
                    {new Date().toLocaleTimeString('sw-TZ', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          )}

          {/* Hourly forecast strip */}
          {hourly.length > 0 && (
            <div className="hourly-section">
              <div className="subheading">
                <h3>Weather</h3>
                <div className="hourly-legend">
                  <span>Temperature</span>
                  <span>Precipitation</span>
                  <span>Wind</span>
                </div>
              </div>
              <div className="hourly-scroll">
                {hourly.map((h, i) => (
                  <div className="hourly-cell" key={i}>
                    <div className="hourly-time">{h.hourLabel}</div>
                    <div className="hourly-icon"><i className={getWMO(h.code).icon}></i></div>
                    <div className="hourly-precip">{h.precip}%</div>
                    <div className="hourly-temp">{formatTemp(h.temp, unit)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Weekly forecast list */}
          {weekly.length > 0 && (
            <div className="daily-section">
              <div className="subheading">
                <h3>{weekly.length} day forecast</h3>
              </div>
              <div className="daily-list">
                {weekly.map((day, i) => (
                  <div className="daily-row" key={i}>
                    <div className="daily-date">{dayLabel(day.date, day.isToday)}</div>
                    <div className="daily-icon"><i className={day.icon}></i></div>
                    <div className="daily-condition">{day.condition}</div>
                    <div className="daily-precip"><i className="fas fa-tint"></i> {day.precip}%</div>
                    <div className="daily-min">{formatTemp(day.min, unit)}</div>
                    <div className="daily-max">{formatTemp(day.max, unit)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Advisory */}
          {current && (
            <motion.div className="weather-advisory">
              <div className="advisory-icon">
                <i className="fas fa-seedling"></i>
              </div>
              <div className="advisory-content">
                <h4>Ushauri wa Kilimo</h4>
                <p>{getAdvisory(current.weatherCode)}</p>
              </div>
            </motion.div>
          )}

          {/* Footer */}
          <div className="weather-footer-row">
            {lastUpdated && (
              <div className="weather-updated">
                <i className="fas fa-clock"></i>
                Imesasishwa: {lastUpdated.toLocaleTimeString('sw-TZ', { hour: '2-digit', minute: '2-digit' })}
              </div>
            )}
            <motion.button
              className="weather-cta"
              onClick={() => onPageChange('weather')}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
            >
              <i className="fas fa-chart-line"></i>
              Maelezo Zaidi ya Hali ya Hewa
            </motion.button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default WeatherWidget;
