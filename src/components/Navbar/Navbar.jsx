import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import './Navbar.css';

const Navbar = ({ currentPage, onPageChange, onAuth, user, canGoBack, onGoBack }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Navigation items organized by categories
  const navCategories = [
    {
      id: 'marketplace',
      label: 'Soko & Biashara',
      icon: 'fas fa-store',
      items: [
        { id: 'market', label: 'Soko la Mazao', icon: 'fas fa-shopping-basket', path: '/market' },
        { id: 'inputs', label: 'Pembejeo', icon: 'fas fa-tools', path: '/inputs' },
        { id: 'suppliers', label: 'Wauzaji', icon: 'fas fa-truck', path: '/suppliers' }
      ]
    },
    {
      id: 'services',
      label: 'Huduma',
      icon: 'fas fa-hand-holding-usd',
      items: [
        { id: 'loans', label: 'Mikopo', icon: 'fas fa-hand-holding-usd', path: '/loans' },
        { id: 'farmer-groups', label: 'Vikundi', icon: 'fas fa-users', path: '/farmer-groups' },
        { id: 'reports', label: 'Ripoti', icon: 'fas fa-chart-line', path: '/reports' }
      ]
    },
    {
      id: 'knowledge',
      label: 'Elimu',
      icon: 'fas fa-graduation-cap',
      items: [
        { id: 'advice', label: 'Ushauri', icon: 'fas fa-graduation-cap', path: '/advice' },
        { id: 'news', label: 'Habari', icon: 'fas fa-newspaper', path: '/news' },
        { id: 'weather', label: 'Mazingira', icon: 'fas fa-cloud-sun', path: '/weather' }
      ]
    },
    {
      id: 'about',
      label: 'Kuhusu',
      icon: 'fas fa-info-circle',
      path: '/about'
    },
    {
      id: 'contact',
      label: 'Wasiliana',
      icon: 'fas fa-phone',
      path: '/contact'
    }
  ];

  // Flattened nav items for mobile view and current page detection
  const allNavItems = navCategories.flatMap(category => 
    category.items ? category.items : [{ ...category }]
  );

  // Dashboard paths based on user role
  const dashboardPaths = {
    farmer: '/farmer-dashboard',
    buyer: '/buyer-dashboard',
    expert: '/expert-dashboard'
  };

  // Determine current page from location
  useEffect(() => {
    const path = location.pathname;
    const currentNavItem = allNavItems.find(item => item.path === path);
    if (currentNavItem && currentNavItem.id !== currentPage) {
      onPageChange(currentNavItem.id);
    }
  }, [location.pathname]);

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
      if (activeDropdown && !event.target.closest('.nav-dropdown')) {
        setActiveDropdown(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isProfileOpen, activeDropdown]);

  useEffect(() => {
    // Close mobile menu when route changes
    setIsMenuOpen(false);
    setIsProfileOpen(false);
    setActiveDropdown(null);
  }, [location.pathname]);

  const handleNavClick = (pageId) => {
    onPageChange(pageId);
    setIsMenuOpen(false);
    setIsProfileOpen(false);
    setActiveDropdown(null);
  };

  const handleAuthClick = (action) => {
    onAuth(action);
    setIsMenuOpen(false);
    setIsProfileOpen(false);
    setActiveDropdown(null);
  };

  const handleProfileToggle = () => {
    setIsProfileOpen(!isProfileOpen);
    setActiveDropdown(null);
  };

  const handleDropdownToggle = (categoryId) => {
    setActiveDropdown(activeDropdown === categoryId ? null : categoryId);
    setIsProfileOpen(false);
  };

  const handleGoBackClick = () => {
    if (onGoBack) {
      onGoBack();
    } else {
      navigate(-1);
    }
    setIsMenuOpen(false);
    setIsProfileOpen(false);
    setActiveDropdown(null);
  };

  const handleLogout = () => {
    if (window.confirm('Una uhakika unataka kutoka?')) {
      handleAuthClick('logout');
      setIsProfileOpen(false);
      setIsMenuOpen(false);
      setActiveDropdown(null);
      navigate('/');
    }
  };

  const getDashboardPath = () => {
    if (user?.role && dashboardPaths[user.role]) {
      return dashboardPaths[user.role];
    }
    return '/dashboard';
  };

  const getUserDisplayName = () => {
    if (!user) return '';
    return user.name || user.email?.split('@')[0] || 'User';
  };

  const getUserRoleDisplay = () => {
    if (!user) return '';
    
    switch (user.role) {
      case 'farmer':
        return '👨‍🌾 Mkulima';
      case 'buyer':
        return '🛒 Mnunuzi';
      case 'expert':
        return '🎓 Mtaalamu';
      default:
        return '👤 Mtumiaji';
    }
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const isCurrentPage = (item) => {
    return currentPage === item.id;
  };

  return (
    <nav className={`navigation ${isScrolled ? 'scrolled' : ''}`}>
      <div className="nav-container">
        {/* Back Button - Show when not on home page */}
        {canGoBack && currentPage !== 'home' && (
          <button 
            className="nav-back-button"
            onClick={handleGoBackClick}
            aria-label="Rudi nyuma"
          >
            <i className="fas fa-arrow-left"></i>
            <span>Rudi</span>
          </button>
        )}

        {/* Logo */}
        <Link 
          className="nav-brand" 
          to="/" 
          onClick={() => handleNavClick('home')}
          aria-label="Katavi E-Kilimo - Nyumbani"
        >
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
          {/* Home Link */}
          <Link
            className={`nav-item ${currentPage === 'home' ? 'active' : ''}`}
            to="/"
            onClick={() => handleNavClick('home')}
            aria-current={currentPage === 'home' ? 'page' : undefined}
          >
            <i className="fas fa-home"></i>
            <span>Nyumbani</span>
          </Link>

          {/* Category Links with Dropdowns */}
          {navCategories.map(category => (
            <div key={category.id} className="nav-dropdown">
              {category.items ? (
                // Dropdown category
                <div className="dropdown-container">
                  <button
                    className={`nav-item dropdown-toggle ${activeDropdown === category.id ? 'active' : ''} ${
                      category.items.some(item => isCurrentPage(item)) ? 'active-parent' : ''
                    }`}
                    onClick={() => handleDropdownToggle(category.id)}
                    aria-expanded={activeDropdown === category.id}
                  >
                    <i className={category.icon}></i>
                    <span>{category.label}</span>
                    <i className={`fas fa-chevron-down dropdown-arrow ${activeDropdown === category.id ? 'open' : ''}`}></i>
                  </button>
                  
                  {activeDropdown === category.id && (
                    <div className="dropdown-menu">
                      {category.items.map(item => (
                        <Link
                          key={item.id}
                          className={`dropdown-item ${isCurrentPage(item) ? 'active' : ''}`}
                          to={item.path}
                          onClick={() => handleNavClick(item.id)}
                          aria-current={isCurrentPage(item) ? 'page' : undefined}
                        >
                          <i className={item.icon}></i>
                          <span>{item.label}</span>
                          {isCurrentPage(item) && <i className="fas fa-check active-indicator"></i>}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                // Single link category
                <Link
                  className={`nav-item ${isCurrentPage(category) ? 'active' : ''}`}
                  to={category.path}
                  onClick={() => handleNavClick(category.id)}
                  aria-current={isCurrentPage(category) ? 'page' : undefined}
                >
                  <i className={category.icon}></i>
                  <span>{category.label}</span>
                </Link>
              )}
            </div>
          ))}
        </div>

        {/* Auth Section */}
        <div className="nav-auth">
          {user ? (
            <div className="user-menu">
              {/* Profile Picture & Dropdown */}
              <div className="user-profile">
                <div 
                  className="profile-avatar" 
                  onClick={handleProfileToggle}
                  aria-label="Fungua menyu ya profaili"
                  aria-expanded={isProfileOpen}
                >
                  {user.profilePicture ? (
                    <img 
                      src={user.profilePicture} 
                      alt={user.name} 
                      className="avatar-img" 
                    />
                  ) : (
                    <div className="avatar-placeholder">
                      {getInitials(user.name)}
                    </div>
                  )}
                  <i className={`fas fa-chevron-down profile-arrow ${isProfileOpen ? 'open' : ''}`}></i>
                </div>
                
                {/* Profile Dropdown Menu */}
                {isProfileOpen && (
                  <div className="profile-dropdown">
                    <div className="dropdown-header">
                      {user.profilePicture ? (
                        <img 
                          src={user.profilePicture} 
                          alt={user.name} 
                          className="dropdown-avatar" 
                        />
                      ) : (
                        <div className="dropdown-avatar placeholder">
                          {getInitials(user.name)}
                        </div>
                      )}
                      <div className="dropdown-user-info">
                        <div className="dropdown-name">{getUserDisplayName()}</div>
                        <div className="dropdown-role">{getUserRoleDisplay()}</div>
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
                      <span>Wasifu Wangu</span>
                    </Link>
                    
                    <Link 
                      className="dropdown-item"
                      to={getDashboardPath()}
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

                    <div className="dropdown-stats">
                      <div className="stat-item">
                        <div className="stat-value">{user.rating || '4.8'}</div>
                        <div className="stat-label">Ukadiriaji</div>
                      </div>
                      <div className="stat-item">
                        <div className="stat-value">98%</div>
                        <div className="stat-label">Majibu</div>
                      </div>
                      <div className="stat-item">
                        <div className="stat-value">
                          {user.role === 'farmer' ? (user.totalSales || '45') :
                           user.role === 'buyer' ? (user.totalOrders || '15') : 
                           (user.consultations || '47')}
                        </div>
                        <div className="stat-label">
                          {user.role === 'farmer' ? 'Mauzo' : 
                           user.role === 'buyer' ? 'Maagizo' : 'Huduma'}
                        </div>
                      </div>
                    </div>
                    
                    <div className="dropdown-divider"></div>
                    
                    <button 
                      className="dropdown-item logout"
                      onClick={handleLogout}
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
              <Link 
                className="btn btn-outline"
                to="/login"
                onClick={() => handleAuthClick('login')}
              >
                <i className="fas fa-sign-in-alt"></i> 
                <span className="btn-text">Ingia</span>
              </Link>
              <Link 
                className="btn btn-primary"
                to="/register"
                onClick={() => handleAuthClick('register')}
              >
                <i className="fas fa-user-plus"></i> 
                <span className="btn-text">Jisajili</span>
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button 
          className="mobile-toggle"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label={isMenuOpen ? 'Funga menyu' : 'Fungua menyu'}
          aria-expanded={isMenuOpen}
        >
          <i className={`fas ${isMenuOpen ? 'fa-times' : 'fa-bars'}`}></i>
        </button>
      </div>

      {/* Mobile Navigation */}
      <div className={`mobile-nav ${isMenuOpen ? 'active' : ''}`}>
        <div className="mobile-nav-content">
          {/* Mobile Header */}
          <div className="mobile-nav-header">
            <div className="mobile-logo">
              <i className="fas fa-seedling"></i>
              <span>Katavi E-Kilimo</span>
            </div>
            <button 
              className="mobile-close-btn"
              onClick={() => setIsMenuOpen(false)}
            >
              <i className="fas fa-times"></i>
            </button>
          </div>

          {/* Mobile Back Button */}
          {canGoBack && currentPage !== 'home' && (
            <button 
              className="mobile-nav-back-button"
              onClick={handleGoBackClick}
            >
              <i className="fas fa-arrow-left"></i>
              <span>Rudi Nyuma</span>
            </button>
          )}
          
          {/* Mobile Navigation Items */}
          <Link
            className={`mobile-nav-item ${currentPage === 'home' ? 'active' : ''}`}
            to="/"
            onClick={() => {
              handleNavClick('home');
              setIsMenuOpen(false);
            }}
            aria-current={currentPage === 'home' ? 'page' : undefined}
          >
            <i className="fas fa-home"></i>
            <span>Nyumbani</span>
            {currentPage === 'home' && <i className="fas fa-chevron-right active-indicator"></i>}
          </Link>

          {/* Mobile Category Sections */}
          {navCategories.map(category => (
            <div key={category.id} className="mobile-category-section">
              {category.items ? (
                <>
                  <div className="mobile-category-header">
                    <i className={category.icon}></i>
                    <span>{category.label}</span>
                  </div>
                  {category.items.map(item => (
                    <Link
                      key={item.id}
                      className={`mobile-nav-item sub-item ${isCurrentPage(item) ? 'active' : ''}`}
                      to={item.path}
                      onClick={() => {
                        handleNavClick(item.id);
                        setIsMenuOpen(false);
                      }}
                      aria-current={isCurrentPage(item) ? 'page' : undefined}
                    >
                      <i className={item.icon}></i>
                      <span>{item.label}</span>
                      {isCurrentPage(item) && <i className="fas fa-chevron-right active-indicator"></i>}
                    </Link>
                  ))}
                </>
              ) : (
                <Link
                  className={`mobile-nav-item ${isCurrentPage(category) ? 'active' : ''}`}
                  to={category.path}
                  onClick={() => {
                    handleNavClick(category.id);
                    setIsMenuOpen(false);
                  }}
                  aria-current={isCurrentPage(category) ? 'page' : undefined}
                >
                  <i className={category.icon}></i>
                  <span>{category.label}</span>
                  {isCurrentPage(category) && <i className="fas fa-chevron-right active-indicator"></i>}
                </Link>
              )}
            </div>
          ))}

          {/* Mobile Auth Section for non-logged in users */}
          {!user && (
            <div className="mobile-auth">
              <div className="mobile-auth-buttons">
                <Link 
                  className="btn btn-primary"
                  to="/login"
                  onClick={() => {
                    handleAuthClick('login');
                    setIsMenuOpen(false);
                  }}
                >
                  <i className="fas fa-sign-in-alt"></i>
                  Ingia
                </Link>
                <Link 
                  className="btn btn-outline"
                  to="/register"
                  onClick={() => {
                    handleAuthClick('register');
                    setIsMenuOpen(false);
                  }}
                >
                  <i className="fas fa-user-plus"></i>
                  Jisajili
                </Link>
              </div>
            </div>
          )}

          {/* Mobile Logout for logged in users */}
          {user && (
            <div className="mobile-logout-section">
              <button 
                className="mobile-nav-item logout"
                onClick={() => {
                  handleLogout();
                  setIsMenuOpen(false);
                }}
              >
                <i className="fas fa-sign-out-alt"></i>
                <span>Toka kwenye Akaunti</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Overlay for profile dropdown and mobile menu */}
      {(isProfileOpen || isMenuOpen || activeDropdown) && (
        <div 
          className="profile-overlay" 
          onClick={() => {
            setIsProfileOpen(false);
            setIsMenuOpen(false);
            setActiveDropdown(null);
          }}
        ></div>
      )}
    </nav>
  );
};

export default Navbar;