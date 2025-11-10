import React, { useState } from 'react';
import Navigation from './Navbar/Navbar';
import Footer from './Footer/Footer';
import './Suppliers.css';

const Suppliers = ({ onPageChange, onAuth, user }) => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const categories = [
    { value: 'all', label: 'Wauzaji Wote' },
    { value: 'fertilizers', label: 'Wauzaji wa Mbolea' },
    { value: 'seeds', label: 'Wauzaji wa Mbegu' },
    { value: 'tools', label: 'Wauzaji wa Vifaa' },
    { value: 'pesticides', label: 'Wauzaji wa Dawa' },
    { value: 'irrigation', label: 'Vifaa vya Umwagiliaji' }
  ];

  const suppliers = [
    {
      id: 1,
      name: 'Agro Supplies Ltd',
      category: 'fertilizers',
      location: 'Mpanda Mjini',
      rating: 4.7,
      products: ['CAN', 'UREA', 'NPK'],
      contact: '+255 789 123 456',
      email: 'info@agrosupplies.co.tz',
      description: 'Wauzaji wakuu wa mbolea za kisasa kwa wakulima',
      delivery: true,
      verified: true
    },
    {
      id: 2,
      name: 'SeedCo Tanzania',
      category: 'seeds',
      location: 'Mlele',
      rating: 4.8,
      products: ['Mahindi DK90', 'Mpunga SARO', 'Maharage'],
      contact: '+255 789 654 321',
      email: 'sales@seedco.tz',
      description: 'Mbegu bora za kilimo zenye uhakika wa mazao',
      delivery: true,
      verified: true
    },
    {
      id: 3,
      name: 'Farm Tools Tanzania',
      category: 'tools',
      location: 'Nsimbo',
      rating: 4.6,
      products: ['Jembe', 'Panga', 'Teko'],
      contact: '+255 789 321 654',
      email: 'tools@farmtools.tz',
      description: 'Vifaa vyote vya kilimo kwa bei nafuu',
      delivery: true,
      verified: true
    }
  ];

  const filteredSuppliers = suppliers.filter(supplier => {
    const matchesSearch = supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         supplier.products.some(product => product.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || supplier.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="page suppliers-page">
      <Navigation 
        currentPage="suppliers"
        onPageChange={onPageChange}
        onAuth={onAuth}
        user={user}
      />
      
      <div className="suppliers-container">
        <div className="container">
          {/* Header */}
          <div className="suppliers-header">
            <h1>Wauzaji wa Pembejeo za Kilimo</h1>
            <p>Pata wauzaji walioidhinishwa wa mbolea, mbegu, na vifaa vyote vya kilimo</p>
          </div>

          {/* Search and Filters */}
          <div className="suppliers-filters">
            <div className="search-box">
              <i className="fas fa-search"></i>
              <input
                type="text"
                placeholder="Tafuta wauzaji au bidhaa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
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
          </div>

          {/* Suppliers Grid */}
          <div className="suppliers-grid">
            {filteredSuppliers.map(supplier => (
              <div key={supplier.id} className="supplier-card">
                <div className="supplier-header">
                  <h3>{supplier.name}</h3>
                  {supplier.verified && <span className="verified-badge">✓ Imethibitishwa</span>}
                </div>
                
                <div className="supplier-info">
                  <div className="supplier-location">
                    <i className="fas fa-map-marker-alt"></i>
                    {supplier.location}
                  </div>
                  <div className="supplier-rating">
                    ⭐ {supplier.rating}
                  </div>
                </div>

                <p className="supplier-description">{supplier.description}</p>

                <div className="supplier-products">
                  <strong>Bidhaa Zinazouzwa:</strong>
                  <div className="products-tags">
                    {supplier.products.map((product, index) => (
                      <span key={index} className="product-tag">{product}</span>
                    ))}
                  </div>
                </div>

                <div className="supplier-contact">
                  <div className="contact-item">
                    <i className="fas fa-phone"></i>
                    {supplier.contact}
                  </div>
                  <div className="contact-item">
                    <i className="fas fa-envelope"></i>
                    {supplier.email}
                  </div>
                  {supplier.delivery && (
                    <div className="contact-item">
                      <i className="fas fa-truck"></i>
                      Inatoa huduma ya uwasilishaji
                    </div>
                  )}
                </div>

                <div className="supplier-actions">
                  <button className="btn btn-primary">
                    <i className="fas fa-phone"></i> Piga Simu
                  </button>
                  <button className="btn btn-outline">
                    <i className="fas fa-envelope"></i> Tuma Ujumbe
                  </button>
                  <button className="btn btn-success">
                    <i className="fas fa-shopping-cart"></i> Agiza Sasa
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Footer onPageChange={onPageChange} />
    </div>
  );
};

export default Suppliers;