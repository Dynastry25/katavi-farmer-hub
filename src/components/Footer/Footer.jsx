import React from 'react';
import './Footer.css';

const Footer = ({ onPageChange }) => {
  const currentYear = new Date().getFullYear();

  const quickLinks = [
    { label: 'Nyumbani', page: 'home' },
    { label: 'Habari za Kilimo', page: 'news' },
    { label: 'Masoko ya Mazao', page: 'market' },
    { label: 'Pembejeo za Kilimo', page: 'inputs' },
    { label: 'Ushauri wa Kilimo', page: 'advice' },
    { label: 'Hali ya Hewa', page: 'weather' }
  ];

  const services = [
    { label: 'Soko la Mazao', description: 'Uza na nunua mazao' },
    { label: 'Ushauri wa Kilimo', description: 'Pata msaada wa wataalamu' },
    { label: 'Taarifa za Hali ya Hewa', description: 'Fuata utabiri wa hali ya hewa' },
    { label: 'Mafunzo ya Kilimo', description: 'Jifunze mbinu bora za kilimo' },
    { label: 'Pembejeo Bora', description: 'Pata mbolea na mbegu bora' }
  ];

  const contactInfo = [
    { icon: 'fas fa-phone', text: '+255 123 456 789' },
    { icon: 'fas fa-envelope', text: 'info@ekilimokatavi.go.tz' },
    { icon: 'fas fa-map-marker-alt', text: 'S.L.P 1234, Mpanda, Katavi' },
    { icon: 'fas fa-clock', text: 'Jumatatu - Ijumaa: 08:00 - 17:00' }
  ];

  const partners = [
    'Wizara ya Kilimo Tanzania',
    'Taifa MIS',
    'Kilimo Kwanza',
    'Serikali ya Mkoa wa Katavi',
    'Vodacom Tanzania',
    'CRDB Bank'
  ];

  return (
    <footer className="footer">
      <div className="container">
        {/* Main Footer Content */}
        <div className="footer-content">
          {/* Brand Section */}
          <div className="footer-section brand-section">
            <div className="footer-brand">
              <div className="footer-logo">
                <i className="fas fa-seedling"></i>
              </div>
              <div className="brand-text">
                <h3>Katavi E-Kilimo</h3>
                <p>
                  Jukwaa la kidijitali linalowaunganisha wakulima, wanunuzi, 
                  na wataalamu wa kilimo katika Mkoa wa Katavi, Tanzania.
                </p>
              </div>
            </div>
            
            <div className="social-links">
              <a href="#" className="social-link" aria-label="Facebook">
                <i className="fab fa-facebook-f"></i>
              </a>
              <a href="#" className="social-link" aria-label="Twitter">
                <i className="fab fa-twitter"></i>
              </a>
              <a href="#" className="social-link" aria-label="Instagram">
                <i className="fab fa-instagram"></i>
              </a>
              <a href="#" className="social-link" aria-label="WhatsApp">
                <i className="fab fa-whatsapp"></i>
              </a>
              <a href="#" className="social-link" aria-label="YouTube">
                <i className="fab fa-youtube"></i>
              </a>
            </div>

            <div className="newsletter">
              <h4>Jiandikishe kwa Habari</h4>
              <div className="newsletter-form">
                <input 
                  type="email" 
                  placeholder="Barua pepe yako"
                  className="newsletter-input"
                />
                <button className="btn btn-primary btn-sm">
                  <i className="fas fa-paper-plane"></i>
                </button>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="footer-section">
            <h4>Viungo Muhimu</h4>
            <ul className="footer-links">
              {quickLinks.map((link, index) => (
                <li key={index}>
                  <button 
                    onClick={() => onPageChange(link.page)}
                    className="footer-link"
                  >
                    <i className="fas fa-chevron-right"></i>
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div className="footer-section">
            <h4>Huduma Zetu</h4>
            <ul className="services-list">
              {services.map((service, index) => (
                <li key={index} className="service-item">
                  <div className="service-icon">
                    <i className="fas fa-check"></i>
                  </div>
                  <div className="service-info">
                    <span className="service-name">{service.label}</span>
                    <span className="service-desc">{service.description}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div className="footer-section">
            <h4>Wasiliana Nasi</h4>
            <ul className="contact-list">
              {contactInfo.map((contact, index) => (
                <li key={index} className="contact-item">
                  <i className={contact.icon}></i>
                  <span>{contact.text}</span>
                </li>
              ))}
            </ul>

            {/* Download App */}
            <div className="app-download">
              <h5>Pakua Programu Yetu</h5>
              <div className="download-buttons">
                <button className="download-btn">
                  <i className="fab fa-google-play"></i>
                  <div>
                    <span>Pakua kwenye</span>
                    <strong>Google Play</strong>
                  </div>
                </button>
                <button className="download-btn">
                  <i className="fab fa-apple"></i>
                  <div>
                    <span>Pakua kwenye</span>
                    <strong>App Store</strong>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Partners Section */}
        <div className="partners-section">
          <h5>Washirika Wetu</h5>
          <div className="partners-grid">
            {partners.map((partner, index) => (
              <div key={index} className="partner-item">
                {partner}
              </div>
            ))}
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="footer-bottom">
          <div className="footer-bottom-content">
            <div className="copyright">
              <p>&copy; {currentYear} Katavi Farmers Hub (E-Kilimo). Haki zote zimehifadhiwa.</p>
            </div>
            
            <div className="footer-bottom-links">
              <button className="footer-bottom-link" onClick={() => onPageChange('about')}>
                Sera ya Faragha
              </button>
              <button className="footer-bottom-link" onClick={() => onPageChange('about')}>
                Masharti ya Matumizi
              </button>
              <button className="footer-bottom-link" onClick={() => onPageChange('contact')}>
                Wasiliana Nasi
              </button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;