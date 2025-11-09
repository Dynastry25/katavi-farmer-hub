import React, { useState, useEffect } from 'react';
import './Navbar.css';

const Navbar = ({ currentPage, onPageChange, onAuth, user }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const navItems = [
    { id: 'home', label: 'Nyumbani', icon: 'fas fa-home' },
    { id: 'news', label: 'Habari', icon: 'fas fa-newspaper' },
    { id: 'market', label: 'Masoko', icon: 'fas fa-store' },
    { id: 'inputs', label: 'Pembejeo', icon: 'fas fa-tools' },
    { id: 'advice', label: 'Ushauri', icon: 'fas fa-hand-holding-heart' },
    { id: 'weather', label: 'Mazingira', icon: 'fas fa-cloud-sun' },
    { id: 'about', label: 'Kuhusu', icon: 'fas fa-info-circle' },
    { id: 'contact', label: 'Wasiliana', icon: 'fas fa-phone' }
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

  return (
    <nav className={`navigation ${isScrolled ? 'scrolled' : ''}`}>
      <div className="nav-container">
        {/* Logo */}
        <div className="nav-brand" onClick={() => handleNavClick('home')}>
          <div className="logo-icon">
            <i className="fas fa-seedling"></i>
          </div>
          <div className="logo-text">
            <h1>Katavi E-Kilimo</h1>
            <span>Jukwaa la Wakulima</span>
          </div>
        </div>

        {/* Desktop Navigation */}
        <div className="nav-menu">
          {navItems.map(item => (
            <button
              key={item.id}
              className={`nav-item ${currentPage === item.id ? 'active' : ''}`}
              onClick={() => handleNavClick(item.id)}
            >
              <i className={item.icon}></i>
              <span>{item.label}</span>
            </button>
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
                    
                    <button 
                      className="dropdown-item"
                      onClick={() => handleNavClick('profile')}
                    >
                      <i className="fas fa-user-edit"></i>
                      <span>Wasilisha Profaili</span>
                    </button>
                    
                    <button 
                      className="dropdown-item"
                      onClick={() => handleNavClick('dashboard')}
                    >
                      <i className="fas fa-tachometer-alt"></i>
                      <span>Dashibodi Yangu</span>
                    </button>
                    
                    <button 
                      className="dropdown-item"
                      onClick={() => handleNavClick('settings')}
                    >
                      <i className="fas fa-cog"></i>
                      <span>Mipangilio</span>
                    </button>
                    
                    <div className="dropdown-divider"></div>
                    
                    <button 
                      className="dropdown-item logout"
                      onClick={() => handleAuthClick('logout')}
                    >
                      <i className="fas fa-sign-out-alt"></i>
                      <span>Toka</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="auth-buttons">
              <button 
                className="btn btn-outline"
                onClick={() => handleAuthClick('login')}
              >
                <i className="fas fa-sign-in-alt"></i> Ingia
              </button>
              <button 
                className="btn btn-primary"
                onClick={() => handleAuthClick('register')}
              >
                <i className="fas fa-user-plus"></i> Jisajili
              </button>
            </div>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button 
          className="mobile-toggle"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          <i className={`fas ${isMenuOpen ? 'fa-times' : 'fa-bars'}`}></i>
        </button>
      </div>

      {/* Mobile Navigation */}
      <div className={`mobile-nav ${isMenuOpen ? 'active' : ''}`}>
        <div className="mobile-nav-content">
          {navItems.map(item => (
            <button
              key={item.id}
              className={`mobile-nav-item ${currentPage === item.id ? 'active' : ''}`}
              onClick={() => handleNavClick(item.id)}
            >
              <i className={item.icon}></i>
              <span>{item.label}</span>
            </button>
          ))}
          
          {/* Mobile Auth Section */}
          <div className="mobile-auth">
            {user ? (
              <>
                <div className="mobile-user-info">
                  {user.profilePicture ? (
                    <img src={user.profilePicture} alt={user.name} className="mobile-avatar" />
                  ) : (
                    <div className="mobile-avatar placeholder">
                      <i className="fas fa-user"></i>
                    </div>
                  )}
                  <div>
                    <div className="user-name">{user.name}</div>
                    <div className="user-role">{user.role}</div>
                    <div className="user-email">{user.email || 'hakuna barua pepe'}</div>
                  </div>
                </div>
                <button 
                  className="btn btn-outline btn-sm"
                  onClick={() => handleNavClick('profile')}
                >
                  <i className="fas fa-user-edit"></i> Wasilisha Profaili
                </button>
                <button 
                  className="btn btn-outline btn-sm"
                  onClick={() => handleNavClick('dashboard')}
                >
                  <i className="fas fa-tachometer-alt"></i> Dashibodi
                </button>
                <button 
                  className="btn btn-outline btn-sm"
                  onClick={() => handleNavClick('settings')}
                >
                  <i className="fas fa-cog"></i> Mipangilio
                </button>
                <button 
                  className="btn btn-outline btn-sm logout"
                  onClick={() => handleAuthClick('logout')}
                >
                  <i className="fas fa-sign-out-alt"></i> Toka
                </button>
              </>
            ) : (
              <>
                <button 
                  className="btn btn-outline btn-sm"
                  onClick={() => handleAuthClick('login')}
                >
                  <i className="fas fa-sign-in-alt"></i> Ingia
                </button>
                <button 
                  className="btn btn-primary btn-sm"
                  onClick={() => handleAuthClick('register')}
                >
                  <i className="fas fa-user-plus"></i> Jisajili
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Overlay for profile dropdown */}
      {isProfileOpen && <div className="profile-overlay"></div>}
    </nav>
  );
};

export default Navbar;