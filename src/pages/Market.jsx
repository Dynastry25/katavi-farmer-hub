import React, { useState } from 'react';
import Navigation from '../components/Navbar/Navbar';
import Footer from '../components/Footer/Footer';
import './CSS/Market.css';
import Mpunga from '../components/assets/mpunga.jpg'


const Market = ({ crops, onPageChange, onAuth, user, onContactFarmer, onCropDetails }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [imageErrors, setImageErrors] = useState({});

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
    { value: 'Karema', label: 'Karema' },
    { value: 'Ikola', label: 'Ikola' },
    { value: 'Kapalala', label: 'Kapalala' }
  ];

  const sortOptions = [
    { value: 'newest', label: 'Mpya Zaidi' },
    { value: 'price-low', label: 'Bei: Chini Kwanza' },
    { value: 'price-high', label: 'Bei: Juu Kwanza' },
    { value: 'name', label: 'Jina (A-Z)' },
    { value: 'rating', label: 'Ukadiriaji (Juu Kwanza)' }
  ];

  // Sample crops data - tumia hii moja kwa moja
  const sampleCrops = [
    {
      id: 1,
      name: 'Mahindi Mweupe',
      category: 'cereals',
      price: 1200,
      quantity: '500',
      unit: 'kg',
      location: 'Mpanda',
      farmer: 'Juma Mohamed',
      description: 'Mahindi mweupe wa hali ya juu, mazao mazuri na nafaka nzuri.',
      image: '',
      fallback: '🌽',
      rating: 4.5,
      reviews: 24,
      date: '2024-01-15'
    },
    {
      id: 2,
      name: 'Mchele wa Mbeya',
      category: 'cereals',
      price: 2500,
      quantity: '300',
      unit: 'kg',
      location: 'Mlele',
      farmer: 'Asha Juma',
      description: 'Mchele mzuri wa aina ya Super, mwenye ubora wa hali ya juu.',
      image: '/images/mbeya-rice.jpg',
      fallback: '🍚',
      rating: 4.8,
      reviews: 31,
      date: '2024-01-14'
    },
    {
      id: 3,
      name: 'Maharage Yawe',
      category: 'legumes',
      price: 3000,
      quantity: '200',
      unit: 'kg',
      location: 'Nsimbo',
      farmer: 'Rajab Suleiman',
      description: 'Maharage mekundu ya aina ya Yawe, yenye virutubisho vingi.',
      image: '/images/red-beans.jpg',
      fallback: '🫘',
      rating: 4.3,
      reviews: 18,
      date: '2024-01-13'
    },
    {
      id: 4,
      name: 'Viazi Mviringo',
      category: 'tubers',
      price: 800,
      quantity: '600',
      unit: 'kg',
      location: 'Mpanda',
      farmer: 'Mariam Charles',
      description: 'Viazi vitamu vya aina mbalimbali, fresh kutoka shambani.',
      image: '/images/potatoes.jpg',
      fallback: '🥔',
      rating: 4.6,
      reviews: 42,
      date: '2024-01-12'
    },
    {
      id: 5,
      name: 'Michungwa',
      category: 'fruits',
      price: 500,
      quantity: '400',
      unit: 'kg',
      location: 'Mlele',
      farmer: 'John Petro',
      description: 'Michungwa mizuri yenye vitamini C nyingi, tamu na fresh.',
      image: '/images/oranges.jpg',
      fallback: '🍊',
      rating: 4.7,
      reviews: 29,
      date: '2024-01-11'
    },
    {
      id: 6,
      name: 'Sukuma Wiki',
      category: 'vegetables',
      price: 300,
      quantity: '350',
      unit: 'mafungu',
      location: 'Nsimbo',
      farmer: 'Fatma Rajab',
      description: 'Sukuma wiki fresh, majani makubwa na ya kuvutia.',
      image: '/images/kale.jpg',
      fallback: '🥬',
      rating: 4.4,
      reviews: 35,
      date: '2024-01-10'
    },
    {
      id: 7,
      name: 'Karoti',
      category: 'vegetables',
      price: 600,
      quantity: '250',
      unit: 'kg',
      location: 'Karema',
      farmer: 'Ali Hassan',
      description: 'Karoti nyekundu zenye vitamini A nyingi, fresh na tamu.',
      image: '/images/carrots.jpg',
      fallback: '🥕',
      rating: 4.5,
      reviews: 27,
      date: '2024-01-09'
    },
    {
      id: 8,
      name: 'Alizeti',
      category: 'oilseeds',
      price: 1800,
      quantity: '150',
      unit: 'kg',
      location: 'Mpanda',
      farmer: 'Sarah Michael',
      description: 'Mbegu za alizeti za hali ya juu kwa utengenezaji wa mafuta.',
      image: '/images/sunflower.jpg',
      fallback: '🌻',
      rating: 4.2,
      reviews: 16,
      date: '2024-01-08'
    },
    {
      id: 9,
      name: 'Mpunga',
      category: 'cereals',
      price: 2000,
      quantity: '50',
      unit: 'kg',
      location: 'Mlele',
      farmer: 'Asha Hassan',
      description: 'Mpunga mweupe wa aina bora, uliofanyiwa usindikaji wa kisasa.',
      image: Mpunga,
      fallback: '🍚',
      rating: 4.8,
      reviews: 28,
      date: '2024-01-16'
    }
  ];

  // Tumia sampleCrops moja kwa moja badala ya kuangalia crops prop
  const displayCrops = sampleCrops;

  const filteredCrops = displayCrops
    .filter(crop => {
      const matchesSearch = searchTerm === '' || 
        crop.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
        case 'rating':
          return b.rating - a.rating;
        case 'newest':
        default:
          return new Date(b.date) - new Date(a.date);
      }
    });

  const handleImageError = (cropId) => {
    setImageErrors(prev => ({
      ...prev,
      [cropId]: true
    }));
  };

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
              {filteredCrops.length} {filteredCrops.length === 1 ? 'zao limepatikana' : 'mazao yamepatikana'}
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
                  <div className="crop-badge">{categories.find(cat => cat.value === crop.category)?.label}</div>
                  
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
                    
                    <div className="crop-price">TZS {crop.price.toLocaleString()}/{crop.unit}</div>
                    
                    <div className="crop-details">
                      <div className="crop-quantity">
                        <i className="fas fa-weight"></i>
                        {crop.quantity} {crop.unit} inapatikana
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
                      <span className="rating-text">{crop.rating} ({crop.reviews} maoni)</span>
                    </div>

                    <div className="crop-actions">
                      <button 
                        className="btn btn-primary"
                        onClick={() => onContactFarmer && onContactFarmer(crop)}
                      >
                        <i className="fas fa-phone"></i> Wasiliana
                      </button>
                      <button 
                        className="btn btn-outline"
                        onClick={() => onCropDetails && onCropDetails(crop)}
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
                    setSortBy('newest');
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
                <div className="stat-number">{displayCrops.length}+</div>
                <div className="stat-label">Mazao Yanayopatikana</div>
              </div>
            </div>
            <div className="stat-card">
              <i className="fas fa-users"></i>
              <div className="stat-content">
                <div className="stat-number">200+</div>
                <div className="stat-label">Wakulima Waliojiunga</div>
              </div>
            </div>
            <div className="stat-card">
              <i className="fas fa-shopping-cart"></i>
              <div className="stat-content">
                <div className="stat-number">850+</div>
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