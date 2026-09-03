import React, { useState, useEffect } from 'react';
import { cropsAPI } from '../api/client';
import Navigation from '../components/Navbar/Navbar';
import Footer from '../components/Footer/Footer';
import Loading from '../components/Loading/Loading';
import './CSS/Market.css';
import Mpunga from '../components/assets/mpunga.jpeg';
import Mahindi from '../components/assets/mahindi4.jpg';
import Viazi from '../components/assets/viazi.jpeg';
import Karoti from '../components/assets/karoti.jpeg';
import Mchele from '../components/assets/mchele.jpeg';
import Maharage from '../components/assets/maharage.jpeg';
import Machungwa from '../components/assets/machungwa.webp';
import Alizeti from '../components/assets/alizeti.jpeg';
import MarketBanner from '../components/assets/crops-marketplace.jpg';


const categoryMeta = {
  cereals: { label: 'Nafaka', icon: 'fas fa-wheat-awn', photo: Mahindi },
  legumes: { label: 'Kunde', icon: 'fas fa-circle-dot', photo: Maharage },
  vegetables: { label: 'Mboga', emoji: '🥬', photo: Karoti },
  fruits: { label: 'Matunda', icon: 'fas fa-lemon', photo: Machungwa },
  tubers: { label: 'Viazi', icon: 'fas fa-apple-whole', photo: Viazi },
  oilseeds: { label: 'Mafuta', emoji: '🌻', photo: Alizeti },
  grains: { label: 'Nafaka', icon: 'fas fa-wheat-awn', photo: Mahindi },
};

const getCat = (cat) => categoryMeta[cat] || { label: 'Zao', icon: 'fas fa-wheat-awn', photo: Mahindi };

