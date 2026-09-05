import React, { useState, useEffect, useCallback } from 'react';
import Loading from '../components/Loading/Loading';
import { weatherAPI } from '../api/client';
import './CSS/Weather.css';

const DEFAULT_ZONES = [
  { name: 'Mpanda', district: 'Mpanda', ward: 'Mpanda Mjini', lat: -6.346, lon: 31.072 },
  { name: 'Mlele', district: 'Mlele', ward: 'Mlele Mjini', lat: -6.9, lon: 31.6 },
  { name: 'Nsimbo', district: 'Nsimbo', ward: 'Sitalike', lat: -6.5, lon: 31.1 },
  { name: 'Karema', district: 'Mpanda', ward: 'Karema', lat: -6.817, lon: 30.44 },
];

const SW_DAYS = ['Jumapili', 'Jumatatu', 'Jumanne', 'Jumatano', 'Alhamisi', 'Ijumaa', 'Jumamosi'];

const dayLabel = (index, dateStr) => {
  if (index === 0) return 'Leo';
  if (index === 1) return 'Kesho';
  if (index === 2) return 'Kesho Kutwa';
  try {
    const d = new Date(`${dateStr}T00:00:00`);
    return SW_DAYS[d.getDay()] || dateStr;
  } catch {
    return dateStr;
  }
};

