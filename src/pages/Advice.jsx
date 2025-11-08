import React, { useState } from 'react';
import Navigation from '../components/Navbar/Navbar';
import Footer from '../components/Footer/Footer';
import './CSS/Advice.css';

const Advice = ({ onPageChange, onAuth, user }) => {
  const [activeTab, setActiveTab] = useState('articles');

  const articles = [
    {
      id: 1,
      title: 'Mbinu Bora za Kupanda Mahindi',
      excerpt: 'Jifunze mbinu za kisasa za kupanda na kuvuna mahindi kwa mazao bora na mengi.',
      category: 'Kilimo cha Nafaka',
      readTime: '5 min',
      date: 'Okt 20, 2023',
      image: '🌽'
    },
    {
      id: 2,
      title: 'Kudhibiti Wadudu bila Kemikali',
      excerpt: 'Njia za asili na salama za kudhibiti wadudu kwenye mimea yako.',
      category: 'Udhibiti wa Wadudu',
      readTime: '4 min',
      date: 'Okt 18, 2023',
      image: '🐛'
    },
    {
      id: 3,
      title: 'Kilimo cha Umwagiliaji wa Umande',
      excerpt: 'Jinsi ya kutumia mfumo wa umwagiliaji wa umande kuokoa maji na kuongeza mazao.',
      category: 'Umwagiliaji',
      readTime: '6 min',
      date: 'Okt 15, 2023',
      image: '💧'
    },
    {
      id: 4,
      title: 'Uhifadhi wa Mazao baada ya Mavuno',
      excerpt: 'Mbinu bora za kuhifadhi mazao yako kwa muda mrefu bila kupoteza ubora.',
      category: 'Uhifadhi wa Mazao',
      readTime: '4 min',
      date: 'Okt 12, 2023',
      image: '📦'
    }
  ];

  const videos = [
    {
      id: 1,
      title: 'Kutengeneza Mbolea Asilia',
      duration: '5:30',
      views: '1.2K',
      category: 'Mbolea',
      thumbnail: '🧪'
    },
    {
      id: 2,
      title: 'Upandaji wa Mbegu za Mpunga',
      duration: '7:15',
      views: '2.1K',
      category: 'Upandaji',
      thumbnail: '🌾'
    },
    {
      id: 3,
      title: 'Matumizi ya Dawa za Wadudu',
      duration: '6:45',
      views: '1.8K',
      category: 'Udhibiti wa Wadudu',
      thumbnail: '🐞'
    },
    {
      id: 4,
      title: 'Mfumo wa Umwagiliaji wa Kisasa',
      duration: '8:20',
      views: '3.2K',
      category: 'Umwagiliaji',
      thumbnail: '🚿'
    }
  ];

  const experts = [
    {
      id: 1,
      name: 'Dk. Anna Mrosso',
      specialization: 'Utaalamu wa Mbolea na Udongo',
      experience: 'Miaka 15',
      image: '👩‍🌾',
      available: true
    },
    {
      id: 2,
      name: 'Bw. Juma Hassan',
      specialization: 'Uvunaji na Uhifadhi wa Mazao',
      experience: 'Miaka 12',
      image: '👨‍🌾',
      available: true
    },
    {
      id: 3,
      name: 'Dk. Robert Kipanga',
      specialization: 'Dawa za Wadudu na Magonjwa',
      experience: 'Miaka 18',
      image: '👨‍🔬',
      available: false
    }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'articles':
        return (
          <div className="articles-grid">
            {articles.map(article => (
              <div key={article.id} className="article-card">
                <div className="article-image">{article.image}</div>
                <div className="article-content">
                  <div className="article-category">{article.category}</div>
                  <h3 className="article-title">{article.title}</h3>
                  <p className="article-excerpt">{article.excerpt}</p>
                  <div className="article-meta">
                    <span className="article-date">{article.date}</span>
                    <span className="article-read-time">{article.readTime}</span>
                  </div>
                  <button className="btn btn-primary btn-sm">
                    Soma Zaidi <i className="fas fa-arrow-right"></i>
                  </button>
                </div>
              </div>
            ))}
          </div>
        );

      case 'videos':
        return (
          <div className="videos-grid">
            {videos.map(video => (
              <div key={video.id} className="video-card">
                <div className="video-thumbnail">
                  {video.thumbnail}
                  <div className="video-duration">{video.duration}</div>
                </div>
                <div className="video-content">
                  <div className="video-category">{video.category}</div>
                  <h3 className="video-title">{video.title}</h3>
                  <div className="video-meta">
                    <span className="video-views">
                      <i className="fas fa-eye"></i> {video.views}
                    </span>
                  </div>
                  <button className="btn btn-primary btn-sm">
                    <i className="fas fa-play"></i> Tazama Video
                  </button>
                </div>
              </div>
            ))}
          </div>
        );

      case 'experts':
        return (
          <div className="experts-grid">
            {experts.map(expert => (
              <div key={expert.id} className="expert-card">
                <div className="expert-header">
                  <div className="expert-image">{expert.image}</div>
                  <div className={`expert-status ${expert.available ? 'available' : 'busy'}`}>
                    {expert.available ? 'Inapatikana' : 'Haipatikani'}
                  </div>
                </div>
                <div className="expert-info">
                  <h3 className="expert-name">{expert.name}</h3>
                  <p className="expert-specialization">{expert.specialization}</p>
                  <div className="expert-experience">
                    <i className="fas fa-clock"></i> Uzoefu: {expert.experience}
                  </div>
                </div>
                <div className="expert-actions">
                  <button className="btn btn-primary" disabled={!expert.available}>
                    <i className="fas fa-comment"></i> Uliza Swali
                  </button>
                  <button className="btn btn-outline" disabled={!expert.available}>
                    <i className="fas fa-calendar"></i> Panga Mkutano
                  </button>
                </div>
              </div>
            ))}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="page advice-page">
      <Navigation 
        currentPage="advice"
        onPageChange={onPageChange}
        onAuth={onAuth}
        user={user}
      />
      
      <div className="advice-container">
        <div className="container">
          {/* Header */}
          <div className="advice-header">
            <h1>Ushauri wa Kilimo</h1>
            <p>Pata mafunzo, video, na ushauri bora wa kilimo kutoka kwa wataalamu wetu</p>
          </div>

          {/* Tabs */}
          <div className="advice-tabs">
            <button 
              className={`tab-btn ${activeTab === 'articles' ? 'active' : ''}`}
              onClick={() => setActiveTab('articles')}
            >
              <i className="fas fa-newspaper"></i>
              Makala
            </button>
            <button 
              className={`tab-btn ${activeTab === 'videos' ? 'active' : ''}`}
              onClick={() => setActiveTab('videos')}
            >
              <i className="fas fa-play-circle"></i>
              Video
            </button>
            <button 
              className={`tab-btn ${activeTab === 'experts' ? 'active' : ''}`}
              onClick={() => setActiveTab('experts')}
            >
              <i className="fas fa-user-graduate"></i>
              Wataalamu
            </button>
          </div>

          {/* Content */}
          <div className="advice-content">
            {renderContent()}
          </div>

          {/* Quick Tips Section */}
          <div className="quick-tips">
            <h2>Vidokezo vya Haraka</h2>
            <div className="tips-grid">
              <div className="tip-card">
                <div className="tip-icon">💧</div>
                <h3>Umwagiliaji</h3>
                <p>Mwaga maji asubuhi na jioni epukapo jua kali la mchana</p>
              </div>
              <div className="tip-card">
                <div className="tip-icon">🌱</div>
                <h3>Mbolea</h3>
                <p>Tumia mbolea asilia kwa angalau wiki mbili kabla ya kupanda</p>
              </div>
              <div className="tip-card">
                <div className="tip-icon">🐛</div>
                <h3>Wadudu</h3>
                <p>Angalia mimea yako kila siku kwa dalili za wadudu na magonjwa</p>
              </div>
              <div className="tip-card">
                <div className="tip-icon">☀️</div>
                <h3>Hali ya Hewa</h3>
                <p>Fuata utabiri wa hali ya hewa kabla ya kufanya shughuli za kilimo</p>
              </div>
            </div>
          </div>

          {/* Ask Question Section */}
          <div className="ask-question">
            <div className="ask-content">
              <h2>Una Swali la Kilimo?</h2>
              <p>Waulize wataalamu wetu na upate jibu ndani ya masaa 24</p>
              <div className="ask-form">
                <textarea 
                  placeholder="Andika swali lako la kilimo hapa..."
                  className="question-input"
                  rows="4"
                ></textarea>
                <button className="btn btn-primary btn-lg">
                  <i className="fas fa-paper-plane"></i> Tuma Swali
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer onPageChange={onPageChange} />
    </div>
  );
};

export default Advice;