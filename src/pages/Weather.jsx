import React, { useState, useEffect } from 'react';
import Navigation from '../components/Navbar/Navbar';
import Footer from '../components/Footer/Footer';
import './CSS/Weather.css';

const Weather = ({ onPageChange, onAuth, user, weatherData }) => {
  const [selectedLocation, setSelectedLocation] = useState('Mpanda');
  const [forecastData, setForecastData] = useState(null);

  const locations = [
    { value: 'Mpanda', label: 'Mpanda' },
    { value: 'Mlele', label: 'Mlele' },
    { value: 'Nsimbo', label: 'Nsimbo' },
    { value: 'Karema', label: 'Karema' }
  ];

  useEffect(() => {
    // Simulate forecast data
    const mockForecast = {
      Mpanda: [
        { day: 'Leo', condition: 'Mawingu', temp: 25, rain: '30%' },
        { day: 'Kesho', condition: 'Mvua Nyeupe', temp: 24, rain: '60%' },
        { day: 'Kesho Kutwa', condition: 'Mawingu', temp: 26, rain: '20%' },
        { day: 'Jumatano', condition: 'Jua', temp: 27, rain: '10%' },
        { day: 'Alhamisi', condition: 'Jua', temp: 28, rain: '0%' }
      ],
      Mlele: [
        { day: 'Leo', condition: 'Jua', temp: 27, rain: '10%' },
        { day: 'Kesho', condition: 'Mawingu', temp: 26, rain: '30%' },
        { day: 'Kesho Kutwa', condition: 'Mvua Nyeupe', temp: 25, rain: '70%' },
        { day: 'Jumatano', condition: 'Mawingu', temp: 26, rain: '40%' },
        { day: 'Alhamisi', condition: 'Jua', temp: 28, rain: '5%' }
      ],
      Nsimbo: [
        { day: 'Leo', condition: 'Mvua Nyeupe', temp: 26, rain: '80%' },
        { day: 'Kesho', condition: 'Mvua', temp: 24, rain: '90%' },
        { day: 'Kesho Kutwa', condition: 'Mawingu', temp: 25, rain: '50%' },
        { day: 'Jumatano', condition: 'Mawingu', temp: 26, rain: '30%' },
        { day: 'Alhamisi', condition: 'Jua', temp: 27, rain: '10%' }
      ],
      Karema: [
        { day: 'Leo', condition: 'Mawingu', temp: 26, rain: '40%' },
        { day: 'Kesho', condition: 'Jua', temp: 28, rain: '5%' },
        { day: 'Kesho Kutwa', condition: 'Jua', temp: 29, rain: '0%' },
        { day: 'Jumatano', condition: 'Mawingu', temp: 27, rain: '20%' },
        { day: 'Alhamisi', condition: 'Mawingu', temp: 26, rain: '30%' }
      ]
    };

    setForecastData(mockForecast);
  }, []);

  const getWeatherIcon = (condition) => {
    switch (condition) {
      case 'Jua': return 'fas fa-sun';
      case 'Mawingu': return 'fas fa-cloud';
      case 'Mvua Nyeupe': return 'fas fa-cloud-rain';
      case 'Mvua': return 'fas fa-cloud-showers-heavy';
      default: return 'fas fa-cloud';
    }
  };

  const getAdvisory = (weather) => {
    if (weather.condition.includes('Mvua')) {
      return {
        type: 'good',
        title: 'Hali Nzuri ya Kupanda',
        message: 'Mvua inafaa kwa kupanda mimea mpya na kutia mbolea. Tumia fursa hii.'
      };
    } else if (weather.condition === 'Jua') {
      return {
        type: 'warning',
        title: 'Umwagiliaji Unahitajika',
        message: 'Jua kali linahitaji umwagiliaji wa mara kwa mara. Epuka kupalilia wakati wa jua kali.'
      };
    } else {
      return {
        type: 'normal',
        title: 'Hali ya Kawaida',
        message: 'Endelea na shughuli za kawaida za kilimo. Fuata ratiba yako ya kilimo.'
      };
    }
  };

  if (!weatherData || !forecastData) {
    return (
      <div className="page weather-page">
        <Navigation 
          currentPage="weather"
          onPageChange={onPageChange}
          onAuth={onAuth}
          user={user}
        />
        <div className="weather-loading">
          <i className="fas fa-cloud-sun"></i>
          <p>Inapakia taarifa za hali ya hewa...</p>
        </div>
        <Footer onPageChange={onPageChange} />
      </div>
    );
  }

  const currentWeather = weatherData[selectedLocation];
  const forecast = forecastData[selectedLocation];
  const advisory = getAdvisory(currentWeather);

  return (
    <div className="page weather-page">
      <Navigation 
        currentPage="weather"
        onPageChange={onPageChange}
        onAuth={onAuth}
        user={user}
      />
      
      <div className="weather-container">
        <div className="container">
          {/* Header */}
          <div className="weather-header">
            <h1>Hali ya Hewa - Mkoa wa Katavi</h1>
            <p>Pata taarifa za hali ya hewa na ushauri wa kilimo kulingana na hali ya anga</p>
          </div>

          {/* Location Selector */}
          <div className="location-selector">
            {locations.map(location => (
              <button
                key={location.value}
                className={`location-btn ${selectedLocation === location.value ? 'active' : ''}`}
                onClick={() => setSelectedLocation(location.value)}
              >
                {location.label}
              </button>
            ))}
          </div>

          {/* Current Weather */}
          <div className="current-weather-section">
            <div className="current-weather-card">
              <div className="weather-main">
                <div className="weather-icon-large">
                  <i className={getWeatherIcon(currentWeather.condition)}></i>
                </div>
                <div className="weather-info">
                  <div className="temperature-large">{currentWeather.temperature}°C</div>
                  <div className="condition-large">{currentWeather.condition}</div>
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
                    <div className="detail-value">{currentWeather.humidity}%</div>
                    <div className="detail-label">Unyevu</div>
                  </div>
                </div>
                <div className="detail-card">
                  <i className="fas fa-cloud-rain"></i>
                  <div className="detail-content">
                    <div className="detail-value">{currentWeather.rainfall}</div>
                    <div className="detail-label">Mvua</div>
                  </div>
                </div>
                <div className="detail-card">
                  <i className="fas fa-wind"></i>
                  <div className="detail-content">
                    <div className="detail-value">{currentWeather.wind}</div>
                    <div className="detail-label">Upepo</div>
                  </div>
                </div>
                <div className="detail-card">
                  <i className="fas fa-temperature-high"></i>
                  <div className="detail-content">
                    <div className="detail-value">28°C</div>
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
                  <div className="forecast-day">{day.day}</div>
                  <div className="forecast-icon">
                    <i className={getWeatherIcon(day.condition)}></i>
                  </div>
                  <div className="forecast-temp">{day.temp}°C</div>
                  <div className="forecast-condition">{day.condition}</div>
                  <div className="forecast-rain">
                    <i className="fas fa-cloud-rain"></i>
                    {day.rain}
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

      <Footer onPageChange={onPageChange} />
    </div>
  );
};

export default Weather;