import React from 'react';
import './Hero.css';

const Hero = ({ onAuth }) => {
  return (
    <section className="hero">
      <div className="hero-background">
        <div className="hero-overlay"></div>
      </div>
      
      <div className="hero-container">
        <div className="hero-content">
          <div className="hero-badge">
            <i className="fas fa-leaf"></i>
            Jukwaa la Kilimo cha Kisasa
          </div>
          
          <h1 className="hero-title">
            Karibu Katavi 
            <span className="hero-highlight"> Farmers Hub</span>
          </h1>
          
          <p className="hero-description">
            Jukwaa la kidijitali linalowaunganisha wakulima, wanunuzi, na wataalamu wa kilimo 
            katika Mkoa wa Katavi. Pata soko la mazao, ushauri wa kilimo, na habari za hali ya hewa.
          </p>
          
          <div className="hero-stats1">
            <div className="stat1">
              <div className="stat-number1">500+</div>
              <div className="stat-label1">Wakulima Waliosajiliwa</div>
            </div>
            <div className="stat1">
              <div className="stat-number1">1,200+</div>
              <div className="stat-label">Mazao Yanayopatikana</div>
            </div>
            <div className="stat1">
              <div className="stat-number1">50+</div>
              <div className="stat-label1">Wataalamu wa Kilimo</div>
            </div>
          </div>
          
          <div className="hero-actions">
            <button 
              className="btn btn-primary btn-lg hero-btn"
              onClick={() => onAuth('register', { role: 'farmer' })}
            >
              <i className="fas fa-tractor"></i>
              Anza Kuuza Mazao
            </button>
            
            <button 
              className="btn btn-outline btn-lg hero-btn"
              onClick={() => onAuth('register', { role: 'buyer' })}
            >
              <i className="fas fa-shopping-cart"></i>
              Nunua Mazao Bora
            </button>
          </div>
          
          <div className="hero-scroll">
            <div className="scroll-indicator">
              <i className="fas fa-chevron-down"></i>
            </div>
          </div>
        </div>
        
        <div className="hero-visual">
          <div className="floating-card card-1">
            <i className="fas fa-wheat-alt"></i>
            <span>Mazao Bora</span>
          </div>
          <div className="floating-card card-2">
            <i className="fas fa-chart-line"></i>
            <span>Bei za Soko</span>
          </div>
          <div className="floating-card card-3">
            <i className="fas fa-cloud-sun"></i>
            <span>Hali ya Hewa</span>
          </div>
          <div className="floating-card card-4">
            <i className="fas fa-graduation-cap"></i>
            <span>Ushauri</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;