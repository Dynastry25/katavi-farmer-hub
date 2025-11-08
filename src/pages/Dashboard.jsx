import React, { useState } from 'react';
import Navigation from '../components/Navbar/Navbar';
import Footer from '../components/Footer/Footer';
import './CSS/Dashboard.css';

const Dashboard = ({ onPageChange, onAuth, user, crops }) => {
  const [activeTab, setActiveTab] = useState('overview');

  // Sample data for dashboard
  const userCrops = crops.filter(crop => crop.farmer === user?.name);
  const userStats = {
    totalCrops: userCrops.length,
    totalSales: 45,
    totalRevenue: 'TZS 2,450,000',
    pendingOrders: 3,
    messages: 12,
    rating: 4.8
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

  const renderOverview = () => (
    <div className="dashboard-overview">
      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">🌾</div>
          <div className="stat-content">
            <div className="stat-number">{userStats.totalCrops}</div>
            <div className="stat-label">Mazao Yaliyowekwa</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <div className="stat-number">{userStats.totalSales}</div>
            <div className="stat-label">Mauzo</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📈</div>
          <div className="stat-content">
            <div className="stat-number">{userStats.totalRevenue}</div>
            <div className="stat-label">Jumla ya Mapato</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⏳</div>
          <div className="stat-content">
            <div className="stat-number">{userStats.pendingOrders}</div>
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
          <button className="action-btn">
            <i className="fas fa-plus"></i>
            <span>Ongeza Zao Jipya</span>
          </button>
          <button className="action-btn">
            <i className="fas fa-store"></i>
            <span>Angalia Soko</span>
          </button>
          <button className="action-btn">
            <i className="fas fa-chart-line"></i>
            <span>Angalia Takwimu</span>
          </button>
          <button className="action-btn">
            <i className="fas fa-cog"></i>
            <span>Mipangilio</span>
          </button>
        </div>
      </div>
    </div>
  );

  const renderCrops = () => (
    <div className="dashboard-crops">
      <div className="section-header">
        <h3>Mazao Yangu</h3>
        <button className="btn btn-primary">
          <i className="fas fa-plus"></i> Ongeza Zao Jipya
        </button>
      </div>

      {userCrops.length > 0 ? (
        <div className="crops-grid">
          {userCrops.map(crop => (
            <div key={crop.id} className="crop-card">
              <div className="crop-image">{crop.image}</div>
              <div className="crop-content">
                <h4>{crop.name}</h4>
                <p>{crop.description}</p>
                <div className="crop-price">{crop.price}/kg</div>
                <div className="crop-stats">
                  <span>Inapatikana: {crop.quantity}kg</span>
                  <span>Imeuzwa: 25kg</span>
                </div>
                <div className="crop-actions">
                  <button className="btn btn-sm btn-outline">Hariri</button>
                  <button className="btn btn-sm btn-primary">Ongeza Picha</button>
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
          <button className="btn btn-primary">
            <i className="fas fa-plus"></i> Ongeza Zao la Kwanza
          </button>
        </div>
      )}
    </div>
  );

  const renderProfile = () => (
    <div className="dashboard-profile">
      <div className="profile-header">
        <div className="profile-avatar">
          <i className="fas fa-user"></i>
        </div>
        <div className="profile-info">
          <h3>{user?.name}</h3>
          <p className="profile-role">{user?.role}</p>
          <p className="profile-location">
            <i className="fas fa-map-marker-alt"></i> {user?.location}
          </p>
        </div>
      </div>

      <div className="profile-stats">
        <div className="profile-stat">
          <div className="stat-value">4.8</div>
          <div className="stat-label">Ukadiriaji</div>
        </div>
        <div className="profile-stat">
          <div className="stat-value">98%</div>
          <div className="stat-label">Majibu</div>
        </div>
        <div className="profile-stat">
          <div className="stat-value">45</div>
          <div className="stat-label">Mauzo</div>
        </div>
      </div>

      <div className="profile-details">
        <h4>Taarifa za Akaunti</h4>
        <div className="detail-item">
          <label>Barua Pepe:</label>
          <span>{user?.email}</span>
        </div>
        <div className="detail-item">
          <label>Simu:</label>
          <span>{user?.phone}</span>
        </div>
        <div className="detail-item">
          <label>Tarehe ya Kujiunga:</label>
          <span>{new Date(user?.registrationDate).toLocaleDateString('sw-TZ')}</span>
        </div>
      </div>

      <div className="profile-actions">
        <button className="btn btn-primary">
          <i className="fas fa-edit"></i> Badilisha Taarifa
        </button>
        <button className="btn btn-outline">
          <i className="fas fa-lock"></i> Badilisha Nenosiri
        </button>
      </div>
    </div>
  );

  return (
    <div className="page dashboard-page">
      <Navigation 
        currentPage="dashboard"
        onPageChange={onPageChange}
        onAuth={onAuth}
        user={user}
      />
      
      <div className="dashboard-container">
        <div className="container">
          {/* Dashboard Header */}
          <div className="dashboard-header">
            <div className="welcome-section">
              <h1>Habari, {user?.name}!</h1>
              <p>Huu ni dashibodi yako ya kusimamia shughuli zako za kilimo</p>
            </div>
            <div className="header-actions">
              <button className="btn btn-primary">
                <i className="fas fa-plus"></i> Ongeza Zao
              </button>
              <button className="btn btn-outline">
                <i className="fas fa-bell"></i> Arifa
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
              className={`tab-btn ${activeTab === 'crops' ? 'active' : ''}`}
              onClick={() => setActiveTab('crops')}
            >
              <i className="fas fa-seedling"></i>
              Mazao Yangu
            </button>
            <button 
              className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => setActiveTab('profile')}
            >
              <i className="fas fa-user"></i>
              Wasifu Wangu
            </button>
            <button 
              className={`tab-btn ${activeTab === 'messages' ? 'active' : ''}`}
              onClick={() => setActiveTab('messages')}
            >
              <i className="fas fa-comments"></i>
              Ujumbe
            </button>
          </div>

          {/* Dashboard Content */}
          <div className="dashboard-content">
            {activeTab === 'overview' && renderOverview()}
            {activeTab === 'crops' && renderCrops()}
            {activeTab === 'profile' && renderProfile()}
            {activeTab === 'messages' && (
              <div className="dashboard-messages">
                <h3>Ujumbe Wangu</h3>
                <div className="empty-state">
                  <i className="fas fa-comments"></i>
                  <h4>Hakuna ujumbe mpya</h4>
                  <p>Ujumbe wote utaonekana hapa unapopokea</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer onPageChange={onPageChange} />
    </div>
  );
};

export default Dashboard;