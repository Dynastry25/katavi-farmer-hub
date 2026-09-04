import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from './AdminLayout';
import { getRoleNavSections } from './roleNav';
import ProfilePanel from '../Profile/ProfilePanel';

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

const Profile = ({ user: propUser, onAuth }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState(propUser);

  useEffect(() => {
    let current = propUser;
    if (!current) {
      try {
        const saved = localStorage.getItem('kataviUser');
        if (saved) current = JSON.parse(saved);
      } catch (e) {}
    }
    if (!current) {
      navigate('/login');
      return;
    }
    setUser(current);
  }, [propUser]);

  const role = user?.role || 'farmer';

  const navSections = getRoleNavSections({
    role,
    navigate,
    activeTab: 'profile',
  });

  return (
    <AdminLayout
      user={user}
      roleLabel={ROLE_LABELS[role]}
      roleIcon={ROLE_ICONS[role]}
      pageTitle="Wasifu wangu"
      subtitle="Hariri na sasisha taarifa zako za akaunti"
      navSections={navSections}
      onLogout={() => onAuth('logout')}
    >
      <ProfilePanel user={user} onAuth={onAuth} />
    </AdminLayout>
  );
};

export default Profile;
