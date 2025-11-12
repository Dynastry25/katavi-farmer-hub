import React, { useState } from 'react';
import './MarketPreview.css';
import Mpunga from '../assets/mpunga.jpg'

const MarketPreview = ({ crops, onPageChange, onContactFarmer }) => {
  const [imageErrors, setImageErrors] = useState({});
  const featuredCrops = crops.slice(0, 6);

  const handleImageError = (cropId) => {
    setImageErrors(prev => ({
      ...prev,
      [cropId]: true
    }));
  };

  // Sample crops data with proper image structure
  const sampleCrops = [
    {
      id: 1,
      name: 'Mahindi Mweupe',
      category: 'grains',
      price: '1,200',
      quantity: '500',
      location: 'Mpanda',
      farmer: 'Juma Mohamed',
      description: 'Mahindi mweupe wa hali ya juu, mazao mazuri na nafaka nzuri',
      image: './',
      fallback: '🌽'
    },
    {
      id: 2,
      name: 'Mchele wa Mbeya',
      category: 'grains',
      price: '2,500',
      quantity: '300',
      location: 'Mlele',
      farmer: 'Asha Juma',
      description: 'Mchele mzuri wa aina ya Super, mwenye ubora wa hali ya juu',
      image: '/images/mbeya-rice.jpg',
      fallback: '🍚'
    },
    {
      id: 3,
      name: 'Maharage Yawe',
      category: 'legumes',
      price: '3,000',
      quantity: '200',
      location: 'Nsimbo',
      farmer: 'Rajab Suleiman',
      description: 'Maharage mekundu ya aina ya Yawe, yenye virutubisho vingi',
      image: '/images/red-beans.jpg',
      fallback: '🫘'
    },
    {
      id: 4,
      name: 'Viazi Mviringo',
      category: 'tubers',
      price: '800',
      quantity: '600',
      location: 'Mpanda',
      farmer: 'Mariam Charles',
      description: 'Viazi vitamu vya aina mbalimbali, fresh kutoka shambani',
      image: '/images/potatoes.jpg',
      fallback: '🥔'
    },
    {
      id: 5,
      name: 'Michungwa',
      category: 'fruits',
      price: '500',
      quantity: '400',
      location: 'Mlele',
      farmer: 'John Petro',
      description: 'Michungwa mizuri yenye vitamini C nyingi, tamu na fresh',
      image: '/images/oranges.jpg',
      fallback: '🍊'
    },
    {
      id: 6,
      name: 'Sukuma Wiki',
      category: 'vegetables',
      price: '300',
      quantity: '350',
      location: 'Nsimbo',
      farmer: 'Fatma Rajab',
      description: 'Sukuma wiki fresh, majani makubwa na ya kuvutia',
      image: '/images/kale.jpg',
      fallback: '🥬'
    }
  ];

  const displayCrops = crops.length > 0 ? crops.slice(0, 6) : sampleCrops;

  return (
    <section className="market-preview">
      <div className="container">
        <div className="section-header">
          <h2>Mazao Bora ya Soko</h2>
          <p>Angalia mazao bora yaliyopo soko leo. Wasiliana moja kwa moja na wakulima</p>
          <button 
            className="btn btn-outline"
            onClick={() => onPageChange('market')}
          >
            Angalia Mazao Yote <i className="fas fa-arrow-right"></i>
          </button>
        </div>
        
        <div className="crops-grid">
          {displayCrops.map(crop => (
            <div key={crop.id} className="market-crop-card">
              <div className="crop-badge">{crop.category}</div>
              
              <div className={`crop-image-container ${crop.category}`}>
                {!imageErrors[crop.id] ? (
                  <img 
                    className="crop-image" 
                    src={crop.image} 
                    alt={crop.name}
                    onError={() => handleImageError(crop.id)}
                    loading="lazy"
                  />
                ) : (
                  <div className="crop-image-fallback">
                    {crop.fallback}
                  </div>
                )}
              </div>
              
              <div className="crop-content">
                <h3 className="crop-name">{crop.name}</h3>
                <p className="crop-description">{crop.description}</p>
                
                <div className="crop-details">
                  <div className="crop-price">TZS {crop.price}/kg</div>
                  <div className="crop-quantity">{crop.quantity} kg inapatikana</div>
                </div>
                
                <div className="crop-meta">
                  <div className="crop-location">
                    <i className="fas fa-map-marker-alt"></i>
                    {crop.location}
                  </div>
                  <div className="crop-farmer">
                    <i className="fas fa-user"></i>
                    {crop.farmer}
                  </div>
                </div>
                
                <div className="crop-actions">
                  <button 
                    className="btn btn-primary btn-sm"
                    onClick={() => onContactFarmer(crop)}
                  >
                    <i className="fas fa-phone"></i> Wasiliana
                  </button>
                  <button className="btn btn-outline btn-sm">
                    <i className="fas fa-info-circle"></i> Maelezo
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="market-stats">
          <div className="stat-item">
            <div className="stat-number">1,200+</div>
            <div className="stat-label">Mazao Yanayopatikana</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">500+</div>
            <div className="stat-label">Wakulima Waliojiunga</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">95%</div>
            <div className="stat-label">Wateja Walioridhika</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MarketPreview;