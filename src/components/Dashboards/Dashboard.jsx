import React, { useState, useEffect } from 'react';
import Navigation from '../Navbar/Navbar';
import Footer from '../Footer/Footer';
import './Dashboard.css';

const Dashboard = ({ onPageChange, onAuth, user, crops, onToggleChat, onCreateGroup, onApplyForLoan }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [showQuickActionModal, setShowQuickActionModal] = useState(false);
  const [quickActionType, setQuickActionType] = useState('');
  const [stats, setStats] = useState({});
  const [recentActivities, setRecentActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Sample data for dashboard
  const userCrops = crops.filter(crop => crop.farmer === user?.name);
  
  // Initialize stats and activities
  useEffect(() => {
    const initializeDashboard = async () => {
      setIsLoading(true);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Calculate user stats based on role
      const userStats = calculateUserStats();
      setStats(userStats);
      
      // Set recent activities
      const activities = getRecentActivities();
      setRecentActivities(activities);
      
      setIsLoading(false);
    };

    initializeDashboard();
  }, [user, crops]);

  const calculateUserStats = () => {
    const baseStats = {
      totalCrops: userCrops.length,
      activeListings: userCrops.filter(crop => crop.status === 'available').length,
      totalRevenue: 'TZS 0',
      pendingOrders: 0,
      completedOrders: 0,
      rating: 5.0,
      messages: 0,
      groupMemberships: 0,
      supplierConnections: 0,
      cropTrends: '+0%'
    };

    // Role-specific stats
    if (user?.role === 'farmer') {
      return {
        ...baseStats,
        totalRevenue: 'TZS 2,450,000',
        pendingOrders: 3,
        completedOrders: 12,
        totalSales: 45,
        loanEligibility: 'TZS 5,000,000',
        groupMemberships: 2,
        supplierConnections: 8,
        cropTrends: '+15%'
      };
    } else if (user?.role === 'buyer') {
      return {
        ...baseStats,
        totalOrders: 15,
        pendingOrders: 3,
        completedOrders: 12,
        totalSpent: 'TZS 3,250,000',
        favoriteCrops: ['Mahindi', 'Mpunga', 'Maharage'],
        trustedFarmers: 8
      };
    } else if (user?.role === 'expert') {
      return {
        ...baseStats,
        totalArticles: 15,
        consultationsAnswered: 47,
        pendingConsultations: 3,
        averageRating: 4.8,
        totalEarnings: 'TZS 850,000',
        expertiseAreas: ['Udongo', 'Mimea', 'Udhibiti wa Wadudu']
      };
    }

    return baseStats;
  };

  const getRecentActivities = () => {
    const baseActivities = [
      {
        id: 1,
        type: 'welcome',
        description: 'Karibu kwenye dashibodi yako ya Katavi E-Kilimo',
        time: 'Sasa hivi',
        icon: '👋',
        priority: 'high'
      }
    ];

    if (user?.role === 'farmer') {
      return [
        ...baseActivities,
        {
          id: 2,
          type: 'sale',
          description: 'Umekuza mahindi kwa TZS 450,000',
          time: '2 saa zilizopita',
          icon: '💰',
          priority: 'high'
        },
        {
          id: 3,
          type: 'message',
          description: 'Ulipokea ujumbe kutoka kwa mnunuzi',
          time: '5 saa zilizopita',
          icon: '💬',
          priority: 'medium'
        },
        {
          id: 4,
          type: 'order',
          description: 'Agizo jipya la mpunga',
          time: '1 siku iliyopita',
          icon: '📦',
          priority: 'high'
        }
      ];
    } else if (user?.role === 'buyer') {
      return [
        ...baseActivities,
        {
          id: 2,
          type: 'order',
          description: 'Umetuma agizo jipya la mahindi',
          time: '2 saa zilizopita',
          icon: '📦',
          priority: 'high'
        },
        {
          id: 3,
          type: 'message',
          description: 'Ulipokea ujumbe kutoka kwa mkulima',
          time: '5 saa zilizopita',
          icon: '💬',
          priority: 'medium'
        },
        {
          id: 4,
          type: 'delivery',
          description: 'Agizo lako la mpunga limewasilishwa',
          time: '1 siku iliyopita',
          icon: '🚚',
          priority: 'medium'
        }
      ];
    } else if (user?.role === 'expert') {
      return [
        ...baseActivities,
        {
          id: 2,
          type: 'article',
          description: 'Makala yako imepokei maoni 5 mapya',
          time: '2 saa zilizopita',
          icon: '📝',
          priority: 'medium'
        },
        {
          id: 3,
          type: 'consultation',
          description: 'Swali jipya kutoka kwa mkulima',
          time: '5 saa zilizopita',
          icon: '💬',
          priority: 'high'
        },
        {
          id: 4,
          type: 'rating',
          description: 'Umepokea tathmini mpya: ⭐⭐⭐⭐⭐',
          time: '1 siku iliyopita',
          icon: '⭐',
          priority: 'medium'
        }
      ];
    }

    return baseActivities;
  };

  // Enhanced crop analytics data
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
      duration: 'Hadi miezi 36',
      requirements: ['Kitambulisho cha taifa', 'Hati miliki ya ardhi', 'Mpango wa kilimo'],
      description: 'Mkopo maalum kwa wakulima wa mazao na mifugo',
      category: 'agriculture',
      deadline: '2024-02-15'
    },
    {
      id: 2,
      name: 'Mkopo wa Vifaa',
      provider: 'CRDB Bank',
      amount: 'Hadi TZS 20,000,000',
      interest: '10% kwa mwaka',
      duration: 'Hadi miezi 24',
      requirements: ['Kitambulisho', 'Makubaliano ya ununuzi', 'Kiasi kidogo cha awali'],
      description: 'Mkopo maalum wa kununua vifaa vya kilimo',
      category: 'equipment',
      deadline: '2024-02-28'
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
      description: 'Kikundi cha wakulima wa eneo la Mpanda kinacholima mazao mbalimbali'
    },
    {
      id: 2,
      name: 'Wakulima wa Mahindi Mlele',
      location: 'Mlele',
      members: 15,
      cropType: 'Mahindi',
      description: 'Kikundi maalum cha wakulima wa mahindi katika eneo la Mlele'
    }
  ];

  // Quick actions handler
  const handleQuickAction = (actionType) => {
    setQuickActionType(actionType);
    setShowQuickActionModal(true);
  };

  // Handle specific actions
  const handleAction = (action) => {
    switch (action) {
      case 'add_crop':
        onPageChange('market');
        break;
      case 'view_market':
        onPageChange('market');
        break;
      case 'view_suppliers':
        onPageChange('suppliers');
        break;
      case 'apply_loan':
        onPageChange('loans');
        break;
      case 'join_group':
        onPageChange('farmer-groups');
        break;
      case 'view_reports':
        onPageChange('reports');
        break;
      case 'start_chat':
        onToggleChat();
        break;
      case 'check_weather':
        onPageChange('weather');
        break;
      default:
        break;
    }
    setShowQuickActionModal(false);
  };

  // Enhanced Overview Section
  const renderOverview = () => (
    <div className="dashboard-overview">
      {/* Enhanced Stats Cards */}
      <div className="stats-grid">
        {user?.role === 'farmer' && (
          <>
            <div className="stat-card">
              <div className="stat-icon">🌾</div>
              <div className="stat-content">
                <div className="stat-number">{stats.totalCrops}</div>
                <div className="stat-label">Mazao Yaliyowekwa</div>
                <div className="stat-trend positive">{stats.cropTrends}</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">💰</div>
              <div className="stat-content">
                <div className="stat-number">{stats.totalSales || 0}</div>
                <div className="stat-label">Mauzo Yaliyokamilika</div>
                <div className="stat-trend positive">+8%</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">📈</div>
              <div className="stat-content">
                <div className="stat-number">{stats.totalRevenue}</div>
                <div className="stat-label">Jumla ya Mapato</div>
                <div className="stat-trend positive">+12%</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">🏦</div>
              <div className="stat-content">
                <div className="stat-number">{stats.loanEligibility}</div>
                <div className="stat-label">Uwezo wa Mkopo</div>
                <div className="stat-trend neutral">Stable</div>
              </div>
            </div>
          </>
        )}

        {user?.role === 'buyer' && (
          <>
            <div className="stat-card">
              <div className="stat-icon">📦</div>
              <div className="stat-content">
                <div className="stat-number">{stats.totalOrders}</div>
                <div className="stat-label">Maagizo Yote</div>
                <div className="stat-trend positive">+5%</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">⏳</div>
              <div className="stat-content">
                <div className="stat-number">{stats.pendingOrders}</div>
                <div className="stat-label">Maagizo Yanayosubiri</div>
                <div className="stat-trend neutral">Hakuna mabadiliko</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">✅</div>
              <div className="stat-content">
                <div className="stat-number">{stats.completedOrders}</div>
                <div className="stat-label">Maagizo Yakamilika</div>
                <div className="stat-trend positive">+15%</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">💰</div>
              <div className="stat-content">
                <div className="stat-number">{stats.totalSpent}</div>
                <div className="stat-label">Jumla ya Matumizi</div>
                <div className="stat-trend positive">+10%</div>
              </div>
            </div>
          </>
        )}

        {user?.role === 'expert' && (
          <>
            <div className="stat-card">
              <div className="stat-icon">📝</div>
              <div className="stat-content">
                <div className="stat-number">{stats.totalArticles}</div>
                <div className="stat-label">Makala Zilizoandikwa</div>
                <div className="stat-trend positive">+3</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">💬</div>
              <div className="stat-content">
                <div className="stat-number">{stats.consultationsAnswered}</div>
                <div className="stat-label">Maswali Yaliyojibiwa</div>
                <div className="stat-trend positive">+12</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">⏳</div>
              <div className="stat-content">
                <div className="stat-number">{stats.pendingConsultations}</div>
                <div className="stat-label">Maswali Yanayosubiri</div>
                <div className="stat-trend neutral">Hakuna mabadiliko</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">⭐</div>
              <div className="stat-content">
                <div className="stat-number">{stats.averageRating}</div>
                <div className="stat-label">Wastani wa Tathmini</div>
                <div className="stat-trend positive">+0.2</div>
              </div>
            </div>
          </>
        )}

        {!user?.role && (
          <>
            <div className="stat-card">
              <div className="stat-icon">🌾</div>
              <div className="stat-content">
                <div className="stat-number">0</div>
                <div className="stat-label">Mazao Yaliyowekwa</div>
                <div className="stat-trend neutral">Anza leo</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">💰</div>
              <div className="stat-content">
                <div className="stat-number">0</div>
                <div className="stat-label">Mauzo</div>
                <div className="stat-trend neutral">Hakuna data</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">👥</div>
              <div className="stat-content">
                <div className="stat-number">0</div>
                <div className="stat-label">Vikundi</div>
                <div className="stat-trend neutral">Jiunge sasa</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">💬</div>
              <div className="stat-content">
                <div className="stat-number">0</div>
                <div className="stat-label">Mazungumzo</div>
                <div className="stat-trend neutral">Anza sasa</div>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="overview-content">
        {/* Left Column */}
        <div className="overview-column">
          {/* Role-specific content */}
          {user?.role === 'farmer' && (
            <>
              {/* Crop Analytics */}
              {cropAnalytics.length > 0 && (
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
              )}

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
            </>
          )}

          {user?.role === 'buyer' && (
            <div className="buyer-highlights">
              <h3>🛒 Ununuzi Wako wa Hivi Karibuni</h3>
              <div className="highlight-cards">
                <div className="highlight-card">
                  <h4>Mazao Unayopenda</h4>
                  <div className="favorites-tags">
                    {stats.favoriteCrops?.map((crop, index) => (
                      <span key={index} className="favorite-tag">{crop}</span>
                    ))}
                  </div>
                </div>
                <div className="highlight-card">
                  <h4>Wakulima Wanaoaminika</h4>
                  <div className="trusted-count">{stats.trustedFarmers}</div>
                  <p>Wakulima ambao una uzoefu nao</p>
                </div>
              </div>
            </div>
          )}

          {user?.role === 'expert' && (
            <div className="expert-highlights">
              <h3>🎓 Utaalamu Wako</h3>
              <div className="expertise-tags">
                {stats.expertiseAreas?.map((area, index) => (
                  <span key={index} className="expertise-tag">{area}</span>
                ))}
              </div>
              <div className="earnings-preview">
                <h4>Mapato Ya Hivi Karibuni</h4>
                <div className="earnings-amount">{stats.totalEarnings}</div>
                <p>Jumla ya mapato kuanzia mwanzo wa mwaka</p>
              </div>
            </div>
          )}
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
          {user?.role === 'farmer' && (
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
          )}
        </div>
      </div>

      {/* Enhanced Quick Actions */}
      <div className="quick-actions">
        <h3>⚡ Vitendo vya Haraka</h3>
        <div className="actions-grid">
          {user?.role === 'farmer' && (
            <>
              <button className="action-btn" onClick={() => handleAction('add_crop')}>
                <i className="fas fa-seedling"></i>
                <span>Ongeza Zao Jipya</span>
              </button>
              <button className="action-btn" onClick={() => handleAction('view_market')}>
                <i className="fas fa-store"></i>
                <span>Angalia Soko</span>
              </button>
              <button className="action-btn" onClick={() => handleAction('view_suppliers')}>
                <i className="fas fa-truck"></i>
                <span>Wauzaji wa Pembejeo</span>
              </button>
              <button className="action-btn" onClick={() => handleAction('apply_loan')}>
                <i className="fas fa-hand-holding-usd"></i>
                <span>Omba Mkopo</span>
              </button>
            </>
          )}

          {user?.role === 'buyer' && (
            <>
              <button className="action-btn" onClick={() => handleAction('view_market')}>
                <i className="fas fa-search"></i>
                <span>Tafuta Mazao</span>
              </button>
              <button className="action-btn" onClick={() => handleAction('start_chat')}>
                <i className="fas fa-comments"></i>
                <span>Wasiliana na Wakulima</span>
              </button>
              <button className="action-btn" onClick={() => handleAction('view_reports')}>
                <i className="fas fa-chart-line"></i>
                <span>Takwimu za Ununuzi</span>
              </button>
              <button className="action-btn" onClick={() => handleAction('check_weather')}>
                <i className="fas fa-cloud-sun"></i>
                <span>Hali ya Hewa</span>
              </button>
            </>
          )}

          {user?.role === 'expert' && (
            <>
              <button className="action-btn" onClick={() => onPageChange('expert-dashboard')}>
                <i className="fas fa-edit"></i>
                <span>Andika Makala</span>
              </button>
              <button className="action-btn" onClick={() => handleAction('start_chat')}>
                <i className="fas fa-comments"></i>
                <span>Jibu Maswali</span>
              </button>
              <button className="action-btn" onClick={() => handleAction('view_reports')}>
                <i className="fas fa-chart-line"></i>
                <span>Takwimu za Mapato</span>
              </button>
              <button className="action-btn" onClick={() => handleAction('join_group')}>
                <i className="fas fa-users"></i>
                <span>Jamii ya Wataalamu</span>
              </button>
            </>
          )}

          {/* Common actions for all users */}
          <button className="action-btn" onClick={() => handleAction('start_chat')}>
            <i className="fas fa-comments"></i>
            <span>Mazungumzo</span>
          </button>
          <button className="action-btn" onClick={() => handleAction('view_reports')}>
            <i className="fas fa-chart-line"></i>
            <span>Ripoti</span>
          </button>
          <button className="action-btn" onClick={() => handleAction('check_weather')}>
            <i className="fas fa-cloud-sun"></i>
            <span>Hali ya Hewa</span>
          </button>
          <button className="action-btn" onClick={() => handleAction('join_group')}>
            <i className="fas fa-users"></i>
            <span>Vikundi</span>
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
          <button className="btn btn-primary" onClick={() => handleAction('add_crop')}>
            <i className="fas fa-plus"></i> Ongeza Zao Jipya
          </button>
          <button className="btn btn-outline" onClick={() => handleAction('view_reports')}>
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
          <button className="btn btn-primary" onClick={() => handleAction('add_crop')}>
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
          <p className="profile-role">
            {user?.role === 'farmer' && '👨‍🌾 Mkulima'}
            {user?.role === 'buyer' && '🛒 Mnunuzi'}
            {user?.role === 'expert' && '🎓 Mtaalamu'}
            {!user?.role && 'Mtumiaji'}
          </p>
          <p className="profile-location">
            <i className="fas fa-map-marker-alt"></i> {user?.location || 'Katavi'}
          </p>
          <div className="profile-badges">
            <span className="badge verified">✓ Imethibitishwa</span>
            <span className="badge active">📈 {user?.role === 'farmer' ? 'Mkulima Aktivu' : 'Mtumiaji Aktivu'}</span>
          </div>
        </div>
      </div>

      <div className="profile-stats">
        <div className="profile-stat">
          <div className="stat-value">{stats.rating || 5.0}</div>
          <div className="stat-label">Ukadiriaji</div>
        </div>
        <div className="profile-stat">
          <div className="stat-value">98%</div>
          <div className="stat-label">Majibu</div>
        </div>
        <div className="profile-stat">
          <div className="stat-value">{stats.totalSales || stats.totalOrders || 0}</div>
          <div className="stat-label">
            {user?.role === 'farmer' ? 'Mauzo' : user?.role === 'buyer' ? 'Maagizo' : 'Huduma'}
          </div>
        </div>
        <div className="profile-stat">
          <div className="stat-value">{stats.groupMemberships || 0}</div>
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
          <span>{user?.registrationDate ? new Date(user.registrationDate).toLocaleDateString('sw-TZ') : 'Hivi karibuni'}</span>
        </div>
        {user?.role === 'farmer' && (
          <div className="detail-item">
            <label>Uwezo wa Mkopo:</label>
            <span className="loan-eligibility">{stats.loanEligibility}</span>
          </div>
        )}
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
          <button className="btn btn-outline" onClick={() => handleAction('view_reports')}>
            <i className="fas fa-external-link-alt"></i> Ripoti Kamili
          </button>
        </div>
      </div>

      <div className="reports-grid">
        <div className="report-card">
          <h4>
            {user?.role === 'farmer' ? 'Mauzo ya Mwezi' : 
             user?.role === 'buyer' ? 'Matumizi ya Mwezi' : 'Mapato ya Mwezi'}
          </h4>
          <div className="report-value">
            {user?.role === 'farmer' ? 'TZS 1,250,000' :
             user?.role === 'buyer' ? 'TZS 750,000' : 'TZS 250,000'}
          </div>
          <div className="report-trend positive">+15% kutoka mwezi uliopita</div>
        </div>
        <div className="report-card">
          <h4>
            {user?.role === 'farmer' ? 'Mazao Yanayovuma' :
             user?.role === 'buyer' ? 'Mazao Yanayonunuliwa Zaidi' : 'Huduma Inayotaka'}
          </h4>
          <div className="report-value">
            {user?.role === 'farmer' ? 'Mahindi' :
             user?.role === 'buyer' ? 'Mahindi' : 'Ushauri wa Udongo'}
          </div>
          <div className="report-trend">
            {user?.role === 'farmer' ? '60% ya mauzo yote' :
             user?.role === 'buyer' ? '35% ya ununuzi wote' : '40% ya mapato'}
          </div>
        </div>
        <div className="report-card">
          <h4>
            {user?.role === 'farmer' ? 'Wanunuzi Wapya' :
             user?.role === 'buyer' ? 'Wakulima Wapya' : 'Wateja Wapya'}
          </h4>
          <div className="report-value">3</div>
          <div className="report-trend positive">+50% kutoka mwezi uliopita</div>
        </div>
        <div className="report-card">
          <h4>
            {user?.role === 'farmer' ? 'Wastani wa Bei' :
             user?.role === 'buyer' ? 'Wastani wa Bei' : 'Wastani wa Kipato'}
          </h4>
          <div className="report-value">
            {user?.role === 'farmer' ? 'TZS 1,850/kg' :
             user?.role === 'buyer' ? 'TZS 1,850/kg' : 'TZS 50,000/huduma'}
          </div>
          <div className="report-trend negative">-5% kutoka mwezi uliopita</div>
        </div>
      </div>

      <div className="charts-preview">
        <h4>Mienendo ya {user?.role === 'farmer' ? 'Mazao' : user?.role === 'buyer' ? 'Ununuzi' : 'Huduma'}</h4>
        <div className="chart-placeholder">
          <i className="fas fa-chart-line"></i>
          <p>Wacha ionyeshe chati hapa</p>
          <button className="btn btn-primary" onClick={() => handleAction('view_reports')}>
            Angalia Chati Kamili
          </button>
        </div>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="page dashboard-page">
        <Navigation 
          currentPage="dashboard"
          onPageChange={onPageChange}
          onAuth={onAuth}
          user={user}
        />
        <div className="dashboard-loading">
          <div className="loading-spinner">
            <i className="fas fa-spinner fa-spin"></i>
          </div>
          <p>Inapakia dashibodi yako...</p>
        </div>
      </div>
    );
  }

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
                  <i className="fas fa-seedling"></i> Mazao {stats.totalCrops}
                </span>
                <span className="welcome-badge">
                  <i className="fas fa-chart-line"></i> {user?.role === 'farmer' ? 'Mapato' : user?.role === 'buyer' ? 'Matumizi' : 'Mapato'} {stats.totalRevenue || stats.totalSpent || 'TZS 0'}
                </span>
                <span className="welcome-badge">
                  <i className="fas fa-users"></i> Vikundi {stats.groupMemberships || 0}
                </span>
              </div>
            </div>
            <div className="header-actions">
              {user?.role === 'farmer' && (
                <button className="btn btn-primary" onClick={() => handleAction('add_crop')}>
                  <i className="fas fa-plus"></i> Ongeza Zao
                </button>
              )}
              <button className="btn btn-outline" onClick={onToggleChat}>
                <i className="fas fa-comments"></i> Mazungumzo
              </button>
              {user?.role === 'farmer' && (
                <button className="btn btn-success" onClick={() => handleAction('apply_loan')}>
                  <i className="fas fa-hand-holding-usd"></i> Mikopo
                </button>
              )}
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
            
            {user?.role === 'farmer' && (
              <button 
                className={`tab-btn ${activeTab === 'crops' ? 'active' : ''}`}
                onClick={() => setActiveTab('crops')}
              >
                <i className="fas fa-seedling"></i>
                Mazao Yangu
              </button>
            )}
            
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
                  <button 
                    className="btn btn-primary" 
                    onClick={() => handleAction('add_crop')}
                  >
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