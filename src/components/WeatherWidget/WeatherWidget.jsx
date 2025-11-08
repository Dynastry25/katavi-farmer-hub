import React, { useState, useEffect } from 'react';
import './WeatherWidget.css';

const WeatherWidget = ({ onPageChange }) => {
  const [weatherData, setWeatherData] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState('Mpanda');

  useEffect(() => {
    // Simulate API call
    const mockWeatherData = {
      Mpanda: {
        temperature: 25,
        condition: 'Mawingu',
        humidity: 65,
        rainfall: '2.5 mm',
        wind: '12 km/h',
        forecast: ['Jua', 'Mawingu', 'Mvua Nyeupe']
      },
      Mlele: {
        temperature: 27,
        condition: 'Jua',
        humidity: 58,
        rainfall: '0 mm',
        wind: '10 km/h',
        forecast: ['Jua', 'Jua', 'Mawingu']
      },
      Nsimbo: {
        temperature: 26,
        condition: 'Mvua Nyeupe',
        humidity: 72,
        rainfall: '5.0 mm',
        wind: '8 km/h',
        forecast: ['Mvua', 'Mawingu', 'Jua']
      }
    };

    setWeatherData(mockWeatherData);
  }, []);

  const locations = ['Mpanda', 'Mlele', 'Nsimbo'];

  const getWeatherIcon = (condition) => {
    switch (condition) {
      case 'Jua': return 'fas fa-sun';
      case 'Mawingu': return 'fas fa-cloud';
      case 'Mvua Nyeupe': return 'fas fa-cloud-rain';
      case 'Mvua': return 'fas fa-cloud-showers-heavy';
      default: return 'fas fa-cloud';
    }
  };

  if (!weatherData) {
    return (
      <section className="weather-widget">
        <div className="container">
          <div className="weather-loading">
            <i className="fas fa-cloud-sun"></i>
            <p>Inapakia taarifa za hali ya hewa...</p>
          </div>
        </div>
      </section>
    );
  }

  const currentWeather = weatherData[selectedLocation];

  return (
    <section className="weather-widget">
      <div className="container">
        <div className="weather-header">
          <h2>Hali ya Hewa ya Mkoa wa Katavi</h2>
          <p>Pata taarifa za hali ya hewa kwa maeneo mbalimbali ya mkoa</p>
        </div>

        <div className="weather-content">
          {/* Location Selector */}
          <div className="location-selector">
            {locations.map(location => (
              <button
                key={location}
                className={`location-btn ${selectedLocation === location ? 'active' : ''}`}
                onClick={() => setSelectedLocation(location)}
              >
                {location}
              </button>
            ))}
          </div>

          {/* Current Weather */}
          <div className="current-weather">
            <div className="weather-main">
              <div className="weather-icon">
                <i className={getWeatherIcon(currentWeather.condition)}></i>
              </div>
              <div className="weather-info">
                <div className="temperature">{currentWeather.temperature}°C</div>
                <div className="condition">{currentWeather.condition}</div>
                <div className="location">{selectedLocation}</div>
              </div>
            </div>

            <div className="weather-details">
              <div className="detail-item">
                <i className="fas fa-tint"></i>
                <div>
                  <div className="detail-value">{currentWeather.humidity}%</div>
                  <div className="detail-label">Unyevu</div>
                </div>
              </div>
              <div className="detail-item">
                <i className="fas fa-cloud-rain"></i>
                <div>
                  <div className="detail-value">{currentWeather.rainfall}</div>
                  <div className="detail-label">Mvua</div>
                </div>
              </div>
              <div className="detail-item">
                <i className="fas fa-wind"></i>
                <div>
                  <div className="detail-value">{currentWeather.wind}</div>
                  <div className="detail-label">Upepo</div>
                </div>
              </div>
            </div>
          </div>

          {/* Weather Forecast */}
          <div className="weather-forecast">
            <h3>Tabiri ya Vijuma Vitatu</h3>
            <div className="forecast-grid">
              {currentWeather.forecast.map((day, index) => (
                <div key={index} className="forecast-day">
                  <div className="forecast-date">
                    {index === 0 ? 'Kesho' : index === 1 ? 'Kesho Kutwa' : 'Kesho Tatu'}
                  </div>
                  <div className="forecast-icon">
                    <i className={getWeatherIcon(day)}></i>
                  </div>
                  <div className="forecast-condition">{day}</div>
                  <div className="forecast-temp">{currentWeather.temperature + index - 1}°C</div>
                </div>
              ))}
            </div>
          </div>

          {/* Weather Advisory */}
          <div className="weather-advisory">
            <div className="advisory-icon">
              <i className="fas fa-seedling"></i>
            </div>
            <div className="advisory-content">
              <h4>Ushauri wa Kilimo</h4>
              <p>
                {currentWeather.condition === 'Mvua' || currentWeather.condition === 'Mvua Nyeupe' 
                  ? 'Hali nzuri ya kupanda mimea. Tumia fursa hii kupanda na kutia mbolea.'
                  : 'Panda mimea upate kumwagilia mara kwa mara. Epuka kupalilia wakati wa jua kali.'
                }
              </p>
            </div>
          </div>

          {/* CTA Button */}
          <div className="weather-cta">
            <button 
              className="btn btn-primary"
              onClick={() => onPageChange('weather')}
            >
              <i className="fas fa-chart-line"></i>
              Angalia Maelezo Zaidi ya Hali ya Hewa
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WeatherWidget;