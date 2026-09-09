import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../shared/context/AuthContext';
import Loading from './Loading/Loading';

const ROLE_HOMES = {
  farmer: '/farmer-dashboard',
  buyer: '/buyer-dashboard',
  seller: '/seller-dashboard',
  expert: '/expert-dashboard',
  admin: '/admin-dashboard',
  support: '/admin-dashboard',
  content_moderator: '/admin-dashboard',
  finance_officer: '/admin-dashboard',
};

const ProtectedRoute = ({ roles, children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <Loading message="Inapakia..." />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (roles && roles.length > 0 && !roles.includes(user.role)) {
    return <Navigate to={ROLE_HOMES[user.role] || '/dashboard'} replace />;
  }

  return children;
};

export default ProtectedRoute;