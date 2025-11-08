import React, { useState } from 'react';
import Navigation from '../components/Navbar/Navbar';
import Footer from '../components/Footer/Footer';
import './CSS/Market.css';

const Market = ({ crops, onPageChange, onAuth, user, onContactFarmer, onCropDetails }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  const categories = [
    { value: 'all', label: 'Kila Aina' },
    { value: 'cereals', label: 'Nafaka' },
    { value: 'legumes', label: 'Mimea ya Mbegu' },
    { value: 'vegetables', label: 'Mboga' },
    { value: 'fruits', label: 'Matunda' },
    { value: 'tubers', label: 'Viazi' },
    { value: 'oilseeds', label: 'Mimea ya Mafuta' }
  ];

  const locations = [
    { value: 'all', label: 'Maeneo Yote' },
    { value: 'Mpanda', label: 'Mpanda' },
    { value: 'Mlele', label: 'Mlele' },
    { value: 'Nsimbo', label: 'Nsimbo' },
    { value: 'Karema', label: 'Karema' }
  ];

  const sortOptions = [
    { value: 'newest', label: 'Mpya Zaidi' },
    { value: 'price-low', label: 'Bei: Chini Kwanza' },
    { value: 'price-high', label: 'Bei: Juu Kwanza' },
    { value: 'name', label: 'Jina (A-Z)' }
  ];

  const filteredCrops = crops
    .filter(crop => {
      const matchesSearch = crop.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          crop.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          crop.farmer.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || crop.category === selectedCategory;
      const matchesLocation = selectedLocation === 'all' || crop.location === selectedLocation;
      
      return matchesSearch && matchesCategory && matchesLocation;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'price-low':
          return a.price - b.price;
        case 'price-high':
          return b.price - a.price;
        case 'name':
          return a.name.localeCompare(b.name);
        case 'newest':
        default:
          return new Date(b.date) - new Date(a.date);
      }
    });

  return (
    <div className="page market-page">
      <Navigation 
        currentPage="market"
        onPageChange={onPageChange}
        onAuth={onAuth}
        user={user}
      />
      
      <div className="market-container">
        <div className="container">
          {/* Header */}
          <div className="market-header">
            <h1>Soko la Mazao</h1>
            <p>Tafuta na nunua mazao bora kutoka kwa wakulima wa Katavi moja kwa moja</p>
          </div>

          {/* Filters and Search */}
          <div className="market-filters">
            <div className="search-box">
              <i className="fas fa-search"></i>
              <input
                type="text"
                placeholder="Tafuta mazao, wakulima, au maeneo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>

            <div className="filter-group">
              <select 
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="filter-select"
              >
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>

              <select 
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="filter-select"
              >
                {locations.map(loc => (
                  <option key={loc.value} value={loc.value}>{loc.label}</option>
                ))}
              </select>

              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="filter-select"
              >
                {sortOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Results Count */}
          <div className="results-info">
            <p>
              {filteredCrops.length} mazao yamepatikana
              {searchTerm && ` kwa "${searchTerm}"`}
              {selectedCategory !== 'all' && ` katika ${categories.find(c => c.value === selectedCategory)?.label}`}
              {selectedLocation !== 'all' && ` ${locations.find(l => l.value === selectedLocation)?.label}`}
            </p>
          </div>

          {/* Crops Grid */}
          <div className="market-grid">
            {filteredCrops.length > 0 ? (
              filteredCrops.map(crop => (
                <div key={crop.id} className="market-crop-card">
                  <div className="crop-badge">{crop.category}</div>
                  <div className="crop-image">{crop.image}</div>
                  
                  <div className="crop-content">
                    <h3 className="crop-name">{crop.name}</h3>
                    <p className="crop-description">{crop.description}</p>
                    
                    <div className="crop-price">TZS {crop.price.toLocaleString()}/kg</div>
                    
                    <div className="crop-details">
                      <div className="crop-quantity">
                        <i className="fas fa-weight"></i>
                        {crop.quantity} kg inapatikana
                      </div>
                      <div className="crop-location">
                        <i className="fas fa-map-marker-alt"></i>
                        {crop.location}
                      </div>
                    </div>

                    <div className="crop-farmer">
                      <i className="fas fa-user"></i>
                      Mkulima: {crop.farmer}
                    </div>

                    <div className="crop-rating">
                      <div className="stars">
                        {[...Array(5)].map((_, i) => (
                          <i 
                            key={i} 
                            className={`fas fa-star ${i < Math.floor(crop.rating) ? 'filled' : ''}`}
                          ></i>
                        ))}
                      </div>
                      <span className="rating-text">{crop.rating}</span>
                    </div>

                    <div className="crop-actions">
                      <button 
                        className="btn btn-primary"
                        onClick={() => onContactFarmer(crop)}
                      >
                        <i className="fas fa-phone"></i> Wasiliana
                      </button>
                      <button 
                        className="btn btn-outline"
                        onClick={() => onCropDetails(crop)}
                      >
                        <i className="fas fa-info-circle"></i> Maelezo
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="no-results">
                <i className="fas fa-search"></i>
                <h3>Hakuna mazao yaliyopatikana</h3>
                <p>Badilisha vichujio vyako au tafuta kitu tofauti</p>
                <button 
                  className="btn btn-primary"
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedCategory('all');
                    setSelectedLocation('all');
                  }}
                >
                  Ondoa Vichujio Vyote
                </button>
              </div>
            )}
          </div>

          {/* Market Stats */}
          <div className="market-stats">
            <div className="stat-card">
              <i className="fas fa-seedling"></i>
              <div className="stat-content">
                <div className="stat-number">{crops.length}+</div>
                <div className="stat-label">Mazao Yanayopatikana</div>
              </div>
            </div>
            <div className="stat-card">
              <i className="fas fa-users"></i>
              <div className="stat-content">
                <div className="stat-number">500+</div>
                <div className="stat-label">Wakulima Waliojiunga</div>
              </div>
            </div>
            <div className="stat-card">
              <i className="fas fa-shopping-cart"></i>
              <div className="stat-content">
                <div className="stat-number">1,200+</div>
                <div className="stat-label">Manunuzi Kila Mwezi</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer onPageChange={onPageChange} />
    </div>
  );
};

export default Market;