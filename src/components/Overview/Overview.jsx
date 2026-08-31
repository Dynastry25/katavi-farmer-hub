import React from 'react';
import './Overview.css';

import MpungaImage from '../assets/mpunga.jpg';
import MahindiImage from '../assets/mahindi.jpeg';
import KarangaImage from '../assets/karanga.jpeg';
import AlizetiImage from '../assets/alizeti.jpeg';
import WeatherImage from '../assets/weather.jpg';
import SoilImage from '../assets/udongo.jpg';
import InputsImage from '../assets/mpunga.jpg';
import AdvisoryImage from '../assets/ushauri.jpeg';

const Overview = ({ onPageChange }) => {
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

  const serviceCards = [
    {
      id: 'weather',
      icon: 'fas fa-cloud-sun',
      title: 'Hali ya Hewa',
      image: WeatherImage,
      badge: '28°C · Mvua kidogo',
      location: 'Mpanda, Katavi',
      description: 'Hali ya hewa inafaa kwa kilimo cha mazao mbalimbali. Mvua za masika zinaendelea.',
      action: 'Angalia Hali ya Hewa',
      actionIcon: 'fas fa-external-link-alt',
      page: 'weather'
    },
    {
      id: 'soil',
      icon: 'fas fa-seedling',
      title: 'Aina za Udongo',
      image: SoilImage,
      tags: ['Udongo Mweusi', 'Mfinyanzi', 'Mchanga'],
      description: 'Udongo wenye rutuba unaofaa kwa kilimo cha mazao mbalimbali. Unahitaji udongo bora?',
      action: 'Pata Ushauri',
      actionIcon: 'fas fa-seedling',
      page: 'advice'
    },
    {
      id: 'inputs',
      icon: 'fas fa-cart-shopping',
      title: 'Maduka ya Pembejeo',
      image: InputsImage,
      tags: ['Mbolea', 'Dawa za Wadudu', 'Mbegu', 'Vyombo'],
      description: 'Pata pembejeo bora za kilimo kwa bei nafuu kutoka kwa wauzaji walioidhinishwa.',
      action: 'Tafuta Pembejeo',
      actionIcon: 'fas fa-shopping-cart',
      page: 'inputs'
    },
    {
      id: 'advisory',
      icon: 'fas fa-user-tie',
      title: 'Huduma za Ushauri',
      image: AdvisoryImage,
      experts: ['Wataalamu wa Kilimo', 'Ushauri wa Afya ya Mazao'],
      description: 'Wasiliana na wataalamu wa kilimo kwa ushauri wa bure juu ya mazao yako.',
      action: 'Omba Ushauri',
      actionIcon: 'fas fa-comments',
      page: 'advice'
    }
  ];

  const kataviStats = [
    { label: 'Eneo la Kilimo', value: '45,843 km²', icon: '🌍' },
    { label: 'Wakulima', value: '250,000+', icon: '👨‍🌾' },
    { label: 'Uzalishaji wa Chakula', value: '120,000 Tani', icon: '📊' },
    { label: 'Mito mikuu', value: '4', icon: '💧' }
  ];

  return (
    <section className="overview">
      <div className="overview-decor decor-1"></div>
      <div className="overview-decor decor-2"></div>

      <div className="container">
        <div className="overview-header">
          <span className="overview-eyebrow">Ukaguzi wa Mkoa</span>
          <h2>Mkoa wa Katavi Kwa Ufupi</h2>
          <p>Taarifa muhimu kuhusu kilimo, hali ya hewa, na rasilimali za kilimo katika mkoa wetu</p>
        </div>

        {/* Mazao Makuu */}
        <div className="overview-section">
          <div className="section-header">
            <div>
              <span className="section-eyebrow">Mazao ya Katavi</span>
              <h3>Mazao Makuu ya Katavi</h3>
            </div>
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

        {/* Huduma za Overview */}
        <div className="overview-section">
          <div className="section-header">
            <div>
              <span className="section-eyebrow">Huduma</span>
              <h3>Taarifa na Huduma Zinazokusaidia</h3>
            </div>
          </div>

          <div className="overview-grid">
            {serviceCards.map(card => (
              <div key={card.id} className="overview-card">
                <div className="card-header">
                  <div className="card-icon">
                    <i className={card.icon}></i>
                  </div>
                  <h4>{card.title}</h4>
                </div>

                <div className="card-image">
                  <img src={card.image} alt={card.title} />
                </div>

                <div className="card-preview">
                  {card.badge && (
                    <div className="weather-preview">
                      <div className="weather-temp">{card.badge}</div>
                      <div className="weather-location">{card.location}</div>
                    </div>
                  )}
                  {card.tags && (
                    <div className="tag-list">
                      {card.tags.map((tag, i) => (
                        <span key={i} className="tag-item">{tag}</span>
                      ))}
                    </div>
                  )}
                  {card.experts && (
                    <div className="experts-list">
                      {card.experts.map((ex, i) => (
                        <div key={i} className="expert-item">
                          <i className="fas fa-user-tie"></i>
                          <span>{ex}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <p className="card-text">{card.description}</p>

                <button
                  className="card-action-btn"
                  onClick={() => onPageChange(card.page)}
                >
                  {card.action} <i className={card.actionIcon}></i>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Takwimu */}
        <div className="stats-section">
          <div className="stats-inner">
            <span className="section-eyebrow light">Hali Halisi</span>
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
      </div>
    </section>
  );
};

export default Overview;
