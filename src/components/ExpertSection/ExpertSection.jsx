import React from 'react';
import './ExpertSection.css';

const ExpertSection = ({ onPageChange }) => {
  const experts = [
    {
      id: 1,
      name: 'Dk. Anna Mrosso',
      specialization: 'Utaalamu wa Mbolea na Udongo',
      experience: 'Miaka 15',
      image: '👩‍🌾',
      rating: 4.9,
      reviews: 127,
      available: true
    },
    {
      id: 2,
      name: 'Bw. Juma Hassan',
      specialization: 'Uvunaji na Uhifadhi wa Mazao',
      experience: 'Miaka 12',
      image: '👨‍🌾',
      rating: 4.8,
      reviews: 98,
      available: true
    },
    {
      id: 3,
      name: 'Bi. Sarah William',
      specialization: 'Kilimo cha Mboga na Matunda',
      experience: 'Miaka 10',
      image: '👩‍🔬',
      rating: 4.7,
      reviews: 84,
      available: false
    },
    {
      id: 4,
      name: 'Dk. Robert Kipanga',
      specialization: 'Dawa za Wadudu na Magonjwa',
      experience: 'Miaka 18',
      image: '👨‍🔬',
      rating: 5.0,
      reviews: 156,
      available: true
    }
  ];

  const articles = [
    {
      id: 1,
      title: 'Mbinu Bora za Kupanda Mahindi',
      excerpt: 'Jifunze mbinu za kisasa za kupanda na kuvuna mahindi kwa mazao bora.',
      readTime: '5 min',
      category: 'Cereals'
    },
    {
      id: 2,
      title: 'Kudhibiti Wadudu bila Kemikali',
      excerpt: 'Njia za asili za kudhibiti wadudu kwenye mimea yako.',
      readTime: '4 min',
      category: 'Pest Control'
    },
    {
      id: 3,
      title: 'Kilimo cha Umwagiliaji wa Umande',
      excerpt: 'Jinsi ya kutumia mfumo wa umwagiliaji wa umande kuokoa maji.',
      readTime: '6 min',
      category: 'Irrigation'
    }
  ];

  return (
    <section className="expert-section">
      <div className="container">
        <div className="section-header">
          <h2>Wataalamu wa Kilimo</h2>
          <p>Pata ushauri bora kutoka kwa wataalamu wetu wa kilimo wenye uzoefu mwingi</p>
        </div>

        <div className="expert-content">
          {/* Experts Grid */}
          <div className="experts-grid">
            {experts.map(expert => (
              <div key={expert.id} className="expert-card">
                <div className="expert-header">
                  <div className="expert-image">{expert.image}</div>
                  <div className="expert-status">
                    <span className={`status ${expert.available ? 'available' : 'busy'}`}>
                      {expert.available ? 'Anapatikana' : 'Hapatikani'}
                    </span>
                  </div>
                </div>

                <div className="expert-info">
                  <h3 className="expert-name">{expert.name}</h3>
                  <p className="expert-specialization">{expert.specialization}</p>
                  <div className="expert-experience">
                    <i className="fas fa-clock"></i>
                    Uzoefu: {expert.experience}
                  </div>
                </div>

                <div className="expert-rating">
                  <div className="stars">
                    {[...Array(5)].map((_, i) => (
                      <i 
                        key={i} 
                        className={`fas fa-star ${i < Math.floor(expert.rating) ? 'filled' : ''}`}
                      ></i>
                    ))}
                  </div>
                  <span className="rating-text">
                    {expert.rating} ({expert.reviews} maoni)
                  </span>
                </div>

                <div className="expert-actions">
                  <button className="btn btn-primary btn-sm">
                    <i className="fas fa-comment"></i> Uliza Swali
                  </button>
                  <button className="btn btn-outline btn-sm">
                    <i className="fas fa-calendar"></i> Panga Mkutano
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Articles Section */}
          <div className="articles-section">
            <div className="articles-header">
              <h3>Makala za Kilimo</h3>
              <button 
                className="btn btn-outline btn-sm"
                onClick={() => onPageChange('advice')}
              >
                Angalia Zote
              </button>
            </div>

            <div className="articles-grid">
              {articles.map(article => (
                <div key={article.id} className="article-card">
                  <div className="article-category">{article.category}</div>
                  <h4 className="article-title">{article.title}</h4>
                  <p className="article-excerpt">{article.excerpt}</p>
                  <div className="article-meta">
                    <span className="read-time">
                      <i className="fas fa-clock"></i> {article.readTime}
                    </span>
                    <button className="read-more">
                      Soma Zaidi <i className="fas fa-arrow-right"></i>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CTA Section */}
          <div className="expert-cta">
            <div className="cta-content">
              <h3>Unahitaji Ushauri wa Kilimo?</h3>
              <p>Jiunge na jukwaa letu na upate ushauri bora wa kilimo kutoka kwa wataalamu</p>
              <div className="cta-actions">
                <button className="btn btn-primary btn-lg">
                  <i className="fas fa-user-graduate"></i> Jiunge kama Mtaalamu
                </button>
                <button 
                  className="btn btn-outline btn-lg"
                  onClick={() => onPageChange('advice')}
                >
                  <i className="fas fa-book"></i> Angalia Mafunzo Yote
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ExpertSection;