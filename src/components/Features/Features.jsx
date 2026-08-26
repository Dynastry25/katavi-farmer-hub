// Features.jsx - IMPROVED VERSION WITH MOUNTAIN BACKGROUND
import React from 'react';
import './Features.css';

const Features = ({ onPageChange }) => {
  const features = [
    {
      icon: 'fas fa-store',
      title: 'Soko la Mazao',
      description: 'Uza na nunua mazao kwa bei nzuri bila wastani. Pata soko la uhakika kwa mazao yako.',
      action: 'Angalia Soko',
      page: 'market'
    },
    {
      icon: 'fas fa-cloud-sun',
      title: 'Hali ya Hewa',
      description: 'Pata taarifa za hali ya hewa kwa kila siku na ushauri wa kilimo kulingana na hali ya anga.',
      action: 'Angalia Mazingira',
      page: 'weather'
    },
    {
      icon: 'fas fa-graduation-cap',
      title: 'Ushauri wa Kilimo',
      description: 'Pata ushauri kutoka kwa wataalamu wa kilimo. Jiunge na mafunzo na video za mbinu bora.',
      action: 'Pata Ushauri',
      page: 'advice'
    },
    {
      icon: 'fas fa-tools',
      title: 'Pembejeo Bora',
      description: 'Pata mbolea, mbegu, na vifaa vya kilimo kwa bei nafuu kutoka kwa wauzaji walioidhinishwa.',
      action: 'Tafuta Pembejeo',
      page: 'inputs'
    },
    {
      icon: 'fas fa-newspaper',
      title: 'Habari za Kilimo',
      description: 'Fuatilia habari mpya za kilimo, matangazo, na fursa za soko katika eneo lako.',
      action: 'Soma Habari',
      page: 'news'
    },
    {
      icon: 'fas fa-comments',
      title: 'Msaada wa Moja kwa Moja',
      description: 'Wasiliana na wataalamu wa kilimo kupitia ujumbe wa maandishi au simu kwa maswali yako.',
      action: 'Wasiliana Sasa',
      page: 'contact'
    }
  ];

  return (
    <section className="features">
      {/* Mountain Background */}
      <div className="features-mountain-bg">
        <svg className="mountain-separator" viewBox="0 0 1000 200" preserveAspectRatio="none">
          <path 
            className="mountain-path-1" 
            d="M1000,200 L0,200 L0,150 C150,100 300,180 450,120 C600,60 750,140 900,80 L1000,120 Z"
          />
          <path 
            className="mountain-path-2" 
            d="M1000,200 L0,200 L0,170 C100,140 250,190 400,150 C550,110 700,160 850,130 L1000,160 Z"
          />
        </svg>
      </div>
      
      <div className="container">
        <div className="features-header">
          <h2>Kwa Nini Uchague Katavi E-Kilimo?</h2>
          <p>Jukwaa letu linakupa huduma zote muhimu za kilimo katika sehemu moja ya uhakika na rahisi</p>
        </div>
        
        <div className="features-grid">
          {features.map((feature, index) => (
            <div key={index} className="feature-card">
              <div className="feature-icon">
                <i className={feature.icon}></i>
              </div>
              
              <h3 className="feature-title">{feature.title}</h3>
              
              <p className="feature-description">{feature.description}</p>
              
              <button 
                className="feature-action"
                onClick={() => onPageChange(feature.page)}
              >
                {feature.action}
                <i className="fas fa-arrow-right"></i>
              </button>
            </div>
          ))}
        </div>
        
        <div className="features-cta">
          <div className="cta-content">
            <h3>Tayari Kujiunga na Jukwaa Letu?</h3>
            <p>Jiunge na maelfu ya wakulima na wanunuzi tayari wanaofaidika na mfumo wetu</p>
            <button className="btn btn-primary btn-lg">
              Jisajili Sasa <i className="fas fa-arrow-right"></i>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Features;