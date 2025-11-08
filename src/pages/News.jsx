import React, { useState } from 'react';
import Navigation from '../components/Navbar/Navbar';
import Footer from '../components/Footer/Footer';
import './CSS/News.css';

const News = ({ onPageChange, onAuth, user }) => {
  const [activeCategory, setActiveCategory] = useState('all');

  const newsCategories = [
    { id: 'all', label: 'Habari Zote' },
    { id: 'farming', label: 'Mbinu za Kilimo' },
    { id: 'market', label: 'Soko na Bei' },
    { id: 'weather', label: 'Hali ya Hewa' },
    { id: 'technology', label: 'Teknolojia' },
    { id: 'events', label: 'Matukio' }
  ];

  const newsArticles = [
    {
      id: 1,
      title: 'Mbinu Mpya za Kilimo cha Mahindi Katika Mkoa wa Katavi',
      excerpt: 'Wataalamu wa kilimo wamegundua mbinu bora za kupanda na kuvuna mahindi kwa mazao bora na mengi zaidi.',
      category: 'farming',
      author: 'Dk. Anna Mrosso',
      date: 'Novemba 15, 2024',
      readTime: '5 min',
      image: '🌽',
      featured: true
    },
    {
      id: 2,
      title: 'Bei za Mpunga Zinapanda Kwenye Soko la Kimataifa',
      excerpt: 'Upatikanaji mdogo wa mpunga umepelekea kupanda kwa bei hadi asilimia 15 katika soko la kimataifa.',
      category: 'market',
      author: 'Bw. Juma Hassan',
      date: 'Novemba 14, 2024',
      readTime: '4 min',
      image: '🌾',
      featured: false
    },
    {
      id: 3,
      title: 'Msimu wa Mvua Unatarajiwa Kuanza Mapema Mwaka Huu',
      excerpt: 'Taasisi ya hali ya hewa imetangaza kuanza kwa mapema kwa msimu wa mvua katika Mkoa wa Katavi.',
      category: 'weather',
      author: 'Mtaalamu wa Hali ya Hewa',
      date: 'Novemba 13, 2024',
      readTime: '3 min',
      image: '🌧️',
      featured: true
    },
    {
      id: 4,
      title: 'Teknolojia ya Umwagiliaji wa Umande Inaleta Mageuzi Katika Kilimo',
      excerpt: 'Wakulima wanaotumia mifumo ya kisasa ya umwagiliaji wanaongeza mazao kwa asilimia 40.',
      category: 'technology',
      author: 'Bi. Sarah William',
      date: 'Novemba 12, 2024',
      readTime: '6 min',
      image: '💧',
      featured: false
    },
    {
      id: 5,
      title: 'Semina ya Kilimo Endelevu Iandaliwa Mpanda',
      excerpt: 'Watendaji wa kilimo wakutana kujadili mbinu za kilimo endelevu na jinsi ya kukabiliana na mabadiliko ya tabianchi.',
      category: 'events',
      author: 'Mwandishi Wetu',
      date: 'Novemba 11, 2024',
      readTime: '4 min',
      image: '👨‍🌾',
      featured: false
    },
    {
      id: 6,
      title: 'Wakulima Wadogo Wafanikiwa Kupata Soko la Nje',
      excerpt: 'Kundi la wakulima 50 wa Katavi wamefanikiwa kufikia soko la Ulaya kwa mazao yao ya kibiashara.',
      category: 'market',
      author: 'Bw. Rajab Simba',
      date: 'Novemba 10, 2024',
      readTime: '5 min',
      image: '🚜',
      featured: true
    }
  ];

  const videos = [
    {
      id: 1,
      title: 'Mbinu ya Kutengeneza Mbolea Asilia Nyumbani',
      duration: '8:15',
      views: '2,450',
      category: 'farming',
      thumbnail: '🧪',
      description: 'Jifunze jinsi ya kutengeneza mbolea asilia kwa gharama ndogo'
    },
    {
      id: 2,
      title: 'Udhibiti wa Wadudu bila Kemikali',
      duration: '6:30',
      views: '1,890',
      category: 'farming',
      thumbnail: '🐛',
      description: 'Njia za asili za kudhibiti wadudu kwenye mimea yako'
    },
    {
      id: 3,
      title: 'Uvunaji na Uhifadhi wa Mazao',
      duration: '10:20',
      views: '3,120',
      category: 'technology',
      thumbnail: '📦',
      description: 'Mbinu bora za kuvuna na kuhifadhi mazao kwa muda mrefu'
    }
  ];

  const announcements = [
    {
      id: 1,
      title: 'Mafunzo ya Kilimo cha Kisasa',
      date: 'Nov 25, 2024',
      location: 'Mpanda',
      type: 'training'
    },
    {
      id: 2,
      title: 'Msururu wa Mvua Unatarajiwa',
      date: 'Nov 30, 2024',
      location: 'Mkoa Mzima',
      type: 'weather'
    },
    {
      id: 3,
      title: 'Msaada wa Mbolea Rasimu Mpya',
      date: 'Dec 5, 2024',
      location: 'Ofisi za Wilaya',
      type: 'support'
    },
    {
      id: 4,
      title: 'Sherehe ya Wakulima Wa Tanzania',
      date: 'Dec 8, 2024',
      location: 'Mpanda Mjini',
      type: 'event'
    }
  ];

  const filteredArticles = activeCategory === 'all' 
    ? newsArticles 
    : newsArticles.filter(article => article.category === activeCategory);

  const featuredArticles = newsArticles.filter(article => article.featured);

  return (
    <div className="page news-page">
      <Navigation 
        currentPage="news"
        onPageChange={onPageChange}
        onAuth={onAuth}
        user={user}
      />
      
      <div className="news-container">
        <div className="container">
          {/* Header Section */}
          <div className="news-header">
            <h1>Habari za Kilimo</h1>
            <p>Fuatilia habari mpya, matangazo, na taarifa muhimu za sekta ya kilimo katika Mkoa wa Katavi</p>
          </div>

          {/* Featured Articles */}
          <section className="featured-section">
            <h2 className="section-title">Makala Muhimu</h2>
            <div className="featured-grid">
              {featuredArticles.map(article => (
                <article key={article.id} className="featured-article">
                  <div className="featured-image">
                    {article.image}
                  </div>
                  <div className="featured-content">
                    <span className="article-category">{article.category}</span>
                    <h3 className="article-title">{article.title}</h3>
                    <p className="article-excerpt">{article.excerpt}</p>
                    <div className="article-meta">
                      <span className="article-author">Na {article.author}</span>
                      <span className="article-date">{article.date}</span>
                      <span className="article-read-time">{article.readTime}</span>
                    </div>
                    <button className="btn btn-primary">
                      Soma Zaidi <i className="fas fa-arrow-right"></i>
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <div className="news-content">
            <div className="main-content">
              {/* Category Filter */}
              <div className="category-filter">
                {newsCategories.map(category => (
                  <button
                    key={category.id}
                    className={`category-btn ${activeCategory === category.id ? 'active' : ''}`}
                    onClick={() => setActiveCategory(category.id)}
                  >
                    {category.label}
                  </button>
                ))}
              </div>

              {/* News Grid */}
              <div className="news-grid">
                {filteredArticles.map(article => (
                  <article key={article.id} className="news-card">
                    <div className="card-image">
                      {article.image}
                    </div>
                    <div className="card-content">
                      <span className="card-category">{article.category}</span>
                      <h3 className="card-title">{article.title}</h3>
                      <p className="card-excerpt">{article.excerpt}</p>
                      <div className="card-meta">
                        <div className="meta-left">
                          <span className="card-author">{article.author}</span>
                          <span className="card-date">{article.date}</span>
                        </div>
                        <span className="card-read-time">{article.readTime}</span>
                      </div>
                      <button className="btn btn-outline btn-sm">
                        Soma Zaidi <i className="fas fa-arrow-right"></i>
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <div className="sidebar">
              {/* Announcements */}
              <div className="sidebar-section">
                <h3 className="sidebar-title">
                  <i className="fas fa-bullhorn"></i>
                  Matangazo
                </h3>
                <div className="announcements-list">
                  {announcements.map(announcement => (
                    <div key={announcement.id} className="announcement-item">
                      <div className="announcement-date">{announcement.date}</div>
                      <h4 className="announcement-title">{announcement.title}</h4>
                      <div className="announcement-location">
                        <i className="fas fa-map-marker-alt"></i>
                        {announcement.location}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Video Section */}
              <div className="sidebar-section">
                <h3 className="sidebar-title">
                  <i className="fas fa-play-circle"></i>
                  Video za Mafunzo
                </h3>
                <div className="videos-list">
                  {videos.map(video => (
                    <div key={video.id} className="video-item">
                      <div className="video-thumbnail">
                        {video.thumbnail}
                        <div className="video-play">
                          <i className="fas fa-play"></i>
                        </div>
                      </div>
                      <div className="video-info">
                        <h4 className="video-title">{video.title}</h4>
                        <p className="video-description">{video.description}</p>
                        <div className="video-meta">
                          <span className="video-duration">{video.duration}</span>
                          <span className="video-views">{video.views} views</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <button className="btn btn-outline btn-sm" style={{width: '100%', marginTop: '1rem'}}>
                  <i className="fas fa-video"></i> Angalia Video Zote
                </button>
              </div>

              {/* Newsletter Signup */}
              <div className="sidebar-section newsletter">
                <h3 className="sidebar-title">Pata Habari Moja kwa Moja</h3>
                <p>Jiandikishe kupokea habari za kilimo kwenye barua pepe yako</p>
                <div className="newsletter-form">
                  <input 
                    type="email" 
                    placeholder="Barua pepe yako"
                    className="newsletter-input"
                  />
                  <button className="btn btn-primary btn-sm">
                    Jiandikishe
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Weather Alert Banner */}
          <div className="weather-alert">
            <div className="alert-icon">
              <i className="fas fa-cloud-sun-rain"></i>
            </div>
            <div className="alert-content">
              <h3>Taarifa ya Hali ya Hewa</h3>
              <p>Mvua nzito inatarajiwa kuanzia kesho jioni hadi Ijumaa. Wadau wa kilimo tafadhali fanya maandalizi ya kuhifadhi mazao.</p>
            </div>
            <button className="btn btn-outline">
              Angalia Hali ya Hewa
            </button>
          </div>
        </div>
      </div>

      <Footer onPageChange={onPageChange} />
    </div>
  );
};

export default News;