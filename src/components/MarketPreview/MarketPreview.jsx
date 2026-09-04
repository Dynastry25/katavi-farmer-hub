import React, { useState } from 'react';
import './MarketPreview.css';

import Mpunga from '../assets/mpunga.jpeg';
import Mahindi from '../assets/mahindi4.jpg';
import MaharagePlaceholder from '../assets/maharage.jpeg';
import ViaziPlaceholder from '../assets/viazi.jpeg';
import MichungwaPlaceholder from '../assets/machungwa.webp';
import KarangaPlaceholder from '../assets/karanga2.jpeg';

// Category fallback photos (shown when a live crop has no image)
import FallbackGrains from '../assets/mahindi.jpeg';
import FallbackLegumes from '../assets/maharage.jpeg';
import FallbackTubers from '../assets/mihogo.jpeg';
import FallbackFruits from '../assets/machungwa.webp';
import FallbackVegetables from '../assets/karoti.jpeg';
import FallbackOilseeds from '../assets/alizeti.jpeg';
import FallbackDefault from '../assets/crops-marketplace.jpg';

const sampleCrops = [
  {
    id: 1, name: 'Mahindi', category: 'grains', price: '1,200', unit: 'kg', quantity: '500',
    location: 'Mpanda', farmer: 'Juma Mohamed', image: Mahindi, fallback: FallbackGrains
  },
  {
    id: 2, name: 'Mchele', category: 'grains', price: '2,500', unit: 'kg', quantity: '300',
    location: 'Mlele', farmer: 'Asha Juma', image: Mpunga, fallback: FallbackGrains
  },
  {
    id: 3, name: 'Maharage', category: 'legumes', price: '3,000', unit: 'kg', quantity: '200',
    location: 'Nsimbo', farmer: 'Rajab Suleiman', image: MaharagePlaceholder, fallback: FallbackLegumes
  },
  {
    id: 4, name: 'Viazi Vitamu', category: 'tubers', price: '800', unit: 'kg', quantity: '600',
    location: 'Mpanda', farmer: 'Mariam Charles', image: ViaziPlaceholder, fallback: FallbackTubers
  },
  {
    id: 5, name: 'Machungwa', category: 'fruits', price: '500', unit: 'kg', quantity: '400',
    location: 'Mlele', farmer: 'John Petro', image: MichungwaPlaceholder, fallback: FallbackFruits
  },
  {
    id: 6, name: 'Karanga', category: 'legumes', price: '300', unit: 'kg', quantity: '350',
    location: 'Nsimbo', farmer: 'Fatma Rajab', image: KarangaPlaceholder, fallback: FallbackLegumes
  }
];

const categoryMeta = {
  grains: { label: 'Nafaka', icon: 'fas fa-wheat-awn', photo: FallbackGrains },
  legumes: { label: 'Kunde', icon: 'fas fa-circle-dot', photo: FallbackLegumes },
  tubers: { label: 'Mizizi', icon: 'fas fa-apple-whole', photo: FallbackTubers },
  fruits: { label: 'Matunda', icon: 'fas fa-lemon', photo: FallbackFruits },
  vegetables: { label: 'Mboga', emoji: '🥬', photo: FallbackVegetables },
  oilseeds: { label: 'Mbegu za Mafuta', emoji: '🌻', photo: FallbackOilseeds },
};

const normalizeCrops = (crops) => {
  if (!Array.isArray(crops) || crops.length === 0) return sampleCrops;
  return crops.slice(0, 6).map(c => {
    const cat = categoryMeta[c.category] || categoryMeta.grains;
    return {
      id: c._id ?? c.id ?? c._id,
      name: c.name || 'Zao',
      category: c.category || 'grains',
      price: String(c.price || 0).replace(/\B(?=(\d{3})+(?!\d))/g, ','),
      unit: c.unit || 'kg',
      quantity: String(c.quantity ?? ''),
      location: c.location || 'Katavi',
      farmer: c.farmerName || c.farmer || 'Mkulima',
      image: c.image,
      fallback: c.fallback || cat.photo || FallbackDefault
    };
  });
};

