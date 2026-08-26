import React from 'react';
import Navigation from '../components/Navbar/Navbar';
import Footer from '../components/Footer/Footer';
import './CSS/About.css';

const About = ({ onPageChange, onAuth, user }) => {
  const teamMembers = [
    {
      id: 1,
      name: 'Dk. Anna Mrosso',
      role: 'Mkurugenzi wa Kilimo',
      experience: 'Miaka 15',
      image: '👩‍🌾',
      description: 'Mtaalamu wa kilimo cha kisasa na mbinu endelevu'
    },
    {
      id: 2,
      name: 'Bw. Juma Hassan',
      role: 'Meneja wa Masoko',
      experience: 'Miaka 12',
      image: '👨‍💼',
      description: 'Mtaalamu wa soko la mazao na uhusiano na wakulima'
    },
    {
      id: 3,
      name: 'Bi. Sarah William',
      role: 'Mtaalamu wa Teknolojia',
      experience: 'Miaka 8',
      image: '👩‍💻',
      description: 'Mtaalamu wa mifumo ya kidijitali na utoaji huduma'
    },
    {
      id: 4,
      name: 'Dk. Robert Kipanga',
      role: 'Mtaalamu wa Afya ya Mimea',
      experience: 'Miaka 18',
      image: '👨‍🔬',
      description: 'Daktari wa mimea na mtaalamu wa magonjwa ya mazao'
    }
  ];

  const milestones = [
    {
      year: '2020',
      title: 'Kuanzishwa kwa Mradi',
      description: 'Iliundwa kwa kushirikiana na wakulima 50 wa kwanza'
    },
    {
      year: '2021',
      title: 'Kupanuka kwa Huduma',
      description: 'Kuanzishwa kwa mfumo wa SMS na ushirikiano na serikali ya mkoa'
    },
    {
      year: '2022',
      title: 'Kufikia Wakulima 1,000',
      description: 'Mfumo ulifanikiwa kuwahudumia wakulima zaidi ya 1,000'
    },
    {
      year: '2023',
      title: 'Teknolojia ya Kisasa',
      description: 'Kuanzishwa kwa programu ya simu na mfumo wa malipo'
    }
  ];

  const partners = [
    { name: 'Wizara ya Kilimo Tanzania', logo: '🏛️' },
    { name: 'Taifa MIS', logo: '🌍' },
    { name: 'Kilimo Kwanza', logo: '🚜' },
    { name: 'Serikali ya Mkoa wa Katavi', logo: '⭐' },
    { name: 'Vodacom Tanzania', logo: '📱' },
    { name: 'CRDB Bank', logo: '🏦' }
  ];

  return (
    <div className="page about-page">
      <Navigation 
        currentPage="about"
        onPageChange={onPageChange}
        onAuth={onAuth}
        user={user}
      />
      
      <div className="about-container">
        <div className="container">
          {/* Hero Section */}
          <div className="about-hero">
            <div className="hero-content">
              <h1>Kuhusu Katavi E-Kilimo</h1>
              <p className="hero-subtitle">
                Jukwaa la kidijitali linalolenga kuleta mageuzi katika sekta ya kilimo 
                katika Mkoa wa Katavi kupitia teknolojia
              </p>
              <div className="hero-stats">
                <div className="stat">
                  <div className="stat-number">2,500+</div>
                  <div className="stat-label">Wakulima</div>
                </div>
                <div className="stat">
                  <div className="stat-number">15,000+</div>
                  <div className="stat-label">Mazao Kila Mwezi</div>
                </div>
                <div className="stat">
                  <div className="stat-number">50+</div>
                  <div className="stat-label">Wataalamu</div>
                </div>
                <div className="stat">
                  <div className="stat-number">95%</div>
                  <div className="stat-label">Wateja Walioridhika</div>
                </div>
              </div>
            </div>
            <div className="hero-visual">
              <div className="visual-icon">🌱</div>
            </div>
          </div>

          {/* Mission & Vision */}
          <div className="mission-vision">
            <div className="mission-card">
              <div className="card-icon">🎯</div>
              <h3>Lengo Letu</h3>
              <p>
                Kuwaunganisha wakulima, wanunuzi, na wataalamu wa kilimo katika jukwaa moja 
                la kidijitali ili kuboresha uzalishaji, upatikanaji wa soko, na mapato ya wakulima.
              </p>
            </div>
            <div className="vision-card">
              <div className="card-icon">🔭</div>
              <h3>Ndoto Yetu</h3>
              <p>
                Kuwa jukwaa kuu la kidijitali la kilimo nchini Tanzania, likiwasaidia wakulima 
                kufikia soko la kimataifa na kuongeza tija kwa kutumia teknolojia ya kisasa.
              </p>
            </div>
          </div>

          {/* Our Story */}
          <div className="story-section">
            <h2>Historia Yetu</h2>
            <div className="story-content">
              <div className="story-text">
                <p>
                  Katavi E-Kilimo ilianzishwa mwaka 2020 kwa lengo la kutatua chango la upatikanaji 
                  wa soko la mazao kwa wakulima wa Mkoa wa Katavi. Wakulima walikuwa wakipata shida 
                  kufikia wanunuzi na kupata bei nzuri kwa mazao yao.
                </p>
                <p>
                  Leo, tumekuwa jukwaa la kidijitali linalowasaidia wakulima zaidi ya 2,500 
                  kufikia soko, kupata ushauri wa kilimo, na kuongeza mapato yao. Tumekua kutoka 
                  kwa mradi mdogo hadi kuwa mfumo mkuu wa kilimo wa kidijitali katika mkoa.
                </p>
              </div>
              <div className="story-image">
                <div className="story-visual">📈</div>
              </div>
            </div>
          </div>

          {/* Team Section */}
          <div className="team-section">
            <h2>Timu Yetu</h2>
            <p className="section-subtitle">
              Watendaji na wataalamu wanaofanya kazi kwa bidii ili kuhakikisha wakulima wanaupata 
              ufanisi wa juu zaidi kutoka kwa mfumo wetu
            </p>
            <div className="team-grid">
              {teamMembers.map(member => (
                <div key={member.id} className="team-card">
                  <div className="member-image">{member.image}</div>
                  <div className="member-info">
                    <h3 className="member-name">{member.name}</h3>
                    <p className="member-role">{member.role}</p>
                    <div className="member-experience">
                      <i className="fas fa-clock"></i> Uzoefu: {member.experience}
                    </div>
                    <p className="member-description">{member.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Milestones */}
          <div className="milestones-section">
            <h2>Hatua Muhimu</h2>
            <div className="timeline">
              {milestones.map((milestone, index) => (
                <div key={index} className="timeline-item">
                  <div className="timeline-year">{milestone.year}</div>
                  <div className="timeline-content">
                    <h3>{milestone.title}</h3>
                    <p>{milestone.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Partners */}
          <div className="partners-section">
            <h2>Washirika Wetu</h2>
            <p className="section-subtitle">
              Tunashirikiana na mashirika mbalimbali ili kutoa huduma bora kwa wakulima
            </p>
            <div className="partners-grid">
              {partners.map((partner, index) => (
                <div key={index} className="partner-card">
                  <div className="partner-logo">{partner.logo}</div>
                  <div className="partner-name">{partner.name}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Values */}
          <div className="values-section">
            <h2>Thamani Zetu</h2>
            <div className="values-grid">
              <div className="value-card">
                <div className="value-icon">🤝</div>
                <h3>Uwazi</h3>
                <p>Tunafanya kazi kwa uwazi na kuwaaminisha wakulima na wanunuzi wetu</p>
              </div>
              <div className="value-card">
                <div className="value-icon">💡</div>
                <h3>Ubunifu</h3>
                <p>Tunatumia teknolojia ya kisasa kuboresha kilimo na kuleta mageuzi</p>
              </div>
              <div className="value-card">
                <div className="value-icon">🌍</div>
                <h3>Ushirikiano</h3>
                <p>Tunaamini kwa kushirikiana tunaweza kufanikiwa zaidi na kwa pamoja</p>
              </div>
              <div className="value-card">
                <div className="value-icon">📈</div>
                <h3>Maendeleo Endelevu</h3>
                <p>Tunajenga mfumo unaodumu na kuwasaidia vizazi vya wakulima vijavyo</p>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div className="about-cta">
            <div className="cta-content">
              <h3>Jiunge na Mwendo wa Mageuzi ya Kilimo</h3>
              <p>Kama wewe ni mkulima, mnunuzi, au mtaalamu wa kilimo, kuna nafasi yako katika jukwaa letu</p>
              <div className="cta-actions">
                <button className="btn btn-primary btn-lg">
                  Jiunge Sasa <i className="fas fa-arrow-right"></i>
                </button>
                <button className="btn btn-outline btn-lg">
                  Wasiliana Nasi <i className="fas fa-phone"></i>
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

export default About;