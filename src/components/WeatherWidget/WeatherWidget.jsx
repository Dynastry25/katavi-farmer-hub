import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './WeatherWidget.css';

const WeatherWidget = ({ onPageChange }) => {
  const [weatherData, setWeatherData] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState('Mpanda');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
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

    setTimeout(() => {
      setWeatherData(mockWeatherData);
      setIsLoading(false);
    }, 1500);
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

  // Enhanced animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        delayChildren: 0.3,
        staggerChildren: 0.15
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 120,
        damping: 12
      }
    }
  };

  const locationButtonVariants = {
    initial: { scale: 1 },
    hover: { 
      scale: 1.05,
      transition: { type: "spring", stiffness: 400, damping: 10 }
    },
    tap: { scale: 0.95 }
  };

  const weatherIconVariants = {
    initial: { scale: 1, rotate: 0 },
    animate: { 
      scale: [1, 1.1, 1],
      rotate: [0, 5, -5, 0],
      transition: { 
        duration: 3,
        repeat: Infinity,
        repeatType: "reverse"
      }
    }
  };

  const temperatureVariants = {
    initial: { scale: 0.8, opacity: 0 },
    animate: { 
      scale: 1, 
      opacity: 1,
      transition: { 
        type: "spring", 
        stiffness: 200,
        delay: 0.5 
      }
    }
  };

  if (isLoading) {
    return (
      <section className="weather-widget">
        <div className="container">
          <motion.div 
            className="weather-loading glass-effect"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <motion.i 
              className="fas fa-cloud-sun"
              animate={{ 
                rotate: 360,
                scale: [1, 1.2, 1]
              }}
              transition={{ 
                rotate: { duration: 4, repeat: Infinity, ease: "linear" },
                scale: { duration: 2, repeat: Infinity }
              }}
            />
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              Inapakia taarifa za hali ya hewa...
            </motion.p>
            <motion.div
              style={{
                width: '100%',
                height: '4px',
                background: 'rgba(255,255,255,0.3)',
                borderRadius: '2px',
                marginTop: '1rem',
                overflow: 'hidden'
              }}
            >
              <motion.div
                style={{
                  width: '100%',
                  height: '100%',
                  background: 'var(--primary)',
                  borderRadius: '2px'
                }}
                initial={{ x: '-100%' }}
                animate={{ x: '100%' }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              />
            </motion.div>
          </motion.div>
        </div>
      </section>
    );
  }

  const currentWeather = weatherData[selectedLocation];

  return (
    <section className="weather-widget">
      <div className="container">
        <motion.div 
          className="weather-header"
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, type: "spring" }}
        >
          <motion.h2
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            Hali ya Hewa ya Mkoa wa Katavi
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            Pata taarifa za hali ya hewa kwa maeneo mbalimbali ya mkoa
          </motion.p>
        </motion.div>

        <motion.div 
          className="weather-content"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Location Selector */}
          <motion.div 
            className="location-selector"
            variants={itemVariants}
          >
            {locations.map(location => (
              <motion.button
                key={location}
                className={`location-btn ${selectedLocation === location ? 'active' : ''}`}
                onClick={() => setSelectedLocation(location)}
                variants={locationButtonVariants}
                initial="initial"
                whileHover="hover"
                whileTap="tap"
              >
                {location}
              </motion.button>
            ))}
          </motion.div>

          {/* Current Weather */}
          <AnimatePresence mode="wait">
            <motion.div 
              key={selectedLocation}
              className="current-weather"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              transition={{ duration: 0.3 }}
            >
              <motion.div 
                className="weather-main"
                variants={itemVariants}
              >
                <motion.div 
                  className="weather-icon"
                  variants={weatherIconVariants}
                  initial="initial"
                  animate="animate"
                >
                  <i className={getWeatherIcon(currentWeather.condition)}></i>
                </motion.div>
                <div className="weather-info">
                  <motion.div 
                    className="temperature"
                    variants={temperatureVariants}
                    initial="initial"
                    animate="animate"
                    key={currentWeather.temperature}
                  >
                    {currentWeather.temperature}°C
                  </motion.div>
                  <motion.div 
                    className="condition"
                    variants={itemVariants}
                  >
                    {currentWeather.condition}
                  </motion.div>
                  <motion.div 
                    className="location"
                    variants={itemVariants}
                  >
                    <i className="fas fa-map-marker-alt"></i>
                    {selectedLocation}
                  </motion.div>
                </div>
              </motion.div>

              <motion.div 
                className="weather-details"
                variants={containerVariants}
              >
                <motion.div 
                  className="detail-item"
                  variants={itemVariants}
                  whileHover={{ 
                    scale: 1.05,
                    y: -2,
                    transition: { type: "spring", stiffness: 300 }
                  }}
                >
                  <motion.i 
                    className="fas fa-tint"
                    whileHover={{ scale: 1.2, rotate: 10 }}
                  />
                  <div>
                    <div className="detail-value">{currentWeather.humidity}%</div>
                    <div className="detail-label">Unyevu</div>
                  </div>
                </motion.div>
                <motion.div 
                  className="detail-item"
                  variants={itemVariants}
                  whileHover={{ 
                    scale: 1.05,
                    y: -2,
                    transition: { type: "spring", stiffness: 300 }
                  }}
                >
                  <motion.i 
                    className="fas fa-cloud-rain"
                    whileHover={{ scale: 1.2, rotate: 10 }}
                  />
                  <div>
                    <div className="detail-value">{currentWeather.rainfall}</div>
                    <div className="detail-label">Mvua</div>
                  </div>
                </motion.div>
                <motion.div 
                  className="detail-item"
                  variants={itemVariants}
                  whileHover={{ 
                    scale: 1.05,
                    y: -2,
                    transition: { type: "spring", stiffness: 300 }
                  }}
                >
                  <motion.i 
                    className="fas fa-wind"
                    whileHover={{ scale: 1.2, rotate: 10 }}
                  />
                  <div>
                    <div className="detail-value">{currentWeather.wind}</div>
                    <div className="detail-label">Upepo</div>
                  </div>
                </motion.div>
              </motion.div>
            </motion.div>
          </AnimatePresence>

          {/* Weather Forecast */}
          <motion.div 
            className="weather-forecast"
            variants={itemVariants}
          >
            <motion.h3
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              Tabiri ya Siku Tatu
            </motion.h3>
            <div className="forecast-grid">
              {currentWeather.forecast.map((day, index) => (
                <motion.div 
                  key={index} 
                  className="forecast-day"
                  variants={itemVariants}
                  whileHover={{ 
                    scale: 1.05,
                    y: -5,
                    transition: { type: "spring", stiffness: 300 }
                  }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 + index * 0.1 }}
                >
                  <div className="forecast-date">
                    {index === 0 ? 'Kesho' : index === 1 ? 'Kesho Kutwa' : 'Kesho Tatu'}
                  </div>
                  <motion.div 
                    className="forecast-icon"
                    whileHover={{ scale: 1.2, rotate: 10 }}
                    transition={{ type: "spring", stiffness: 200 }}
                  >
                    <i className={getWeatherIcon(day)}></i>
                  </motion.div>
                  <div className="forecast-condition">{day}</div>
                  <div className="forecast-temp">{currentWeather.temperature + index - 1}°C</div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Weather Advisory */}
          <motion.div 
            className="weather-advisory"
            variants={itemVariants}
            whileHover={{ 
              scale: 1.02,
              y: -2,
              transition: { type: "spring", stiffness: 300 }
            }}
          >
            <motion.div 
              className="advisory-icon"
              animate={{ 
                y: [0, -10, 0],
                scale: [1, 1.1, 1],
                transition: { duration: 3, repeat: Infinity }
              }}
            >
              <i className="fas fa-seedling"></i>
            </motion.div>
            <div className="advisory-content">
              <h4>Ushauri wa Kilimo</h4>
              <p>
                {currentWeather.condition === 'Mvua' || currentWeather.condition === 'Mvua Nyeupe' 
                  ? 'Hali nzuri ya kupanda mimea. Tumia fursa hii kupanda na kutia mbolea.'
                  : 'Panda mimea upate kumwagilia mara kwa mara. Epuka kupalilia wakati wa jua kali.'
                }
              </p>
            </div>
          </motion.div>

          {/* CTA Button */}
          <motion.div 
            className="weather-cta"
            variants={itemVariants}
          >
            <motion.button 
              className="btn btn-primary"
              onClick={() => onPageChange('weather')}
              whileHover={{ 
                scale: 1.05,
                y: -2,
                boxShadow: "0 12px 25px rgba(0, 0, 0, 0.2)"
              }}
              whileTap={{ scale: 0.95 }}
              style={{
                background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
                border: 'none',
                padding: '1rem 2rem',
                fontSize: '1.1rem',
                borderRadius: 'var(--radius)'
              }}
            >
              <motion.i 
                className="fas fa-chart-line"
                animate={{ 
                  x: [0, 5, 0],
                  transition: { duration: 1.5, repeat: Infinity }
                }}
              />
              &nbsp; Angalia Maelezo Zaidi ya Hali ya Hewa
            </motion.button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default WeatherWidget;