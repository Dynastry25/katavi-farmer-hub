import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import './Navbar.css';

const Navbar = ({ currentPage, onPageChange, onAuth, user, canGoBack, onGoBack }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [localUser, setLocalUser] = useState(user);
  const location = useLocation();
  const navigate = useNavigate();
  const searchRef = useRef(null);
  const profileRef = useRef(null);

  useEffect(() => { setLocalUser(user); }, [user]);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setIsMobileOpen(false);
    setIsProfileOpen(false);
    setIsSearchOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (isProfileOpen && profileRef.current && !profileRef.current.contains(e.target)) {
        setIsProfileOpen(false);
      }
      if (isSearchOpen && searchRef.current && !searchRef.current.contains(e.target)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [isProfileOpen, isSearchOpen]);

  const navLinks = [
    { id: 'home', label: 'Nyumbani', icon: 'fas fa-home', path: '/' },
    { id: 'market', label: 'Soko', icon: 'fas fa-store', path: '/market' },
    { id: 'advice', label: 'Ushauri', icon: 'fas fa-book-open', path: '/advice' },
    { id: 'news', label: 'Habari', icon: 'fas fa-newspaper', path: '/news' },
    { id: 'loans', label: 'Mikopo', icon: 'fas fa-coins', path: '/loans' },
    { id: 'contact', label: 'Wasiliana', icon: 'fas fa-envelope', path: '/contact' },
  ];

  const dashboardPaths = { farmer: '/farmer-dashboard', buyer: '/buyer-dashboard', expert: '/expert-dashboard' };

  const isLoggedIn = !!localUser;
  const getInitials = (name) => name ? name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : 'U';
  const getDashboardPath = () => localUser?.role && dashboardPaths[localUser.role] ? dashboardPaths[localUser.role] : '/dashboard';

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/market?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
      setIsSearchOpen(false);
    }
  };

  const performLogout = () => {
    if (onAuth) onAuth('logout');
    setLocalUser(null);
    setIsProfileOpen(false);
    navigate('/', { replace: true });
    localStorage.removeItem('kataviToken');
    localStorage.removeItem('kataviUser');
  };

  const isActive = (id) => currentPage === id || location.pathname === navLinks.find(l => l.id === id)?.path;

  return (
    <nav className={`navbar ${isScrolled ? 'scrolled' : ''}`}>
      <div className="navbar-inner">
        {/* Logo */}
        <Link className="navbar-brand" to="/" onClick={() => onPageChange('home')}>
          <div className="brand-icon">
            <i className="fas fa-seedling"></i>
          </div>
          <div className="brand-text">
            <span className="brand-name">Katavi E-Kilimo</span>
            <span className="brand-tagline">Jukwaa la Wakulima</span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <div className="navbar-links">
          {navLinks.map(link => (
            <Link
              key={link.id}
              className={`nav-link ${isActive(link.id) ? 'active' : ''}`}
              to={link.path}
              onClick={() => onPageChange(link.id)}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Right Section */}
        <div className="navbar-actions">
          {/* Search */}
          <div className="search-wrapper" ref={searchRef}>
            <button
              className="icon-btn search-toggle"
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              aria-label="Tafuta"
            >
              <i className="fas fa-search"></i>
            </button>
            {isSearchOpen && (
              <form className="search-dropdown" onSubmit={handleSearch}>
                <i className="fas fa-search search-icon"></i>
                <input
                  type="text"
                  className="search-input"
                  placeholder="Tafuta mazao, wauzaji, ushauri..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />
                <button type="submit" className="search-submit">
                  <i className="fas fa-arrow-right"></i>
                </button>
              </form>
            )}
          </div>

          {/* Auth */}
          {isLoggedIn ? (
            <div className="profile-wrapper" ref={profileRef}>
              <button
                className="profile-trigger"
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                aria-label="Profaili"
              >
                {localUser.profilePicture ? (
                  <img src={localUser.profilePicture} alt={localUser.name} className="profile-img" />
                ) : (
                  <div className="profile-initials">{getInitials(localUser.name)}</div>
                )}
              </button>

              {isProfileOpen && (
                <div className="profile-menu">
                  <div className="profile-menu-header">
                    <div className="profile-menu-avatar">
                      {localUser.profilePicture ? (
                        <img src={localUser.profilePicture} alt={localUser.name} />
                      ) : (
                        <span>{getInitials(localUser.name)}</span>
                      )}
                    </div>
                    <div className="profile-menu-info">
                      <div className="profile-menu-name">{localUser.name || 'Mtumiaji'}</div>
                      <div className="profile-menu-email">{localUser.email}</div>
                    </div>
                  </div>
                  <div className="profile-menu-divider"></div>
                  <Link className="profile-menu-item" to={getDashboardPath()} onClick={() => setIsProfileOpen(false)}>
                    <i className="fas fa-th-large"></i>
                    <span>Dashibodi</span>
                  </Link>
                  <Link className="profile-menu-item" to="/profile" onClick={() => setIsProfileOpen(false)}>
                    <i className="fas fa-user"></i>
                    <span>Wasifu</span>
                  </Link>
                  <Link className="profile-menu-item" to="/settings" onClick={() => setIsProfileOpen(false)}>
                    <i className="fas fa-cog"></i>
                    <span>Mipangilio</span>
                  </Link>
                  <div className="profile-menu-divider"></div>
                  <button className="profile-menu-item logout" onClick={performLogout}>
                    <i className="fas fa-sign-out-alt"></i>
                    <span>Toka</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="auth-buttons">
              <Link className="btn-ghost" to="/login" onClick={() => onAuth('login')}>Ingia</Link>
              <Link className="btn-filled" to="/register" onClick={() => onAuth('register')}>Jisajili</Link>
            </div>
          )}

          {/* Mobile Toggle */}
          <button
            className={`hamburger ${isMobileOpen ? 'open' : ''}`}
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            aria-label={isMobileOpen ? 'Funga' : 'Fungua'}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <div className={`mobile-menu ${isMobileOpen ? 'open' : ''}`}>
        <div className="mobile-menu-inner">
          {/* Mobile Search */}
          <form className="mobile-search" onSubmit={handleSearch}>
            <i className="fas fa-search"></i>
            <input
              type="text"
              placeholder="Tafuta mazao, wauzaji..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </form>

          {/* Mobile Nav Links */}
          <div className="mobile-nav-links">
            {navLinks.map(link => (
              <Link
                key={link.id}
                className={`mobile-link ${isActive(link.id) ? 'active' : ''}`}
                to={link.path}
                onClick={() => { onPageChange(link.id); setIsMobileOpen(false); }}
              >
                <i className={link.icon}></i>
                <span>{link.label}</span>
                <i className="fas fa-chevron-right mobile-link-arrow"></i>
              </Link>
            ))}
          </div>

          {/* Mobile Extra Links */}
          <div className="mobile-extra-links">
            <Link className="mobile-link" to="/suppliers" onClick={() => setIsMobileOpen(false)}>
              <i className="fas fa-truck"></i>
              <span>Wauzaji</span>
              <i className="fas fa-chevron-right mobile-link-arrow"></i>
            </Link>
            <Link className="mobile-link" to="/farmer-groups" onClick={() => setIsMobileOpen(false)}>
              <i className="fas fa-users"></i>
              <span>Vikundi</span>
              <i className="fas fa-chevron-right mobile-link-arrow"></i>
            </Link>
            <Link className="mobile-link" to="/weather" onClick={() => setIsMobileOpen(false)}>
              <i className="fas fa-cloud-sun"></i>
              <span>Hali ya Hewa</span>
              <i className="fas fa-chevron-right mobile-link-arrow"></i>
            </Link>
          </div>

          {/* Mobile Auth */}
          {!isLoggedIn ? (
            <div className="mobile-auth">
              <Link className="btn-filled full-width" to="/login" onClick={() => { onAuth('login'); setIsMobileOpen(false); }}>
                <i className="fas fa-sign-in-alt"></i> Ingia
              </Link>
              <Link className="btn-ghost full-width" to="/register" onClick={() => { onAuth('register'); setIsMobileOpen(false); }}>
                <i className="fas fa-user-plus"></i> Jisajili
              </Link>
            </div>
          ) : (
            <div className="mobile-auth">
              <button className="btn-ghost full-width logout-btn" onClick={() => { performLogout(); setIsMobileOpen(false); }}>
                <i className="fas fa-sign-out-alt"></i> Toka
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Overlay */}
      {(isMobileOpen || isProfileOpen || isSearchOpen) && (
        <div
          className="navbar-overlay"
          onClick={() => { setIsMobileOpen(false); setIsProfileOpen(false); setIsSearchOpen(false); }}
        ></div>
      )}
    </nav>
  );
};

export default Navbar;
