import React from 'react';
import './Overview.css';

// Import placeholder images - utahitaji kuweka hizi images katika folder yako ya assets
import MpungaImage from '../assets/mpunga.jpg';
import MahindiImage from '../assets/mahindi.jpeg';
import KarangaImage from '../assets/karanga.jpeg';
import AlizetiImage from '../assets/alizeti.jpeg';
import WeatherImage from '../assets/weather.jpg';
import SoilImage from '../assets/udongo.jpg';
import InputsImage from '../assets/mpunga.jpg';
import AdvisoryImage from '../assets/ushauri.jpeg';

const Overview = ({ onPageChange }) => {
  // Data ya mazao 4 mkuu ya Katavi - sasa na picha halisi
  const mainCrops = [
    {
      id: 1,
      name: 'Mahindi',
      image: MahindiImage,
      description: 'Mazao ya mahindi yanakua vizuri katika mkoa wa Katavi na ndio zao kuu la chakula',
      production: 'Tani 50,000 kwa mwaka',
      season: 'Masika na Vuli'
    },
    {
      id: 2,
      name: 'Mpunga',
      image: MpungaImage,
      description: 'Katavi ina maeneo mengi yenye udongo wa mfinyanzi unaofaa kwa kilimo cha mpunga',
      production: 'Tani 30,000 kwa mwaka',
      season: 'Majira ya mvua'
    },
    {
      id: 3,
      name: 'Karanga',
      image: KarangaImage,
      description: 'Mazao ya karanga yanakua vizuri na ni chanzo kizuri cha mapato kwa wakulima',
      production: 'Tani 15,000 kwa mwaka',
      season: 'Msimu wa kiangazi'
    },
    {
      id: 4,
      name: 'Alizeti',
      image: AlizetiImage,
      description: 'Mazao mapya yanayokua kasi na kuleta faida kubwa kwa wakulima',
      production: 'Tani 8,000 kwa mwaka',
      season: 'Msimu wa kiangazi'
    }
  ];

  // Takwimu za mkoa wa Katavi
  const kataviStats = [
    { label: 'Eneo la Kilimo', value: '45,843 km²', icon: '🌍' },
    { label: 'Wakulima', value: '250,000+', icon: '👨‍🌾' },
    { label: 'Uzalishaji wa Chakula', value: '120,000 Tani', icon: '📊' },
    { label: 'Mito mikuu', value: '4', icon: '💧' }
  ];

  return (
    <section className="overview">
      <div className="container">
        <div className="overview-header">
          <h2>Ukaguzi wa Mkoa wa Katavi</h2>
          <p>Taarifa muhimu kuhusu kilimo, hali ya hewa, na rasilimali za kilimo katika mkoa wetu</p>
        </div>

        {/* Sehemu ya Mazao */}
        <div className="overview-section">
          <div className="section-header">
            <h3>Mazao Mikuu ya Katavi</h3>
            <button 
              className="view-all-btn"
              onClick={() => onPageChange('market')}
            >
              Angalia Mazao Yote <i className="fas fa-arrow-right"></i>
            </button>
          </div>
          <div className="crops-grid">
            {mainCrops.map(crop => (
              <div key={crop.id} className="crop-card">
                <div className="crop-image">
                  <img src={crop.image} alt={crop.name} />
                  <div className="crop-overlay">
                    <span className="crop-name">{crop.name}</span>
                  </div>
                </div>
                <div className="crop-content">
                  <h4>{crop.name}</h4>
                  <p>{crop.description}</p>
                  <div className="crop-details">
                    <span className="crop-production">
                      <i className="fas fa-chart-bar"></i> {crop.production}
                    </span>
                    <span className="crop-season">
                      <i className="fas fa-calendar-alt"></i> {crop.season}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="overview-grid">
          {/* Hali ya Hewa */}
          <div className="overview-card weather-card">
            <div className="card-header">
              <div className="card-icon">🌤️</div>
              <h4>Hali ya Hewa</h4>
            </div>
            <div className="card-image">
              <img src={WeatherImage} alt="Hali ya hewa Katavi" />
            </div>
            <div className="weather-preview">
              <div className="weather-info">
                <div className="weather-temp">28°C</div>
                <div className="weather-desc">Mvua kidogo</div>
                <div className="weather-location">Mpanda, Katavi</div>
              </div>
            </div>
            <p>Hali ya hewa inafaa kwa kilimo cha mazao mbalimbali. Mvua za masika zinaendelea.</p>
            <button 
              className="card-action-btn"
              onClick={() => onPageChange('weather')}
            >
              Angalia Hali ya Hewa <i className="fas fa-external-link-alt"></i>
            </button>
          </div>

          {/* Aina ya Udongo */}
          <div className="overview-card soil-card">
            <div className="card-header">
              <div className="card-icon">🌱</div>
              <h4>Aina za Udongo</h4>
            </div>
            <div className="card-image">
              <img src={SoilImage} alt="Udongo wa Katavi" />
            </div>
            <div className="soil-preview">
              <div className="soil-types">
                <span className="soil-type">Udongo Mweusi</span>
                <span className="soil-type">Mfinyanzi</span>
                <span className="soil-type">Mchanga</span>
              </div>
            </div>
            <p>Udongo wenye rutuba unaofaa kwa kilimo cha mazao mbalimbali. Unahitaji udongo bora?</p>
            <button 
              className="card-action-btn"
              onClick={() => onPageChange('advice')}
            >
              Pata Ushauri <i className="fas fa-seedling"></i>
            </button>
          </div>

          {/* Maduka ya Pembejeo */}
          <div className="overview-card inputs-card">
            <div className="card-header">
              <div className="card-icon">🛒</div>
              <h4>Maduka ya Pembejeo</h4>
            </div>
            <div className="card-image">
              <img src={InputsImage} alt="Maduka ya pembejeo" />
            </div>
            <div className="inputs-preview">
              <div className="input-items">
                <span className="input-item">Mbolea</span>
                <span className="input-item">Dawa za Wadudu</span>
                <span className="input-item">Mbegu</span>
                <span className="input-item">Vyombo</span>
              </div>
            </div>
            <p>Pata pembejeo bora za kilimo kwa bei nafuu kutoka kwa wauzaji walioidhinishwa.</p>
            <button 
              className="card-action-btn"
              onClick={() => onPageChange('inputs')}
            >
              Tafuta Pembejeo <i className="fas fa-shopping-cart"></i>
            </button>
          </div>

          {/* Huduma za Ushauri */}
          <div className="overview-card advisory-card">
            <div className="card-header">
              <div className="card-icon">👨‍🔬</div>
              <h4>Huduma za Ushauri</h4>
            </div>
            <div className="card-image">
              <img src={AdvisoryImage} alt="Huduma za ushauri" />
            </div>
            <div className="advisory-preview">
              <div className="experts-list">
                <div className="expert-item">
                  <i className="fas fa-user-tie"></i>
                  <span>Wataalamu wa Kilimo</span>
                </div>
                <div className="expert-item">
                  <i className="fas fa-clinic-medical"></i>
                  <span>Ushauri wa Afya ya Mazao</span>
                </div>
              </div>
            </div>
            <p>Wasiliana na wataalamu wa kilimo kwa ushauri wa bure juu ya mazao yako.</p>
            <button 
              className="card-action-btn"
              onClick={() => onPageChange('advice')}
            >
              Omba Ushauri <i className="fas fa-comments"></i>
            </button>
          </div>
        </div>

        {/* Takwimu za Mkoa */}
        <div className="stats-section">
          <h3>Takwimu za Mkoa wa Katavi</h3>
          <div className="stats-grid">
            {kataviStats.map((stat, index) => (
              <div key={index} className="stat-item">
                <div className="stat-icon">{stat.icon}</div>
                <div className="stat-value">{stat.value}</div>
                <div className="stat-label">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Overview;