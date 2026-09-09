import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cropsAPI, ordersAPI, priceAlertsAPI, marketPricesAPI } from '../../api/client';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, PieChart, Pie, Legend, LineChart, Line } from 'recharts';
import AdminLayout from './AdminLayout';
import { getRoleNavSections } from './roleNav';
import RatingModal from './RatingModal';
import { useAuth } from '../../shared/context/AuthContext';
import './BuyerDashboard.css';



const BuyerDashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [showOrderDetailsModal, setShowOrderDetailsModal] = useState(false);
  const [orderDetail, setOrderDetail] = useState(null);
  const [ratingOrder, setRatingOrder] = useState(null);
  const [selectedCrop, setSelectedCrop] = useState(null);
  const [selectedFarmer, setSelectedFarmer] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [orderDetails, setOrderDetails] = useState({
    quantity: '',
    deliveryDate: '',
    specialInstructions: ''
  });
  const [remainderBusyId, setRemainderBusyId] = useState(null);

  const [apiCrops, setApiCrops] = useState([]);
  const [apiOrders, setApiOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const [buyerAlerts, setBuyerAlerts] = useState([]);
  const [buyerPriceCrops, setBuyerPriceCrops] = useState([]);
  const [loadingPriceStats, setLoadingPriceStats] = useState(false);

  const loadBuyerPriceStats = async () => {
    setLoadingPriceStats(true);
    try {
      const names = [...new Set(myOrders.map(o => (o.crop || o.cropName || '').trim()).filter(Boolean))].slice(0, 5);
      const [alertsRes, ...rows] = await Promise.all([
        priceAlertsAPI.getMy(),
        ...names.map(async (name) => {
          try {
            const [latestRes, avgRes] = await Promise.all([
              marketPricesAPI.getAll({ cropName: name }),
              marketPricesAPI.getAverage({ cropName: name, days: 30 }),
            ]);
            const latest = Array.isArray(latestRes.data) ? latestRes.data[0] : null;
            const avg = avgRes.data?.avgPrice || 0;
            const today = latest?.pricePerUnit || 0;
            const diffPct = avg > 0 && today > 0 ? ((today - avg) / avg) * 100 : null;
            return { name, today, avg, diffPct };
          } catch (e) { return { name, today: 0, avg: 0, diffPct: null }; }
        }),
      ]);
      setBuyerAlerts(Array.isArray(alertsRes.data) ? alertsRes.data : []);
      setBuyerPriceCrops(rows);
    } catch (err) { console.error('Buyer price stats error:', err); }
    finally { setLoadingPriceStats(false); }
  };

  useEffect(() => {
    if (activeTab === 'statistics') loadBuyerPriceStats();
  }, [activeTab]);

  const toggleBuyerAlert = async (crop) => {
    try {
      const existing = buyerAlerts.find(a => (a.crop || '').toLowerCase() === String(crop).toLowerCase());
      if (existing) {
        await priceAlertsAPI.remove(existing._id);
        setBuyerAlerts(prev => prev.filter(a => a._id !== existing._id));
      } else {
        const res = await priceAlertsAPI.create({ crop, thresholdPct: 10 });
        setBuyerAlerts(prev => [res.data, ...prev]);
        alert(`Utaarifiwa bei ya ${crop} ikishuka/zikipanda zaidi ya 10% kwa SMS/Push`);
      }
    } catch (err) { console.error('Toggle buyer alert error:', err); }
  };

  const renderStatistics = () => {
    const trendMap = {};
    myOrders.forEach(o => {
      const d = o.orderDate || o.createdAt || '';
      const key = String(d).slice(0, 7);
      if (!key || key.startsWith('--')) return;
      trendMap[key] = trendMap[key] || { month: key, orders: 0 };
      trendMap[key].orders += 1;
    });
    const trend = Object.values(trendMap).sort((a, b) => a.month.localeCompare(b.month)).slice(-12);

    const favCrops = {};
    const favFarmers = {};
    myOrders.forEach(o => {
      const crop = (o.crop || o.cropName || 'Hakuna').trim();
      favCrops[crop] = (favCrops[crop] || 0) + 1;
      const f = (o.farmer || o.farmerName || 'Hakuna').trim();
      favFarmers[f] = (favFarmers[f] || 0) + 1;
    });
    const topCrops = Object.entries(favCrops).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const topFarmers = Object.entries(favFarmers).sort((a, b) => b[1] - a[1]).slice(0, 5);

    return (
      <div className="buyer-overview">
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon"><i className="fas fa-chart-line"></i></div>
            <div className="stat-content">
              <div className="stat-number">{myOrders.length}</div>
              <div className="stat-label">Jumla ya Maagizo Yako</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon"><i className="fas fa-heart"></i></div>
            <div className="stat-content">
              <div className="stat-number">{(myOrders[0] ? topCrops[0]?.[0] : '—') || '—'}</div>
              <div className="stat-label">Zao Unalopenda Zaidi</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon"><i className="fas fa-user-tie"></i></div>
            <div className="stat-content">
              <div className="stat-number">{(myOrders[0] ? topFarmers[0]?.[0] : '—') || '—'}</div>
              <div className="stat-label">Muuzaji Anayependwa</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon"><i className="fas fa-bell"></i></div>
            <div className="stat-content">
              <div className="stat-number">{buyerAlerts.length}</div>
              <div className="stat-label">Mazao Unayofuatilia</div>
            </div>
          </div>
        </div>

        <div className="dash-charts-row">
          <div className="dash-chart-card">
            <h3>Mwenendo wa Manunuzi (miezi)</h3>
            {trend.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={trend} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="orders" name="Maagizo" stroke="#1a7431" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : <p className="empty-state" style={{ padding: '20px' }}>Hakuna rekodi za maagizo.</p>}
          </div>
          <div className="dash-chart-card">
            <h3>Tahadhari ya Bei (SMS/Push)</h3>
            {loadingPriceStats ? (
              <div className="admin-loading"><i className="fas fa-spinner fa-spin"></i></div>
            ) : buyerPriceCrops.length > 0 ? (
              <div className="buyer-price-list">
                {buyerPriceCrops.map(c => {
                  const followed = buyerAlerts.some(a => (a.crop || '').toLowerCase() === c.name.toLowerCase());
                  return (
                    <div key={c.name} className="buyer-price-row">
                      <div className="buyer-price-info">
                        <strong>{c.name}</strong>
                        <span className={c.diffPct === null ? '' : c.diffPct >= 0 ? 'price-positive' : 'price-negative'}>
                          Leo: TZS {c.today.toLocaleString()} {c.diffPct !== null ? `(${c.diffPct >= 0 ? '▲' : '▼'} ${Math.abs(c.diffPct).toFixed(1)}%)` : ''}
                        </span>
                      </div>
                      <button className={`btn btn-sm ${followed ? 'btn-outline' : 'btn-primary'}`} onClick={() => toggleBuyerAlert(c.name)}>
                        {followed ? 'Ondoa' : 'Fuatilia'}
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : <p className="empty-state" style={{ padding: '20px' }}>Weka maagizo ili kupata tahadhari za bei.</p>}
          </div>
        </div>

        <div className="dash-charts-row">
          <div className="dash-chart-card">
            <h3><i className="fas fa-heart"></i> Mazao Unayopenda</h3>
            <div className="table-scroll">
              <table className="admin-table">
                <thead><tr><th>Zao</th><th style={{ textAlign: 'right' }}>Idadi ya Maagizo</th></tr></thead>
                <tbody>
                  {topCrops.map(([crop, count]) => (
                    <tr key={crop}><td>{crop}</td><td style={{ textAlign: 'right' }}>{count}</td></tr>
                  ))}
                  {topCrops.length === 0 && <tr><td colSpan={2}>Hakuna data</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
          <div className="dash-chart-card">
            <h3><i className="fas fa-user-tie"></i> Wauzaji Wako Bora</h3>
            <div className="table-scroll">
              <table className="admin-table">
                <thead><tr><th>Mkulima</th><th style={{ textAlign: 'right' }}>Idadi ya Maagizo</th></tr></thead>
                <tbody>
                  {topFarmers.map(([farmer, count]) => (
                    <tr key={farmer}><td>{farmer}</td><td style={{ textAlign: 'right' }}>{count}</td></tr>
                  ))}
                  {topFarmers.length === 0 && <tr><td colSpan={2}>Hakuna data</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const fetchOrders = async () => {
    try {
      const [cropsRes, ordersRes] = await Promise.all([
        cropsAPI.getAll(),
        ordersAPI.getAll(),
      ]);
      setApiCrops(cropsRes.data?.crops || cropsRes.data || []);
      if (ordersRes.data && ordersRes.data.length > 0) setApiOrders(ordersRes.data);
    } catch (err) {
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
  // Scroll to top when tab changes
  window.scrollTo({
    top: 0,
    left: 0,
    behavior: 'smooth'
  });
}, [activeTab]);
  const navigate = useNavigate();

  // Sample data for buyer
  const buyerStats = {
    totalOrders: 15,
    pendingOrders: 3,
    completedOrders: 12,
    totalSpent: 'TZS 3,250,000',
    favoriteCrops: ['Mahindi', 'Mpunga', 'Maharage'],
    trustedFarmers: 8
  };

  const myOrders = apiOrders.length > 0
    ? apiOrders.map(o => ({
        ...o,
        id: o._id || o.id,
        crop: o.cropName || (o.crop && typeof o.crop === 'object' ? o.crop.name : o.crop) || 'Bila jina',
        farmer: o.farmerName || (o.farmer && typeof o.farmer === 'object' ? o.farmer.name : o.farmer) || 'Bila jina',
        orderDate: o.orderDate || (o.createdAt ? new Date(o.createdAt).toLocaleDateString() : '-'),
      }))
    : [];

  const STATUS_LABELS = {
    pending: 'Inasubiri',
    approved: 'Imekubaliwa',
    partially_approved: 'Imekubaliwa Kwa Sehemu',
    rejected: 'Imekataliwa',
    expired: 'Imeisha Muda',
  };
  const statusLabelOf = (s) => STATUS_LABELS[s] || s || '-';
  const qtyLabelOf = (o) => (o.requestedQuantity != null ? `${o.requestedQuantity} ${o.unit || ''}` : o.quantity);
  const availableOf = (c) => {
    const stock = c.stockQuantity ?? (Number(String(c.quantity || '').replace(/[^0-9.]/g, '')) || 0);
    const reserved = Number(c.reservedQuantity) || 0;
    return Math.max(0, stock - reserved);
  };
  const isAvailableCrop = (c) => availableOf(c) > 0;

  const savedFarmers = [
    {
      id: 1,
      name: 'Juma Mwinyi',
      location: 'Mpanda',
      rating: 4.8,
      totalSales: 45,
      crops: ['Mahindi', 'Mpunga'],
      contact: '+255 789 123 456',
      joinDate: '2023-05-15'
    },
    {
      id: 2,
      name: 'Asha Hassan',
      location: 'Mlele',
      rating: 4.9,
      totalSales: 32,
      crops: ['Maharage', 'Karanga'],
      contact: '+255 789 123 457',
      joinDate: '2023-06-20'
    },
    {
      id: 3,
      name: 'Mohamed Ali',
      location: 'Nsimbo',
      rating: 4.7,
      totalSales: 28,
      crops: ['Alizeti', 'Uwele'],
      contact: '+255 789 123 458',
      joinDate: '2023-04-10'
    }
  ];

  const recentActivities = [
    {
      id: 1,
      type: 'order',
      description: 'Umetuma agizo jipya la mahindi',
      time: '2 saa zilizopita',
      icon: 'fas fa-box'
    },
    {
      id: 2,
      type: 'message',
      description: 'Ulipokea ujumbe kutoka kwa mkulima',
      time: '5 saa zilizopita',
      icon: '💬'
    },
    {
      id: 3,
      type: 'delivery',
      description: 'Agizo lako la mpunga limewasilishwa',
      time: '1 siku iliyopita',
      icon: '🚚'
    },
    {
      id: 4,
      type: 'price',
      description: 'Bei ya maharage imeshuka kwenye soko',
      time: '2 siku zilizopita',
      icon: 'fas fa-coins'
    }
  ];

  // Filter crops based on search and category
  const filteredCrops = apiCrops.filter(crop => {
    const search = searchTerm.toLowerCase();
    const cropName = (crop.name || '').toLowerCase();
    const farmerName = String(crop.farmerName || crop.farmer || '').toLowerCase();
    const matchesSearch = cropName.includes(search) || farmerName.includes(search);
    const matchesCategory = selectedCategory === 'all' || crop.category === selectedCategory || crop.type === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = [
    { value: 'all', label: 'Mazao Yote' },
    { value: 'cereal', label: 'Nafaka' },
    { value: 'legume', label: 'Mikunde' },
    { value: 'vegetable', label: 'Mboga' },
    { value: 'fruit', label: 'Matunda' }
  ];

  const handlePlaceOrder = (crop) => {
    setSelectedCrop(crop);
    setOrderDetails({
      quantity: '',
      deliveryDate: '',
      specialInstructions: ''
    });
    setShowOrderModal(true);
  };

  const handleContactFarmer = (farmer) => {
    setSelectedFarmer(farmer);
    setShowContactModal(true);
  };

  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    const qty = Number(orderDetails.quantity);
    if (!qty || qty < 1) {
      alert('Weka kiasi halali');
      return;
    }
    try {
      const res = await ordersAPI.create({
        crop: selectedCrop._id || selectedCrop.id,
        requestedQuantity: qty,
        deliveryDate: orderDetails.deliveryDate,
        contact: user?.phone || '',
      });
      const created = res.data || res;
      const existing = apiOrders.find(x => (x._id || x.id) === (created._id || created.id));
      setApiOrders(prev => [created, ...prev.filter(x => !existing)]);
      alert(`Umeweka agizo la ${qty} ${created.unit || selectedCrop.unit || 'kg'} ya ${selectedCrop.name}. Agizo linasubiri idhini ya mkulima.`);
      setShowOrderModal(false);
      setSelectedCrop(null);
      setOrderDetails({ quantity: '', deliveryDate: '', specialInstructions: '' });
    } catch (err) {
      console.error('Place order error:', err);
      alert(err.response?.data?.message || 'Hitilafu imetokea wakati wa kuagiza');
    }
  };

  const handleCancelOrder = (orderId) => {
    if (window.confirm('Una uhakika unataka kughairi agizo hili? Hisa itatolewa kwenye zao.')) {
      ordersAPI.delete(orderId)
        .then(() => {
          setApiOrders(prev => prev.filter(o => (o._id || o.id) !== orderId));
          alert('Agizo limeghairiwa na hisa imetolewa.');
        })
        .catch(err => alert(err.response?.data?.message || 'Hitilafu imetokea kughairi agizo'));
    }
  };

  const handleRequestRemainder = async (order) => {
    if (!window.confirm(`Tuma ombi la kiasi kilichobaki cha ${order.crop}?`)) return;
    setRemainderBusyId(order.id);
    try {
      const res = await ordersAPI.requestRemainder(order.id);
      const rem = res.data?.remainder;
      alert(`Umetuma ombi la kiasi kilichobaki: ${rem?.requestedQuantity ?? ''} ${rem?.unit || order.unit || 'kg'}. Mkulima atakujibu kiteka.`);
      await fetchOrders();
    } catch (err) {
      alert(err.response?.data?.message || 'Hitilafu imetokea kutuma ombi la ziada');
    } finally {
      setRemainderBusyId(null);
    }
  };

  const renderOverview = () => (
    <div className="buyer-overview">
      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon"><i className="fas fa-box"></i></div>
          <div className="stat-content">
            <div className="stat-number">{buyerStats.totalOrders}</div>
            <div className="stat-label">Maagizo Yote</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⏳</div>
          <div className="stat-content">
            <div className="stat-number">{buyerStats.pendingOrders}</div>
            <div className="stat-label">Maagizo Yanayosubiri</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><i className="fas fa-check-circle"></i></div>
          <div className="stat-content">
            <div className="stat-number">{buyerStats.completedOrders}</div>
            <div className="stat-label">Maagizo Yakamilika</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><i className="fas fa-coins"></i></div>
          <div className="stat-content">
            <div className="stat-number">{buyerStats.totalSpent}</div>
            <div className="stat-label">Jumla ya Matumizi</div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="dash-charts-row">
        <div className="dash-chart-card">
          <h3>Maagizo kwa Hali</h3>
          <ResponsiveContainer width="100%" height={230}>
            <PieChart>
              <Pie data={[
                { name: 'Yamekamilika', value: buyerStats.completedOrders },
                { name: 'Yanasubiri', value: buyerStats.pendingOrders },
              ].filter(d => d.value > 0)} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={4} label>
                <Cell fill="#16a34a" />
                <Cell fill="#f59e0b" />
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="dash-chart-card">
          <h3>Muhtasari wa Maagizo</h3>
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={[
              { name: 'Yote', value: buyerStats.totalOrders },
              { name: 'Yakamilika', value: buyerStats.completedOrders },
              { name: 'Yanasubiri', value: buyerStats.pendingOrders },
            ]} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="value" name="Idadi" radius={[6, 6, 0, 0]}>
                <Cell fill="#1a7431" />
                <Cell fill="#16a34a" />
                <Cell fill="#f59e0b" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Favorite Crops */}
      <div className="favorites-section">
        <h3>Mazao Unayopenda</h3>
        <div className="favorites-tags">
          {buyerStats.favoriteCrops.map((crop, index) => (
            <span key={index} className="favorite-tag">{crop}</span>
          ))}
        </div>
      </div>

      {/* Recent Activities */}
      <div className="activities-section">
        <h3>Shughuli Zaidi ya Hivi Karibuni</h3>
        <div className="activities-list">
          {recentActivities.map(activity => (
            <div key={activity.id} className="activity-item">
              <div className="activity-icon">{activity.icon.startsWith('fas') ? <i className={activity.icon}></i> : activity.icon}</div>
              <div className="activity-content">
                <p className="activity-description">{activity.description}</p>
                <span className="activity-time">{activity.time}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <h3>Vitendo vya Haraka</h3>
        <div className="actions-grid">
          <button className="action-btn" onClick={() => setActiveTab('marketplace')}>
            <i className="fas fa-search"></i>
            <span>Tafuta Mazao</span>
          </button>
          <button className="action-btn" onClick={() => setActiveTab('orders')}>
            <i className="fas fa-shopping-cart"></i>
            <span>Angalia Maagizo</span>
          </button>
          <button className="action-btn" onClick={() => setActiveTab('farmers')}>
            <i className="fas fa-users"></i>
            <span>Wakulima Wanaoaminika</span>
          </button>
        </div>
      </div>

      {/* Dashboard Links */}
      <div className="dashboard-links-section">
        <h3>🔗 Huduma za Wanunuzi</h3>
        <div className="dashboard-links-grid">
          <button className="dashboard-link-card" onClick={() => navigate('/market')}>
            <div className="link-icon">
              <i className="fas fa-store"></i>
            </div>
            <div className="link-content">
              <h4>Soko la Mazao</h4>
              <p>Angalia na nunua mazao mbalimbali</p>
            </div>
          </button>
          
          <button className="dashboard-link-card" onClick={() => navigate('/suppliers')}>
            <div className="link-icon">
              <i className="fas fa-truck"></i>
            </div>
            <div className="link-content">
              <h4>Wauzaji wa Pembejeo</h4>
              <p>Pata pembejeo za kilimo</p>
            </div>
          </button>
          
          <button className="dashboard-link-card" onClick={() => navigate('/market')}>
            <div className="link-icon">
              <i className="fas fa-users"></i>
            </div>
            <div className="link-content">
              <h4>Wakulima</h4>
              <p>Wasiliana na wakulima moja kwa moja</p>
            </div>
          </button>
          
          <button className="dashboard-link-card" onClick={() => navigate('/reports')}>
            <div className="link-icon">
              <i className="fas fa-chart-bar"></i>
            </div>
            <div className="link-content">
              <h4>Ripoti za Bei</h4>
              <p>Fuata mienendo ya bei za mazao</p>
            </div>
          </button>

          <button className="dashboard-link-card" onClick={() => navigate('/weather')}>
            <div className="link-icon">
              <i className="fas fa-cloud-sun"></i>
            </div>
            <div className="link-content">
              <h4>Hali ya Hewa</h4>
              <p>Angalia utabiri wa hali ya hewa</p>
            </div>
          </button>

          <button className="dashboard-link-card" onClick={() => navigate('/advice')}>
            <div className="link-icon">
              <i className="fas fa-graduation-cap"></i>
            </div>
            <div className="link-content">
              <h4>Ushauri wa Kilimo</h4>
              <p>Pata maelekezo kutoka kwa wataalamu</p>
            </div>
          </button>

          <button className="dashboard-link-card" onClick={() => navigate('/news')}>
            <div className="link-icon">
              <i className="fas fa-newspaper"></i>
            </div>
            <div className="link-content">
              <h4>Habari za Soko</h4>
              <p>Taarifa mpya za soko la mazao</p>
            </div>
          </button>

          <button className="dashboard-link-card" onClick={() => navigate('/market')}>
            <div className="link-icon">
              <i className="fas fa-hand-holding-usd"></i>
            </div>
            <div className="link-content">
              <h4>Mikopo ya Biashara</h4>
              <p>Angalia fursa za mikopo</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );

  const renderMarketplace = () => (
    <div className="buyer-section">
      <div className="section-header">
        <h3>Soko la Mazao</h3>
        <div className="search-filters">
          <div className="search-box">
            <i className="fas fa-search"></i>
            <input
              type="text"
              placeholder="Tafuta mazao au wakulima..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select 
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="category-filter"
          >
            {categories.map(category => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>
        </div>
      </div>

<div className="crops-grid">
        {filteredCrops.map(crop => (
          <div key={crop._id || crop.id} className="crop-card">
            <div className="crop-image">
                {crop.image ? <img src={crop.image} alt={crop.name} loading="lazy" /> : <i className="fas fa-wheat-awn"></i>}
            </div>
            <div className="crop-content">
              <h4>{crop.name}</h4>
              <p>{crop.description}</p>
              <div className="crop-details">
                <span><strong>Bei:</strong> {crop.price}/{crop.unit || 'kg'}</span>
                <span><strong>Inapatikana:</strong> {availableOf(crop)} {crop.unit || 'kg'}</span>
                <span><strong>Eneo:</strong> {crop.location}</span>
              </div>
              <div className="farmer-info">
                <i className="fas fa-user"></i>
                <span>{crop.farmerName || (crop.farmer && typeof crop.farmer === 'object' ? crop.farmer.name : crop.farmer) || 'Bila jina'}</span>
                <span className="rating"><i className="fas fa-star" style={{color:'#f59e0b'}}></i> {crop.rating || 4.5}</span>
              </div>
              <div className="crop-actions">
                <button 
                  className="btn btn-sm btn-primary"
                  disabled={!isAvailableCrop(crop)}
                  onClick={() => handlePlaceOrder(crop)}
                >
                  <i className="fas fa-cart-plus"></i> {isAvailableCrop(crop) ? 'Agiza Sasa' : 'Imeisha'}
                </button>
                <button 
                  className="btn btn-sm btn-outline"
                  onClick={() => handleContactFarmer({ name: crop.farmer, contact: crop.contact })}
                >
                  <i className="fas fa-phone"></i> Wasiliana
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredCrops.length === 0 && (
        <div className="empty-state">
          <i className="fas fa-search"></i>
          <h4>Hakuna mazao yaliyopatikana</h4>
          <p>Badilisha utafutaji wako au kategoria ili kuona matokeo</p>
          <button className="btn btn-primary" onClick={() => {
            setSearchTerm('');
            setSelectedCategory('all');
          }}>
            <i className="fas fa-refresh"></i> Onyesha Mazao Yote
          </button>
        </div>
      )}

      {/* Additional Links in Marketplace Tab */}
      <div className="dashboard-links-section">
        <h3>🔗 Viungo vya Ziada</h3>
        <div className="dashboard-links-grid">
          <button className="dashboard-link-card" onClick={() => navigate('/suppliers')}>
            <div className="link-icon">
              <i className="fas fa-truck"></i>
            </div>
            <div className="link-content">
              <h4>Wauzaji wa Pembejeo</h4>
              <p>Pata pembejeo za ziada</p>
            </div>
          </button>
          
          <button className="dashboard-link-card" onClick={() => navigate('/reports')}>
            <div className="link-icon">
              <i className="fas fa-chart-line"></i>
            </div>
            <div className="link-content">
              <h4>Bei za Soko</h4>
              <p>Angalia mienendo ya bei</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );

  const renderOrders = () => (
    <div className="buyer-section">
      <h3>Historia ya Maagizo Yangu</h3>
      
      <div className="orders-table-container">
        <table className="orders-table">
          <thead>
            <tr>
              <th>Zao</th>
              <th>Mkulima</th>
              <th>Kiasi Kilichoomwa</th>
              <th>Kilichoidhinishwa</th>
              <th>Bei</th>
              <th>Tarehe</th>
              <th>Hali</th>
              <th>Vitendo</th>
            </tr>
          </thead>
          <tbody>
            {myOrders.map(order => (
              <tr key={order.id}>
                <td>{order.crop}</td>
                <td>{order.farmer}</td>
                <td>{qtyLabelOf(order)}</td>
                <td>{order.approvedQuantity != null ? `${order.approvedQuantity} ${order.unit || ''}` : '-'}</td>
                <td>{order.price}</td>
                <td>{order.orderDate}</td>
                <td>
                  <span className={`status-badge ${order.status}`}>
                    {statusLabelOf(order.status)}
                  </span>
                </td>
                <td>
                  <div className="order-actions">
                    <button className="btn btn-sm btn-outline" onClick={() => { setOrderDetail(order); setShowOrderDetailsModal(true); }}>
                      <i className="fas fa-eye"></i> Angalia
                    </button>
                    {order.status === 'pending' && (
                      <button 
                        className="btn btn-sm btn-danger"
                        onClick={() => handleCancelOrder(order.id)}
                      >
                        <i className="fas fa-times"></i> Katiza
                      </button>
                    )}
                    {order.status === 'approved' && (
                      <button 
                        className="btn btn-sm btn-primary"
                        onClick={() => {
                          setRatingOrder(order);
                          setShowRatingModal(true);
                        }}
                      >
                        <i className="fas fa-star"></i> Kadiria
                      </button>
                    )}
                    {order.status === 'partially_approved' && (
                      <button 
                        className="btn btn-sm btn-success"
                        disabled={remainderBusyId === order.id}
                        onClick={() => handleRequestRemainder(order)}
                      >
                        <i className={`fas ${remainderBusyId === order.id ? 'fa-spinner fa-spin' : 'fa-plus'}`}></i>
                        {remainderBusyId === order.id ? ' Inatuma...' : ' Omba Kiasi Kilichobaki'}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {myOrders.length === 0 && (
              <tr><td colSpan={8} className="empty-state">Hakuna maagizo bado. Weka agizo kutoka kwenye Soko la Mazao.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Order Statistics */}
      <div className="order-stats">
        <div className="stat-card">
          <div className="stat-value">{myOrders.filter(o => o.status === 'pending').length}</div>
          <div className="stat-label">Yanayosubiri</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{myOrders.filter(o => o.status === 'approved').length}</div>
          <div className="stat-label">Yaliyokubaliwa</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{myOrders.filter(o => o.status === 'partially_approved').length}</div>
          <div className="stat-label">Kwa Sehemu</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{myOrders.filter(o => o.status === 'rejected' || o.status === 'expired').length}</div>
          <div className="stat-label">Yaliyokataliwa/ Yameisha</div>
        </div>
      </div>

      {/* Additional Links in Orders Tab */}
      <div className="dashboard-links-section">
        <h3>🔗 Viungo vya Usaidizi</h3>
        <div className="dashboard-links-grid">
          <button className="dashboard-link-card" onClick={() => navigate('/contact')}>
            <div className="link-icon">
              <i className="fas fa-headset"></i>
            </div>
            <div className="link-content">
              <h4>Huduma kwa Wateja</h4>
              <p>Pata msaada wa ziada</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );

  const renderFarmers = () => (
    <div className="buyer-section">
      <h3>Wakulima Wanaoaminika</h3>
      
      <div className="farmers-grid">
        {savedFarmers.map(farmer => (
          <div key={farmer.id} className="farmer-card">
            <div className="farmer-avatar">
              <i className="fas fa-user"></i>
            </div>
            <div className="farmer-content">
              <h4>{farmer.name}</h4>
              <div className="farmer-location">
                <i className="fas fa-map-marker-alt"></i>
                {farmer.location}
              </div>
              <div className="farmer-rating">
                <i className="fas fa-star" style={{color:'#f59e0b'}}></i> {farmer.rating} ({farmer.totalSales} mauzo)
              </div>
              <div className="farmer-crops">
                <strong>Mazao:</strong>
                <div className="crops-tags">
                  {farmer.crops.map((crop, index) => (
                    <span key={index} className="crop-tag">{crop}</span>
                  ))}
                </div>
              </div>
              <div className="farmer-meta">
                <span>Imejiunga: {new Date(farmer.joinDate).toLocaleDateString('sw-TZ')}</span>
              </div>
              <div className="farmer-actions">
                <button 
                  className="btn btn-sm btn-primary"
                  onClick={() => handleContactFarmer(farmer)}
                >
                  <i className="fas fa-phone"></i> Wasiliana
                </button>
                <button className="btn btn-sm btn-outline" onClick={() => navigate('/market')}>
                  <i className="fas fa-store"></i> Angalia Mazao
                </button>
                <button className="btn btn-sm btn-success">
                  <i className="fas fa-star"></i> Weka Alama
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Additional Links in Farmers Tab */}
      <div className="dashboard-links-section">
        <h3>🔗 Pata Wakulima Wengine</h3>
        <div className="dashboard-links-grid">
          <button className="dashboard-link-card" onClick={() => navigate('/market')}>
            <div className="link-icon">
              <i className="fas fa-users"></i>
            </div>
            <div className="link-content">
              <h4>Vikundi vya Wakulima</h4>
              <p>Jiunge na vikundi vya wakulima</p>
            </div>
          </button>
          
          <button className="dashboard-link-card" onClick={() => navigate('/market')}>
            <div className="link-icon">
              <i className="fas fa-store"></i>
            </div>
            <div className="link-content">
              <h4>Soko la Mazao</h4>
              <p>Angalia wakulima wote</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );

  const renderAnalytics = () => (
    <div className="buyer-section">
      <h3>Takwimu za Ununuzi</h3>
      
      <div className="analytics-grid">
        <div className="analytics-card">
          <h4>Matumizi ya Mwezi</h4>
          <div className="analytics-value">TZS 750,000</div>
          <div className="analytics-trend positive">+12% kutoka mwezi uliopita</div>
        </div>
        <div className="analytics-card">
          <h4>Mazao Yanayonunuliwa Zaidi</h4>
          <div className="analytics-value">Mahindi</div>
          <div className="analytics-trend">35% ya ununuzi wote</div>
        </div>
        <div className="analytics-card">
          <h4>Wakulima Wapya</h4>
          <div className="analytics-value">2</div>
          <div className="analytics-trend positive">Wameongezeka mwezi huu</div>
        </div>
        <div className="analytics-card">
          <h4>Wastani wa Bei</h4>
          <div className="analytics-value">TZS 1,850/kg</div>
          <div className="analytics-trend negative">-5% kutoka mwezi uliopita</div>
        </div>
      </div>

      <div className="spending-breakdown">
        <h4>Mgawanyiko wa Matumizi kwa Mazao</h4>
        <div className="breakdown-chart">
          <div className="chart-item">
            <div className="chart-bar" style={{width: '35%'}}></div>
            <span className="chart-label">Mahindi - 35%</span>
          </div>
          <div className="chart-item">
            <div className="chart-bar" style={{width: '25%'}}></div>
            <span className="chart-label">Mpunga - 25%</span>
          </div>
          <div className="chart-item">
            <div className="chart-bar" style={{width: '20%'}}></div>
            <span className="chart-label">Maharage - 20%</span>
          </div>
          <div className="chart-item">
            <div className="chart-bar" style={{width: '15%'}}></div>
            <span className="chart-label">Mengineyo - 15%</span>
          </div>
        </div>
      </div>

      {/* Additional Links in Analytics Tab */}
      <div className="dashboard-links-section">
        <h3>🔗 Ripoti za Ziada</h3>
        <div className="dashboard-links-grid">
          <button className="dashboard-link-card" onClick={() => navigate('/reports')}>
            <div className="link-icon">
              <i className="fas fa-chart-line"></i>
            </div>
            <div className="link-content">
              <h4>Ripoti Kamili</h4>
              <p>Angalia ripoti zote za ununuzi</p>
            </div>
          </button>
          
          <button className="dashboard-link-card" onClick={() => navigate('/market')}>
            <div className="link-icon">
              <i className="fas fa-chart-bar"></i>
            </div>
            <div className="link-content">
              <h4>Bei za Soko</h4>
              <p>Angalia mienendo ya bei za mazao</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );

  const navSections = getRoleNavSections({
    role: 'buyer',
    navigate,
    activeTab,
    badges: { orders: buyerStats.pendingOrders },
    onTab: setActiveTab,
  });

  return (
    <>
    <AdminLayout
      user={user}
      roleLabel="Mnunuzi"
      roleIcon="fas fa-shopping-cart"
      pageTitle="Dashibodi ya Mnunuzi"
      subtitle="Dashibodi yako ya kununua mazao bora kutoka kwa wakulima wa Katavi"
      headerBadge={<div className="admin-badge"><i className="fas fa-shopping-cart"></i> Mnunuzi Waandaliwa</div>}
      navSections={navSections}
      onLogout={logout}
      headerActions={
        <>
          <button className="btn btn-primary" onClick={() => setActiveTab('marketplace')}>
            <i className="fas fa-search"></i> Tafuta Mazao
          </button>
          <button className="btn btn-success" onClick={() => navigate('/reports')}>
            <i className="fas fa-chart-line"></i> Ripoti za Bei
          </button>
        </>
      }
    >
      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'marketplace' && renderMarketplace()}
      {activeTab === 'statistics' && renderStatistics()}
      {activeTab === 'orders' && renderOrders()}
      {activeTab === 'farmers' && renderFarmers()}
      {activeTab === 'analytics' && renderAnalytics()}
    </AdminLayout>

      {/* Order Modal */}
      {showOrderModal && selectedCrop && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Agiza {selectedCrop.name}</h3>
              <button className="close-btn" onClick={() => setShowOrderModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <form onSubmit={handleSubmitOrder} className="modal-body">
              <div className="order-preview">
                <div className="crop-info">
                  <h4>Maelezo ya Zao:</h4>
                  <p><strong>Mkulima:</strong> {selectedCrop.farmerName || (selectedCrop.farmer && typeof selectedCrop.farmer === 'object' ? selectedCrop.farmer.name : selectedCrop.farmer) || 'Bila jina'}</p>
                  <p><strong>Bei ya Msingi:</strong> {selectedCrop.price}/{selectedCrop.unit || 'kg'}</p>
                  <p><strong>Kiasi Kinachopatikana:</strong> {availableOf(selectedCrop)} {selectedCrop.unit || 'kg'}</p>
                  <p><strong>Eneo:</strong> {selectedCrop.location}</p>
                </div>
              </div>
              
              <div className="form-grid">
                <div className="form-group">
                  <label>Kiasi Unachotaka ({selectedCrop.unit || 'kg'}) *</label>
                  <input
                    type="number"
                    value={orderDetails.quantity}
                    onChange={(e) => setOrderDetails({...orderDetails, quantity: e.target.value})}
                    required
                    min="1"
                    max={availableOf(selectedCrop)}
                    placeholder="Weka kiasi unachohitaji"
                  />
                </div>
                <div className="form-group">
                  <label>Tarehe ya Uwasilishaji *</label>
                  <input
                    type="date"
                    value={orderDetails.deliveryDate}
                    onChange={(e) => setOrderDetails({...orderDetails, deliveryDate: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group full-width">
                  <label>Maagizo Maalum</label>
                  <textarea
                    value={orderDetails.specialInstructions}
                    onChange={(e) => setOrderDetails({...orderDetails, specialInstructions: e.target.value})}
                    placeholder="Weka maagizo yoyote maalum kuhusu agizo lako..."
                    rows="3"
                  />
                </div>
              </div>

              {orderDetails.quantity && (
                <div className="order-summary">
                  <h4>Muhtasari wa Agizo:</h4>
                  <div className="summary-details">
                    <p><strong>Jumla ya Bei:</strong> TZS {(parseInt(selectedCrop.price) * parseInt(orderDetails.quantity) || 0).toLocaleString()}</p>
                    <p><strong>Kiasi:</strong> {orderDetails.quantity} {selectedCrop.unit || 'kg'}</p>
                    <p><strong>Bei ya Kipekee:</strong> {selectedCrop.price}/{selectedCrop.unit || 'kg'}</p>
                  </div>
                </div>
              )}

              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowOrderModal(false)}>
                  Ghairi
                </button>
                <button type="submit" className="btn btn-primary">
                  <i className="fas fa-check"></i> Thibitisha Agizo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Contact Farmer Modal */}
      {showContactModal && selectedFarmer && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Wasiliana na {selectedFarmer.name}</h3>
              <button className="close-btn" onClick={() => setShowContactModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <div className="contact-details">
                <div className="contact-info">
                  <h4>Maelezo ya Mawasiliano:</h4>
                  <p><strong>Namba ya Simu:</strong> {selectedFarmer.contact}</p>
                  <p><strong>Eneo:</strong> {selectedFarmer.location}</p>
                  {selectedFarmer.rating && (
                    <p><strong>Ukadiriaji:</strong> <i className="fas fa-star" style={{color:'#f59e0b'}}></i> {selectedFarmer.rating}</p>
                  )}
                </div>
                
                <div className="contact-tips">
                  <h5>Vidokezo vya Mawasiliano:</h5>
                  <ul>
                    <li>Jisalulishe kwa neno "Habari"</li>
                    <li>Eleza wazi kuhusu hitaji lako la mazao</li>
                    <li>Uliza maswali kuhusu ubora wa mazao</li>
                    <li>Panga mkutano wa kuona mazao</li>
                  </ul>
                </div>
              </div>
              
              <div className="modal-actions">
                <button className="btn btn-outline" onClick={() => setShowContactModal(false)}>
                  Funga
                </button>
                <a 
                  href={`tel:${selectedFarmer.contact}`}
                  className="btn btn-primary"
                >
                  <i className="fas fa-phone"></i> Piga Simu Sasa
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {showOrderDetailsModal && orderDetail && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Maelezo ya Agizo #{orderDetail.id}</h3>
              <button className="close-btn" onClick={() => setShowOrderDetailsModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <div className="order-details">
                <div className="detail-row">
                  <label>Zao:</label>
                  <span>{orderDetail.crop}</span>
                </div>
                <div className="detail-row">
                  <label>Mkulima:</label>
                  <span>{orderDetail.farmer}</span>
                </div>
                <div className="detail-row">
                  <label>Kiasi Kilichoomwa:</label>
                  <span>{qtyLabelOf(orderDetail)}</span>
                </div>
                <div className="detail-row">
                  <label>Kilichoidhinishwa:</label>
                  <span>{orderDetail.approvedQuantity != null ? `${orderDetail.approvedQuantity} ${orderDetail.unit || ''}` : '-'}</span>
                </div>
                <div className="detail-row">
                  <label>Bei:</label>
                  <span>{orderDetail.price}</span>
                </div>
                <div className="detail-row">
                  <label>Tarehe ya Mwisho Kujibiwa:</label>
                  <span>{orderDetail.expiresAt ? new Date(orderDetail.expiresAt).toLocaleString() : '-'}</span>
                </div>
                <div className="detail-row">
                  <label>Hali:</label>
                  <span className={`status-badge ${orderDetail.status}`}>
                    {statusLabelOf(orderDetail.status)}
                  </span>
                </div>
                {orderDetail.respondedAt && (
                  <div className="detail-row">
                    <label>Jibu la Mkulima:</label>
                    <span>{new Date(orderDetail.respondedAt).toLocaleString()}</span>
                  </div>
                )}
              </div>
              <div className="modal-actions">
                {orderDetail.status === 'partially_approved' && (
                  <button className="btn btn-success" disabled={remainderBusyId === orderDetail.id} onClick={() => handleRequestRemainder(orderDetail)}>
                    <i className={`fas ${remainderBusyId === orderDetail.id ? 'fa-spinner fa-spin' : 'fa-plus'}`}></i>
                    {remainderBusyId === orderDetail.id ? ' Inatuma...' : ' Omba Kiasi Kilichobaki'}
                  </button>
                )}
                <button className="btn btn-outline" onClick={() => setShowOrderDetailsModal(false)}>
                  Funga
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showRatingModal && ratingOrder && (
        <RatingModal
          order={ratingOrder}
          onClose={() => setShowRatingModal(false)}
          onSubmitted={() => {
            setShowRatingModal(false);
            alert('Asante kwa ukadiriaji wako!');
            fetchOrders();
          }}
        />
      )}
    </>
  );
};

export default BuyerDashboard;