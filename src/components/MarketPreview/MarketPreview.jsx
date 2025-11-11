import React from 'react';
import './MarketPreview.css';

const MarketPreview = ({ crops, onPageChange, onContactFarmer }) => {
  const featuredCrops = crops.slice(0, 6);

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
          {featuredCrops.map(crop => (
            <div key={crop.id} className="market-crop-card">
              <div className="crop-badge">{crop.category}</div>
              <div className="crop-image">{crop.image}</div>
              
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