const MarketPreview = ({ crops, onPageChange, onContactFarmer }) => {
  const [imageErrors, setImageErrors] = useState({});
  const [imageLoaded, setImageLoaded] = useState({});

  const displayCrops = normalizeCrops(crops);

  const handleImageError = (id) => {
    setImageErrors(prev => ({ ...prev, [id]: true }));
  };

  const handleImageLoad = (id) => {
    setImageLoaded(prev => ({ ...prev, [id]: true }));
  };

  return (
    <section className="market-preview">
      <div className="market-decor decor-1"></div>
      <div className="market-decor decor-2"></div>

      <div className="container">
        <div className="market-header">
          <div className="market-header-left">
            <span className="market-eyebrow">Soko la Moja kwa Moja</span>
            <h2>Mazao Bora ya Soko</h2>
            <p>Mazao fresh kutoka shambani, bei za moja kwa moja kutoka kwa wakulima wa Katavi</p>
          </div>
          <button
            className="market-view-all"
            onClick={() => onPageChange('market')}
          >
            Fungua Soko Kamili <i className="fas fa-arrow-right"></i>
          </button>
        </div>

        <div className="market-note">
          <i className="fas fa-bolt"></i>
          <span>Fresh leo — mazao haya yameorodheshwa na wakulima wa eneo la Katavi</span>
        </div>

        <div className="crops-grid">
          {displayCrops.map(crop => {
            const id = crop.id;
            const hasError = imageErrors[id];
            const isLoaded = imageLoaded[id];
            const cat = categoryMeta[crop.category] || categoryMeta.grains;

            return (
              <div key={id} className="market-crop-card">
                <div className="crop-image-container">
                  {!hasError && crop.image ? (
                    <>
                      {!isLoaded && <div className="crop-image-loading image-loading"></div>}
                      <img
                        className={`crop-image ${isLoaded ? 'loaded' : 'loading'}`}
                        src={crop.image}
                        alt={crop.name}
                        onError={() => handleImageError(id)}
                        onLoad={() => handleImageLoad(id)}
                        loading="lazy"
                      />
                    </>
                  ) : (
                    <img
                      className="crop-image"
                      src={crop.fallback}
                      alt={crop.name}
                      loading="lazy"
                    />
                  )}

                  <div className="crop-badge">{cat.icon ? <i className={cat.icon}></i> : cat.emoji} {cat.label}</div>

                  <div className="crop-sold">
                    {crop.quantity ? `${crop.quantity} ${crop.unit}` : 'Ipo Soko'}
                  </div>
                </div>

                <div className="crop-content">
                  <div className="crop-topline">
                    <h3 className="crop-name">{crop.name}</h3>
                    <span className="crop-fresh">{crop.location}</span>
                  </div>

                  <div className="crop-price">
                    <span className="currency">TZS</span>
                    {crop.price}
                    <span className="unit">/{crop.unit}</span>
                    <span className="crop-qty">{crop.quantity} {crop.unit}</span>
                  </div>

                  <div className="crop-farmer">
                    <div className="farmer-avatar"></div>
                    <div className="farmer-info">
                      <span className="farmer-label">Muuzaji</span>
                      <span className="farmer-name">{crop.farmer}</span>
                    </div>
                  </div>

                  <div className="crop-actions">
                    <button
                      className="btn-contact"
                      onClick={() => onContactFarmer && onContactFarmer(crop)}
                    >
                      Wasiliana
                    </button>
                    <button
                      className="btn-buy"
                      onClick={() => onPageChange('market')}
                    >
                      Nunua
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="market-stats">
          <div className="stat-item">
            <div className="stat-icon"><i className="fas fa-seedling"></i></div>
            <div className="stat-number">1,200+</div>
            <div className="stat-label">Mazao Yanayopatikana</div>
          </div>
          <div className="stat-item">
            <div className="stat-icon"><i className="fas fa-users"></i></div>
            <div className="stat-number">500+</div>
            <div className="stat-label">Wakulima Waliojiunga</div>
          </div>
          <div className="stat-item">
            <div className="stat-icon"><i className="fas fa-smile"></i></div>
            <div className="stat-number">95%</div>
            <div className="stat-label">Wateja Walioridhika</div>
          </div>
          <div className="stat-item">
            <div className="stat-icon"><i className="fas fa-handshake"></i></div>
            <div className="stat-number">24/7</div>
            <div className="stat-label">Msaada kwa Wakulima</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MarketPreview;
