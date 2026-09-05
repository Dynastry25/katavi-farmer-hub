import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from './AdminLayout';
import { getRoleNavSections } from './roleNav';
import ProfilePanel from '../Profile/ProfilePanel';
import { useAuth } from '../../shared/context/AuthContext';
import { authAPI } from '../../api/client';

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

const STAFF_ROLES = ['admin', 'support', 'content_moderator', 'finance_officer'];

const Profile = () => {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const [isSaving2FA, setIsSaving2FA] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  const role = user?.role || 'farmer';
  const isStaff = STAFF_ROLES.includes(role);

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

  const handleToggle2FA = async () => {
    const enabling = !user?.twoFactorEnabled;
    setIsSaving2FA(true);
    try {
      const res = await authAPI.setupTwoFactor({ enabled: enabling });
      updateUser({ twoFactorEnabled: res.data.twoFactorEnabled });
      window.alert(
        res.data.twoFactorEnabled
          ? `2FA imewezeshwa.\nNamba yako ya kwanza ya 2FA: ${res.data.testCode}\nUtaihitaji kila unapoingia.`
          : '2FA imezimwa'
      );
    } catch (err) {
      window.alert(err.response?.data?.message || 'Hitilafu imetokea');
    } finally {
      setIsSaving2FA(false);
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
      {isStaff && (
        <div className="section-card" style={{ marginTop: '20px' }}>
          <h3>Usalama — Uhakiki wa Hatua Mbili (2FA)</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '12px' }}>
            {user?.twoFactorEnabled
              ? '2FA imewezeshwa. Utahitaji namba ya 2FA kila unapoingia kwenye akaunti yako.'
              : '2FA haijaweshwa. Iwezeshe ili kuimarisha usalama wa akaunti yako.'}
          </p>
          <button
            className={`btn ${user?.twoFactorEnabled ? 'btn-outline' : 'btn-primary'}`}
            onClick={handleToggle2FA}
            disabled={isSaving2FA}
          >
            <i className={`fas ${user?.twoFactorEnabled ? 'fa-shield-halved' : 'fa-shield'}`}></i>{' '}
            {user?.twoFactorEnabled ? 'Zima 2FA' : 'Wezesha 2FA'}
          </button>
        </div>
      )}
    </AdminLayout>
  );
};

export default Profile;
