import React, { useState } from 'react';
import Navigation from '../components/Navbar/Navbar';
import Footer from '../components/Footer/Footer';
import './CSS/Dashboard.css';

const Dashboard = ({ onPageChange, onAuth, user, crops, onToggleChat, onCreateGroup, onApplyForLoan }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [showQuickActionModal, setShowQuickActionModal] = useState(false);
  const [quickActionType, setQuickActionType] = useState('');

  // Sample data for dashboard - Enhanced with new features
  const userCrops = crops.filter(crop => crop.farmer === user?.name);
  const userStats = {
    totalCrops: userCrops.length,
    totalSales: 45,
    totalRevenue: 'TZS 2,450,000',
    pendingOrders: 3,
    messages: 12,
    rating: 4.8,
    // New stats
    loanEligibility: 'TZS 5,000,000',
    groupMemberships: 2,
    supplierConnections: 8,
    cropTrends: '+15%'
  };

  // Enhanced recent activities with new features
  const recentActivities = [
    {
      id: 1,
      type: 'sale',
      description: 'Umekuza mahindi kwa TZS 450,000',
      time: '2 saa zilizopita',
      icon: '💰',
      priority: 'high'
    },
    {
      id: 2,
      type: 'message',
      description: 'Ulipokea ujumbe kutoka kwa mnunuzi',
      time: '5 saa zilizopita',
      icon: '💬',
      priority: 'medium'
    },
    {
      id: 3,
      type: 'order',
      description: 'Agizo jipya la mpunga',
      time: '1 siku iliyopita',
      icon: '📦',
      priority: 'high'
    },
    {
      id: 4,
      type: 'weather',
      description: 'Mvua inatarajiwa kesho',
      time: '1 siku iliyopita',
      icon: '🌧️',
      priority: 'medium'
    },
    {
      id: 5,
      type: 'loan',
      description: 'Mkopo wako umeidhinishwa',
      time: '2 siku zilizopita',
      icon: '🏦',
      priority: 'high'
    },
    {
      id: 6,
      type: 'group',
      description: 'Kikundi kipya kimeundwa eneo lako',
      time: '3 siku zilizopita',
      icon: '👥',
      priority: 'low'
    }
  ];

  // Crop analytics data
  const cropAnalytics = userCrops.map(crop => ({
    name: crop.name,
    quantity: crop.quantity,
    price: crop.price,
    totalValue: crop.quantity * crop.price,
    trend: Math.random() > 0.5 ? 'up' : 'down',
    trendPercentage: Math.floor(Math.random() * 30) + 5
  }));

  // Loan opportunities
  const loanOpportunities = [
    {
      id: 1,
      name: 'Mkopo wa Kilimo',
      provider: 'NMB Bank',
      amount: 'Hadi TZS 50,000,000',
      interest: '12% kwa mwaka',
      deadline: '2024-02-15',
      eligibility: 'Wakulima wenye shamba la angalau ekari 2'
    },
    {
      id: 2,
      name: 'Mkopo wa Vifaa',
      provider: 'CRDB Bank',
      amount: 'Hadi TZS 20,000,000',
      interest: '10% kwa mwaka',
      deadline: '2024-02-28',
      eligibility: 'Kununua vifaa vya kilimo'
    }
  ];

  // Farmer groups suggestions
  const suggestedGroups = [
    {
      id: 1,
      name: 'Wakulima wa Mpanda',
      location: 'Mpanda',
      members: 25,
      cropType: 'Mimea Mbalimbali',
      description: 'Kikundi cha wakulima wa eneo la Mpanda'
    },
    {
      id: 2,
      name: 'Wakulima wa Mahindi Mlele',
      location: 'Mlele',
      members: 15,
      cropType: 'Mahindi',
      description: 'Kikundi maalum cha wakulima wa mahindi'
    }
  ];

  // Quick actions handler
  const handleQuickAction = (actionType) => {
    setQuickActionType(actionType);
    setShowQuickActionModal(true);
  };

  // Enhanced Overview Section
  const renderOverview = () => (
    <div className="dashboard-overview">
      {/* Enhanced Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">🌾</div>
          <div className="stat-content">
            <div className="stat-number">{userStats.totalCrops}</div>
            <div className="stat-label">Mazao Yaliyowekwa</div>
            <div className="stat-trend positive">+{userStats.cropTrends}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <div className="stat-number">{userStats.totalSales}</div>
            <div className="stat-label">Mauzo</div>
            <div className="stat-trend positive">+8%</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📈</div>
          <div className="stat-content">
            <div className="stat-number">{userStats.totalRevenue}</div>
            <div className="stat-label">Jumla ya Mapato</div>
            <div className="stat-trend positive">+12%</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🏦</div>
          <div className="stat-content">
            <div className="stat-number">{userStats.loanEligibility}</div>
            <div className="stat-label">Uwezo wa Mkopo</div>
            <div className="stat-trend neutral">Stable</div>
          </div>
        </div>
      </div>

      <div className="overview-content">
        {/* Left Column */}
        <div className="overview-column">
          {/* Crop Analytics */}
          <div className="analytics-section">
            <h3>📊 Takwimu za Mazao Yako</h3>
            <div className="analytics-grid">
              {cropAnalytics.map((crop, index) => (
                <div key={index} className="analytics-card">
                  <div className="analytics-header">
                    <h4>{crop.name}</h4>
                    <span className={`trend-indicator ${crop.trend}`}>
                      {crop.trend === 'up' ? '📈' : '📉'} {crop.trendPercentage}%
                    </span>
                  </div>
                  <div className="analytics-details">
                    <div className="detail-item">
                      <span className="label">Kiasi:</span>
                      <span className="value">{crop.quantity}kg</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Bei ya Kipekee:</span>
                      <span className="value">TZS {crop.price}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Thamani ya Jumla:</span>
                      <span className="value">TZS {crop.totalValue.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Loan Opportunities */}
          <div className="loan-section">
            <h3>🏦 Fursa za Mikopo</h3>
            <div className="loan-cards">
              {loanOpportunities.map(loan => (
                <div key={loan.id} className="loan-card">
                  <div className="loan-header">
                    <h4>{loan.name}</h4>
                    <span className="provider">{loan.provider}</span>
                  </div>
                  <div className="loan-details">
                    <div className="detail-item">
                      <span>Kiasi:</span>
                      <strong>{loan.amount}</strong>
                    </div>
                    <div className="detail-item">
                      <span>Riba:</span>
                      <strong>{loan.interest}</strong>
                    </div>
                    <div className="detail-item">
                      <span>Mwisho wa Kutuma Maombi:</span>
                      <strong>{loan.deadline}</strong>
                    </div>
                  </div>
                  <p className="eligibility">{loan.eligibility}</p>
                  <button 
                    className="btn btn-primary btn-sm"
                    onClick={() => onApplyForLoan(loan)}
                  >
                    <i className="fas fa-edit"></i> Omba Sasa
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="overview-column">
          {/* Recent Activities */}
          <div className="activities-section">
            <div className="section-header">
              <h3>📋 Shughuli Zaidi ya Hivi Karibuni</h3>
              <button className="btn btn-sm btn-outline" onClick={onToggleChat}>
                <i className="fas fa-comments"></i> Mazungumzo
              </button>
            </div>
            <div className="activities-list">
              {recentActivities.map(activity => (
                <div key={activity.id} className={`activity-item ${activity.priority}`}>
                  <div className="activity-icon">{activity.icon}</div>
                  <div className="activity-content">
                    <p className="activity-description">{activity.description}</p>
                    <span className="activity-time">{activity.time}</span>
                  </div>
                  {activity.priority === 'high' && (
                    <div className="priority-badge">Muhimu</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Farmer Groups Suggestions */}
          <div className="groups-section">
            <h3>👥 Vikundi Vipendwa vya Wakulima</h3>
            <div className="groups-list">
              {suggestedGroups.map(group => (
                <div key={group.id} className="group-suggestion">
                  <div className="group-info">
                    <h4>{group.name}</h4>
                    <p>{group.description}</p>
                    <div className="group-meta">
                      <span><i className="fas fa-map-marker-alt"></i> {group.location}</span>
                      <span><i className="fas fa-users"></i> {group.members} wanachama</span>
                      <span><i className="fas fa-seedling"></i> {group.cropType}</span>
                    </div>
                  </div>
                  <button 
                    className="btn btn-success btn-sm"
                    onClick={() => onCreateGroup(group)}
                  >
                    <i className="fas fa-user-plus"></i> Jiunge
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Quick Actions */}
      <div className="quick-actions">
        <h3>⚡ Vitendo vya Haraka</h3>
        <div className="actions-grid">
          <button className="action-btn" onClick={() => handleQuickAction('add_crop')}>
            <i className="fas fa-seedling"></i>
            <span>Ongeza Zao Jipya</span>
          </button>
          <button className="action-btn" onClick={() => onPageChange('market')}>
            <i className="fas fa-store"></i>
            <span>Angalia Soko</span>
          </button>
          <button className="action-btn" onClick={() => onPageChange('suppliers')}>
            <i className="fas fa-truck"></i>
            <span>Wauzaji wa Pembejeo</span>
          </button>
          <button className="action-btn" onClick={() => onPageChange('loans')}>
            <i className="fas fa-hand-holding-usd"></i>
            <span>Omba Mkopo</span>
          </button>
          <button className="action-btn" onClick={() => onPageChange('farmer-groups')}>
            <i className="fas fa-users"></i>
            <span>Vikundi vya Wakulima</span>
          </button>
          <button className="action-btn" onClick={() => onPageChange('reports')}>
            <i className="fas fa-chart-line"></i>
            <span>Angalia Ripoti</span>
          </button>
          <button className="action-btn" onClick={onToggleChat}>
            <i className="fas fa-comments"></i>
            <span>Mazungumzo</span>
          </button>
          <button className="action-btn" onClick={() => onPageChange('weather')}>
            <i className="fas fa-cloud-sun"></i>
            <span>Hali ya Hewa</span>
          </button>
        </div>
      </div>
    </div>
  );

  const renderCrops = () => (
    <div className="dashboard-crops">
      <div className="section-header">
        <h3>Mazao Yangu</h3>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={() => handleQuickAction('add_crop')}>
            <i className="fas fa-plus"></i> Ongeza Zao Jipya
          </button>
          <button className="btn btn-outline" onClick={() => onPageChange('reports')}>
            <i className="fas fa-chart-bar"></i> Angalia Ripoti
          </button>
        </div>
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
                <div className="crop-analytics">
                  <div className="analytics-item">
                    <span>Mwenendo:</span>
                    <span className="trend positive">+15%</span>
                  </div>
                  <div className="analytics-item">
                    <span>Mapato:</span>
                    <span>TZS {(crop.quantity * crop.price).toLocaleString()}</span>
                  </div>
                </div>
                <div className="crop-actions">
                  <button className="btn btn-sm btn-outline">Hariri</button>
                  <button className="btn btn-sm btn-primary">Ongeza Picha</button>
                  <button className="btn btn-sm btn-info" onClick={onToggleChat}>
                    <i className="fas fa-comments"></i> Mazungumzo
                  </button>
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
          <button className="btn btn-primary" onClick={() => handleQuickAction('add_crop')}>
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
          <div className="profile-badges">
            <span className="badge verified">✓ Imethibitishwa</span>
            <span className="badge active">📈 Mkulima Aktivu</span>
          </div>
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
        <div className="profile-stat">
          <div className="stat-value">2</div>
          <div className="stat-label">Vikundi</div>
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
        <div className="detail-item">
          <label>Uwezo wa Mkopo:</label>
          <span className="loan-eligibility">{userStats.loanEligibility}</span>
        </div>
      </div>

      <div className="profile-connected-services">
        <h4>Huduma Zilizounganishwa</h4>
        <div className="services-grid">
          <div className="service-item connected">
            <i className="fas fa-comments"></i>
            <span>Mfumo wa Mazungumzo</span>
          </div>
          <div className="service-item connected">
            <i className="fas fa-users"></i>
            <span>Vikundi vya Wakulima</span>
          </div>
          <div className="service-item connected">
            <i className="fas fa-hand-holding-usd"></i>
            <span>Mikopo</span>
          </div>
          <div className="service-item">
            <i className="fas fa-truck"></i>
            <span>Wauzaji wa Pembejeo</span>
          </div>
        </div>
      </div>

      <div className="profile-actions">
        <button className="btn btn-primary">
          <i className="fas fa-edit"></i> Badilisha Taarifa
        </button>
        <button className="btn btn-outline">
          <i className="fas fa-lock"></i> Badilisha Nenosiri
        </button>
        <button className="btn btn-success" onClick={onToggleChat}>
          <i className="fas fa-comments"></i> Mazungumzo
        </button>
      </div>
    </div>
  );

  const renderReports = () => (
    <div className="dashboard-reports">
      <div className="section-header">
        <h3>📈 Ripoti na Takwimu</h3>
        <div className="header-actions">
          <button className="btn btn-primary">
            <i className="fas fa-download"></i> Pakua Ripoti
          </button>
          <button className="btn btn-outline" onClick={() => onPageChange('reports')}>
            <i className="fas fa-external-link-alt"></i> Ripoti Kamili
          </button>
        </div>
      </div>

      <div className="reports-grid">
        <div className="report-card">
          <h4>Mauzo ya Mwezi</h4>
          <div className="report-value">TZS 1,250,000</div>
          <div className="report-trend positive">+15% kutoka mwezi uliopita</div>
        </div>
        <div className="report-card">
          <h4>Mazao Yanayovuma</h4>
          <div className="report-value">Mahindi</div>
          <div className="report-trend">60% ya mauzo yote</div>
        </div>
        <div className="report-card">
          <h4>Wanunuzi Wapya</h4>
          <div className="report-value">3</div>
          <div className="report-trend positive">+50% kutoka mwezi uliopita</div>
        </div>
        <div className="report-card">
          <h4>Wastani wa Bei</h4>
          <div className="report-value">TZS 1,850/kg</div>
          <div className="report-trend negative">-5% kutoka mwezi uliopita</div>
        </div>
      </div>

      <div className="charts-preview">
        <h4>Mienendo ya Mazao</h4>
        <div className="chart-placeholder">
          <i className="fas fa-chart-line"></i>
          <p>Wacha ionyeshe chati hapa</p>
          <button className="btn btn-primary" onClick={() => onPageChange('reports')}>
            Angalia Chati Kamili
          </button>
        </div>
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
        onToggleChat={onToggleChat}
      />
      
      <div className="dashboard-container">
        <div className="container">
          {/* Enhanced Dashboard Header */}
          <div className="dashboard-header">
            <div className="welcome-section">
              <h1>Habari, {user?.name}!</h1>
              <p>Huu ni dashibodi yako ya kusimamia shughuli zako za kilimo na biashara</p>
              <div className="welcome-badges">
                <span className="welcome-badge">
                  <i className="fas fa-seedling"></i> Mazao {userStats.totalCrops}
                </span>
                <span className="welcome-badge">
                  <i className="fas fa-chart-line"></i> Mapato {userStats.totalRevenue}
                </span>
                <span className="welcome-badge">
                  <i className="fas fa-users"></i> Vikundi {userStats.groupMemberships}
                </span>
              </div>
            </div>
            <div className="header-actions">
              <button className="btn btn-primary" onClick={() => handleQuickAction('add_crop')}>
                <i className="fas fa-plus"></i> Ongeza Zao
              </button>
              <button className="btn btn-outline" onClick={onToggleChat}>
                <i className="fas fa-comments"></i> Mazungumzo
              </button>
              <button className="btn btn-success" onClick={() => onPageChange('loans')}>
                <i className="fas fa-hand-holding-usd"></i> Mikopo
              </button>
            </div>
          </div>

          {/* Enhanced Dashboard Tabs */}
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
              className={`tab-btn ${activeTab === 'reports' ? 'active' : ''}`}
              onClick={() => setActiveTab('reports')}
            >
              <i className="fas fa-chart-bar"></i>
              Ripoti
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
            {activeTab === 'reports' && renderReports()}
            {activeTab === 'messages' && (
              <div className="dashboard-messages">
                <div className="messages-header">
                  <h3>✉️ Ujumbe Wangu</h3>
                  <button className="btn btn-primary" onClick={onToggleChat}>
                    <i className="fas fa-comments"></i> Fungua Mazungumzo
                  </button>
                </div>
                <div className="empty-state">
                  <i className="fas fa-comments"></i>
                  <h4>Hakuna ujumbe mpya</h4>
                  <p>Ujumbe wote utaonekana hapa unapopokea au fungua mazungumzo</p>
                  <button className="btn btn-primary" onClick={onToggleChat}>
                    <i className="fas fa-comments"></i> Anza Mazungumzo
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Action Modal */}
      {showQuickActionModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Haraka Action - {quickActionType === 'add_crop' ? 'Ongeza Zao Jipya' : 'Tendeka Lengine'}</h3>
              <button className="close-btn" onClick={() => setShowQuickActionModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              {quickActionType === 'add_crop' && (
                <div className="quick-action-form">
                  <p>Ongeza zao jipya kwa urahisi kwenye soko la Katavi E-Kilimo</p>
                  <button className="btn btn-primary" onClick={() => onPageChange('market')}>
                    <i className="fas fa-external-link-alt"></i> Nenda Kwenye Soko
                  </button>
                </div>
              )}
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setShowQuickActionModal(false)}>
                Funga
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer onPageChange={onPageChange} />
    </div>
  );
};

export default Dashboard;