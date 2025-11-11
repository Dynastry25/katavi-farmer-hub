import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '../Navbar/Navbar';
import Footer from '../Footer/Footer';
import './FarmerDashboard.css';

const FarmerDashboard = ({ onPageChange, onAuth, user, crops, onToggleChat, onAddCrop, onUpdateCrop, onDeleteCrop, onRefresh }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [showAddCropModal, setShowAddCropModal] = useState(false);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const navigate = useNavigate();

  const [newCrop, setNewCrop] = useState({
    name: '',
    type: '',
    quantity: '',
    price: '',
    description: '',
    harvestDate: '',
    location: user?.location || '',
    image: ''
  });

  const [newProduct, setNewProduct] = useState({
    name: '',
    category: '',
    quantity: '',
    price: '',
    description: '',
    processingMethod: '',
    shelfLife: ''
  });

  // Sample data for farmer
  const myCrops = crops.filter(crop => crop.farmer === user?.name);
  const myProducts = [
    {
      id: 1,
      name: 'Unga wa Mahindi',
      category: 'Vyakula Vilivyotengenezwa',
      quantity: '50kg',
      price: 'TZS 2,500/kg',
      description: 'Unga wa mahindi safi uliotengenezwa kwa ustadi',
      status: 'available'
    }
  ];

  const orders = [
    { 
      id: 1, 
      crop: 'Mahindi', 
      buyer: 'John Doe', 
      quantity: '50kg', 
      price: 'TZS 150,000', 
      status: 'pending',
      orderDate: '2024-01-15',
      deliveryDate: '2024-01-20',
      contact: '+255 789 456 123'
    },
    { 
      id: 2, 
      crop: 'Mpunga', 
      buyer: 'Jane Smith', 
      quantity: '100kg', 
      price: 'TZS 300,000', 
      status: 'completed',
      orderDate: '2024-01-10',
      deliveryDate: '2024-01-12',
      contact: '+255 789 456 124'
    },
    { 
      id: 3, 
      crop: 'Maharage', 
      buyer: 'Mike Johnson', 
      quantity: '30kg', 
      price: 'TZS 120,000', 
      status: 'cancelled',
      orderDate: '2024-01-08',
      deliveryDate: '2024-01-15',
      contact: '+255 789 456 125'
    }
  ];

  const farmerStats = {
    totalCrops: myCrops.length,
    activeListings: myCrops.filter(crop => crop.status === 'available').length,
    totalProducts: myProducts.length,
    totalSales: 12,
    revenue: 'TZS 2,450,000',
    pendingOrders: orders.filter(order => order.status === 'pending').length,
    completedOrders: orders.filter(order => order.status === 'completed').length
  };

  const recentActivities = [
    {
      id: 1,
      type: 'sale',
      description: 'Umekuza mahindi kwa TZS 450,000',
      time: '2 saa zilizopita',
      icon: '💰'
    },
    {
      id: 2,
      type: 'message',
      description: 'Ulipokea ujumbe kutoka kwa mnunuzi',
      time: '5 saa zilizopita',
      icon: '💬'
    },
    {
      id: 3,
      type: 'order',
      description: 'Agizo jipya la mpunga',
      time: '1 siku iliyopita',
      icon: '📦'
    },
    {
      id: 4,
      type: 'weather',
      description: 'Mvua inatarajiwa kesho',
      time: '1 siku iliyopita',
      icon: '🌧️'
    }
  ];

  const handleAddCrop = (e) => {
    e.preventDefault();
    // Handle adding new crop logic here
    const addedCrop = onAddCrop(newCrop);
    console.log('Adding new crop:', addedCrop);
    alert('Zao jipya limeongezwa kikamilifu!');
    setShowAddCropModal(false);
    setNewCrop({
      name: '',
      type: '',
      quantity: '',
      price: '',
      description: '',
      harvestDate: '',
      location: user?.location || '',
      image: ''
    });
  };

  const handleAddProduct = (e) => {
    e.preventDefault();
    // Handle adding new product logic here
    console.log('Adding new product:', newProduct);
    alert('Bidhaa mpya imeongezwa kikamilifu!');
    setShowAddProductModal(false);
    setNewProduct({
      name: '',
      category: '',
      quantity: '',
      price: '',
      description: '',
      processingMethod: '',
      shelfLife: ''
    });
  };

  const handleOrderAction = (orderId, action) => {
    if (action === 'accept') {
      alert(`Umekubali agizo #${orderId}`);
    } else if (action === 'reject') {
      alert(`Umekataa agizo #${orderId}`);
    }
    setShowOrderModal(false);
  };

  const renderOverview = () => (
    <div className="farmer-overview">
      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">🌾</div>
          <div className="stat-content">
            <div className="stat-number">{farmerStats.totalCrops}</div>
            <div className="stat-label">Mazao Yaliyowekwa</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📦</div>
          <div className="stat-content">
            <div className="stat-number">{farmerStats.activeListings}</div>
            <div className="stat-label">Mazao Yanayopatikana</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <div className="stat-number">{farmerStats.totalSales}</div>
            <div className="stat-label">Mauzo Yaliyokamilika</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⏳</div>
          <div className="stat-content">
            <div className="stat-number">{farmerStats.pendingOrders}</div>
            <div className="stat-label">Maagizo Yanayosubiri</div>
          </div>
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
          <button className="action-btn" onClick={() => setShowAddCropModal(true)}>
            <i className="fas fa-seedling"></i>
            <span>Ongeza Zao Jipya</span>
          </button>
          <button className="action-btn" onClick={() => setShowAddProductModal(true)}>
            <i className="fas fa-industry"></i>
            <span>Ongeza Bidhaa</span>
          </button>
          <button className="action-btn" onClick={() => setActiveTab('orders')}>
            <i className="fas fa-shopping-cart"></i>
            <span>Angalia Maagizo</span>
          </button>
          <button className="action-btn" onClick={() => setActiveTab('analytics')}>
            <i className="fas fa-chart-line"></i>
            <span>Takwimu za Biashara</span>
          </button>
        </div>
      </div>

      {/* Dashboard Links */}
      <div className="dashboard-links-section">
        <h3>🔗 Huduma za Wakulima</h3>
        <div className="dashboard-links-grid">
          <button className="dashboard-link-card" onClick={() => navigate('/market')}>
            <div className="link-icon">
              <i className="fas fa-store"></i>
            </div>
            <div className="link-content">
              <h4>Soko la Mazao</h4>
              <p>Weka na uuze mazao yako</p>
            </div>
          </button>
          
          <button className="dashboard-link-card" onClick={() => navigate('/suppliers')}>
            <div className="link-icon">
              <i className="fas fa-truck"></i>
            </div>
            <div className="link-content">
              <h4>Wauzaji wa Pembejeo</h4>
              <p>Pata mbolea na vifaa</p>
            </div>
          </button>
          
          <button className="dashboard-link-card" onClick={() => navigate('/loans')}>
            <div className="link-icon">
              <i className="fas fa-hand-holding-usd"></i>
            </div>
            <div className="link-content">
              <h4>Mikopo</h4>
              <p>Omba mkopo wa kilimo</p>
            </div>
          </button>
          
          <button className="dashboard-link-card" onClick={() => navigate('/farmer-groups')}>
            <div className="link-icon">
              <i className="fas fa-users"></i>
            </div>
            <div className="link-content">
              <h4>Vikundi vya Wakulima</h4>
              <p>Jiunge na wakulima wengine</p>
            </div>
          </button>
          
          <button className="dashboard-link-card" onClick={() => navigate('/reports')}>
            <div className="link-icon">
              <i className="fas fa-chart-bar"></i>
            </div>
            <div className="link-content">
              <h4>Ripoti na Takwimu</h4>
              <p>Angalia mienendo ya biashara</p>
            </div>
          </button>
          
          <button className="dashboard-link-card" onClick={() => navigate('/advice')}>
            <div className="link-icon">
              <i className="fas fa-graduation-cap"></i>
            </div>
            <div className="link-content">
              <h4>Ushauri wa Kilimo</h4>
              <p>Pata maelekezo ya wataalamu</p>
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

          <button className="dashboard-link-card" onClick={() => navigate('/inputs')}>
            <div className="link-icon">
              <i className="fas fa-tools"></i>
            </div>
            <div className="link-content">
              <h4>Pembejeo</h4>
              <p>Vifaa na vyombo vya kilimo</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );

  const renderMyCrops = () => (
    <div className="farmer-section">
      <div className="section-header">
        <h3>Mazao Yangu</h3>
        <button className="btn btn-primary" onClick={() => setShowAddCropModal(true)}>
          <i className="fas fa-plus"></i> Ongeza Zao Jipya
        </button>
      </div>

      {myCrops.length > 0 ? (
        <div className="crops-grid">
          {myCrops.map(crop => (
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
                <div className="crop-status">
                  <span className={`status-badge ${crop.status}`}>
                    {crop.status === 'available' ? 'Inapatikana' : 'Imeuzwa'}
                  </span>
                </div>
                <div className="crop-actions">
                  <button className="btn btn-sm btn-outline">Hariri</button>
                  <button className="btn btn-sm btn-primary">Ongeza Picha</button>
                  <button className="btn btn-sm btn-danger">Futa</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <i className="fas fa-seedling"></i>
          <h4>Huna mazao yaliyowekwa bado</h4>
          <p>Anza kuuza mazao yako kwa kuongeza zao jipya</p>
          <button className="btn btn-primary" onClick={() => setShowAddCropModal(true)}>
            <i className="fas fa-plus"></i> Ongeza Zao la Kwanza
          </button>
        </div>
      )}
    </div>
  );

  const renderMyProducts = () => (
    <div className="farmer-section">
      <div className="section-header">
        <h3>Bidhaa Zangu Zilizotengenezwa</h3>
        <button className="btn btn-primary" onClick={() => setShowAddProductModal(true)}>
          <i className="fas fa-plus"></i> Ongeza Bidhaa Mpya
        </button>
      </div>

      {myProducts.length > 0 ? (
        <div className="products-grid">
          {myProducts.map(product => (
            <div key={product.id} className="product-card">
              <div className="product-image">
                {product.image || '🏭'}
              </div>
              <div className="product-content">
                <h4>{product.name}</h4>
                <p>{product.description}</p>
                <div className="product-details">
                  <span><strong>Kategoria:</strong> {product.category}</span>
                  <span><strong>Kiasi:</strong> {product.quantity}</span>
                  <span><strong>Bei:</strong> {product.price}</span>
                </div>
                <div className="product-actions">
                  <button className="btn btn-sm btn-outline">Hariri</button>
                  <button className="btn btn-sm btn-primary">Pakia Picha</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <i className="fas fa-industry"></i>
          <h4>Huna bidhaa zilizotengenezwa bado</h4>
          <p>Ongeza bidhaa zilizotengenezwa kutoka kwa mazao yako</p>
          <button className="btn btn-primary" onClick={() => setShowAddProductModal(true)}>
            <i className="fas fa-plus"></i> Ongeza Bidhaa ya Kwanza
          </button>
        </div>
      )}
    </div>
  );

  const renderOrders = () => (
    <div className="farmer-section">
      <h3>Maagizo Yangu</h3>
      <div className="orders-table-container">
        <table className="orders-table">
          <thead>
            <tr>
              <th>Zao/Bidhaa</th>
              <th>Mnunuzi</th>
              <th>Kiasi</th>
              <th>Bei</th>
              <th>Tarehe ya Agizo</th>
              <th>Hali</th>
              <th>Vitendo</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(order => (
              <tr key={order.id}>
                <td>{order.crop}</td>
                <td>{order.buyer}</td>
                <td>{order.quantity}</td>
                <td>{order.price}</td>
                <td>{order.orderDate}</td>
                <td>
                  <span className={`status-badge ${order.status}`}>
                    {order.status === 'pending' ? 'Inasubiri' : 
                     order.status === 'completed' ? 'Imekamilika' : 'Imekatizwa'}
                  </span>
                </td>
                <td>
                  <div className="order-actions">
                    <button 
                      className="btn btn-sm btn-outline"
                      onClick={() => {
                        setSelectedOrder(order);
                        setShowOrderModal(true);
                      }}
                    >
                      Angalia
                    </button>
                    {order.status === 'pending' && (
                      <>
                        <button 
                          className="btn btn-sm btn-success"
                          onClick={() => handleOrderAction(order.id, 'accept')}
                        >
                          Kubali
                        </button>
                        <button 
                          className="btn btn-sm btn-danger"
                          onClick={() => handleOrderAction(order.id, 'reject')}
                        >
                          Kataa
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderAnalytics = () => (
    <div className="farmer-section">
      <h3>Takwimu za Biashara</h3>
      <div className="analytics-grid">
        <div className="analytics-card">
          <h4>Mapato ya Mwezi</h4>
          <div className="analytics-value">TZS 1,250,000</div>
          <div className="analytics-trend positive">+15% kutoka mwezi uliopita</div>
        </div>
        <div className="analytics-card">
          <h4>Mauzo ya Mwezi</h4>
          <div className="analytics-value">8</div>
          <div className="analytics-trend positive">+25% kutoka mwezi uliopita</div>
        </div>
        <div className="analytics-card">
          <h4>Mazao Yanayovuma</h4>
          <div className="analytics-value">Mahindi</div>
          <div className="analytics-trend">60% ya mauzo yote</div>
        </div>
        <div className="analytics-card">
          <h4>Wanunuzi Wapya</h4>
          <div className="analytics-value">3</div>
          <div className="analytics-trend positive">+50% kutoka mwezi uliopita</div>
        </div>
      </div>

      {/* Additional Links in Analytics Tab */}
      <div className="dashboard-links-section">
        <h3>🔗 Ripoti za kina</h3>
        <div className="dashboard-links-grid">
          <button className="dashboard-link-card" onClick={() => navigate('/reports')}>
            <div className="link-icon">
              <i className="fas fa-chart-line"></i>
            </div>
            <div className="link-content">
              <h4>Ripoti Kamili</h4>
              <p>Angalia ripoti zote za biashara</p>
            </div>
          </button>
          
          <button className="dashboard-link-card" onClick={() => navigate('/market')}>
            <div className="link-icon">
              <i className="fas fa-chart-bar"></i>
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

  return (
    <div className="page farmer-dashboard-page">
      <Navigation 
        currentPage="farmer-dashboard"
        onPageChange={onPageChange}
        onAuth={onAuth}
        user={user}
      />
      
      <div className="farmer-dashboard-container">
        <div className="container">
          {/* Dashboard Header */}
          <div className="dashboard-header">
            <div className="welcome-section">
              <h1>Karibu, Mkulima {user?.name}!</h1>
              <p>Dashibodi yako ya kusimamia shughuli zako za kilimo na biashara</p>
              <div className="farmer-badge">
                <i className="fas fa-tractor"></i>
                Mkulima Waandaliwa
              </div>
            </div>
            <div className="header-actions">
              <button className="btn btn-primary" onClick={() => setShowAddCropModal(true)}>
                <i className="fas fa-plus"></i> Ongeza Zao
              </button>
              <button className="btn btn-outline" onClick={onToggleChat}>
                <i className="fas fa-comments"></i> Mazungumzo
              </button>
              <button className="btn btn-success" onClick={() => navigate('/loans')}>
                <i className="fas fa-hand-holding-usd"></i> Mikopo
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
              className={`tab-btn ${activeTab === 'mycrops' ? 'active' : ''}`}
              onClick={() => setActiveTab('mycrops')}
            >
              <i className="fas fa-seedling"></i>
              Mazao Yangu
            </button>
            <button 
              className={`tab-btn ${activeTab === 'products' ? 'active' : ''}`}
              onClick={() => setActiveTab('products')}
            >
              <i className="fas fa-industry"></i>
              Bidhaa Zangu
            </button>
            <button 
              className={`tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
              onClick={() => setActiveTab('orders')}
            >
              <i className="fas fa-shopping-cart"></i>
              Maagizo
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
            {activeTab === 'mycrops' && renderMyCrops()}
            {activeTab === 'products' && renderMyProducts()}
            {activeTab === 'orders' && renderOrders()}
            {activeTab === 'analytics' && renderAnalytics()}
          </div>
        </div>
      </div>

      {/* Add Crop Modal */}
      {showAddCropModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Ongeza Zao Jipya</h3>
              <button className="close-btn" onClick={() => setShowAddCropModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <form onSubmit={handleAddCrop} className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label>Jina la Zao *</label>
                  <input
                    type="text"
                    value={newCrop.name}
                    onChange={(e) => setNewCrop({...newCrop, name: e.target.value})}
                    required
                    placeholder="Mf. Mahindi, Mpunga, nk"
                  />
                </div>
                <div className="form-group">
                  <label>Aina ya Zao *</label>
                  <select
                    value={newCrop.type}
                    onChange={(e) => setNewCrop({...newCrop, type: e.target.value})}
                    required
                  >
                    <option value="">Chagua aina</option>
                    <option value="cereal">Nafaka</option>
                    <option value="legume">Mikunde</option>
                    <option value="vegetable">Mboga</option>
                    <option value="fruit">Matunda</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Kiasi (kg) *</label>
                  <input
                    type="number"
                    value={newCrop.quantity}
                    onChange={(e) => setNewCrop({...newCrop, quantity: e.target.value})}
                    required
                    placeholder="Mf. 100"
                  />
                </div>
                <div className="form-group">
                  <label>Bei (TZS/kg) *</label>
                  <input
                    type="number"
                    value={newCrop.price}
                    onChange={(e) => setNewCrop({...newCrop, price: e.target.value})}
                    required
                    placeholder="Mf. 1500"
                  />
                </div>
                <div className="form-group full-width">
                  <label>Maelezo</label>
                  <textarea
                    value={newCrop.description}
                    onChange={(e) => setNewCrop({...newCrop, description: e.target.value})}
                    placeholder="Maelezo ya zao lako..."
                    rows="3"
                  />
                </div>
                <div className="form-group">
                  <label>Tarehe ya Uvunaji</label>
                  <input
                    type="date"
                    value={newCrop.harvestDate}
                    onChange={(e) => setNewCrop({...newCrop, harvestDate: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Eneo</label>
                  <input
                    type="text"
                    value={newCrop.location}
                    onChange={(e) => setNewCrop({...newCrop, location: e.target.value})}
                    placeholder="Eneo la shamba"
                  />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowAddCropModal(false)}>
                  Ghairi
                </button>
                <button type="submit" className="btn btn-primary">
                  <i className="fas fa-save"></i> Hifadhi Zao
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Product Modal */}
      {showAddProductModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Ongeza Bidhaa Mpya</h3>
              <button className="close-btn" onClick={() => setShowAddProductModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <form onSubmit={handleAddProduct} className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label>Jina la Bidhaa *</label>
                  <input
                    type="text"
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                    required
                    placeholder="Mf. Unga wa Mahindi, Mafuta ya Alizeti"
                  />
                </div>
                <div className="form-group">
                  <label>Kategoria *</label>
                  <select
                    value={newProduct.category}
                    onChange={(e) => setNewProduct({...newProduct, category: e.target.value})}
                    required
                  >
                    <option value="">Chagua kategoria</option>
                    <option value="processed_food">Vyakula Vilivyotengenezwa</option>
                    <option value="beverages">Vinywaji</option>
                    <option value="oils">Mafuta</option>
                    <option value="flours">Unga</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Kiasi *</label>
                  <input
                    type="text"
                    value={newProduct.quantity}
                    onChange={(e) => setNewProduct({...newProduct, quantity: e.target.value})}
                    required
                    placeholder="Mf. 50kg, 20L, nk"
                  />
                </div>
                <div className="form-group">
                  <label>Bei *</label>
                  <input
                    type="text"
                    value={newProduct.price}
                    onChange={(e) => setNewProduct({...newProduct, price: e.target.value})}
                    required
                    placeholder="Mf. TZS 2,500/kg"
                  />
                </div>
                <div className="form-group full-width">
                  <label>Maelezo</label>
                  <textarea
                    value={newProduct.description}
                    onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
                    placeholder="Maelezo ya bidhaa..."
                    rows="3"
                  />
                </div>
                <div className="form-group">
                  <label>Mbinu ya Uandaaaji</label>
                  <input
                    type="text"
                    value={newProduct.processingMethod}
                    onChange={(e) => setNewProduct({...newProduct, processingMethod: e.target.value})}
                    placeholder="Mf. Kusaga, Kutengenezea, nk"
                  />
                </div>
                <div className="form-group">
                  <label>Muda wa Kumaliza</label>
                  <input
                    type="text"
                    value={newProduct.shelfLife}
                    onChange={(e) => setNewProduct({...newProduct, shelfLife: e.target.value})}
                    placeholder="Mf. Miezi 6"
                  />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowAddProductModal(false)}>
                  Ghairi
                </button>
                <button type="submit" className="btn btn-primary">
                  <i className="fas fa-save"></i> Hifadhi Bidhaa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Order Details Modal */}
      {showOrderModal && selectedOrder && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Maelezo ya Agizo #{selectedOrder.id}</h3>
              <button className="close-btn" onClick={() => setShowOrderModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <div className="order-details">
                <div className="detail-row">
                  <label>Zao/Bidhaa:</label>
                  <span>{selectedOrder.crop}</span>
                </div>
                <div className="detail-row">
                  <label>Mnunuzi:</label>
                  <span>{selectedOrder.buyer}</span>
                </div>
                <div className="detail-row">
                  <label>Kiasi:</label>
                  <span>{selectedOrder.quantity}</span>
                </div>
                <div className="detail-row">
                  <label>Bei:</label>
                  <span>{selectedOrder.price}</span>
                </div>
                <div className="detail-row">
                  <label>Tarehe ya Agizo:</label>
                  <span>{selectedOrder.orderDate}</span>
                </div>
                <div className="detail-row">
                  <label>Tarehe ya Uwasilishaji:</label>
                  <span>{selectedOrder.deliveryDate}</span>
                </div>
                <div className="detail-row">
                  <label>Namba ya Simu:</label>
                  <span>{selectedOrder.contact}</span>
                </div>
                <div className="detail-row">
                  <label>Hali:</label>
                  <span className={`status-badge ${selectedOrder.status}`}>
                    {selectedOrder.status === 'pending' ? 'Inasubiri' : 
                     selectedOrder.status === 'completed' ? 'Imekamilika' : 'Imekatizwa'}
                  </span>
                </div>
              </div>
              {selectedOrder.status === 'pending' && (
                <div className="modal-actions">
                  <button 
                    className="btn btn-success"
                    onClick={() => handleOrderAction(selectedOrder.id, 'accept')}
                  >
                    <i className="fas fa-check"></i> Kubali Agizo
                  </button>
                  <button 
                    className="btn btn-danger"
                    onClick={() => handleOrderAction(selectedOrder.id, 'reject')}
                  >
                    <i className="fas fa-times"></i> Kataa Agizo
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <Footer onPageChange={onPageChange} />
    </div>
  );
};

export default FarmerDashboard;