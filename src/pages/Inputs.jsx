import React, { useState } from 'react';
import Navigation from '../components/Navbar/Navbar';
import Footer from '../components/Footer/Footer';
import './CSS/Inputs.css';

const Inputs = ({ onPageChange, onAuth, user }) => {
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = [
    { value: 'all', label: 'Pembejeo Zote' },
    { value: 'fertilizers', label: 'Mbolea' },
    { value: 'seeds', label: 'Mbegu' },
    { value: 'tools', label: 'Vifaa' },
    { value: 'pesticides', label: 'Dawa za Wadudu' },
    { value: 'irrigation', label: 'Vifaa vya Umwagiliaji' }
  ];

  const agriculturalInputs = [
    {
      id: 1,
      name: 'Mbolea ya CAN',
      category: 'fertilizers',
      price: 'TZS 45,000',
      unit: 'Mfuko wa 50kg',
      supplier: 'Agro Supplies Ltd',
      location: 'Mpanda',
      description: 'Mbolea bora ya nitrojeni inayofaa kwa mimea yote',
      image: '🧪',
      rating: 4.7
    },
    {
      id: 2,
      name: 'Mbegu za Mahindi DK 90',
      category: 'seeds',
      price: 'TZS 12,000',
      unit: 'Kilo 1',
      supplier: 'SeedCo Tanzania',
      location: 'Mlele',
      description: 'Mbegu bora za mahindi zenye mazao mengi na upinzani wa magonjwa',
      image: '🌽',
      rating: 4.8
    },
    {
      id: 3,
      name: 'Dawa ya Wadudu - Cypermethrin',
      category: 'pesticides',
      price: 'TZS 25,000',
      unit: 'Lita 1',
      supplier: 'CropCare Solutions',
      location: 'Nsimbo',
      description: 'Dawa bora ya kudhibiti aina mbalimbali za wadudu wa mimea',
      image: '🐛',
      rating: 4.5
    },
    {
      id: 4,
      name: 'Jembe la Kisasa',
      category: 'tools',
      price: 'TZS 15,000',
      unit: 'Kipande',
      supplier: 'Farm Tools Tanzania',
      location: 'Mpanda',
      description: 'Jembe la kisasa lenye kushikilia vizuri na kudumu muda mrefu',
      image: '🛠️',
      rating: 4.6
    },
    {
      id: 5,
      name: 'Mfumo wa Umwagiliaji wa Umande',
      category: 'irrigation',
      price: 'TZS 350,000',
      unit: 'Seti',
      supplier: 'IrriTech Systems',
      location: 'Mlele',
      description: 'Mfumo wa kisasa wa umwagiliaji unaookoa maji na kuongeza mazao',
      image: '💧',
      rating: 4.9
    },
    {
      id: 6,
      name: 'Mbolea ya Kuku',
      category: 'fertilizers',
      price: 'TZS 8,000',
      unit: 'Mfuko wa 25kg',
      supplier: 'Organic Farms Ltd',
      location: 'Nsimbo',
      description: 'Mbolea asilia ya kuku yenye virutubisho vingi vya mimea',
      image: '🐔',
      rating: 4.4
    }
  ];

  const filteredInputs = selectedCategory === 'all' 
    ? agriculturalInputs 
    : agriculturalInputs.filter(input => input.category === selectedCategory);

  return (
    <div className="page inputs-page">
      <Navigation 
        currentPage="inputs"
        onPageChange={onPageChange}
        onAuth={onAuth}
        user={user}
      />
      
      <div className="inputs-container">
        <div className="container">
          {/* Header */}
          <div className="inputs-header">
            <h1>Pembejeo za Kilimo</h1>
            <p>Pata mbolea, mbegu, na vifaa vyote vya kilimo kwa bei nafuu kutoka kwa wauzaji walioidhinishwa</p>
          </div>

          {/* Category Filter */}
          <div className="category-filters">
            {categories.map(category => (
              <button
                key={category.value}
                className={`category-btn ${selectedCategory === category.value ? 'active' : ''}`}
                onClick={() => setSelectedCategory(category.value)}
              >
                {category.label}
              </button>
            ))}
          </div>

          {/* Inputs Grid */}
          <div className="inputs-grid">
            {filteredInputs.map(input => (
              <div key={input.id} className="input-card">
                <div className="input-image">{input.image}</div>
                
                <div className="input-content">
                  <div className="input-category">{input.category}</div>
                  <h3 className="input-name">{input.name}</h3>
                  <p className="input-description">{input.description}</p>
                  
                  <div className="input-price">{input.price}</div>
                  <div className="input-unit">{input.unit}</div>
                  
                  <div className="input-supplier">
                    <i className="fas fa-store"></i>
                    {input.supplier}
                  </div>
                  
                  <div className="input-location">
                    <i className="fas fa-map-marker-alt"></i>
                    {input.location}
                  </div>

                  <div className="input-rating">
                    <div className="stars">
                      {[...Array(5)].map((_, i) => (
                        <i 
                          key={i} 
                          className={`fas fa-star ${i < Math.floor(input.rating) ? 'filled' : ''}`}
                        ></i>
                      ))}
                    </div>
                    <span className="rating-text">{input.rating}</span>
                  </div>

                  <div className="input-actions">
                    <button className="btn btn-primary">
                      <i className="fas fa-phone"></i> Wasiliana
                    </button>
                    <button className="btn btn-outline">
                      <i className="fas fa-shopping-cart"></i> Weka kwenye Ruhusa
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Suppliers Section */}
          <div className="suppliers-section">
            <h2>Wauzaji Walioidhinishwa</h2>
            <div className="suppliers-grid">
              <div className="supplier-card">
                <div className="supplier-logo">🌱</div>
                <h3>Agro Supplies Ltd</h3>
                <p>Wauzaji wakuu wa mbolea na dawa za wadudu</p>
                <div className="supplier-contact">
                  <i className="fas fa-phone"></i> +255 789 123 456
                </div>
              </div>
              
              <div className="supplier-card">
                <div className="supplier-logo">🌾</div>
                <h3>SeedCo Tanzania</h3>
                <p>Mbegu bora za kilimo za aina mbalimbali</p>
                <div className="supplier-contact">
                  <i className="fas fa-phone"></i> +255 789 654 321
                </div>
              </div>
              
              <div className="supplier-card">
                <div className="supplier-logo">🚜</div>
                <h3>Farm Tools Tanzania</h3>
                <p>Vifaa vyote vya kilimo kwa bei nafuu</p>
                <div className="supplier-contact">
                  <i className="fas fa-phone"></i> +255 789 321 654
                </div>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div className="inputs-cta">
            <div className="cta-content">
              <h3>Unauza Pembejeo za Kilimo?</h3>
              <p>Jiunge na jukwaa letu na ufikishwe na wakulima wengi zaidi</p>
              <button className="btn btn-primary btn-lg">
                <i className="fas fa-user-plus"></i> Jiunge kama Msaidizaji
              </button>
            </div>
          </div>
        </div>
      </div>

      <Footer onPageChange={onPageChange} />
    </div>
  );
};

export default Inputs;