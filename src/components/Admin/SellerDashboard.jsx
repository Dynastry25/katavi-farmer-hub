import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from './AdminLayout';
import { getRoleNavSections } from './roleNav';
import { suppliersAPI } from '../../api/client';
import { useAuth } from '../../shared/context/AuthContext';
import './SellerDashboard.css';

const SUPPLIER_CATEGORIES = [
  { value: 'fertilizers', label: 'Wauzaji wa Mbolea' },
  { value: 'seeds', label: 'Wauzaji wa Mbegu' },
  { value: 'tools', label: 'Wauzaji wa Vifaa' },
  { value: 'pesticides', label: 'Wauzaji wa Dawa' },
  { value: 'irrigation', label: 'Vifaa vya Umwagiliaji' },
];

const CATEGORY_SHORT = {
  fertilizers: 'Mbolea',
  seeds: 'Mbegu',
  tools: 'Vifaa',
  pesticides: 'Dawa',
  irrigation: 'Umwagiliaji',
};

const SellerDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [supplier, setSupplier] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  const [profileForm, setProfileForm] = useState({
    name: '',
    category: 'seeds',
    location: '',
    contact: '',
    email: '',
    description: '',
    delivery: false,
  });
  const [newProduct, setNewProduct] = useState('');

  const loadSupplier = async () => {
    setLoading(true);
    try {
      const res = await suppliersAPI.getMine();
      const data = res.data;
      setSupplier(data);
      if (data) {
        setProfileForm({
          name: data.name || '',
          category: data.category || 'seeds',
          location: data.location || '',
          contact: data.contact || '',
          email: data.email || '',
          description: data.description || '',
          delivery: !!data.delivery,
        });
      }
    } catch (err) {
      console.error('Seller profile error:', err);
      setSupplier(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSupplier();
  }, []);

  const handleProfileInput = (e) => {
    const { name, value, type, checked } = e.target;
    setProfileForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSavedMsg('');
    try {
      if (supplier) {
        const res = await suppliersAPI.update(supplier._id, profileForm);
        setSupplier(res.data);
      } else {
        const res = await suppliersAPI.create(profileForm);
        setSupplier(res.data);
      }
      setSavedMsg('Wasifu wako umehifadhiwa kikamilifu.');
    } catch (err) {
      setSavedMsg(err.response?.data?.message || 'Hitilafu imetokea wakati wa kuhifadhi.');
    } finally {
      setSaving(false);
      setTimeout(() => setSavedMsg(''), 4000);
    }
  };

  const addProduct = async () => {
    const name = newProduct.trim();
    if (!name) return;
    if (!supplier) {
      setSavedMsg('Hifadhi wasifu wako wa muuzaji kwanza kabla ya kuongeza bidhaa.');
      setTimeout(() => setSavedMsg(''), 4000);
      return;
    }
    const products = [...(supplier.products || []), name];
    try {
      const res = await suppliersAPI.update(supplier._id, { products });
      setSupplier(res.data);
      setNewProduct('');
    } catch (err) {
      alert(err.response?.data?.message || 'Hitilafu imetokea.');
    }
  };

  const removeProduct = async (index) => {
    const products = (supplier.products || []).filter((_, i) => i !== index);
    try {
      const res = await suppliersAPI.update(supplier._id, { products });
      setSupplier(res.data);
    } catch (err) {
      alert(err.response?.data?.message || 'Hitilafu imetokea.');
    }
  };

  const deleteSupplier = async () => {
    if (!supplier) return;
    if (!window.confirm('Una uhakika unataka kufuta wasifu wako wa muuzaji?')) return;
    try {
      await suppliersAPI.delete(supplier._id);
      setSupplier(null);
      setActiveTab('profile');
      setSavedMsg('Wasifu wako umefutwa.');
      setTimeout(() => setSavedMsg(''), 4000);
    } catch (err) {
      alert(err.response?.data?.message || 'Hitilafu imetokea.');
    }
  };

  const renderOverview = () => {
    const products = supplier?.products?.length || 0;
    const categoryLabel = supplier ? (CATEGORY_SHORT[supplier.category] || supplier.category) : '—';
    return (
      <div className="seller-overview">
        {!supplier && !loading && (
          <div className="seller-empty-state">
            <div className="empty-icon"><i className="fas fa-store"></i></div>
            <h3>Karibu, {user?.name?.split(' ')[0]}!</h3>
            <p>Bado huna wasifu wa muuzaji. Unda wasifu wako kwanza ili bidhaa zako zionekane kwa wakulima kwenye ukurasa wa Wauzaji.</p>
            <button className="btn btn-primary" onClick={() => setActiveTab('profile')}>
              <i className="fas fa-plus"></i> Unda Wasifu wa Muuzaji
            </button>
          </div>
        )}

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon"><i className="fas fa-box-open"></i></div>
            <div className="stat-content">
              <div className="stat-number">{products}</div>
              <div className="stat-label">Bidhaa Unazouza</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon"><i className="fas fa-tag"></i></div>
            <div className="stat-content">
              <div className="stat-number">{categoryLabel}</div>
              <div className="stat-label">Aina ya Bidhaa</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon"><i className="fas fa-star"></i></div>
            <div className="stat-content">
              <div className="stat-number">{supplier ? supplier.rating?.toFixed(1) : '—'}</div>
              <div className="stat-label">Ukadiriaji</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon"><i className="fas fa-truck"></i></div>
            <div className="stat-content">
              <div className="stat-number">{supplier ? (supplier.delivery ? 'Ndiyo' : 'Hapana') : '—'}</div>
              <div className="stat-label">Uwasilishaji</div>
            </div>
          </div>
        </div>

        {supplier && (
          <>
            <div className="seller-public-warning">
              <i className="fas fa-info-circle"></i>
              <div>
                <strong>Uthibitisho:</strong>{' '}
                {supplier.verified
                  ? 'Wasifu wako umeidhinishwa na msimamizi. Umeonekana kwa wakulima.'
                  : 'Wasifu wako unaonekana kwa wakulima lakini bado unaongozana na utathibitishwa na msimamizi (verified).'}
              </div>
            </div>
            <div className="seller-section">
              <div className="seller-section-header">
                <h3>Hatua Zinazofuata</h3>
              </div>
              <div className="seller-next-steps">
                <div className="next-step-card">
                  <i className="fas fa-box-open"></i>
                  <div>
                    <strong>Ongeza Bidhaa Zako</strong>
                    <p>Weka mbolea, mbegu, dawa au vifaa unavyoviuza ili wakulima wavipate.</p>
                  </div>
                  <button className="btn btn-outline" onClick={() => setActiveTab('products')}>Endelea</button>
                </div>
                <div className="next-step-card">
                  <i className="fas fa-eye"></i>
                  <div>
                    <strong>Angalia Ukurasa wa Wauzaji</strong>
                    <p>Tazama jinsi wasifu na bidhaa zako zinavyoonekana kwa wakulima.</p>
                  </div>
                  <button className="btn btn-outline" onClick={() => navigate('/suppliers')}>Tazama</button>
                </div>
                <div className="next-step-card">
                  <i className="fas fa-user-cog"></i>
                  <div>
                    <strong>Kamilisha Wasifu Wako</strong>
                    <p>Hakikisha maelezo, eneo na mawasiliano yako ni kamili na sahihi.</p>
                  </div>
                  <button className="btn btn-outline" onClick={() => setActiveTab('profile')}>Hariri</button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  const renderProducts = () => {
    const products = supplier?.products || [];
    return (
      <div className="seller-section">
        <div className="seller-section-header">
          <h3>Bidhaa Zinazouzwa</h3>
          <p>Hizi ndizo pembejeo unazowasilisha kwa wakulima wa Katavi.</p>
        </div>

        {!supplier ? (
          <div className="seller-empty-state small">
            <p>Unda wasifu wako wa muuzaji kwanza kabla ya kuongeza bidhaa.</p>
            <button className="btn btn-primary" onClick={() => setActiveTab('profile')}>
              Unda Wasifu
            </button>
          </div>
        ) : (
          <>
            <div className="products-add-row">
              <input
                type="text"
                className="form-control"
                placeholder="Jina la bidhaa, mf. UREA, Mahindi DK90..."
                value={newProduct}
                onChange={(e) => setNewProduct(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addProduct(); } }}
              />
              <button className="btn btn-primary" onClick={addProduct}>
                <i className="fas fa-plus"></i> Ongeza
              </button>
            </div>

            {products.length === 0 ? (
              <div className="products-empty">
                <i className="fas fa-box-open"></i>
                <p>Huna bidhaa bado. Ongeza bidhaa yako ya kwanza hapo juu.</p>
              </div>
            ) : (
              <div className="products-grid">
                {products.map((product, index) => (
                  <div key={index} className="product-card">
                    <div className="product-card-icon"><i className="fas fa-seedling"></i></div>
                    <span className="product-card-name">{product}</span>
                    <button className="product-remove" title="Ondoa" onClick={() => removeProduct(index)}>
                      <i className="fas fa-times"></i>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  const renderProfile = () => {
    return (
      <div className="seller-section">
        <div className="seller-section-header">
          <h3>Wasifu wa Muuzaji / Msambazaji</h3>
          <p>Taarifa hizi zinaonekana kwa wakulima kwenye ukurasa wa Wauzaji.</p>
        </div>

        {savedMsg && <div className="seller-saved-msg"><i className="fas fa-check-circle"></i> {savedMsg}</div>}

        <form className="seller-profile-form" onSubmit={saveProfile}>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="name">Jina la Duka / Biashara</label>
              <input
                type="text"
                id="name"
                name="name"
                className="form-control"
                value={profileForm.name}
                onChange={handleProfileInput}
                placeholder="Mf. SeedCo Tanzania"
              />
            </div>
            <div className="form-group">
              <label htmlFor="category">Aina ya Bidhaa</label>
              <select
                id="category"
                name="category"
                className="form-control"
                value={profileForm.category}
                onChange={handleProfileInput}
              >
                {SUPPLIER_CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="location">Eneo / Mji</label>
              <input
                type="text"
                id="location"
                name="location"
                className="form-control"
                value={profileForm.location}
                onChange={handleProfileInput}
                placeholder="Mf. Mpanda Mjini"
              />
            </div>
            <div className="form-group">
              <label htmlFor="contact">Simu</label>
              <input
                type="text"
                id="contact"
                name="contact"
                className="form-control"
                value={profileForm.contact}
                onChange={handleProfileInput}
                placeholder="+255..."
              />
            </div>
            <div className="form-group">
              <label htmlFor="email">Barua Pepe</label>
              <input
                type="email"
                id="email"
                name="email"
                className="form-control"
                value={profileForm.email}
                onChange={handleProfileInput}
                placeholder="info@..."
              />
            </div>
            <div className="form-group">
              <label htmlFor="description">Maelezo mafupi</label>
              <input
                type="text"
                id="description"
                name="description"
                className="form-control"
                value={profileForm.description}
                onChange={handleProfileInput}
                placeholder="Mf. Wauzaji wakuu wa mbolea za kisasa"
              />
            </div>
          </div>

          <label className="seller-checkbox">
            <input
              type="checkbox"
              name="delivery"
              checked={profileForm.delivery}
              onChange={handleProfileInput}
            />
            <span>Natoa huduma ya uwasilishaji wa bidhaa</span>
          </label>

          <div className="profile-actions">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              <i className={`fas ${saving ? 'fa-spinner fa-spin' : 'fa-save'}`}></i>
              {saving ? ' Inahifadhi...' : (supplier ? ' Hifadhi Mabadiliko' : ' Unda Wasifu')}
            </button>
            {supplier && (
              <button type="button" className="btn btn-outline danger" onClick={deleteSupplier}>
                <i className="fas fa-trash-alt"></i> Futa Wasifu
              </button>
            )}
          </div>
        </form>

        {supplier && (
          <div className="seller-verified-state">
            <i className={`fas ${supplier.verified ? 'fa-check-circle' : 'fa-clock'}`}></i>
            {supplier.verified ? 'Imethibitishwa - unaonekana kama msambazaji wa uhakika.' : 'Bado haijaidhinishwa - msimamizi ataithibitisha wasifu wako.'}
          </div>
        )}
      </div>
    );
  };

  const renderChat = () => {
    return (
      <div className="seller-section">
        <div className="seller-section-header">
          <h3>Barua na Ushauri</h3>
          <p>Wasiliana na wakulima na wateja wako kwa urahisi.</p>
        </div>
        <div className="seller-contact-card">
          <i className="fas fa-headset"></i>
          <div>
            <strong>Mawasiliano ya Moja kwa Moja</strong>
            <p>Wakulima wanaweza kuona namba yako ya simu na barua pepe kwenye ukurasa wa Wauzaji. Huduma ya ujumbe wa moja kwa moja itapatikana hivi karibuni.</p>
          </div>
        </div>
      </div>
    );
  };

  const navSections = getRoleNavSections({
    role: 'seller',
    navigate,
    activeTab,
    onTab: setActiveTab,
  });

  return (
    <AdminLayout
      user={user}
      roleLabel="Muuzaji / Msambazaji"
      roleIcon="fas fa-store"
      pageTitle="Dashibodi ya Muuzaji / Msambazaji"
      subtitle="Dhibiti bidhaa zako za pembejeo na uwafikie wakulima wa Katavi"
      headerBadge={<div className="admin-badge"><i className="fas fa-store"></i> Muuzaji / Msambazaji</div>}
      navSections={navSections}
      onLogout={logout}
      headerActions={
        <button className="btn btn-success" onClick={() => navigate('/suppliers')}>
          <i className="fas fa-eye"></i> Angalia Ukurasa wa Wauzaji
        </button>
      }
    >
      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'products' && renderProducts()}
      {activeTab === 'profile' && renderProfile()}
      {activeTab === 'chat' && renderChat()}
    </AdminLayout>
  );
};

export default SellerDashboard;