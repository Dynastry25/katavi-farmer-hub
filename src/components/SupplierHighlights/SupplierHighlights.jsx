import React from 'react';
import { useNavigate } from 'react-router-dom';
import './SupplierHighlights.css';

const SupplierHighlights = () => {
  const navigate = useNavigate();

  const suppliers = [
    {
      name: 'SeedCo Tanzania',
      location: 'Mlele',
      rating: 4.8,
      description: 'Mbegu bora za kilimo zenye uhakika wa mazao',
      products: ['Mahindi DK90', 'Mpunga SARO', 'Maharage'],
      delivery: true
    },
    {
      name: 'Agro Supplies Ltd',
      location: 'Mpanda Mjini',
      rating: 4.7,
      description: 'Wauzaji wakuu wa mbolea za kisasa kwa wakulima',
      products: ['CAN', 'UREA', 'NPK'],
      delivery: true
    },
    {
      name: 'Farm Tools Tanzania',
      location: 'Nsimbo',
      rating: 4.6,
      description: 'Vifaa vyote vya kilimo kwa bei nafuu',
      products: ['Jembe', 'Panga', 'Teko'],
      delivery: true
    }
  ];

  const track = [...suppliers, ...suppliers];

  return (
    <section className="supplier-highlights">
      <div className="supplier-highlights-container">
        <div className="supplier-highlights-header">
          <span className="supplier-highlights-eyebrow">Wauzaji wa Pembejeo za Kilimo</span>
          <h2>Pata wauzaji walioidhinishwa wa mbolea, mbegu, na vifaa vya kilimo</h2>
          <p>Highlights za wauzaji bora wanaopatikana kwenye jukwaa la Katavi E-Kilimo</p>
        </div>

        <div className="supplier-marquee">
          <div className="supplier-marquee-track">
            {track.map((supplier, index) => (
              <div key={index} className="supplier-highlight-card">
                <div className="highlight-card-top">
                  <h3>{supplier.name}</h3>
                  <span className="highlight-verified"><i className="fas fa-check-circle"></i> Imethibitishwa</span>
                </div>
                <div className="highlight-card-meta">
                  <span className="highlight-location"><i className="fas fa-map-marker-alt"></i> {supplier.location}</span>
                  <span className="highlight-rating"><i className="fas fa-star"></i> {supplier.rating}</span>
                </div>
                <p className="highlight-desc">{supplier.description}</p>
                <div className="highlight-products">
                  {supplier.products.map((product, i) => (
                    <span key={i} className="highlight-product-tag">{product}</span>
                  ))}
                </div>
                {supplier.delivery && (
                  <span className="highlight-delivery"><i className="fas fa-truck"></i> Inatoa huduma ya uwasilishaji</span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="supplier-highlights-cta">
          <button className="supplier-highlights-btn" onClick={() => navigate('/suppliers')}>
            Tazama Wauzaji Wote <i className="fas fa-arrow-right"></i>
          </button>
        </div>
      </div>
    </section>
  );
};

export default SupplierHighlights;