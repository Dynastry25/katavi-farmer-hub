import React, { useEffect, useState } from 'react';
import { authAPI } from '../../api/client';
import './ProfilePanel.css';

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

const ProfilePanel = ({ user, onAuth }) => {
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const role = user?.role || 'farmer';

  useEffect(() => {
    let current = user;
    if (!current) {
      try {
        const saved = localStorage.getItem('kataviUser');
        if (saved) current = JSON.parse(saved);
      } catch (e) {}
    }
    setForm({
      name: current?.name || '',
      phone: current?.phone || '',
      location: current?.location || '',
      district: current?.district || '',
      ward: current?.ward || '',
      village: current?.village || '',
      farmSize: current?.farmSize || '',
      farmLocation: current?.farmLocation || '',
      crops: Array.isArray(current?.crops) ? current.crops.join(', ') : (current?.crops || ''),
      businessType: current?.businessType || '',
      businessLocation: current?.businessLocation || '',
      expertise: current?.expertise || '',
      experience: current?.experience || '',
    });
  }, [user]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...form,
        crops: form.crops ? form.crops.split(',').map(s => s.trim()).filter(Boolean) : [],
      };
      const res = await authAPI.updateProfile(payload);
      const updated = res.data;
      const merged = { ...user, ...updated };
      localStorage.setItem('kataviUser', JSON.stringify(merged));
      if (onAuth) onAuth('login-success', merged);
      showToast('Wasifu wako umesasishwa kikamilifu!');
    } catch (err) {
      showToast(err?.response?.data?.message || 'Imeshindikana kusasisha wasifu wako', 'error');
    } finally {
      setLoading(false);
    }
  };

  const field = (name, label, placeholder = '') => (
    <div className="form-group" key={name}>
      <label>{label}</label>
      <input type="text" name={name} value={form[name] || ''} onChange={handleChange} placeholder={placeholder} />
    </div>
  );

  return (
    <div className="profile-panel">
      {toast && <div className={`profile-toast ${toast.type === 'error' ? 'toast-error' : 'toast-success'}`}>{toast.message}</div>}

      <div className="profile-header-card">
        <div className="profile-avatar">
          {user?.profilePicture ? <img src={user.profilePicture} alt="Profile" /> : <i className={ROLE_ICONS[role]}></i>}
        </div>
        <div className="profile-info">
          <h2>{user?.name}</h2>
          <p className="profile-role"><i className={ROLE_ICONS[role]}></i> {ROLE_LABELS[role] || role}</p>
          <p className="profile-location"><i className="fas fa-map-marker-alt"></i> {user?.location || 'Katavi'}</p>
          <div className="profile-badges">
            <span className="badge verified"><i className="fas fa-check-circle"></i> Imethibitishwa</span>
            <span className="badge active"><i className="fas fa-circle"></i> Akaunti Aktivu</span>
          </div>
        </div>
      </div>

      <form className="profile-form" onSubmit={handleSubmit}>
        <div className="form-section">
          <h3>Taarifa za Msingi</h3>
          <div className="form-grid">
            {field('name', 'Jina Kamili', 'Andika jina lako kamili')}
            <div className="form-group">
              <label>Barua Pepe</label>
              <input type="email" value={user?.email || ''} disabled />
            </div>
            {field('phone', 'Namba ya Simu', 'e.g. +255 789 000 000')}
            {field('location', 'Eneo', 'e.g. Mpanda')}
            {field('district', 'Wilaya', 'e.g. Mlele')}
            {field('ward', 'Kata', 'e.g. Mpanda Mjini')}
            {field('village', 'Kijiji', 'e.g. Misheni')}
          </div>
        </div>

        {role === 'farmer' && (
          <div className="form-section">
            <h3>Taarifa za Shamba</h3>
            <div className="form-grid">
              {field('farmSize', 'Ukubwa wa Shamba (Eka/Hekta)', 'e.g. 5 eka')}
              {field('farmLocation', 'Mahali pa Shamba', 'e.g. Kijiji A, Wilaya B')}
              <div className="form-group">
                <label>Mazao Unayolima (tenga kwa koma)</label>
                <input name="crops" value={form.crops || ''} onChange={handleChange} placeholder="e.g. Mahindi, Mpunga, Maharage" />
              </div>
            </div>
          </div>
        )}

        {role === 'buyer' && (
          <div className="form-section">
            <h3>Taarifa za Biashara</h3>
            <div className="form-grid">
              {field('businessType', 'Aina ya Biashara', 'e.g. Msambazaji wa Mazao')}
              {field('businessLocation', 'Mahali pa Biashara', 'e.g. Soko Kuu, Mpanda')}
            </div>
          </div>
        )}

        {role === 'expert' && (
          <div className="form-section">
            <h3>Taarifa za Utaalamu</h3>
            <div className="form-grid">
              {field('expertise', 'Utaalamu / Fani', 'e.g. Udhibiti wa Wadudu')}
              {field('experience', 'Uzoefu (Miaka)', 'e.g. 8 miaka')}
            </div>
          </div>
        )}

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={loading}>
            <i className="fas fa-save"></i> {loading ? 'Inahifadhi...' : 'Hifadhi Mabadiliko'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProfilePanel;