const Weather = ({ onRefresh }) => {
  const [zones, setZones] = useState(DEFAULT_ZONES);
  const [selectedLocation, setSelectedLocation] = useState('Mpanda');
  const [current, setCurrent] = useState(null);
  const [daily, setDaily] = useState([]);
  const [advisories, setAdvisories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Load zones from backend, fall back to defaults if the API is unavailable
  useEffect(() => {
    let mounted = true;
    weatherAPI.getZones()
      .then(res => {
        if (!mounted) return;
        const list = res.data?.zones?.filter(z => z.active) || [];
        if (list.length) {
          const zoneNames = list.map(z => z.name);
          setZones(list);
          if (!zoneNames.includes(selectedLocation)) setSelectedLocation(list[0].name);
        }
      })
      .catch(() => { /* use defaults */ });
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchForecast = useCallback(async (zone) => {
    setLoading(true);
    setError(false);
    try {
      const res = await weatherAPI.getForecast({ lat: zone.lat, lon: zone.lon, days: 7 });
      setCurrent(res.data.current);
      setDaily(res.data.daily || []);
      setAdvisories(res.data.advisories || []);
    } catch (err) {
      console.error('Weather fetch error:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const zone = zones.find(z => z.name === selectedLocation) || zones[0];
    if (!zone) return;
    fetchForecast(zone);
  }, [selectedLocation, zones, fetchForecast]);

  const getWeatherIcon = (desc = '') => {
    const d = String(desc).toLowerCase();
    if (d.includes('mvua') || d.includes('umande') || d.includes('mkunju') || d.includes('drizzle')) return 'fas fa-cloud-rain';
    if (d.includes('dondoko') || d.includes('umeme') || d.includes('thunder')) return 'fas fa-bolt';
    if (d.includes('ukungu') || d.includes('fog')) return 'fas fa-smog';
    if (d.includes('jua') || d.includes('wazi') || d.includes('clear')) return 'fas fa-sun';
    if (d.includes('mawingu') || d.includes('cloud')) return 'fas fa-cloud';
    return 'fas fa-cloud-sun';
  };

  const getAdvisory = (cur, advisories) => {
    if (advisories.length) {
      const top = advisories[0];
      return {
        type: top.type === 'danger' ? 'warning' : (top.type === 'warning' ? 'warning' : 'good'),
        title: top.type === 'danger' ? 'Tahadhari Kubwa' : top.type === 'warning' ? 'Tahadhari' : 'Ushauri',
        message: top.message,
      };
    }
    if (!cur) {
      return {
        type: 'normal',
        title: 'Hali ya Kawaida',
        message: 'Endelea na shughuli za kawaida za kilimo. Fuata ratiba yako ya kilimo.'
      };
    }
    if (String(cur.description).toLowerCase().includes('mvua')) {
      return {
        type: 'good',
        title: 'Hali Nzuri ya Kupanda',
        message: 'Mvua inafaa kwa kupanda mimea mpya na kutia mbolea. Tumia fursa hii.'
      };
    }
    if (String(cur.description).toLowerCase().includes('wazi')) {
      return {
        type: 'warning',
        title: 'Umwagiliaji Unahitajika',
        message: 'Jua kali linahitaji umwagiliaji wa mara kwa mara. Epuka kupalilia wakati wa jua kali.'
      };
    }
    return {
      type: 'normal',
      title: 'Hali ya Kawaida',
      message: 'Endelea na shughuli za kawaida za kilimo. Fuata ratiba yako ya kilimo.'
    };
  };

  if (loading) {
    return <Loading message="Inapakia taarifa za hali ya hewa..." />;
  }

  if (error || !current) {
    return (
      <div className="page weather-page">
        <div className="weather-error">
          <i className="fas fa-exclamation-triangle"></i>
          <h3>Huduma ya Hali ya Hewa Haipatikani</h3>
          <p>Samahani, hatuwezi kupata taarifa za hali ya hewa kwa sasa.</p>
          <button className="btn btn-primary" onClick={() => fetchForecast(zones.find(z => z.name === selectedLocation) || zones[0])}>
            <i className="fas fa-sync-alt"></i> Jaribu Tena
          </button>
        </div>
      </div>
    );
  }

  const forecast = daily.slice(0, 5);
  const advisory = getAdvisory(current, advisories);
  const today = daily[0] || {};

  return (
    <div className="page weather-page">
      <div className="weather-container">
        <div className="container">
          {/* Header */}
          <div className="weather-header">
            <h1>Hali ya Hewa - Mkoa wa Katavi</h1>
            <p>Pata taarifa za hali ya hewa na ushauri wa kilimo kulingana na hali ya anga</p>
          </div>

          {/* Location Selector */}
          <div className="location-selector">
            {zones.map(location => (
              <button
                key={location.name}
                className={`location-btn ${selectedLocation === location.name ? 'active' : ''}`}
                onClick={() => setSelectedLocation(location.name)}
              >
                {location.name}
              </button>
            ))}
          </div>

          {/* Current Weather */}
          <div className="current-weather-section">
            <div className="current-weather-card">
              <div className="weather-main">
                <div className="weather-icon-large">
                  <i className={getWeatherIcon(current.description)}></i>
                </div>
                <div className="weather-info">
                  <div className="temperature-large">{Math.round(current.temperature)}°C</div>
                  <div className="condition-large">{current.description}</div>
                  <div className="location-large">
                    <i className="fas fa-map-marker-alt"></i>
                    {selectedLocation}
                  </div>
                </div>
              </div>

              <div className="weather-details-grid">
                <div className="detail-card">
                  <i className="fas fa-tint"></i>
                  <div className="detail-content">
                    <div className="detail-value">{current.humidity}%</div>
                    <div className="detail-label">Unyevu</div>
                  </div>
                </div>
                <div className="detail-card">
                  <i className="fas fa-cloud-rain"></i>
                  <div className="detail-content">
                    <div className="detail-value">{today.precipitationProbability != null ? `${today.precipitationProbability}%` : '—'}</div>
                    <div className="detail-label">Uwezekano wa Mvua</div>
                  </div>
                </div>
                <div className="detail-card">
                  <i className="fas fa-wind"></i>
                  <div className="detail-content">
                    <div className="detail-value">{current.windSpeed != null ? `${Math.round(current.windSpeed)} km/h` : '—'}</div>
                    <div className="detail-label">Upepo</div>
                  </div>
                </div>
                <div className="detail-card">
                  <i className="fas fa-temperature-high"></i>
                  <div className="detail-content">
                    <div className="detail-value">{(today.maxTemp != null ? `${Math.round(today.maxTemp)}` : current.temperature)}°C</div>
                    <div className="detail-label">Joto la Juu</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Weather Advisory */}
          <div className={`advisory-card ${advisory.type}`}>
            <div className="advisory-icon">
              <i className="fas fa-seedling"></i>
            </div>
            <div className="advisory-content">
              <h3>{advisory.title}</h3>
              <p>{advisory.message}</p>
            </div>
          </div>

          {/* 5-Day Forecast */}
          <div className="forecast-section">
            <h2>Tabiri ya Siku 5</h2>
            <div className="forecast-grid">
              {forecast.map((day, index) => (
                <div key={index} className="forecast-card">
                  <div className="forecast-day">{dayLabel(index, day.date)}</div>
                  <div className="forecast-icon">
                    <i className={getWeatherIcon(day.description)}></i>
                  </div>
                  <div className="forecast-temp">{Math.round(day.maxTemp)}°C</div>
                  <div className="forecast-condition">{day.description}</div>
                  <div className="forecast-rain">
                    <i className="fas fa-cloud-rain"></i>
                    {day.precipitationProbability != null ? `${day.precipitationProbability}%` : '—'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Seasonal Information */}
          <div className="seasonal-info">
            <h2>Taarifa za Msimu</h2>
            <div className="seasonal-cards">
              <div className="seasonal-card">
                <h3>Msimu wa Masika</h3>
                <p><strong>Muda:</strong> Machi - Mei</p>
                <p><strong>Shughuli:</strong> Upandaji mkuu wa mazao</p>
                <p><strong>Ushauri:</strong> Panda mapema na tumia mbolea ya kuanzia</p>
              </div>
              <div className="seasonal-card">
                <h3>Msimu wa Kipupwe</h3>
                <p><strong>Muda:</strong> Juni - Agosti</p>
                <p><strong>Shughuli:</strong> Uvunaji na uhifadhi wa mazao</p>
                <p><strong>Ushauri:</strong> Anza uvunaji asubuhi na uhifadhi mazao kwenye sehemu baridi</p>
              </div>
              <div className="seasonal-card">
                <h3>Msimu wa Vuli</h3>
                <p><strong>Muda:</strong> Septemba - Novemba</p>
                <p><strong>Shughuli:</strong> Upandaji wa mazao ya msimu mfupi</p>
                <p><strong>Ushauri:</strong> Tumia mbegu za msimu mfupi na epuka maeneo yanayofurika</p>
              </div>
            </div>
          </div>

          {/* SMS Alert Signup */}
          <div className="sms-alert">
            <div className="sms-content">
              <h3>Pokea Arifa za Hali ya Hewa kwenye Simu</h3>
              <p>Jiandikishe kupokea arifa za hali ya hewa kwenye simu yako kupitia SMS</p>
              <div className="sms-form">
                <input
                  type="tel"
                  placeholder="Weka namba yako ya simu"
                  className="sms-input"
                />
                <button className="btn btn-primary">
                  <i className="fas fa-bell"></i> Jiandikishe
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Weather;