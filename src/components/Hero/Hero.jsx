import React, { useState, useEffect } from 'react';
import mashamba from '../assets/mashamba.jpg';
import mashamba2 from '../assets/mashamba2.jpg';
import cropsMarketplace from '../assets/crops-marketplace.jpg';
import './Hero.css';

const SLIDES = [
  { image: mashamba, alt: 'Shamba la Katavi' },
  { image: mashamba2, alt: 'Wakulima wa Katavi' },
  { image: cropsMarketplace, alt: 'Soko la Mazao' },
];

const SLIDE_INTERVAL = 5000;

const Hero = ({ onAuth }) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
    }, SLIDE_INTERVAL);
    return () => clearInterval(timer);
  }, []);

  const goToSlide = (index) => {
    setCurrentSlide(index);
  };

  return (
    <section className="hero">
      {/* Background Slideshow */}
      <div className="hero-slideshow">
        {SLIDES.map((slide, index) => (
          <div
            key={index}
            className={`hero-slide ${index === currentSlide ? 'active' : ''}`}
            style={{ backgroundImage: `url(${slide.image})` }}
            role="img"
            aria-label={slide.alt}
          ></div>
        ))}
        <div className="hero-overlay"></div>
        <div className="hero-gradient"></div>
      </div>

      {/* Content */}
      <div className="hero-content">
        <div className="hero-badge">
          <span className="badge-dot"></span>
          Jukwaa la Kilimo cha Kisasa
        </div>

        <h1 className="hero-title">
          Kuunganisha Wakulima
          <span className="hero-highlight"> wa Katavi</span>
          <span className="hero-sub-title"> kwenye Soko Moja</span>
        </h1>

        <p className="hero-description">
          Jukwaa la kidijitali linalowaunganisha wakulima, wanunuzi, na wataalamu wa kilimo
          katika Mkoa wa Katavi. Pata soko la mazao, ushauri wa kilimo, na habari za hali ya hewa.
        </p>

        <div className="hero-actions">
          <button
            className="hero-btn hero-btn-primary"
            onClick={() => onAuth('register', { role: 'farmer' })}
          >
            <i className="fas fa-tractor"></i>
            Anza Kuuza Mazao
          </button>
          <button
            className="hero-btn hero-btn-secondary"
            onClick={() => onAuth('register', { role: 'buyer' })}
          >
            <i className="fas fa-shopping-cart"></i>
            Nunua Mazao Bora
          </button>
        </div>

        {/* Stats */}
        <div className="hero-stats">
          <div className="hero-stat">
            <div className="stat-number">500+</div>
            <div className="stat-label">Wakulima</div>
          </div>
          <div className="hero-stat-divider"></div>
          <div className="hero-stat">
            <div className="stat-number">1,200+</div>
            <div className="stat-label">Mazao</div>
          </div>
          <div className="hero-stat-divider"></div>
          <div className="hero-stat">
            <div className="stat-number">50+</div>
            <div className="stat-label">Wataalamu</div>
          </div>
        </div>
      </div>

      {/* Slide Controls */}
      <div className="hero-slide-controls">
        {SLIDES.map((_, index) => (
          <button
            key={index}
            className={`slide-dot ${index === currentSlide ? 'active' : ''}`}
            onClick={() => goToSlide(index)}
            aria-label={`Slide ${index + 1}`}
          ></button>
        ))}
      </div>

      {/* Scroll indicator */}
      <div className="hero-scroll">
        <div className="scroll-indicator">
          <i className="fas fa-chevron-down"></i>
        </div>
      </div>
    </section>
  );
};

export default Hero;
