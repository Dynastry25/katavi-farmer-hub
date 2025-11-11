import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '../Navbar/Navbar';
import Footer from '../Footer/Footer';
import './BuyerDashboard.css';



const BuyerDashboard = ({ onPageChange, onAuth, user, crops, onToggleChat, onRefresh }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [selectedCrop, setSelectedCrop] = useState(null);
  const [selectedFarmer, setSelectedFarmer] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [orderDetails, setOrderDetails] = useState({
    quantity: '',
    deliveryDate: '',
    specialInstructions: ''
  });

  useEffect(() => {
  // Scroll to top when tab changes
  window.scrollTo({
    top: 0,
    left: 0,
    behavior: 'smooth'
  });
}, [activeTab]);
  const navigate = useNavigate();

  // Sample data for buyer
  const buyerStats = {
    totalOrders: 15,
    pendingOrders: 3,
    completedOrders: 12,
    totalSpent: 'TZS 3,250,000',
    favoriteCrops: ['Mahindi', 'Mpunga', 'Maharage'],
    trustedFarmers: 8
  };

  const myOrders = [
    {
      id: 1,
      crop: 'Mahindi',
      farmer: 'Juma Mwinyi',
      quantity: '50kg',
      price: 'TZS 150,000',
      orderDate: '2024-01-15',
      deliveryDate: '2024-01-20',
      status: 'pending',
      farmerContact: '+255 789 123 456'
    },
    {
      id: 2,
      crop: 'Mpunga',
      farmer: 'Asha Hassan',
      quantity: '100kg',
      price: 'TZS 300,000',
      orderDate: '2024-01-10',
      deliveryDate: '2024-01-12',
      status: 'completed',
      farmerContact: '+255 789 123 457'
    },
    {
      id: 3,
      crop: 'Maharage',
      farmer: 'Mohamed Ali',
      quantity: '30kg',
      price: 'TZS 120,000',
      orderDate: '2024-01-08',
      deliveryDate: '2024-01-15',
      status: 'delivered',
      farmerContact: '+255 789 123 458'
    },
    {
      id: 4,
      crop: 'Alizeti',
      farmer: 'Grace Peter',
      quantity: '20kg',
      price: 'TZS 80,000',
      orderDate: '2024-01-05',
      deliveryDate: '2024-01-10',
      status: 'cancelled',
      farmerContact: '+255 789 123 459'
    }
  ];

  const savedFarmers = [
    {
      id: 1,
      name: 'Juma Mwinyi',
      location: 'Mpanda',
      rating: 4.8,
      totalSales: 45,
      crops: ['Mahindi', 'Mpunga'],
      contact: '+255 789 123 456',
      joinDate: '2023-05-15'
    },
    {
      id: 2,
      name: 'Asha Hassan',
      location: 'Mlele',
      rating: 4.9,
      totalSales: 32,
      crops: ['Maharage', 'Karanga'],
      contact: '+255 789 123 457',
      joinDate: '2023-06-20'
    },
    {
      id: 3,
      name: 'Mohamed Ali',
      location: 'Nsimbo',
      rating: 4.7,
      totalSales: 28,
      crops: ['Alizeti', 'Uwele'],
      contact: '+255 789 123 458',
      joinDate: '2023-04-10'
    }
  ];

  const recentActivities = [
    {
      id: 1,
      type: 'order',
      description: 'Umetuma agizo jipya la mahindi',
      time: '2 saa zilizopita',
      icon: '📦'
    },
    {
      id: 2,
      type: 'message',
      description: 'Ulipokea ujumbe kutoka kwa mkulima',
      time: '5 saa zilizopita',
      icon: '💬'
    },
    {
      id: 3,
      type: 'delivery',
      description: 'Agizo lako la mpunga limewasilishwa',
      time: '1 siku iliyopita',
      icon: '🚚'
    },
    {
      id: 4,
      type: 'price',
      description: 'Bei ya maharage imeshuka kwenye soko',
      time: '2 siku zilizopita',
      icon: '💰'
    }
  ];

  // Filter crops based on search and category
  const filteredCrops = crops.filter(crop => {
    const matchesSearch = crop.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         crop.farmer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || crop.type === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = [
    { value: 'all', label: 'Mazao Yote' },
    { value: 'cereal', label: 'Nafaka' },
    { value: 'legume', label: 'Mikunde' },
    { value: 'vegetable', label: 'Mboga' },
    { value: 'fruit', label: 'Matunda' }
  ];

  const handlePlaceOrder = (crop) => {
    setSelectedCrop(crop);
    setOrderDetails({
      quantity: '',
      deliveryDate: '',
      specialInstructions: ''
    });
    setShowOrderModal(true);
  };

  const handleContactFarmer = (farmer) => {
    setSelectedFarmer(farmer);
    setShowContactModal(true);
  };

  const handleSubmitOrder = (e) => {
    e.preventDefault();
    // Handle order submission logic here
    console.log('Placing order:', { crop: selectedCrop, details: orderDetails });
    alert(`Umeweka agizo la ${orderDetails.quantity}kg ya ${selectedCrop.name} kwa mkulima ${selectedCrop.farmer}!`);
    setShowOrderModal(false);
    setSelectedCrop(null);
    setOrderDetails({
      quantity: '',
      deliveryDate: '',
      specialInstructions: ''
    });
  };

  const handleCancelOrder = (orderId) => {
    if (window.confirm('Una uhakika unataka kughairi agizo hili?')) {
      alert(`Umekatiza agizo #${orderId}`);
    }
  };

  const renderOverview = () => (
    <div className="buyer-overview">
      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📦</div>
          <div className="stat-content">
            <div className="stat-number">{buyerStats.totalOrders}</div>
            <div className="stat-label">Maagizo Yote</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⏳</div>
          <div className="stat-content">
            <div className="stat-number">{buyerStats.pendingOrders}</div>
            <div className="stat-label">Maagizo Yanayosubiri</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <div className="stat-number">{buyerStats.completedOrders}</div>
            <div className="stat-label">Maagizo Yakamilika</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <div className="stat-number">{buyerStats.totalSpent}</div>
            <div className="stat-label">Jumla ya Matumizi</div>
          </div>
        </div>
      </div>

      {/* Favorite Crops */}
      <div className="favorites-section">
        <h3>Mazao Unayopenda</h3>
        <div className="favorites-tags">
          {buyerStats.favoriteCrops.map((crop, index) => (
            <span key={index} className="favorite-tag">{crop}</span>
          ))}
        </div>
      </div>

      {/* Recent Activities */}
      <div className="activities-section">
        <h3>Shughuli Zaidi ya Hivi Karibuni</h3>
        <div className="activities-list">
          {recentActivities.map(activity => (
            <div key={activity.id} className="activity-item">
              <div className="activity-icon">{activity.icon}</div>
              <div className="activity-content">
                <p className="activity-description">{activity.description}</p>
                <span className="activity-time">{activity.time}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <h3>Vitendo vya Haraka</h3>
        <div className="actions-grid">
          <button className="action-btn" onClick={() => setActiveTab('marketplace')}>
            <i className="fas fa-search"></i>
            <span>Tafuta Mazao</span>
          </button>
          <button className="action-btn" onClick={() => setActiveTab('orders')}>
            <i className="fas fa-shopping-cart"></i>
            <span>Angalia Maagizo</span>
          </button>
          <button className="action-btn" onClick={() => setActiveTab('farmers')}>
            <i className="fas fa-users"></i>
            <span>Wakulima Wanaoaminika</span>
          </button>
          <button className="action-btn" onClick={onToggleChat}>
            <i className="fas fa-comments"></i>
            <span>Mazungumzo</span>
          </button>
        </div>
      </div>

      {/* Dashboard Links */}
      <div className="dashboard-links-section">
        <h3>🔗 Huduma za Wanunuzi</h3>
        <div className="dashboard-links-grid">
          <button className="dashboard-link-card" onClick={() => navigate('/market')}>
            <div className="link-icon">
              <i className="fas fa-store"></i>
            </div>
            <div className="link-content">
              <h4>Soko la Mazao</h4>
              <p>Angalia na nunua mazao mbalimbali</p>
            </div>
          </button>
          
          <button className="dashboard-link-card" onClick={() => navigate('/suppliers')}>
            <div className="link-icon">
              <i className="fas fa-truck"></i>
            </div>
            <div className="link-content">
              <h4>Wauzaji wa Pembejeo</h4>
              <p>Pata pembejeo za kilimo</p>
            </div>
          </button>
          
          <button className="dashboard-link-card" onClick={() => navigate('/farmer-groups')}>
            <div className="link-icon">
              <i className="fas fa-users"></i>
            </div>
            <div className="link-content">
              <h4>Wakulima</h4>
              <p>Wasiliana na wakulima moja kwa moja</p>
            </div>
          </button>
          
          <button className="dashboard-link-card" onClick={() => navigate('/reports')}>
            <div className="link-icon">
              <i className="fas fa-chart-bar"></i>
            </div>
            <div className="link-content">
              <h4>Ripoti za Bei</h4>
              <p>Fuata mienendo ya bei za mazao</p>
            </div>
          </button>

          <button className="dashboard-link-card" onClick={() => navigate('/weather')}>
            <div className="link-icon">
              <i className="fas fa-cloud-sun"></i>
            </div>
            <div className="link-content">
              <h4>Hali ya Hewa</h4>
              <p>Angalia utabiri wa hali ya hewa</p>
            </div>
          </button>

          <button className="dashboard-link-card" onClick={() => navigate('/advice')}>
            <div className="link-icon">
              <i className="fas fa-graduation-cap"></i>
            </div>
            <div className="link-content">
              <h4>Ushauri wa Kilimo</h4>
              <p>Pata maelekezo kutoka kwa wataalamu</p>
            </div>
          </button>

          <button className="dashboard-link-card" onClick={() => navigate('/news')}>
            <div className="link-icon">
              <i className="fas fa-newspaper"></i>
            </div>
            <div className="link-content">
              <h4>Habari za Soko</h4>
              <p>Taarifa mpya za soko la mazao</p>
            </div>
          </button>

          <button className="dashboard-link-card" onClick={() => navigate('/loans')}>
            <div className="link-icon">
              <i className="fas fa-hand-holding-usd"></i>
            </div>
            <div className="link-content">
              <h4>Mikopo ya Biashara</h4>
              <p>Angalia fursa za mikopo</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );

  const renderMarketplace = () => (
    <div className="buyer-section">
      <div className="section-header">
        <h3>Soko la Mazao</h3>
        <div className="search-filters">
          <div className="search-box">
            <i className="fas fa-search"></i>
            <input
              type="text"
              placeholder="Tafuta mazao au wakulima..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select 
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="category-filter"
          >
            {categories.map(category => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="crops-grid">
        {filteredCrops.map(crop => (
          <div key={crop.id} className="crop-card">
            <div className="crop-image">
              {crop.image || '🌾'}
            </div>
            <div className="crop-content">
              <h4>{crop.name}</h4>
              <p>{crop.description}</p>
              <div className="crop-details">
                <span><strong>Bei:</strong> {crop.price}/kg</span>
                <span><strong>Kiasi:</strong> {crop.quantity}kg</span>
                <span><strong>Eneo:</strong> {crop.location}</span>
              </div>
              <div className="farmer-info">
                <i className="fas fa-user"></i>
                <span>{crop.farmer}</span>
                <span className="rating">⭐ {crop.rating || 4.5}</span>
              </div>
              <div className="crop-actions">
                <button 
                  className="btn btn-sm btn-primary"
                  onClick={() => handlePlaceOrder(crop)}
                >
                  <i className="fas fa-cart-plus"></i> Agiza Sasa
                </button>
                <button 
                  className="btn btn-sm btn-outline"
                  onClick={() => handleContactFarmer({ name: crop.farmer, contact: crop.contact })}
                >
                  <i className="fas fa-phone"></i> Wasiliana
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredCrops.length === 0 && (
        <div className="empty-state">
          <i className="fas fa-search"></i>
          <h4>Hakuna mazao yaliyopatikana</h4>
          <p>Badilisha utafutaji wako au kategoria ili kuona matokeo</p>
          <button className="btn btn-primary" onClick={() => {
            setSearchTerm('');
            setSelectedCategory('all');
          }}>
            <i className="fas fa-refresh"></i> Onyesha Mazao Yote
          </button>
        </div>
      )}

      {/* Additional Links in Marketplace Tab */}
      <div className="dashboard-links-section">
        <h3>🔗 Viungo vya Ziada</h3>
        <div className="dashboard-links-grid">
          <button className="dashboard-link-card" onClick={() => navigate('/suppliers')}>
            <div className="link-icon">
              <i className="fas fa-truck"></i>
            </div>
            <div className="link-content">
              <h4>Wauzaji wa Pembejeo</h4>
              <p>Pata pembejeo za ziada</p>
            </div>
          </button>
          
          <button className="dashboard-link-card" onClick={() => navigate('/reports')}>
            <div className="link-icon">
              <i className="fas fa-chart-line"></i>
            </div>
            <div className="link-content">
              <h4>Bei za Soko</h4>
              <p>Angalia mienendo ya bei</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );

  const renderOrders = () => (
    <div className="buyer-section">
      <h3>Historia ya Maagizo Yangu</h3>
      
      <div className="orders-table-container">
        <table className="orders-table">
          <thead>
            <tr>
              <th>Zao</th>
              <th>Mkulima</th>
              <th>Kiasi</th>
              <th>Bei</th>
              <th>Tarehe ya Agizo</th>
              <th>Tarehe ya Uwasilishaji</th>
              <th>Hali</th>
              <th>Vitendo</th>
            </tr>
          </thead>
          <tbody>
            {myOrders.map(order => (
              <tr key={order.id}>
                <td>{order.crop}</td>
                <td>{order.farmer}</td>
                <td>{order.quantity}</td>
                <td>{order.price}</td>
                <td>{order.orderDate}</td>
                <td>{order.deliveryDate}</td>
                <td>
                  <span className={`status-badge ${order.status}`}>
                    {order.status === 'pending' ? 'Inasubiri' : 
                     order.status === 'completed' ? 'Imekamilika' :
                     order.status === 'delivered' ? 'Imepelekwa' : 'Imekatizwa'}
                  </span>
                </td>
                <td>
                  <div className="order-actions">
                    <button className="btn btn-sm btn-outline">
                      <i className="fas fa-eye"></i> Angalia
                    </button>
                    {order.status === 'pending' && (
                      <button 
                        className="btn btn-sm btn-danger"
                        onClick={() => handleCancelOrder(order.id)}
                      >
                        <i className="fas fa-times"></i> Katiza
                      </button>
                    )}
                    <button className="btn btn-sm btn-primary">
                      <i className="fas fa-phone"></i> Piga
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Order Statistics */}
      <div className="order-stats">
        <div className="stat-card">
          <div className="stat-value">{myOrders.filter(o => o.status === 'pending').length}</div>
          <div className="stat-label">Yanayosubiri</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{myOrders.filter(o => o.status === 'completed').length}</div>
          <div className="stat-label">Yaliyokamilika</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{myOrders.filter(o => o.status === 'delivered').length}</div>
          <div className="stat-label">Yaliyowasilishwa</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{myOrders.length}</div>
          <div className="stat-label">Jumla</div>
        </div>
      </div>

      {/* Additional Links in Orders Tab */}
      <div className="dashboard-links-section">
        <h3>🔗 Viungo vya Usaidizi</h3>
        <div className="dashboard-links-grid">
          <button className="dashboard-link-card" onClick={onToggleChat}>
            <div className="link-icon">
              <i className="fas fa-comments"></i>
            </div>
            <div className="link-content">
              <h4>Msaada wa Moja kwa Moja</h4>
              <p>Wasiliana na msaada wa wateja</p>
            </div>
          </button>
          
          <button className="dashboard-link-card" onClick={() => navigate('/contact')}>
            <div className="link-icon">
              <i className="fas fa-headset"></i>
            </div>
            <div className="link-content">
              <h4>Huduma kwa Wateja</h4>
              <p>Pata msaada wa ziada</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );

  const renderFarmers = () => (
    <div className="buyer-section">
      <h3>Wakulima Wanaoaminika</h3>
      
      <div className="farmers-grid">
        {savedFarmers.map(farmer => (
          <div key={farmer.id} className="farmer-card">
            <div className="farmer-avatar">
              <i className="fas fa-user"></i>
            </div>
            <div className="farmer-content">
              <h4>{farmer.name}</h4>
              <div className="farmer-location">
                <i className="fas fa-map-marker-alt"></i>
                {farmer.location}
              </div>
              <div className="farmer-rating">
                ⭐ {farmer.rating} ({farmer.totalSales} mauzo)
              </div>
              <div className="farmer-crops">
                <strong>Mazao:</strong>
                <div className="crops-tags">
                  {farmer.crops.map((crop, index) => (
                    <span key={index} className="crop-tag">{crop}</span>
                  ))}
                </div>
              </div>
              <div className="farmer-meta">
                <span>Imejiunga: {new Date(farmer.joinDate).toLocaleDateString('sw-TZ')}</span>
              </div>
              <div className="farmer-actions">
                <button 
                  className="btn btn-sm btn-primary"
                  onClick={() => handleContactFarmer(farmer)}
                >
                  <i className="fas fa-phone"></i> Wasiliana
                </button>
                <button className="btn btn-sm btn-outline" onClick={() => navigate('/market')}>
                  <i className="fas fa-store"></i> Angalia Mazao
                </button>
                <button className="btn btn-sm btn-success">
                  <i className="fas fa-star"></i> Weka Alama
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Additional Links in Farmers Tab */}
      <div className="dashboard-links-section">
        <h3>🔗 Pata Wakulima Wengine</h3>
        <div className="dashboard-links-grid">
          <button className="dashboard-link-card" onClick={() => navigate('/farmer-groups')}>
            <div className="link-icon">
              <i className="fas fa-users"></i>
            </div>
            <div className="link-content">
              <h4>Vikundi vya Wakulima</h4>
              <p>Jiunge na vikundi vya wakulima</p>
            </div>
          </button>
          
          <button className="dashboard-link-card" onClick={() => navigate('/market')}>
            <div className="link-icon">
              <i className="fas fa-store"></i>
            </div>
            <div className="link-content">
              <h4>Soko la Mazao</h4>
              <p>Angalia wakulima wote</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );

  const renderAnalytics = () => (
    <div className="buyer-section">
      <h3>Takwimu za Ununuzi</h3>
      
      <div className="analytics-grid">
        <div className="analytics-card">
          <h4>Matumizi ya Mwezi</h4>
          <div className="analytics-value">TZS 750,000</div>
          <div className="analytics-trend positive">+12% kutoka mwezi uliopita</div>
        </div>
        <div className="analytics-card">
          <h4>Mazao Yanayonunuliwa Zaidi</h4>
          <div className="analytics-value">Mahindi</div>
          <div className="analytics-trend">35% ya ununuzi wote</div>
        </div>
        <div className="analytics-card">
          <h4>Wakulima Wapya</h4>
          <div className="analytics-value">2</div>
          <div className="analytics-trend positive">Wameongezeka mwezi huu</div>
        </div>
        <div className="analytics-card">
          <h4>Wastani wa Bei</h4>
          <div className="analytics-value">TZS 1,850/kg</div>
          <div className="analytics-trend negative">-5% kutoka mwezi uliopita</div>
        </div>
      </div>

      <div className="spending-breakdown">
        <h4>Mgawanyiko wa Matumizi kwa Mazao</h4>
        <div className="breakdown-chart">
          <div className="chart-item">
            <div className="chart-bar" style={{width: '35%'}}></div>
            <span className="chart-label">Mahindi - 35%</span>
          </div>
          <div className="chart-item">
            <div className="chart-bar" style={{width: '25%'}}></div>
            <span className="chart-label">Mpunga - 25%</span>
          </div>
          <div className="chart-item">
            <div className="chart-bar" style={{width: '20%'}}></div>
            <span className="chart-label">Maharage - 20%</span>
          </div>
          <div className="chart-item">
            <div className="chart-bar" style={{width: '15%'}}></div>
            <span className="chart-label">Mengineyo - 15%</span>
          </div>
        </div>
      </div>

      {/* Additional Links in Analytics Tab */}
      <div className="dashboard-links-section">
        <h3>🔗 Ripoti za Ziada</h3>
        <div className="dashboard-links-grid">
          <button className="dashboard-link-card" onClick={() => navigate('/reports')}>
            <div className="link-icon">
              <i className="fas fa-chart-line"></i>
            </div>
            <div className="link-content">
              <h4>Ripoti Kamili</h4>
              <p>Angalia ripoti zote za ununuzi</p>
            </div>
          </button>
          
          <button className="dashboard-link-card" onClick={() => navigate('/market')}>
            <div className="link-icon">
              <i className="fas fa-chart-bar"></i>
            </div>
            <div className="link-content">
              <h4>Bei za Soko</h4>
              <p>Angalia mienendo ya bei za mazao</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="page buyer-dashboard-page">
      <Navigation 
        currentPage="buyer-dashboard"
        onPageChange={onPageChange}
        onAuth={onAuth}
        user={user}
      />
      
      <div className="buyer-dashboard-container">
        <div className="container">
          {/* Dashboard Header */}
          <div className="dashboard-header">
            <div className="welcome-section">
              <h1>Karibu, Mnunuzi {user?.name}!</h1>
              <p>Dashibodi yako ya kununua mazao bora kutoka kwa wakulima wa Katavi</p>
              <div className="buyer-badge">
                <i className="fas fa-shopping-cart"></i>
                Mnunuzi Waandaliwa
              </div>
            </div>
            <div className="header-actions">
              <button className="btn btn-primary" onClick={() => setActiveTab('marketplace')}>
                <i className="fas fa-search"></i> Tafuta Mazao
              </button>
              <button className="btn btn-outline" onClick={onToggleChat}>
                <i className="fas fa-comments"></i> Mazungumzo
              </button>
              <button className="btn btn-success" onClick={() => navigate('/reports')}>
                <i className="fas fa-chart-line"></i> Ripoti za Bei
              </button>
            </div>
          </div>

          {/* Dashboard Tabs */}
          <div className="dashboard-tabs">
            <button 
              className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              <i className="fas fa-chart-pie"></i>
              Mapitio
            </button>
            <button 
              className={`tab-btn ${activeTab === 'marketplace' ? 'active' : ''}`}
              onClick={() => setActiveTab('marketplace')}
            >
              <i className="fas fa-store"></i>
              Soko la Mazao
            </button>
            <button 
              className={`tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
              onClick={() => setActiveTab('orders')}
            >
              <i className="fas fa-shopping-cart"></i>
              Maagizo Yangu
            </button>
            <button 
              className={`tab-btn ${activeTab === 'farmers' ? 'active' : ''}`}
              onClick={() => setActiveTab('farmers')}
            >
              <i className="fas fa-users"></i>
              Wakulima
            </button>
            <button 
              className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
              onClick={() => setActiveTab('analytics')}
            >
              <i className="fas fa-chart-line"></i>
              Takwimu
            </button>
          </div>

          {/* Dashboard Content */}
          <div className="dashboard-content">
            {activeTab === 'overview' && renderOverview()}
            {activeTab === 'marketplace' && renderMarketplace()}
            {activeTab === 'orders' && renderOrders()}
            {activeTab === 'farmers' && renderFarmers()}
            {activeTab === 'analytics' && renderAnalytics()}
          </div>
        </div>
      </div>

      {/* Order Modal */}
      {showOrderModal && selectedCrop && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Agiza {selectedCrop.name}</h3>
              <button className="close-btn" onClick={() => setShowOrderModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <form onSubmit={handleSubmitOrder} className="modal-body">
              <div className="order-preview">
                <div className="crop-info">
                  <h4>Maelezo ya Zao:</h4>
                  <p><strong>Mkulima:</strong> {selectedCrop.farmer}</p>
                  <p><strong>Bei ya Msingi:</strong> {selectedCrop.price}/kg</p>
                  <p><strong>Kiasi Kinachopatikana:</strong> {selectedCrop.quantity}kg</p>
                  <p><strong>Eneo:</strong> {selectedCrop.location}</p>
                </div>
              </div>
              
              <div className="form-grid">
                <div className="form-group">
                  <label>Kiasi Unachotaka (kg) *</label>
                  <input
                    type="number"
                    value={orderDetails.quantity}
                    onChange={(e) => setOrderDetails({...orderDetails, quantity: e.target.value})}
                    required
                    min="1"
                    max={selectedCrop.quantity}
                    placeholder="Weka kiasi unachohitaji"
                  />
                </div>
                <div className="form-group">
                  <label>Tarehe ya Uwasilishaji *</label>
                  <input
                    type="date"
                    value={orderDetails.deliveryDate}
                    onChange={(e) => setOrderDetails({...orderDetails, deliveryDate: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group full-width">
                  <label>Maagizo Maalum</label>
                  <textarea
                    value={orderDetails.specialInstructions}
                    onChange={(e) => setOrderDetails({...orderDetails, specialInstructions: e.target.value})}
                    placeholder="Weka maagizo yoyote maalum kuhusu agizo lako..."
                    rows="3"
                  />
                </div>
              </div>

              {orderDetails.quantity && (
                <div className="order-summary">
                  <h4>Muhtasari wa Agizo:</h4>
                  <div className="summary-details">
                    <p><strong>Jumla ya Bei:</strong> TZS {(parseInt(selectedCrop.price) * parseInt(orderDetails.quantity) || 0).toLocaleString()}</p>
                    <p><strong>Kiasi:</strong> {orderDetails.quantity}kg</p>
                    <p><strong>Bei ya Kipekee:</strong> {selectedCrop.price}/kg</p>
                  </div>
                </div>
              )}

              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowOrderModal(false)}>
                  Ghairi
                </button>
                <button type="submit" className="btn btn-primary">
                  <i className="fas fa-check"></i> Thibitisha Agizo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Contact Farmer Modal */}
      {showContactModal && selectedFarmer && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Wasiliana na {selectedFarmer.name}</h3>
              <button className="close-btn" onClick={() => setShowContactModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <div className="contact-details">
                <div className="contact-info">
                  <h4>Maelezo ya Mawasiliano:</h4>
                  <p><strong>Namba ya Simu:</strong> {selectedFarmer.contact}</p>
                  <p><strong>Eneo:</strong> {selectedFarmer.location}</p>
                  {selectedFarmer.rating && (
                    <p><strong>Ukadiriaji:</strong> ⭐ {selectedFarmer.rating}</p>
                  )}
                </div>
                
                <div className="contact-tips">
                  <h5>Vidokezo vya Mawasiliano:</h5>
                  <ul>
                    <li>Jisalulishe kwa neno "Habari"</li>
                    <li>Eleza wazi kuhusu hitaji lako la mazao</li>
                    <li>Uliza maswali kuhusu ubora wa mazao</li>
                    <li>Panga mkutano wa kuona mazao</li>
                  </ul>
                </div>
              </div>
              
              <div className="modal-actions">
                <button className="btn btn-outline" onClick={() => setShowContactModal(false)}>
                  Funga
                </button>
                <a 
                  href={`tel:${selectedFarmer.contact}`}
                  className="btn btn-primary"
                >
                  <i className="fas fa-phone"></i> Piga Simu Sasa
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer onPageChange={onPageChange} />
    </div>
  );
};

export default BuyerDashboard;