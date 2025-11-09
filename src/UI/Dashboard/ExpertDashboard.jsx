import React, { useState } from 'react';
import Navigation from '../../components/Navbar/Navbar';
import Footer from '../../components/Footer/Footer';
import './ExpertDashboard.css';

const ExpertDashboard = ({ onPageChange, onAuth, user }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [showAddArticleModal, setShowAddArticleModal] = useState(false);
  const [showConsultationModal, setShowConsultationModal] = useState(false);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState(null);

  const [newArticle, setNewArticle] = useState({
    title: '',
    category: '',
    content: '',
    tags: '',
    image: ''
  });

  const [consultationResponse, setConsultationResponse] = useState('');

  // Sample data for expert
  const expertStats = {
    totalArticles: 15,
    consultationsAnswered: 47,
    pendingConsultations: 3,
    averageRating: 4.8,
    totalEarnings: 'TZS 850,000',
    expertiseAreas: ['Udongo', 'Mimea', 'Udhibiti wa Wadudu']
  };

  const myArticles = [
    {
      id: 1,
      title: 'Mbinu Bora za Kilimo cha Mahindi',
      category: 'Kilimo',
      content: 'Maelezo ya kina kuhusu jinsi ya kulima mahindi kwa ufanisi...',
      date: '2024-01-10',
      views: 245,
      likes: 34,
      status: 'published'
    },
    {
      id: 2,
      title: 'Udhibiti wa Wadudu wa Mahindi',
      category: 'Afya ya Mimea',
      content: 'Njia mbadala za kudhibiti wadudu wanaoua mazao ya mahindi...',
      date: '2024-01-08',
      views: 189,
      likes: 28,
      status: 'published'
    },
    {
      id: 3,
      title: 'Uchambuzi wa Udongo wa Mkoa wa Katavi',
      category: 'Udongo',
      content: 'Uchambuzi wa kina wa udongo wa mkoa wetu na mbinu za kuboresha...',
      date: '2024-01-05',
      views: 312,
      likes: 45,
      status: 'draft'
    }
  ];

  const consultations = [
    {
      id: 1,
      farmer: 'Juma Mwinyi',
      question: 'Nina shamba la ekari 5 la mahindi. Udongo unakosa rutuba. Nifanye nini?',
      category: 'Udongo',
      urgency: 'high',
      date: '2024-01-15',
      status: 'pending',
      contact: '+255 789 123 456'
    },
    {
      id: 2,
      farmer: 'Asha Hassan',
      question: 'Mimea yangu ya maharage inaonekana dhaifu na majani yanageuka manjano. Shida ni nini?',
      category: 'Afya ya Mimea',
      urgency: 'medium',
      date: '2024-01-14',
      status: 'answered',
      contact: '+255 789 123 457'
    },
    {
      id: 3,
      farmer: 'Mohamed Ali',
      question: 'Nawezaje kuboresha mazao ya mpunga kwenye eneo lenye maji machache?',
      category: 'Kilimo',
      urgency: 'low',
      date: '2024-01-13',
      status: 'pending',
      contact: '+255 789 123 458'
    },
    {
      id: 4,
      farmer: 'Grace Peter',
      question: 'Ni mbolea gani nzuri kwa mazao ya alizeti?',
      category: 'Mbolea',
      urgency: 'medium',
      date: '2024-01-12',
      status: 'answered',
      contact: '+255 789 123 459'
    }
  ];

  const recentActivities = [
    {
      id: 1,
      type: 'article',
      description: 'Makala yako imepokei maoni 5 mapya',
      time: '2 saa zilizopita',
      icon: '📝'
    },
    {
      id: 2,
      type: 'consultation',
      description: 'Swali jipya kutoka kwa mkulima',
      time: '5 saa zilizopita',
      icon: '💬'
    },
    {
      id: 3,
      type: 'rating',
      description: 'Umepokea tathmini mpya: ⭐⭐⭐⭐⭐',
      time: '1 siku iliyopita',
      icon: '⭐'
    },
    {
      id: 4,
      type: 'payment',
      description: 'Malipo yameingia kwa ushauri uliotoa',
      time: '2 siku zilizopita',
      icon: '💰'
    }
  ];

  const earningsData = [
    { month: 'Jan', earnings: 850000 },
    { month: 'Feb', earnings: 720000 },
    { month: 'Mar', earnings: 930000 },
    { month: 'Apr', earnings: 680000 },
    { month: 'May', earnings: 890000 },
    { month: 'Jun', earnings: 950000 }
  ];

  const handleAddArticle = (e) => {
    e.preventDefault();
    // Handle adding new article logic here
    console.log('Adding new article:', newArticle);
    alert('Makala mpya imeongezwa kikamilifu!');
    setShowAddArticleModal(false);
    setNewArticle({
      title: '',
      category: '',
      content: '',
      tags: '',
      image: ''
    });
  };

  const handleRespondToQuestion = (questionId) => {
    const question = consultations.find(q => q.id === questionId);
    setSelectedQuestion(question);
    setShowResponseModal(true);
  };

  const handleSubmitResponse = (e) => {
    e.preventDefault();
    // Handle response submission logic here
    console.log('Submitting response:', consultationResponse);
    alert('Umewasilisha jibu lako kikamilifu!');
    setShowResponseModal(false);
    setConsultationResponse('');
    setSelectedQuestion(null);
  };

  const renderOverview = () => (
    <div className="expert-overview">
      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📝</div>
          <div className="stat-content">
            <div className="stat-number">{expertStats.totalArticles}</div>
            <div className="stat-label">Makala Zilizoandikwa</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">💬</div>
          <div className="stat-content">
            <div className="stat-number">{expertStats.consultationsAnswered}</div>
            <div className="stat-label">Maswali Yaliyojibiwa</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⏳</div>
          <div className="stat-content">
            <div className="stat-number">{expertStats.pendingConsultations}</div>
            <div className="stat-label">Maswali Yanayosubiri</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⭐</div>
          <div className="stat-content">
            <div className="stat-number">{expertStats.averageRating}</div>
            <div className="stat-label">Wastani wa Tathmini</div>
          </div>
        </div>
      </div>

      {/* Expertise Areas */}
      <div className="expertise-section">
        <h3>Maeneo ya Utaalamu Wako</h3>
        <div className="expertise-tags">
          {expertStats.expertiseAreas.map((area, index) => (
            <span key={index} className="expertise-tag">{area}</span>
          ))}
          <button className="btn btn-sm btn-outline">
            <i className="fas fa-plus"></i> Ongeza Utaalamu
          </button>
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
          <button className="action-btn" onClick={() => setShowAddArticleModal(true)}>
            <i className="fas fa-edit"></i>
            <span>Andika Makala</span>
          </button>
          <button className="action-btn" onClick={() => setActiveTab('consultations')}>
            <i className="fas fa-comments"></i>
            <span>Angalia Maswali</span>
          </button>
          <button className="action-btn" onClick={() => setActiveTab('earnings')}>
            <i className="fas fa-chart-line"></i>
            <span>Takwimu za Mapato</span>
          </button>
          <button className="action-btn">
            <i className="fas fa-cog"></i>
            <span>Mipangilio</span>
          </button>
        </div>
      </div>
    </div>
  );

  const renderArticles = () => (
    <div className="expert-section">
      <div className="section-header">
        <h3>Makala Yangu</h3>
        <button className="btn btn-primary" onClick={() => setShowAddArticleModal(true)}>
          <i className="fas fa-plus"></i> Andika Makala Mpya
        </button>
      </div>

      <div className="articles-grid">
        {myArticles.map(article => (
          <div key={article.id} className="article-card">
            <div className="article-header">
              <h4>{article.title}</h4>
              <span className={`status-badge ${article.status}`}>
                {article.status === 'published' ? 'Imechapishwa' : 'Rasimu'}
              </span>
            </div>
            <div className="article-meta">
              <span className="category">{article.category}</span>
              <span className="date">{article.date}</span>
            </div>
            <p className="article-preview">{article.content.substring(0, 150)}...</p>
            <div className="article-stats">
              <span><i className="fas fa-eye"></i> {article.views}</span>
              <span><i className="fas fa-heart"></i> {article.likes}</span>
            </div>
            <div className="article-actions">
              <button className="btn btn-sm btn-outline">Hariri</button>
              <button className="btn btn-sm btn-primary">Ongeza Picha</button>
              {article.status === 'draft' && (
                <button className="btn btn-sm btn-success">Chapisha</button>
              )}
              <button className="btn btn-sm btn-danger">Futa</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderConsultations = () => (
    <div className="expert-section">
      <h3>Maswali ya Wakulima</h3>
      
      {/* Consultation Stats */}
      <div className="consultation-stats">
        <div className="stat-item">
          <div className="stat-value">{consultations.filter(c => c.status === 'pending').length}</div>
          <div className="stat-label">Yanayosubiri</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{consultations.filter(c => c.status === 'answered').length}</div>
          <div className="stat-label">Yaliyojibiwa</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{consultations.length}</div>
          <div className="stat-label">Jumla</div>
        </div>
      </div>

      <div className="consultations-list">
        {consultations.map(consultation => (
          <div key={consultation.id} className="consultation-card">
            <div className="consultation-header">
              <div className="farmer-info">
                <h4>{consultation.farmer}</h4>
                <span className="contact">{consultation.contact}</span>
              </div>
              <div className="consultation-meta">
                <span className={`urgency-badge ${consultation.urgency}`}>
                  {consultation.urgency === 'high' ? 'Haraka' : 
                   consultation.urgency === 'medium' ? 'Wastani' : 'Si haraka'}
                </span>
                <span className="category">{consultation.category}</span>
                <span className="date">{consultation.date}</span>
              </div>
            </div>
            <div className="consultation-question">
              <p>{consultation.question}</p>
            </div>
            <div className="consultation-actions">
              <span className={`status-badge ${consultation.status}`}>
                {consultation.status === 'pending' ? 'Inasubiri' : 'Imejibiwa'}
              </span>
              {consultation.status === 'pending' && (
                <button 
                  className="btn btn-sm btn-primary"
                  onClick={() => handleRespondToQuestion(consultation.id)}
                >
                  <i className="fas fa-reply"></i> Jibu Swali
                </button>
              )}
              <button className="btn btn-sm btn-outline">
                <i className="fas fa-phone"></i> Piga Simu
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderEarnings = () => (
    <div className="expert-section">
      <h3>Takwimu za Mapato</h3>
      
      <div className="earnings-overview">
        <div className="earnings-card">
          <h4>Jumla ya Mapato</h4>
          <div className="earnings-amount">{expertStats.totalEarnings}</div>
          <div className="earnings-period">Kuanzia Januari 2024</div>
        </div>
        
        <div className="earnings-breakdown">
          <h4>Vyanzo vya Mapato</h4>
          <div className="breakdown-list">
            <div className="breakdown-item">
              <span className="source">Maswali Yanayolipwa</span>
              <span className="amount">TZS 450,000</span>
            </div>
            <div className="breakdown-item">
              <span className="source">Makala</span>
              <span className="amount">TZS 250,000</span>
            </div>
            <div className="breakdown-item">
              <span className="source">Mafunzo</span>
              <span className="amount">TZS 150,000</span>
            </div>
          </div>
        </div>
      </div>

      <div className="earnings-chart">
        <h4>Mapato kwa Miezi (2024)</h4>
        <div className="chart-bars">
          {earningsData.map((data, index) => (
            <div key={index} className="chart-bar-container">
              <div 
                className="chart-bar"
                style={{ height: `${(data.earnings / 1000000) * 100}px` }}
                title={`${data.month}: TZS ${data.earnings.toLocaleString()}`}
              ></div>
              <span className="chart-label">{data.month}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderSchedule = () => (
    <div className="expert-section">
      <h3>Ratiba Yangu</h3>
      
      <div className="schedule-container">
        <div className="schedule-header">
          <h4>Mikakati Iliyopangwa</h4>
          <button className="btn btn-primary">
            <i className="fas fa-plus"></i> Ongeza Mkutano
          </button>
        </div>
        
        <div className="schedule-list">
          <div className="schedule-item">
            <div className="schedule-time">
              <span className="date">Jan 20, 2024</span>
              <span className="time">10:00 AM - 11:00 AM</span>
            </div>
            <div className="schedule-details">
              <h5>Mkutano na Mkulima Juma</h5>
              <p>Majadiliano kuhusu udongo wa shamba la mahindi</p>
              <span className="status upcoming">Ujao</span>
            </div>
            <div className="schedule-actions">
              <button className="btn btn-sm btn-outline">Hariri</button>
              <button className="btn btn-sm btn-danger">Ghairi</button>
            </div>
          </div>
          
          <div className="schedule-item">
            <div className="schedule-time">
              <span className="date">Jan 18, 2024</span>
              <span className="time">02:00 PM - 03:00 PM</span>
            </div>
            <div className="schedule-details">
              <h5>Mafunzo ya Kilimo kwa Kikundi</h5>
              <p>Mafunzo kuhusu mbinu za kisasa za kilimo</p>
              <span className="status completed">Imekamilika</span>
            </div>
            <div className="schedule-actions">
              <button className="btn btn-sm btn-outline">Angalia Maelezo</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="page expert-dashboard-page">
      <Navigation 
        currentPage="expert-dashboard"
        onPageChange={onPageChange}
        onAuth={onAuth}
        user={user}
      />
      
      <div className="expert-dashboard-container">
        <div className="container">
          {/* Dashboard Header */}
          <div className="dashboard-header">
            <div className="welcome-section">
              <h1>Karibu, Mtaalamu {user?.name}!</h1>
              <p>Dashibodi yako ya kutoa ushauri na kuongoza wakulima wa Katavi</p>
              <div className="expert-badge">
                <i className="fas fa-graduation-cap"></i>
                Mtaalamu wa Kilimo
              </div>
            </div>
            <div className="header-actions">
              <button className="btn btn-primary" onClick={() => setShowAddArticleModal(true)}>
                <i className="fas fa-edit"></i> Andika Makala
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
              className={`tab-btn ${activeTab === 'articles' ? 'active' : ''}`}
              onClick={() => setActiveTab('articles')}
            >
              <i className="fas fa-newspaper"></i>
              Makala Yangu
            </button>
            <button 
              className={`tab-btn ${activeTab === 'consultations' ? 'active' : ''}`}
              onClick={() => setActiveTab('consultations')}
            >
              <i className="fas fa-comments"></i>
              Maswali
              {consultations.filter(c => c.status === 'pending').length > 0 && (
                <span className="notification-badge">
                  {consultations.filter(c => c.status === 'pending').length}
                </span>
              )}
            </button>
            <button 
              className={`tab-btn ${activeTab === 'earnings' ? 'active' : ''}`}
              onClick={() => setActiveTab('earnings')}
            >
              <i className="fas fa-chart-line"></i>
              Mapato
            </button>
            <button 
              className={`tab-btn ${activeTab === 'schedule' ? 'active' : ''}`}
              onClick={() => setActiveTab('schedule')}
            >
              <i className="fas fa-calendar"></i>
              Ratiba
            </button>
          </div>

          {/* Dashboard Content */}
          <div className="dashboard-content">
            {activeTab === 'overview' && renderOverview()}
            {activeTab === 'articles' && renderArticles()}
            {activeTab === 'consultations' && renderConsultations()}
            {activeTab === 'earnings' && renderEarnings()}
            {activeTab === 'schedule' && renderSchedule()}
          </div>
        </div>
      </div>

      {/* Add Article Modal */}
      {showAddArticleModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Andika Makala Mpya</h3>
              <button className="close-btn" onClick={() => setShowAddArticleModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <form onSubmit={handleAddArticle} className="modal-body">
              <div className="form-grid">
                <div className="form-group full-width">
                  <label>Kichwa cha Makala *</label>
                  <input
                    type="text"
                    value={newArticle.title}
                    onChange={(e) => setNewArticle({...newArticle, title: e.target.value})}
                    required
                    placeholder="Weka kichwa cha makala..."
                  />
                </div>
                <div className="form-group">
                  <label>Kategoria *</label>
                  <select
                    value={newArticle.category}
                    onChange={(e) => setNewArticle({...newArticle, category: e.target.value})}
                    required
                  >
                    <option value="">Chagua kategoria</option>
                    <option value="kilimo">Kilimo</option>
                    <option value="udongo">Udongo</option>
                    <option value="mbolea">Mbolea</option>
                    <option value="wadudu">Udhibiti wa Wadudu</option>
                    <option value="majimaji">Umwagiliaji</option>
                    <option value="soko">Masoko</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Vitambulisho (Tags)</label>
                  <input
                    type="text"
                    value={newArticle.tags}
                    onChange={(e) => setNewArticle({...newArticle, tags: e.target.value})}
                    placeholder="Mf. mahindi, mbolea, udongo"
                  />
                </div>
                <div className="form-group full-width">
                  <label>Maudhui ya Makala *</label>
                  <textarea
                    value={newArticle.content}
                    onChange={(e) => setNewArticle({...newArticle, content: e.target.value})}
                    required
                    placeholder="Andika maudhui ya makala yako hapa..."
                    rows="8"
                  />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowAddArticleModal(false)}>
                  Ghairi
                </button>
                <button type="submit" className="btn btn-primary">
                  <i className="fas fa-save"></i> Hifadhi Makala
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Response Modal */}
      {showResponseModal && selectedQuestion && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Jibu Swali la {selectedQuestion.farmer}</h3>
              <button className="close-btn" onClick={() => setShowResponseModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <form onSubmit={handleSubmitResponse} className="modal-body">
              <div className="question-preview">
                <h4>Swali:</h4>
                <p>{selectedQuestion.question}</p>
              </div>
              <div className="form-group full-width">
                <label>Jibu Lako *</label>
                <textarea
                  value={consultationResponse}
                  onChange={(e) => setConsultationResponse(e.target.value)}
                  required
                  placeholder="Andika jibu lako la kina hapa..."
                  rows="6"
                />
              </div>
              <div className="response-tips">
                <h5>Vidokezo vya Kujibu:</h5>
                <ul>
                  <li>Toa jibu la kina na lenye maelezo</li>
                  <li>Tumia lugha rahisi kueleweka</li>
                  <li>Toa mifano na ushauri unaoweza kutekelezwa</li>
                  <li>Wasiliana kwa heshima na utu</li>
                </ul>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowResponseModal(false)}>
                  Ghairi
                </button>
                <button type="submit" className="btn btn-primary">
                  <i className="fas fa-paper-plane"></i> Wasilisha Jibu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer onPageChange={onPageChange} />
    </div>
  );
};

export default ExpertDashboard;