const Market = ({ crops, onPageChange, onAuth, user, onContactFarmer, onCropDetails }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [imageErrors, setImageErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [apiCrops, setApiCrops] = useState([]);

  useEffect(() => {
    const fetchCrops = async () => {
      try {
        const res = await cropsAPI.getAll();
        if (res.data && res.data.length > 0) {
          setApiCrops(res.data);
        }
      } catch (err) {
        console.error('Error fetching crops:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCrops();
  }, []);

  const categories = [
    { value: 'all', label: 'Kila Aina', icon: 'fas fa-seedling' },
    { value: 'cereals', label: 'Nafaka', icon: 'fas fa-wheat-awn' },
    { value: 'legumes', label: 'Kunde', icon: 'fas fa-circle-dot' },
    { value: 'vegetables', label: 'Mboga', emoji: '🥬' },
    { value: 'fruits', label: 'Matunda', icon: 'fas fa-lemon' },
    { value: 'tubers', label: 'Viazi', icon: 'fas fa-apple-whole' },
    { value: 'oilseeds', label: 'Mafuta', emoji: '🌻' }
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
      id: 1, name: 'Mahindi', category: 'cereals', price: 1200, quantity: '500', unit: 'kg',
      location: 'Mpanda', farmer: 'Juma Mohamed', image: Mahindi, fallback: Mahindi,
      description: 'Mahindi mweupe wa hali ya juu, mazao mazuri na nafaka nzuri.',
      rating: 4.5, reviews: 24, date: '2024-01-15'
    },
    {
      id: 2, name: 'Mchele', category: 'cereals', price: 2500, quantity: '300', unit: 'kg',
      location: 'Mlele', farmer: 'Asha Juma', image: Mchele, fallback: Mchele,
      description: 'Mchele mzuri wa aina ya Super, mwenye ubora wa hali ya juu.',
      rating: 4.8, reviews: 31, date: '2024-01-14'
    },
    {
      id: 3, name: 'Maharage', category: 'legumes', price: 3000, quantity: '200', unit: 'kg',
      location: 'Nsimbo', farmer: 'Rajab Suleiman', image: Maharage, fallback: Maharage,
      description: 'Maharage mekundu ya aina ya Yawe, yenye virutubisho vingi.',
      rating: 4.3, reviews: 18, date: '2024-01-13'
    },
    {
      id: 4, name: 'Viazi', category: 'tubers', price: 800, quantity: '600', unit: 'kg',
      location: 'Mpanda', farmer: 'Mariam Charles', image: Viazi, fallback: Viazi,
      description: 'Viazi vitamu vya aina mbalimbali, fresh kutoka shambani.',
      rating: 4.6, reviews: 42, date: '2024-01-12'
    },
    {
      id: 5, name: 'Machungwa', category: 'fruits', price: 500, quantity: '400', unit: 'kg',
      location: 'Mlele', farmer: 'John Petro', image: Machungwa, fallback: Machungwa,
      description: 'Michungwa mizuri yenye vitamini C nyingi, tamu na fresh.',
      rating: 4.7, reviews: 29, date: '2024-01-11'
    },
    {
      id: 6, name: 'Sukuma Wiki', category: 'vegetables', price: 300, quantity: '350', unit: 'mafungu',
      location: 'Nsimbo', farmer: 'Fatma Rajab', image: '/images/kale.jpg', fallback: Karoti,
      description: 'Sukuma wiki fresh, majani makubwa na ya kuvutia.',
      rating: 4.4, reviews: 35, date: '2024-01-10'
    },
    {
      id: 7, name: 'Karoti', category: 'vegetables', price: 600, quantity: '250', unit: 'kg',
      location: 'Karema', farmer: 'Ali Hassan', image: Karoti, fallback: Karoti,
      description: 'Karoti nyekundu zenye vitamini A nyingi, fresh na tamu.',
      rating: 4.5, reviews: 27, date: '2024-01-09'
    },
    {
      id: 8, name: 'Alizeti', category: 'oilseeds', price: 1800, quantity: '150', unit: 'kg',
      location: 'Mpanda', farmer: 'Sarah Michael', image: Alizeti, fallback: Alizeti,
      description: 'Mbegu za alizeti za hali ya juu kwa utengenezaji wa mafuta.',
      rating: 4.2, reviews: 16, date: '2024-01-08'
    },
    {
      id: 9, name: 'Mpunga', category: 'cereals', price: 2000, quantity: '50', unit: 'kg',
      location: 'Mlele', farmer: 'Asha Hassan', image: Mpunga, fallback: Mpunga,
      description: 'Mpunga mweupe wa aina bora, uliofanyiwa usindikaji wa kisasa.',
      rating: 4.8, reviews: 28, date: '2024-01-16'
    }
  ];

  // Use API data if available, otherwise use local sample data
  const displayCrops = apiCrops.length > 0 ? apiCrops.map(crop => ({
    ...crop,
    id: crop._id,
    image: crop.image || null,
    fallback: crop.fallback || getCat(crop.category).photo,
  })) : sampleCrops;

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

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('all');
    setSelectedLocation('all');
    setSortBy('newest');
  };

  return (
    <div className="page market-page">
      <Navigation 
        currentPage="market"
        onPageChange={onPageChange}
        onAuth={onAuth}
        user={user}
      />
      
      <div className="farmer-market-banner">
        <img className="banner-bg" src={MarketBanner} alt="Soko la wakulima" />
        <div className="banner-overlay"></div>
        <div className="container banner-content">
          <span className="banner-eyebrow"><i className="fas fa-store"></i> Soko la Wakulima</span>
          <h1>Soko la Mazao</h1>
          <p>Tafuta na nunua mazao bora kutoka kwa wakulima wa Katavi moja kwa moja</p>
        </div>
      </div>

      <div className="market-container">
        <div className="container">
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
              {searchTerm && (
                <button className="search-clear" onClick={() => setSearchTerm('')}>
                  <i className="fas fa-times"></i>
                </button>
              )}
            </div>

            <div className="filter-pills">
              <div className="filter-group">
                <span className="filter-label">Aina</span>
                <select 
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="filter-select"
                >
                  {categories.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <span className="filter-label">Eneo</span>
                <select 
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="filter-select"
                >
                  {locations.map(loc => (
                    <option key={loc.value} value={loc.value}>{loc.label}</option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <span className="filter-label">Panga</span>
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
          </div>

          {/* Results Count */}
          <div className="results-info">
            <p>
              <i className="fas fa-box"></i>
              {filteredCrops.length} {filteredCrops.length === 1 ? 'zao limepatikana' : 'mazao yamepatikana'}
              {searchTerm && ` kwa "${searchTerm}"`}
              {selectedCategory !== 'all' && ` · ${categories.find(c => c.value === selectedCategory)?.label}`}
              {selectedLocation !== 'all' && ` · ${locations.find(l => l.value === selectedLocation)?.label}`}
            </p>
          </div>

          {/* Crops Grid */}
          {loading && apiCrops.length === 0 && (
            <Loading message="Inapakua mazao..." />
          )}

          <div className="market-grid">
            {!loading && filteredCrops.length > 0 ? (
              filteredCrops.map(crop => {
                const cat = getCat(crop.category);
                const hasError = imageErrors[crop.id];
                return (
                  <div key={crop.id} className="market-crop-card">
                    <div className="crop-image-container">
                      {!hasError && crop.image ? (
                        <img 
                          className="crop-image" 
                          src={crop.image} 
                          alt={crop.name}
                          onError={() => handleImageError(crop.id)}
                          loading="lazy"
                        />
                      ) : (
                        <img
                          className="crop-image"
                          src={crop.fallback}
                          alt={crop.name}
                          loading="lazy"
                        />
                      )}
                      <div className="crop-badge">{cat.icon ? <i className={cat.icon}></i> : cat.emoji} {cat.label}</div>
                      <div className="crop-stock">
                        {crop.quantity ? `${crop.quantity} ${crop.unit}` : 'Ipo'}
                      </div>
                    </div>
                    
                    <div className="crop-content">
                      <div className="crop-topline">
                        <h3 className="crop-name">{crop.name}</h3>
                        <span className="crop-fresh">{crop.location}</span>
                      </div>
                      <p className="crop-description">{crop.description}</p>
                      
                      <div className="crop-price">
                        <span className="currency">TZS</span>
                        {crop.price.toLocaleString()}
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

                      {typeof crop.rating === 'number' && (
                        <div className="crop-rating">
                          <div className="stars">
                            {[...Array(5)].map((_, i) => (
                              <i 
                                key={i} 
                                className={`fas fa-star ${i < Math.floor(crop.rating) ? 'filled' : ''}`}
                              ></i>
                            ))}
                          </div>
                          <span className="rating-text">{crop.rating} ({crop.reviews || 0})</span>
                        </div>
                      )}

                      <div className="crop-actions">
                        <button 
                          className="btn-contact"
                          onClick={() => onContactFarmer && onContactFarmer(crop)}
                        >
                          Wasiliana
                        </button>
                        <button 
                          className="btn-details"
                          onClick={() => onCropDetails && onCropDetails(crop)}
                        >
                          Maelezo
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              !loading && (
                <div className="no-results">
                  <i className="fas fa-search"></i>
                  <h3>Hakuna mazao yaliyopatikana</h3>
                  <p>Badilisha vichujio vyako au tafuta kitu tofauti</p>
                  <button 
                    className="btn-clear"
                    onClick={clearFilters}
                  >
                    <i className="fas fa-undo"></i> Ondoa Vichujio Vyote
                  </button>
                </div>
              )
            )}
          </div>

          {/* Market Stats */}
          <div className="market-stats">
            <div className="stat-card">
              <div className="stat-icon"><i className="fas fa-seedling"></i></div>
              <div className="stat-content">
                <div className="stat-number">{displayCrops.length}+</div>
                <div className="stat-label">Mazao Yanayopatikana</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon"><i className="fas fa-users"></i></div>
              <div className="stat-content">
                <div className="stat-number">200+</div>
                <div className="stat-label">Wakulima Waliojiunga</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon"><i className="fas fa-shopping-cart"></i></div>
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
