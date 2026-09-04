import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from './AdminLayout';
import { getRoleNavSections } from './roleNav';
import ProfilePanel from '../Profile/ProfilePanel';
import { useAuth } from '../../shared/context/AuthContext';

const ROLE_LABELS = {
  farmer: 'Mkulima',
  buyer: 'Mnunuzi / Muuzaji',
  expert: 'Mtaalamu / Extension',
  admin: 'Admin'
};

const ROLE_ICONS = {
  farmer: 'fas fa-tractor',
  buyer: 'fas fa-shopping-cart',
  expert: 'fas fa-graduation-cap',
  admin: 'fas fa-user-shield'
};

const Profile = () => {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  const role = user?.role || 'farmer';

  const navSections = getRoleNavSections({
    role,
    navigate,
    activeTab: 'profile',
  });

  const handleProfileAction = (action, data) => {
    if (action === 'login-success' && data) {
      updateUser(data);
    }
  };

  return (
    <AdminLayout
      user={user}
      roleLabel={ROLE_LABELS[role]}
      roleIcon={ROLE_ICONS[role]}
      pageTitle="Wasifu wangu"
      subtitle="Hariri na sasisha taarifa zako za akaunti"
      navSections={navSections}
      onLogout={logout}
    >
      <ProfilePanel user={user} onAuth={handleProfileAction} />
    </AdminLayout>
  );
};

export default Profile;
