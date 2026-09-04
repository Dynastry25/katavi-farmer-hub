import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminLayout.css';

const AdminLayout = ({
  user,
  roleLabel,
  roleIcon,
  navSections,
  headerActions,
  headerBadge,
  pageTitle,
  subtitle,
  onLogout,
  onGoWebsite,
  children
}) => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);
  const goWebsite = onGoWebsite || (() => navigate('/'));

  // Close user menu on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className={`admin-page ${sidebarOpen ? 'sidebar-open' : ''}`}>
      {/* Fixed Sidebar */}
      <aside className="admin-sidebar">
        <div className="sidebar-brand">
          <div className="brand-logo">
            <i className="fas fa-leaf"></i>
          </div>
          <span className="brand-name">Katavi E-Kilimo</span>
          <button className="sidebar-close" onClick={() => setSidebarOpen(false)}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="sidebar-profile">
          <div className="profile-avatar">
            <i className="fas fa-user"></i>
          </div>
          <div className="profile-info">
            <span className="profile-name">{user?.name}</span>
            <span className={`role-badge role-${user?.role}`}>
              <i className={roleIcon}></i> {roleLabel}
            </span>
          </div>
        </div>

        <nav className="sidebar-nav-wrap">
          {navSections.map((section, idx) => (
            <div className="sidebar-nav" key={idx}>
              {section.label && <p className="sidebar-label">{section.label}</p>}
              {section.links.map(link => (
                <button
                  key={link.id || link.label}
                  className={`sidebar-link ${link.active ? 'active' : ''}`}
                  onClick={link.onClick}
                  title={link.label}
                >
                  <i className={link.icon}></i>
                  <span className="sidebar-link-text">{link.label}</span>
                  {link.badge > 0 && <span className="sidebar-badge">{link.badge}</span>}
                </button>
              ))}
            </div>
          ))}

          <div className="sidebar-nav">
            <button className="sidebar-link website-link" onClick={goWebsite} title="Go to main website">
              <i className="fas fa-external-link-alt"></i>
              <span className="sidebar-link-text">Go to main website</span>
            </button>
          </div>
        </nav>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}></div>}

      {/* Main area */}
      <div className="admin-main">
        {/* Fixed Topbar */}
        <header className="admin-topbar">
          <div className="topbar-left">
            <button className="topbar-toggle" onClick={() => setSidebarOpen(true)}>
              <i className="fas fa-bars"></i>
            </button>
            <div className="topbar-title">
              <h1>{pageTitle || `Dashibodi ya ${roleLabel}`}</h1>
              {subtitle && <p>{subtitle}</p>}
            </div>
          </div>

          <div className="topbar-right">
            {headerActions && <div className="topbar-actions">{headerActions}</div>}

            <div className="topbar-user" ref={userMenuRef}>
              <div className="topbar-avatar" onClick={() => setUserMenuOpen(o => !o)}>
                <i className="fas fa-user"></i>
              </div>
              <div className="topbar-user-info" onClick={() => setUserMenuOpen(o => !o)}>
                <span className="topbar-user-name">{user?.name}</span>
                <span className="topbar-user-role"><i className={roleIcon}></i> {roleLabel}</span>
              </div>
              <button className="topbar-chevron" onClick={() => setUserMenuOpen(o => !o)}>
                <i className={`fas fa-chevron-${userMenuOpen ? 'up' : 'down'}`}></i>
              </button>

              {userMenuOpen && (
                <div className="user-dropdown">
                  <div className="user-dropdown-header">
                    <strong>{user?.name}</strong>
                    <span>{user?.email}</span>
                  </div>
                  <button className="dropdown-item" onClick={onLogout}>
                    <i className="fas fa-sign-out-alt"></i> Ondoka
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="admin-content">
          {headerBadge && <div className="content-welcome">{headerBadge}</div>}
          <div className="dashboard-content">{children}</div>
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
