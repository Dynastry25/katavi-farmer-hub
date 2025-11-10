import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './Navbar.css';

const Navbar = ({ currentPage, onPageChange, onGoBack, onAuth, user, canGoBack }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const navItems = [
    { id: 'home', label: 'Nyumbani', icon: 'fas fa-home', path: '/' },
    { id: 'news', label: 'Habari', icon: 'fas fa-newspaper', path: '/news' },
    { id: 'market', label: 'Masoko', icon: 'fas fa-store', path: '/market' },
    { id: 'inputs', label: 'Pembejeo', icon: 'fas fa-tools', path: '/inputs' },
    { id: 'advice', label: 'Ushauri', icon: 'fas fa-hand-holding-heart', path: '/advice' },
    { id: 'weather', label: 'Mazingira', icon: 'fas fa-cloud-sun', path: '/weather' },
    { id: 'about', label: 'Kuhusu', icon: 'fas fa-info-circle', path: '/about' },
    { id: 'contact', label: 'Wasiliana', icon: 'fas fa-phone', path: '/contact' }
  ];

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isProfileOpen && !event.target.closest('.user-profile')) {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isProfileOpen]);

  const handleNavClick = (pageId) => {
    onPageChange(pageId);
    setIsMenuOpen(false);
    setIsProfileOpen(false);
  };

  const handleAuthClick = (action) => {
    onAuth(action);
    setIsMenuOpen(false);
    setIsProfileOpen(false);
  };

  const handleProfileToggle = () => {
    setIsProfileOpen(!isProfileOpen);
  };

  const handleGoBackClick = () => {
    onGoBack();
    setIsMenuOpen(false);
    setIsProfileOpen(false);
  };

  return (
    <nav className={`navigation ${isScrolled ? 'scrolled' : ''}`}>
      <div className="nav-container">
        {/* Back Button - Show when not on home page */}
        {canGoBack && currentPage !== 'home' && (
          <Link 
            className="nav-back-button"
            onClick={handleGoBackClick}
            aria-label="Rudi nyuma"
            to="#"
          >
            <i className="fas fa-arrow-left"></i>
            <span>Rudi</span>
          </Link>
        )}

        {/* Logo */}
        <Link className="nav-brand" to="/" onClick={() => handleNavClick('home')}>
          <div className="logo-icon">
            <i className="fas fa-seedling"></i>
          </div>
          <div className="logo-text">
            <h1>Katavi E-Kilimo</h1>
            <span>Jukwaa la Wakulima</span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <div className="nav-menu">
          {navItems.map(item => (
            <Link
              key={item.id}
              className={`nav-item ${currentPage === item.id ? 'active' : ''}`}
              to={item.path}
              onClick={() => handleNavClick(item.id)}
            >
              <i className={item.icon}></i>
              <span>{item.label}</span>
            </Link>
          ))}
        </div>

        {/* Auth Section */}
        <div className="nav-auth">
          {user ? (
            <div className="user-menu">
              {/* Profile Picture & Dropdown */}
              <div className="user-profile">
                <div className="profile-avatar1" onClick={handleProfileToggle}>
                  {user.profilePicture ? (
                    <img src={user.profilePicture} alt={user.name} className="avatar-img" />
                  ) : (
                    <div className="avatar-placeholder">
                      <i className="fas fa-user"></i>
                    </div>
                  )}
                </div>
                
                {/* Profile Dropdown Menu */}
                {isProfileOpen && (
                  <div className="profile-dropdown">
                    <div className="dropdown-header">
                      {user.profilePicture ? (
                        <img src={user.profilePicture} alt={user.name} className="dropdown-avatar" />
                      ) : (
                        <div className="dropdown-avatar placeholder">
                          <i className="fas fa-user"></i>
                        </div>
                      )}
                      <div className="dropdown-user-info">
                        <div className="dropdown-name">{user.name}</div>
                        <div className="dropdown-role">{user.role}</div>
                        <div className="dropdown-email">{user.email || 'hakuna barua pepe'}</div>
                      </div>
                    </div>
                    
                    <div className="dropdown-divider"></div>
                    
                    <Link 
                      className="dropdown-item"
                      to="/profile"
                      onClick={() => handleNavClick('profile')}
                    >
                      <i className="fas fa-user-edit"></i>
                      <span>Wasilisha Profaili</span>
                    </Link>
                    
                    <Link 
                      className="dropdown-item"
                      to="/dashboard"
                      onClick={() => handleNavClick('dashboard')}
                    >
                      <i className="fas fa-tachometer-alt"></i>
                      <span>Dashibodi Yangu</span>
                    </Link>
                    
                    <Link 
                      className="dropdown-item"
                      to="/settings"
                      onClick={() => handleNavClick('settings')}
                    >
                      <i className="fas fa-cog"></i>
                      <span>Mipangilio</span>
                    </Link>
                    
                    <div className="dropdown-divider"></div>
                    
                    <Link 
                      className="dropdown-item logout"
                      to="#"
                      onClick={() => handleAuthClick('logout')}
                    >
                      <i className="fas fa-sign-out-alt"></i>
                      <span>Toka</span>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="auth-buttons">
              <Link 
                className="btn btn-outline"
                to="/login"
                onClick={() => handleAuthClick('login')}
              >
                <i className="fas fa-sign-in-alt"></i> Ingia
              </Link>
              <Link 
                className="btn btn-primary"
                to="/register"
                onClick={() => handleAuthClick('register')}
              >
                <i className="fas fa-user-plus"></i> Jisajili
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button 
          className="mobile-toggle"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label={isMenuOpen ? 'Funga menyu' : 'Fungua menyu'}
        >
          <i className={`fas ${isMenuOpen ? 'fa-times' : 'fa-bars'}`}></i>
        </button>
      </div>

      {/* Mobile Navigation */}
      <div className={`mobile-nav ${isMenuOpen ? 'active' : ''}`}>
        <div className="mobile-nav-content">
          {/* Mobile Back Button */}
          {canGoBack && currentPage !== 'home' && (
            <Link 
              className="mobile-nav-back-button"
              to="#"
              onClick={handleGoBackClick}
            >
              <i className="fas fa-arrow-left"></i>
              <span>Rudi Nyuma</span>
            </Link>
          )}
          
          {navItems.map(item => (
            <Link
              key={item.id}
              className={`mobile-nav-item ${currentPage === item.id ? 'active' : ''}`}
              to={item.path}
              onClick={() => handleNavClick(item.id)}
            >
              <i className={item.icon}></i>
              <span>{item.label}</span>
            </Link>
          ))}
          

        </div>
      </div>

      {/* Overlay for profile dropdown */}
      {isProfileOpen && <div className="profile-overlay"></div>}
    </nav>
  );
};

export default Navbar;