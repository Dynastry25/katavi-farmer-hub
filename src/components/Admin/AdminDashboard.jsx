import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  AreaChart, Area, LineChart, Line
} from 'recharts';
import AdminLayout from './AdminLayout';
import { adminAPI, adminExtendedAPI, weatherAPI, marketPricesAPI } from '../../api/client';
import { useAuth } from '../../shared/context/AuthContext';
import { getRoleNavSections } from './roleNav';
import { CROP_CATEGORIES } from '../../constants/roleConfig';
import './AdminDashboard.css';

const CHART_COLORS = ['#1a7431', '#22c55e', '#f59e0b', '#3b82f6', '#16a34a', '#86efac'];

const ROLE_LABELS = {
  farmer: 'Mkulima',
  buyer: 'Mnunuzi / Muuzaji',
  expert: 'Mtaalamu / Extension',
  admin: 'Admin',
  support: 'Support',
  content_moderator: 'Msimamizi wa Maudhui',
  finance_officer: 'Afisa Fedha'
};

const ROLE_ICONS = {
  farmer: 'fas fa-tractor',
  buyer: 'fas fa-shopping-cart',
  expert: 'fas fa-graduation-cap',
  admin: 'fas fa-user-shield',
  support: 'fas fa-headset',
  content_moderator: 'fas fa-edit',
  finance_officer: 'fas fa-coins'
};

const AdminDashboard = ({ user: propUser, onAuth, onToggleChat, onRefresh }) => {
  const { user: authUser } = useAuth();
  const user = propUser || authUser;
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [roleFilter, setRoleFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [newUser, setNewUser] = useState({ name: '', email: '', phone: '', password: '', role: 'farmer', location: '' });
  const [editForm, setEditForm] = useState({ name: '', phone: '', location: '' });

  const [crops, setCrops] = useState([]);
  const [cropFilter, setCropFilter] = useState('all');

  const [marketPrices, setMarketPrices] = useState([]);
const [priceTrend, setPriceTrend] = useState([]);
const [trendCrop, setTrendCrop] = useState('');
  const [priceForm, setPriceForm] = useState({ cropName: '', category: 'cereals', region: 'Mpanda', pricePerUnit: '', unit: 'kg', isBaseline: false });

  const [loans, setLoans] = useState([]);
  const [loanFilter, setLoanFilter] = useState('all');

  const [groups, setGroups] = useState([]);
  const [news, setNews] = useState([]);
  const [articles, setArticles] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [ratings, setRatings] = useState([]);

  const [weatherZones, setWeatherZones] = useState([]);
  const [weatherConfig, setWeatherConfig] = useState({ source: 'open-meteo', baseUrl: '', apiKey: '', cacheMinutes: 60 });
  const [zoneForm, setZoneForm] = useState({ name: '', district: '', ward: '', lat: '', lon: '', active: true, alertEnabled: true, alertRainMm: 30, alertTempC: 35 });
  const [showZoneModal, setShowZoneModal] = useState(false);
  const [editingZone, setEditingZone] = useState(null);

  const [broadcastForm, setBroadcastForm] = useState({ title: '', message: '', type: 'system', targetRole: '' });

  const [toast, setToast] = useState(null);
  const [settings, setSettings] = useState({
    commissionRate: 5,
    featuredListingsEnabled: true,
    bannerMessage: '',
    bannerActive: true,
  });

  const navigate = useNavigate();

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadStats = useCallback(async () => {
    try {
      const res = await adminAPI.getStats();
      setStats(res.data);
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getUsers({ role: roleFilter, search: searchTerm || undefined });
      setUsers(Array.isArray(res.data) ? res.data : res.data.users || []);
    } catch (err) {
      console.error('Error loading users:', err);
    } finally {
      setLoading(false);
    }
  }, [roleFilter, searchTerm]);

  const loadCrops = useCallback(async () => {
    try {
      const res = await adminExtendedAPI.getCrops({ status: cropFilter });
      setCrops(Array.isArray(res.data) ? res.data : res.data.crops || []);
    } catch (err) {
      console.error('Error loading crops:', err);
    }
  }, [cropFilter]);

  const loadMarketPrices = useCallback(async () => {
    try {
      const res = await adminExtendedAPI.getMarketPrices();
      const loaded = Array.isArray(res.data) ? res.data : res.data.prices || [];
      setMarketPrices(loaded);
      if (loaded.length) {
        setTrendCrop(prev => prev || loaded[0].cropName);
      }
    } catch (err) {
      console.error('Error loading market prices:', err);
    }
  }, []);

  const loadPriceTrend = useCallback(async () => {
    if (!trendCrop) return;
    try {
      const res = await marketPricesAPI.getTrend({ cropName: trendCrop });
      setPriceTrend(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Error loading price trend:', err);
    }
  }, [trendCrop]);

  const loadLoans = useCallback(async () => {
    try {
      const res = await adminExtendedAPI.getLoanApplications({ status: loanFilter });
      setLoans(Array.isArray(res.data) ? res.data : res.data.applications || []);
    } catch (err) {
      console.error('Error loading loans:', err);
    }
  }, [loanFilter]);

  const loadGroups = useCallback(async () => {
    try {
      const res = await adminExtendedAPI.getGroups();
      setGroups(Array.isArray(res.data) ? res.data : res.data.groups || []);
    } catch (err) {
      console.error('Error loading groups:', err);
    }
  }, []);

  const loadNews = useCallback(async () => {
    try {
      const res = await adminExtendedAPI.getNewsAdmin();
      setNews(Array.isArray(res.data) ? res.data : res.data.news || []);
    } catch (err) {
      console.error('Error loading news:', err);
    }
  }, []);

  const loadArticles = useCallback(async () => {
    try {
      const res = await adminExtendedAPI.getAdvisory();
      setArticles(Array.isArray(res.data) ? res.data : res.data.articles || []);
    } catch (err) {
      console.error('Error loading articles:', err);
    }
  }, []);

  const loadNotifications = useCallback(async () => {
    try {
      const res = await adminExtendedAPI.getNotifications();
      setNotifications(Array.isArray(res.data) ? res.data : res.data.notifications || []);
    } catch (err) {
      console.error('Error loading notifications:', err);
    }
  }, []);

  const loadAuditLogs = useCallback(async () => {
    try {
      const res = await adminExtendedAPI.getAuditLogs();
      setAuditLogs(Array.isArray(res.data) ? res.data : res.data.logs || []);
    } catch (err) {
      console.error('Error loading audit logs:', err);
    }
  }, []);

  const loadDisputes = useCallback(async () => {
    try {
      const res = await adminExtendedAPI.getDisputes();
      setDisputes(Array.isArray(res.data) ? res.data : res.data.disputes || []);
    } catch (err) {
      console.error('Error loading disputes:', err);
    }
  }, []);

  const loadRatings = useCallback(async () => {
    try {
      const res = await adminExtendedAPI.getRatings();
      setRatings(Array.isArray(res.data) ? res.data : res.data.ratings || []);
    } catch (err) {
      console.error('Error loading ratings:', err);
    }
  }, []);

  const loadWeather = useCallback(async () => {
    try {
      const [zonesRes, configRes] = await Promise.all([
        weatherAPI.getZones(),
        weatherAPI.getConfigAdmin(),
      ]);
      setWeatherZones(Array.isArray(zonesRes.data) ? zonesRes.data : zonesRes.data?.zones || []);
      setWeatherConfig({
        source: configRes.data?.source || 'open-meteo',
        baseUrl: configRes.data?.baseUrl || '',
        apiKey: configRes.data?.apiKey || '',
        cacheMinutes: configRes.data?.cacheMinutes || 60,
      });
    } catch (err) {
      console.error('Error loading weather settings:', err);
    }
  }, []);

  const loadSettings = useCallback(async () => {
    try {
      const res = await adminExtendedAPI.getSettings();
      setSettings({
        commissionRate: res.data?.commissionRate ?? 5,
        featuredListingsEnabled: res.data?.featuredListingsEnabled ?? true,
        bannerMessage: res.data?.bannerMessage ?? '',
        bannerActive: res.data?.bannerActive ?? true,
      });
    } catch (err) {
      showToast(err.response?.data?.message || 'Habari ya mipangilio haikupatikana', 'error');
    }
  }, []);

  const handleSaveWeatherConfig = async () => {
    try {
      await weatherAPI.updateConfig(weatherConfig);
      showToast('Mipangilio ya hali ya hewa imehifadhiwa');
    } catch (err) {
      showToast(err.response?.data?.message || 'Hitilafu imetokea', 'error');
    }
  };

  const handleZoneSave = async () => {
    if (!zoneForm.name || !zoneForm.lat || !zoneForm.lon) {
      showToast('Jina, latitude na longitude zinahitajika', 'error');
      return;
    }
    try {
      if (editingZone) {
        await weatherAPI.updateZone(editingZone._id, { ...zoneForm, lat: Number(zoneForm.lat), lon: Number(zoneForm.lon) });
        showToast('Eneo limerekebishwa');
      } else {
        await weatherAPI.createZone({ ...zoneForm, lat: Number(zoneForm.lat), lon: Number(zoneForm.lon) });
        showToast('Eneo limeongezwa');
      }
      setShowZoneModal(false);
      setEditingZone(null);
      setZoneForm({ name: '', district: '', ward: '', lat: '', lon: '', active: true, alertEnabled: true, alertRainMm: 30, alertTempC: 35 });
      loadWeather();
    } catch (err) {
      showToast(err.response?.data?.message || 'Hitilafu imetokea', 'error');
    }
  };

  const handleZoneDelete = async (id) => {
    if (!window.confirm('Una uhakika unataka kufuta eneo hili?')) return;
    try {
      await weatherAPI.deleteZone(id);
      showToast('Eneo limefutwa');
      loadWeather();
    } catch (err) {
      showToast(err.response?.data?.message || 'Hitilafu imetokea', 'error');
    }
  };

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    if (activeTab === 'users') loadUsers();
  }, [activeTab, loadUsers]);

  useEffect(() => {
    if (activeTab === 'products') loadCrops();
  }, [activeTab, loadCrops]);

  useEffect(() => {
    if (activeTab === 'market-prices') loadMarketPrices();

    if (activeTab === 'market-prices') loadPriceTrend();
  }, [activeTab, loadMarketPrices, loadPriceTrend]);

  useEffect(() => {
    if (activeTab === 'loans') loadLoans();
  }, [activeTab, loadLoans]);

  useEffect(() => {
    if (activeTab === 'groups') loadGroups();
  }, [activeTab, loadGroups]);

  useEffect(() => {
    if (activeTab === 'news') loadNews();
  }, [activeTab, loadNews]);

  useEffect(() => {
    if (activeTab === 'advisory') loadArticles();
  }, [activeTab, loadArticles]);

  useEffect(() => {
    if (activeTab === 'notifications') loadNotifications();
  }, [activeTab, loadNotifications]);

  useEffect(() => {
    if (activeTab === 'ratings') loadRatings();
  }, [activeTab, loadRatings]);

  useEffect(() => {
    if (activeTab === 'audit-logs') loadAuditLogs();
  }, [activeTab, loadAuditLogs]);

  useEffect(() => {
    if (activeTab === 'disputes') loadDisputes();
  }, [activeTab, loadDisputes]);

  useEffect(() => {
    if (activeTab === 'weather' && user.role === 'admin') loadWeather();
  }, [activeTab, loadWeather, user.role]);

  useEffect(() => {
    if (activeTab === 'settings') loadSettings();
  }, [activeTab, loadSettings]);

  // Debounce search
  useEffect(() => {
    if (activeTab !== 'users') return;
    const t = setTimeout(() => loadUsers(), 400);
    return () => clearTimeout(t);
  }, [searchTerm, activeTab, loadUsers]);

  // ---- User Management Handlers ----
  const handleRoleChange = async (id, role) => {
    if (id === user?._id) {
      showToast('Huwezi kubadilisha jukumu lako mwenyewe', 'error');
      return;
    }
    try {
      await adminAPI.updateRole(id, role);
      showToast('Jukumu limebadilishwa kikamilifu');
      loadUsers();
    } catch (err) {
      showToast(err.response?.data?.message || 'Hitilafu imetokea', 'error');
    }
  };

  const handleSuspend = async (id, suspend) => {
    if (id === user?._id) {
      showToast('Huwezi kusimamisha mwenyewe', 'error');
      return;
    }
    try {
      await adminExtendedAPI.suspendUser(id, suspend);
      showToast(suspend ? 'Mtumiaji amesimamishwa' : 'Mtumiaji amewashwa');
      loadUsers();
    } catch (err) {
      showToast(err.response?.data?.message || 'Hitilafu imetokea', 'error');
    }
  };

  const handleDeleteUser = async (id) => {
    if (id === user?._id) {
      showToast('Huwezi kujifuta mwenyewe', 'error');
      return;
    }
    if (!window.confirm('Una uhakika unataka kumfuta mtumiaji huyu?')) return;
    try {
      await adminAPI.deleteUser(id);
      showToast('Mtumiaji amefutwa');
      loadUsers();
    } catch (err) {
      showToast(err.response?.data?.message || 'Hitilafu imetokea', 'error');
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await adminAPI.createUser(newUser);
      showToast('Mtumiaji mpya ameundwa');
      setShowCreateModal(false);
      setNewUser({ name: '', email: '', phone: '', password: '', role: 'farmer', location: '' });
      loadUsers();
    } catch (err) {
      showToast(err.response?.data?.message || 'Hitilafu imetokea', 'error');
    }
  };

  const openEdit = (u) => {
    setEditingUser(u);
    setEditForm({ name: u.name, phone: u.phone, location: u.location });
    setShowEditModal(true);
  };

  const handleEditUser = async (e) => {
    e.preventDefault();
    try {
      await adminAPI.updateUser(editingUser._id, editForm);
      showToast('Mtumiaji amesasishwa');
      setShowEditModal(false);
      loadUsers();
    } catch (err) {
      showToast(err.response?.data?.message || 'Hitilafu imetokea', 'error');
    }
  };

  // ---- Product Moderation Handlers ----
  const handleModerateCrop = async (id, status) => {
    try {
      await adminExtendedAPI.moderateCrop(id, status);
      showToast('Zao limerekebishwa');
      loadCrops();
    } catch (err) {
      showToast(err.response?.data?.message || 'Hitilafu imetokea', 'error');
    }
  };

  // ---- Market Price Handlers ----
  const handleCreatePrice = async (e) => {
    e.preventDefault();
    try {
      await adminExtendedAPI.createMarketPrice(priceForm);
      showToast('Bei imeongezwa');
      setPriceForm({ cropName: '', category: 'cereals', region: 'Mpanda', pricePerUnit: '', unit: 'kg', isBaseline: false });
      loadMarketPrices();
    } catch (err) {
      showToast(err.response?.data?.message || 'Hitilafu imetokea', 'error');
    }
  };

  const handleDeletePrice = async (id) => {
    if (!window.confirm('Una uhakika unataka kufuta bei hii?')) return;
    try {
      await adminExtendedAPI.deleteMarketPrice(id);
      showToast('Bei imefutwa');
      loadMarketPrices();
    } catch (err) {
      showToast(err.response?.data?.message || 'Hitilafu imetokea', 'error');
    }
  };

  // ---- Loan Moderation Handlers ----
  const handleModerateLoan = async (id, status) => {
    try {
      await adminExtendedAPI.moderateLoan(id, status);
      showToast(status === 'approved' ? 'Mkopo umekubaliwa' : 'Mkopo umekataliwa');
      loadLoans();
    } catch (err) {
      showToast(err.response?.data?.message || 'Hitilafu imetokea', 'error');
    }
  };

  const handleUpdateRepayment = async (id, repaymentStatus) => {
    try {
      await adminExtendedAPI.updateLoanRepayment(id, { repaymentStatus });
      showToast('Malipo ya mkopo yamerekebishwa');
      loadLoans();
    } catch (err) {
      showToast(err.response?.data?.message || 'Hitilafu imetokea', 'error');
    }
  };

  const handleVerifyUser = async (id, verify) => {
    try {
      await adminExtendedAPI.verifyUser(id, verify);
      showToast(verify ? 'Mtumiaji amethibitishwa' : 'Uthibitisho umeondolewa');
      loadUsers();
    } catch (err) {
      showToast(err.response?.data?.message || 'Hitilafu imetokea', 'error');
    }
  };

  const handleModerateAdvice = async (id, status) => {
    try {
      await adminExtendedAPI.moderateAdvisory(id, status);
      showToast('Makala imerekebishwa');
      loadArticles();
    } catch (err) {
      showToast(err.response?.data?.message || 'Hitilafu imetokea', 'error');
    }
  };

  const handleModerateNews = async (id, status) => {
    try {
      await adminExtendedAPI.moderateNews(id, status);
      showToast('Habari imerekebishwa');
      loadNews();
    } catch (err) {
      showToast(err.response?.data?.message || 'Hitilafu imetokea', 'error');
    }
  };

  const handleResolveDispute = async (id, status, resolution) => {
    try {
      await adminExtendedAPI.resolveDispute(id, { status, resolution });
      showToast('Mgogoro umetatuliwa');
      loadDisputes();
    } catch (err) {
      showToast(err.response?.data?.message || 'Hitilafu imetokea', 'error');
    }
  };

  // ---- Broadcast ----
  const handleBroadcast = async (e) => {
    e.preventDefault();
    try {
      const res = await adminExtendedAPI.broadcastNotification(broadcastForm);
      showToast(res.data?.message || 'Ujumbe umetumwa');
      setBroadcastForm({ title: '', message: '', type: 'system', targetRole: '' });
    } catch (err) {
      showToast(err.response?.data?.message || 'Hitilafu imetokea', 'error');
    }
  };

  // ---- Settings ----
  const handleSaveSettings = async () => {
    try {
      await adminExtendedAPI.updateSettings({
        commissionRate: Number(settings.commissionRate),
        featuredListingsEnabled: settings.featuredListingsEnabled,
        bannerMessage: settings.bannerMessage,
        bannerActive: settings.bannerActive,
      });
      loadSettings();
      showToast('Mipangilio imehifadhiwa');
    } catch (err) {
      showToast(err.response?.data?.message || 'Hitilafu imetokea', 'error');
    }
  };

  const navSections = getRoleNavSections({
    role: user.role,
    navigate,
    activeTab,
    onTab: setActiveTab,
  });

  // ================== RENDERERS ==================

  const renderStats = () => {
    const statCards = [
      { label: 'Wakulima', value: stats?.farmers ?? 0, icon: 'fas fa-tractor' },
      { label: 'Wanunuzi', value: stats?.buyers ?? 0, icon: 'fas fa-shopping-cart' },
      { label: 'Wataalamu', value: stats?.experts ?? 0, icon: 'fas fa-graduation-cap' },
      { label: 'Jumla ya Watumiaji', value: stats?.totalUsers ?? 0, icon: 'fas fa-users' },
      { label: 'Mazao', value: stats?.totalCrops ?? 0, icon: 'fas fa-wheat-awn' },
      { label: 'Maagizo', value: stats?.totalOrders ?? 0, icon: 'fas fa-shopping-basket' },
      { label: 'Bidhaa', value: stats?.totalProducts ?? 0, icon: 'fas fa-industry' },
      { label: 'Mikopo', value: stats?.totalLoans ?? 0, icon: 'fas fa-hand-holding-usd' },
      { label: 'Vikundi', value: stats?.totalGroups ?? 0, icon: 'fas fa-users' },
      { label: 'Arifa', value: stats?.totalNotifications ?? 0, icon: 'fas fa-bell' },
    ];

    const roleData = [
      { name: 'Wakulima', value: stats?.farmers ?? 0, color: '#1a7431' },
      { name: 'Wanunuzi', value: stats?.buyers ?? 0, color: '#3b82f6' },
      { name: 'Wataalamu', value: stats?.experts ?? 0, color: '#f59e0b' },
      { name: 'Admin', value: stats?.admins ?? 0, color: '#dc2626' },
    ].filter(d => d.value > 0);

    const activityData = [
      { name: 'Mazao', value: stats?.totalCrops ?? 0 },
      { name: 'Bidhaa', value: stats?.totalProducts ?? 0 },
      { name: 'Maagizo', value: stats?.totalOrders ?? 0 },
      { name: 'Mikopo', value: stats?.totalLoans ?? 0 },
      { name: 'Vikundi', value: stats?.totalGroups ?? 0 },
    ];

    const growthData = (stats?.monthlyUsers && stats.monthlyUsers.length)
      ? stats.monthlyUsers
      : [
          { month: 'Jan', users: 4 }, { month: 'Feb', users: 7 },
          { month: 'Mar', users: 9 }, { month: 'Apr', users: 12 },
          { month: 'May', users: 15 }, { month: 'Juni', users: 20 },
        ];

    const recentUsers = stats?.recentUsers || [];

    return (
      <div className="admin-overview">
        <div className="admin-stat-grid">
          {statCards.map((s, i) => (
            <div className="admin-stat-card" key={i}>
              <div className="admin-stat-icon"><i className={s.icon}></i></div>
              <div className="admin-stat-content">
                <div className="admin-stat-value">{s.value}</div>
                <div className="admin-stat-label">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="admin-charts-row">
          <div className="admin-chart-card">
            <h3>Watumiaji kwa Jukumu</h3>
            <div className="chart-body">
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={roleData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={95} paddingAngle={3}>
                    {roleData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="admin-chart-card">
            <h3>Shughuli za Jukwaa</h3>
            <div className="chart-body">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={activityData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" name="Idadi" fill="#1a7431" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="admin-charts-row">
          <div className="admin-chart-card">
            <h3>Ukuaji wa Watumiaji (miezi 6)</h3>
            <div className="chart-body">
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={growthData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1a7431" stopOpacity={0.7} />
                      <stop offset="95%" stopColor="#1a7431" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="users" name="Watumiaji" stroke="#1a7431" fill="url(#colorUsers)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="admin-chart-card">
            <h3>Watumiaji Waingiapo Hivi Karibuni</h3>
            <div className="recent-users">
              {recentUsers.length === 0 ? (
                <div className="no-data">Hakuna data ya watumiaji</div>
              ) : (
                recentUsers.map(u => (
                  <div className="recent-user" key={u._id}>
                    <span className={`ru-avatar role-${u.role}`}><i className={ROLE_ICONS[u.role] || 'fas fa-user'}></i></span>
                    <div className="ru-meta">
                      <strong>{u.name}</strong>
                      <span>{u.email}</span>
                    </div>
                    <span className={`role-pill role-${u.role}`}>{ROLE_LABELS[u.role] || u.role}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="admin-quick-actions">
          <h3>Vitendo vya Haraka</h3>
          <div className="admin-actions-grid">
            <button className="action-btn" onClick={() => setActiveTab('users')}>
              <i className="fas fa-user-plus"></i> Dhibiti Watumiaji
            </button>
            <button className="action-btn" onClick={() => setActiveTab('products')}>
              <i className="fas fa-leaf"></i> Simamia Mazao
            </button>
            <button className="action-btn" onClick={() => setActiveTab('market-prices')}>
              <i className="fas fa-chart-line"></i> Bei za Soko
            </button>
            <button className="action-btn" onClick={() => setActiveTab('loans')}>
              <i className="fas fa-hand-holding-usd"></i> Mikopo
            </button>
            <button className="action-btn" onClick={() => navigate('/admin-reports')}>
              <i className="fas fa-chart-bar"></i> Ripoti za Mfumo
            </button>
            <button className="action-btn" onClick={onRefresh}>
              <i className="fas fa-sync-alt"></i> Refresh
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderUsers = () => (
    <div className="admin-users">
      <div className="users-toolbar">
        <div className="search-box">
          <i className="fas fa-search"></i>
          <input
            type="text"
            placeholder="Tafuta kwa jina, barua pepe, au simu..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          className="role-filter"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        >
          <option value="all">Watumiaji Wote</option>
          <option value="farmer">Wakulima</option>
          <option value="buyer">Wanunuzi</option>
          <option value="expert">Wataalamu</option>
          <option value="admin">Admin</option>
          <option value="support">Support</option>
          <option value="content_moderator">Msimamizi wa Maudhui</option>
          <option value="finance_officer">Afisa Fedha</option>
        </select>
        {user.role === 'admin' && (
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            <i className="fas fa-user-plus"></i> Ongeza Mtumiaji
          </button>
        )}
      </div>

      {loading ? (
        <div className="admin-loading"><i className="fas fa-spinner fa-spin"></i> Inapakia...</div>
      ) : users.length === 0 ? (
        <div className="empty-state">
          <i className="fas fa-users"></i>
          <h4>Hakuna watumiaji waliofanana na utafutaji</h4>
        </div>
      ) : (
        <div className="users-table-container">
          <table className="users-table">
            <thead>
              <tr>
                <th>Mtumiaji</th>
                <th>Simu</th>
                <th>Eneo</th>
                <th>Jukumu</th>
                <th>Thamani</th>
                <th>Hali</th>
                <th>Amejiunga</th>
                <th>Vitendo</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u._id}>
                  <td>
                    <div className="user-cell">
                      <div className="user-avatar"><i className="fas fa-user"></i></div>
                      <div className="user-meta">
                        <strong>{u.name} {u._id === user?._id && <span className="you-tag">Wewe</span>}</strong>
                        <span>{u.email}</span>
                        {u.isVerified && (
                          <span className="verified-badge" title="Mtumiaji aliyethibitishwa">
                            <i className="fas fa-check-circle"></i> Imethibitishwa
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>{u.phone}</td>
                  <td>{u.location || u.district || '—'}</td>
                  <td>
                    <span className={`role-pill role-${u.role}`}>
                      <i className={ROLE_ICONS[u.role] || 'fas fa-user'}></i> {ROLE_LABELS[u.role] || u.role}
                    </span>
                  </td>
                  <td>
                    <span className={`status-pill ${u.isActive === false ? 'status-banned' : 'status-active'}`}>
                      {u.isActive === false ? 'Imesimamishwa' : 'Hai'}
                    </span>
                  </td>
                  <td>
                    <div className="trust-score-cell">
                      <span className="score-stars">
                        {'★'.repeat(Math.max(1, Math.min(5, Math.round(u.trustScore || u.creditScore || 0))))}
                      </span>
                      <span className="score-value">
                        {(u.trustScore || u.creditScore || 0).toFixed(1)}
                      </span>
                      {u.creditScore > 0 && (
                        <small className="score-sub">Mikopo: {u.creditScore.toFixed(1)}</small>
                      )}
                    </div>
                  </td>
                  <td>{u.createdAt ? new Date(u.createdAt).toLocaleDateString('sw-TZ') : '—'}</td>
                  <td>
                    <div className="user-actions">
                      <select
                        className="role-select"
                        value={u.role}
                        onChange={(e) => handleRoleChange(u._id, e.target.value)}
                      >
                        <option value="farmer">Mkulima</option>
                        <option value="buyer">Mnunuzi</option>
                        <option value="expert">Mtaalamu</option>
                        <option value="admin">Admin</option>
                        {user.role === 'admin' && (
                          <>
                            <option value="support">Support</option>
                            <option value="content_moderator">Msimamizi wa Maudhui</option>
                            <option value="finance_officer">Afisa Fedha</option>
                          </>
                        )}
                      </select>
                      <button className="btn btn-sm btn-outline" onClick={() => openEdit(u)} title="Hariri">
                        <i className="fas fa-edit"></i>
                      </button>
                      <button
                        className={`btn btn-sm ${u.isActive === false ? 'btn-outline' : 'btn-warning'}`}
                        onClick={() => handleSuspend(u._id, u.isActive !== false)}
                        disabled={u._id === user?._id}
                        title={u.isActive === false ? 'Washa' : 'Simamisha'}
                      >
                        <i className={`fas ${u.isActive === false ? 'fa-play' : 'fa-pause'}`}></i>
                      </button>
                      <button
                        className={`btn btn-sm ${u.isVerified ? 'btn-outline' : 'btn-success'}`}
                        onClick={() => handleVerifyUser(u._id, !u.isVerified)}
                        disabled={u._id === user?._id}
                        title={u.isVerified ? 'Ondoa uthibitisho' : 'Thibitisha (KYC)'}
                      >
                        <i className="fas fa-check-double"></i>
                      </button>
                      {user.role === 'admin' && (
                        <button className="btn btn-sm btn-danger" onClick={() => handleDeleteUser(u._id)} disabled={u._id === user?._id} title="Futa">
                          <i className="fas fa-trash"></i>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderProducts = () => (
    <div className="admin-products">
      <div className="users-toolbar">
        <select className="role-filter" value={cropFilter} onChange={(e) => setCropFilter(e.target.value)}>
          <option value="all">Mazao Yote</option>
          <option value="available">Yanayopatikana</option>
          <option value="sold">Yameuzwa</option>
          <option value="reserved">Yamehifadhiwa</option>
          <option value="rejected">Yamekataliwa</option>
        </select>
      </div>
      <div className="users-table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>Zao</th>
              <th>Aina</th>
              <th>Bei (TZS)</th>
              <th>Eneo</th>
              <th>Mkulima</th>
              <th>Hali</th>
              <th>Vitendo</th>
            </tr>
          </thead>
          <tbody>
            {crops.map(c => (
              <tr key={c._id}>
                <td>
                  <div className="user-cell">
                    {c.image && <img src={c.image} alt={c.name} className="crop-thumb" />}
                    <div className="user-meta"><strong>{c.name}</strong></div>
                  </div>
                </td>
                <td>{c.category}</td>
                <td>{c.price}</td>
                <td>{c.location}</td>
                <td>{c.farmerName}</td>
                <td><span className={`role-pill role-${c.status}`}>{c.status}</span></td>
                <td>
                  <div className="user-actions">
                    <select
                      className="role-select"
                      value={c.status}
                      onChange={(e) => handleModerateCrop(c._id, e.target.value)}
                    >
                      <option value="available">Inapatikana</option>
                      <option value="sold">Imeuzwa</option>
                      <option value="reserved">Imehifadhiwa</option>
                      <option value="rejected">Imekataliwa</option>
                    </select>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderMarketPrices = () => (
    <div className="admin-market-prices">
      <div className="section-card">
        <h3>Mwelekeo wa Bei (Trend)</h3>
        {marketPrices.length > 0 && (
          <select
            className="role-filter"
            style={{ marginBottom: '14px' }}
            value={trendCrop}
            onChange={(e) => setTrendCrop(e.target.value)}
          >
            {[...new Set(marketPrices.map(p => p.cropName))].map(crop => (
              <option key={crop} value={crop}>{crop}</option>
            ))}
          </select>
        )}
        {priceTrend.length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={priceTrend} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => [`${Number(v).toLocaleString()} TZS`, 'Bei']} />
              <Area type="monotone" dataKey="price" stroke="#1a7431" fill="#22c55e" fillOpacity={0.25} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <p className="empty-state" style={{ padding: '20px 0' }}>
            <i className="fas fa-chart-line"></i> Hakuna data ya mwelekeo kwa zao hili bado.
          </p>
        )}
      </div>

      <div className="section-card">
        <h3>Ongeza Bei Mpya</h3>
        <form onSubmit={handleCreatePrice} className="price-form">
          <div className="form-grid">
            <div className="form-group">
              <label>Zao *</label>
              <input type="text" value={priceForm.cropName} onChange={(e) => setPriceForm({ ...priceForm, cropName: e.target.value })} required placeholder="Mf. Mahindi" />
            </div>
            <div className="form-group">
              <label>Aina</label>
              <select value={priceForm.category} onChange={(e) => setPriceForm({ ...priceForm, category: e.target.value })}>
                {CROP_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Mkoa / Eneo</label>
              <input type="text" value={priceForm.region} onChange={(e) => setPriceForm({ ...priceForm, region: e.target.value })} required placeholder="Mpanda" />
            </div>
            <div className="form-group">
              <label>Bei kwa Kitengo (TZS) *</label>
              <input type="number" min="0" value={priceForm.pricePerUnit} onChange={(e) => setPriceForm({ ...priceForm, pricePerUnit: e.target.value })} required placeholder="2500" />
            </div>
            <div className="form-group">
              <label>Kitengo</label>
              <select value={priceForm.unit} onChange={(e) => setPriceForm({ ...priceForm, unit: e.target.value })}>
                <option value="kg">Kilogramu</option>
                <option value="bag">Gunia</option>
                <option value="tonne">Tani</option>
                <option value="piece">Kipande</option>
              </select>
            </div>
            <div className="form-group checkbox-group">
              <label>
                <input type="checkbox" checked={priceForm.isBaseline} onChange={(e) => setPriceForm({ ...priceForm, isBaseline: e.target.checked })} />
                Bei ya Msingi
              </label>
            </div>
          </div>
          <div className="modal-actions">
            <button type="submit" className="btn btn-primary"><i className="fas fa-plus"></i> Ongeza Bei</button>
          </div>
        </form>
      </div>

      <div className="users-table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>Zao</th>
              <th>Aina</th>
              <th>Eneo</th>
              <th>Bei (TZS)</th>
              <th>Tarehe</th>
              <th>Msingi</th>
              <th>Vitendo</th>
            </tr>
          </thead>
          <tbody>
            {marketPrices.map(p => (
              <tr key={p._id}>
                <td><strong>{p.cropName}</strong></td>
                <td>{p.category}</td>
                <td>{p.region}</td>
                <td>{p.pricePerUnit}</td>
                <td>{new Date(p.dateRecorded).toLocaleDateString('sw-TZ')}</td>
                <td>{p.isBaseline ? <span className="role-pill role-admin">Msingi</span> : '—'}</td>
                <td>
                  <button className="btn btn-sm btn-danger" onClick={() => handleDeletePrice(p._id)}>
                    <i className="fas fa-trash"></i>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderLoans = () => (
    <div className="admin-loans">
      <div className="users-toolbar">
        <select className="role-filter" value={loanFilter} onChange={(e) => setLoanFilter(e.target.value)}>
          <option value="all">Maombi Yote</option>
          <option value="pending">Yanasubiri</option>
          <option value="approved">Yamekubaliwa</option>
          <option value="rejected">Yamekataliwa</option>
          <option value="completed">Yamekamilika</option>
        </select>
      </div>
      <div className="users-table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>Mlengwa</th>
              <th>Mkopo</th>
              <th>Kiasi</th>
              <th>Tarehe</th>
              <th>Hali</th>
              <th>Malipo</th>
              <th>Vitendo</th>
            </tr>
          </thead>
          <tbody>
            {loans.map(l => (
              <tr key={l._id}>
                <td><strong>{l.user?.name || 'N/A'}</strong></td>
                <td>{l.loanName}</td>
                <td>{l.amount}</td>
                <td>{new Date(l.createdAt).toLocaleDateString('sw-TZ')}</td>
                <td><span className={`role-pill role-${l.status}`}>{l.status}</span></td>
                <td>
                  <div className="repayment-cell">
                    <select
                      className="repayment-select"
                      value={l.repaymentStatus || 'none'}
                      onChange={(e) => handleUpdateRepayment(l._id, e.target.value)}
                    >
                      <option value="none">Hakuna malipo</option>
                      <option value="partial">Sehemu ya malipo</option>
                      <option value="paid">Imelipwa</option>
                      <option value="overdue">Imekwama</option>
                    </select>
                    {l.remaining ? <span className="repayment-note">Bado: {l.remaining}</span> : null}
                  </div>
                </td>
                <td>
                  {l.status === 'pending' && (
                    <div className="user-actions">
                      <button className="btn btn-sm btn-primary" onClick={() => handleModerateLoan(l._id, 'approved')}>
                        <i className="fas fa-check"></i> Kubali
                      </button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleModerateLoan(l._id, 'rejected')}>
                        <i className="fas fa-times"></i> Kataa
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderGroups = () => (
    <div className="admin-groups">
      <div className="users-table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>Kikundi</th>
              <th>Eneo</th>
              <th>Aina ya Mazao</th>
              <th>Wanachama</th>
              <th>Mwenyeji</th>
            </tr>
          </thead>
          <tbody>
            {groups.map(g => (
              <tr key={g._id}>
                <td><strong>{g.name}</strong></td>
                <td>{g.location}</td>
                <td>{g.cropType}</td>
                <td>{g.members?.length || 0}</td>
                <td>{g.creatorName}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderNews = () => (
    <div className="admin-news">
      <div className="users-table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>Kichwa</th>
              <th>Aina</th>
              <th>Mwandishi</th>
              <th>Tarehe</th>
              <th>Hali</th>
              <th>Vitendo</th>
            </tr>
          </thead>
          <tbody>
            {news.map(n => (
              <tr key={n._id}>
                <td><strong>{n.title}</strong></td>
                <td>{n.category}</td>
                <td>{n.author}</td>
                <td>{new Date(n.date || n.createdAt).toLocaleDateString('sw-TZ')}</td>
                <td>
                  <span className={`role-pill role-${n.status || 'approved'}`}>
                    {n.status === 'approved' ? 'Imekubaliwa' : n.status === 'pending' ? 'Inasubiri' : 'Imekataliwa'}
                  </span>
                </td>
                <td>
                  <div className="user-actions">
                    {n.status === 'pending' && (
                      <>
                        <button className="btn btn-sm btn-success" onClick={() => handleModerateNews(n._id, 'approved')}>
                          <i className="fas fa-check"></i>
                        </button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleModerateNews(n._id, 'rejected')}>
                          <i className="fas fa-times"></i>
                        </button>
                      </>
                    )}
                    {n.status === 'rejected' && (
                      <button className="btn btn-sm btn-primary" onClick={() => handleModerateNews(n._id, 'approved')}>
                        <i className="fas fa-check"></i> Kubali
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderAdvisory = () => (
    <div className="admin-advisory">
      <div className="users-table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>Kichwa</th>
              <th>Aina</th>
              <th>Tarehe</th>
              <th>Muda wa Kusoma</th>
              <th>Hali</th>
              <th>Vitendo</th>
            </tr>
          </thead>
          <tbody>
            {articles.map(a => (
              <tr key={a._id}>
                <td><strong>{a.title}</strong></td>
                <td>{a.category}</td>
                <td>{new Date(a.date || a.createdAt).toLocaleDateString('sw-TZ')}</td>
                <td>{a.readTime}</td>
                <td>
                  <span className={`role-pill role-${a.status || 'approved'}`}>
                    {a.status === 'approved' ? 'Imekubaliwa' : a.status === 'pending' ? 'Inasubiri' : 'Imekataliwa'}
                  </span>
                </td>
                <td>
                  <div className="user-actions">
                    {a.status === 'pending' && (
                      <>
                        <button className="btn btn-sm btn-success" onClick={() => handleModerateAdvice(a._id, 'approved')}>
                          <i className="fas fa-check"></i>
                        </button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleModerateAdvice(a._id, 'rejected')}>
                          <i className="fas fa-times"></i>
                        </button>
                      </>
                    )}
                    {a.status === 'rejected' && (
                      <button className="btn btn-sm btn-primary" onClick={() => handleModerateAdvice(a._id, 'approved')}>
                        <i className="fas fa-check"></i> Kubali
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderNotifications = () => (
    <div className="admin-notifications">
      <div className="section-card">
        <h3>Tuma Ujumbe kwa Watumiaji</h3>
        <form onSubmit={handleBroadcast} className="broadcast-form">
          <div className="form-grid">
            <div className="form-group">
              <label>Kichwa *</label>
              <input type="text" value={broadcastForm.title} onChange={(e) => setBroadcastForm({ ...broadcastForm, title: e.target.value })} required placeholder="Mf. Tahadhari ya Mvua" />
            </div>
            <div className="form-group">
              <label>Aina</label>
              <select value={broadcastForm.type} onChange={(e) => setBroadcastForm({ ...broadcastForm, type: e.target.value })}>
                <option value="system">Mfumo</option>
                <option value="weather">Hali ya Hewa</option>
                <option value="price">Bei</option>
                <option value="loan">Mikopo</option>
                <option value="order">Maagizo</option>
              </select>
            </div>
            <div className="form-group">
              <label>Lenga Jukumu</label>
              <select value={broadcastForm.targetRole} onChange={(e) => setBroadcastForm({ ...broadcastForm, targetRole: e.target.value })}>
                <option value="">Wafuasi Wote</option>
                <option value="farmer">Wakulima</option>
                <option value="buyer">Wanunuzi</option>
                <option value="expert">Wataalamu</option>
              </select>
            </div>
            <div className="form-group full-width">
              <label>Ujumbe *</label>
              <textarea value={broadcastForm.message} onChange={(e) => setBroadcastForm({ ...broadcastForm, message: e.target.value })} required rows="4" placeholder="Andika ujumbe..." />
            </div>
          </div>
          <div className="modal-actions">
            <button type="submit" className="btn btn-primary"><i className="fas fa-paper-plane"></i> Tuma Ujumbe</button>
          </div>
        </form>
      </div>

      <div className="users-table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>Kichwa</th>
              <th>Ujumbe</th>
              <th>Aina</th>
              <th>Mlengwa</th>
              <th>Tarehe</th>
            </tr>
          </thead>
          <tbody>
            {notifications.map(n => (
              <tr key={n._id}>
                <td><strong>{n.title}</strong></td>
                <td>{n.message}</td>
                <td>{n.type}</td>
                <td>{n.user?.name || 'N/A'}</td>
                <td>{new Date(n.createdAt).toLocaleDateString('sw-TZ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderDisputes = () => (
    <div className="admin-disputes">
      <div className="users-table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>Zao</th>
              <th>Mnunuzi</th>
              <th>Mkulima</th>
              <th>Hali</th>
              <th>Tarehe</th>
              <th>Uamuzi</th>
              <th>Vitendo</th>
            </tr>
          </thead>
          <tbody>
            {disputes.map(d => (
              <tr key={d._id}>
                <td><strong>{d.cropName}</strong></td>
                <td>{d.buyerName}</td>
                <td>{d.farmerName}</td>
                <td><span className="role-pill role-rejected">{d.status}</span></td>
                <td>{new Date(d.createdAt).toLocaleDateString('sw-TZ')}</td>
                <td>{d.resolution || '—'}</td>
                <td>
                  <div className="user-actions">
                    <button
                      className="btn btn-sm btn-success"
                      onClick={() => handleResolveDispute(d._id, 'completed', 'Mgogoro umetatuliwa kwa kukamilisha agizo')}
                      title="Kamilisha agizo"
                    >
                      <i className="fas fa-check"></i> Tatua
                    </button>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => handleResolveDispute(d._id, 'cancelled', 'Agizo limekatishwa baada ya mgogoro')}
                      title="Katisha agizo"
                    >
                      <i className="fas fa-times"></i> Katisha
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderAuditLogs = () => (
    <div className="admin-audit-logs">
      <div className="users-table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>Mhusika</th>
              <th>Kitendo</th>
              <th>Aina</th>
              <th>Maelezo</th>
              <th>Tarehe</th>
            </tr>
          </thead>
          <tbody>
            {auditLogs.map(l => (
              <tr key={l._id}>
                <td><strong>{l.userName}</strong> <span className="role-pill">{l.userRole}</span></td>
                <td>{l.action}</td>
                <td>{l.category}</td>
                <td>{l.details ? JSON.stringify(l.details).slice(0, 50) : '—'}</td>
                <td>{new Date(l.createdAt).toLocaleString('sw-TZ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderRatings = () => (
    <div className="admin-ratings">
      <div className="users-table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>Mtoa</th>
              <th>Alionwa</th>
              <th>Alama</th>
              <th>Maoni</th>
              <th>Tarehe</th>
            </tr>
          </thead>
          <tbody>
            {ratings.map(r => (
              <tr key={r._id}>
                <td><strong>{r.raterName}</strong></td>
                <td>{r.ratedUser?.name || '—'}</td>
                <td>{'⭐'.repeat(r.rating)} ({r.rating}/5)</td>
                <td>{r.comment || '—'}</td>
                <td>{new Date(r.createdAt).toLocaleDateString('sw-TZ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderWeather = () => (
    <div className="admin-weather">
      <div className="weather-config-section">
        <div className="section-card">
          <h3>Chanzo cha Data ya Hali ya Hewa</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>Chanzo</label>
              <select
                value={weatherConfig.source}
                onChange={(e) => setWeatherConfig({ ...weatherConfig, source: e.target.value })}
              >
                <option value="open-meteo">Open-Meteo</option>
                <option value="openweather">OpenWeather</option>
              </select>
            </div>
            <div className="form-group">
              <label>Base URL (hiari)</label>
              <input
                type="text"
                value={weatherConfig.baseUrl}
                onChange={(e) => setWeatherConfig({ ...weatherConfig, baseUrl: e.target.value })}
                placeholder="Inaachwa wazi kutumia default"
              />
            </div>
            <div className="form-group">
              <label>API Key (hiari)</label>
              <input
                type="password"
                value={weatherConfig.apiKey}
                onChange={(e) => setWeatherConfig({ ...weatherConfig, apiKey: e.target.value })}
                placeholder="Open-Meteo hakihitaji key"
              />
            </div>
            <div className="form-group">
              <label>Cache (dakika)</label>
              <input
                type="number"
                min="5"
                max="1440"
                value={weatherConfig.cacheMinutes}
                onChange={(e) => setWeatherConfig({ ...weatherConfig, cacheMinutes: e.target.value })}
              />
            </div>
          </div>
          <div className="form-actions">
            <button className="btn btn-primary" onClick={handleSaveWeatherConfig}>
              <i className="fas fa-save"></i> Hifadhi Chanzo
            </button>
          </div>
        </div>
      </div>

      <div className="weather-zones-section">
        <div className="section-card">
          <div className="section-header">
            <h3>Maeneo ya Tahadhari</h3>
            <button className="btn btn-primary" onClick={() => { setEditingZone(null); setZoneForm({ name: '', district: '', ward: '', lat: '', lon: '', active: true, alertEnabled: true, alertRainMm: 30, alertTempC: 35 }); setShowZoneModal(true); }}>
              <i className="fas fa-plus"></i> Ongeza Eneo
            </button>
          </div>
          <div className="users-table-container">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Eneo</th>
                  <th>Wilaya</th>
                  <th>Kata</th>
                  <th>Hali</th>
                  <th>Tahadhari ya Mvua (mm)</th>
                  <th>Tahadhari ya Joto (°C)</th>
                  <th>Vitendo</th>
                </tr>
              </thead>
              <tbody>
                {weatherZones.length === 0 ? (
                  <tr><td colSpan="7" className="no-data">Hakuna maeneo — ongeza eneo la kwanza</td></tr>
                ) : weatherZones.map(z => (
                  <tr key={z._id}>
                    <td><strong>{z.name}</strong><br /><span className="muted">({z.lat}, {z.lon})</span></td>
                    <td>{z.district || '—'}</td>
                    <td>{z.ward || '—'}</td>
                    <td>
                      <span className={`status-pill ${z.active ? 'status-active' : 'status-banned'}`}>
                        {z.active ? 'Inatumika' : 'Imesimamishwa'}
                      </span>
                    </td>
                    <td>{z.alertEnabled ? `${z.alertRainMm} mm` : 'Off'}</td>
                    <td>{z.alertEnabled ? `${z.alertTempC}°C` : 'Off'}</td>
                    <td>
                      <div className="user-actions">
                        <button className="btn btn-sm btn-outline" onClick={() => { setEditingZone(z); setZoneForm({ name: z.name, district: z.district, ward: z.ward, lat: z.lat, lon: z.lon, active: z.active, alertEnabled: z.alertEnabled, alertRainMm: z.alertRainMm, alertTempC: z.alertTempC }); setShowZoneModal(true); }} title="Hariri">
                          <i className="fas fa-edit"></i>
                        </button>
                        <button
                          className={`btn btn-sm ${z.active ? 'btn-warning' : 'btn-outline'}`}
                          onClick={async () => { await weatherAPI.updateZone(z._id, { active: !z.active }); loadWeather(); }}
                          title={z.active ? 'Simamisha' : 'Washa'}
                        >
                          <i className={`fas ${z.active ? 'fa-pause' : 'fa-play'}`}></i>
                        </button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleZoneDelete(z._id)} title="Futa">
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showZoneModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>{editingZone ? `Hariri ${editingZone.name}` : 'Ongeza Eneo Mpya'}</h3>
              <button className="close-btn" onClick={() => setShowZoneModal(false)}><i className="fas fa-times"></i></button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label>Jina la Eneo *</label>
                  <input type="text" value={zoneForm.name} onChange={(e) => setZoneForm({ ...zoneForm, name: e.target.value })} placeholder="Mpanda" />
                </div>
                <div className="form-group">
                  <label>Wilaya</label>
                  <input type="text" value={zoneForm.district} onChange={(e) => setZoneForm({ ...zoneForm, district: e.target.value })} placeholder="Mpanda" />
                </div>
                <div className="form-group">
                  <label>Kata</label>
                  <input type="text" value={zoneForm.ward} onChange={(e) => setZoneForm({ ...zoneForm, ward: e.target.value })} placeholder="Mpanda Mjini" />
                </div>
                <div className="form-group">
                  <label>Latitude *</label>
                  <input type="number" step="any" value={zoneForm.lat} onChange={(e) => setZoneForm({ ...zoneForm, lat: e.target.value })} placeholder="-6.346" />
                </div>
                <div className="form-group">
                  <label>Longitude *</label>
                  <input type="number" step="any" value={zoneForm.lon} onChange={(e) => setZoneForm({ ...zoneForm, lon: e.target.value })} placeholder="31.072" />
                </div>
                <div className="form-group">
                  <label>Tahadhari ya Mvua (mm)</label>
                  <input type="number" min="0" value={zoneForm.alertRainMm} onChange={(e) => setZoneForm({ ...zoneForm, alertRainMm: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Tahadhari ya Joto (°C)</label>
                  <input type="number" min="0" value={zoneForm.alertTempC} onChange={(e) => setZoneForm({ ...zoneForm, alertTempC: e.target.value })} />
                </div>
                <div className="form-group checkbox-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={zoneForm.active}
                      onChange={(e) => setZoneForm({ ...zoneForm, active: e.target.checked })}
                    />
                    Eneo Linatumika
                  </label>
                </div>
                <div className="form-group checkbox-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={zoneForm.alertEnabled}
                      onChange={(e) => setZoneForm({ ...zoneForm, alertEnabled: e.target.checked })}
                    />
                    Tahadhari imewashwa
                  </label>
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowZoneModal(false)}>Ghairi</button>
                <button className="btn btn-primary" onClick={handleZoneSave}>
                  <i className="fas fa-save"></i> Hifadhi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderSettings = () => (
    <div className="admin-settings">
      <div className="section-card">
        <h3>Mipangilio ya Mfumo</h3>
        <div className="form-grid">
          <div className="form-group">
            <label>Asilimia ya Tume (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              value={settings.commissionRate}
              onChange={(e) => setSettings({ ...settings, commissionRate: e.target.value })}
            />
          </div>
          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={settings.featuredListingsEnabled}
                onChange={(e) => setSettings({ ...settings, featuredListingsEnabled: e.target.checked })}
              />
              Wezesha Bidhaa Zilizojulikana
            </label>
          </div>
          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={settings.bannerActive}
                onChange={(e) => setSettings({ ...settings, bannerActive: e.target.checked })}
              />
              Onyesha Bendera ya Taarifa kwa Umma
            </label>
          </div>
          <div className="form-group full-width">
            <label>Ujumbe wa Bendera</label>
            <textarea
              value={settings.bannerMessage}
              onChange={(e) => setSettings({ ...settings, bannerMessage: e.target.value })}
              rows="3"
              placeholder="Ujumbe unaoonekana kwa watumiaji wote..."
            />
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn btn-primary" onClick={handleSaveSettings}>
            <i className="fas fa-save"></i> Hifadhi Mipangilio
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
    <AdminLayout
      user={user}
      roleLabel={ROLE_LABELS[user.role] || 'Admin'}
      roleIcon={ROLE_ICONS[user.role] || 'fas fa-user-shield'}
      pageTitle="Admin Panel - Usimamizi wa Mfumo"
      subtitle="Dhibiti watumiaji, mazao, bei, mikopo na mfumo mzima"
      headerBadge={<div className="admin-badge content-badge"><i className="fas fa-user-shield"></i> Admin - Usimamizi</div>}
      navSections={navSections}
      onLogout={() => onAuth('logout')}
      headerActions={
        <>
          <button className="btn btn-outline" onClick={onToggleChat}>
            <i className="fas fa-comments"></i> Mazungumzo
          </button>
        </>
      }
    >
      {activeTab === 'overview' && renderStats()}
      {activeTab === 'users' && renderUsers()}
      {activeTab === 'products' && renderProducts()}
      {activeTab === 'market-prices' && renderMarketPrices()}
      {activeTab === 'loans' && renderLoans()}
      {activeTab === 'groups' && renderGroups()}
      {activeTab === 'advisory' && renderAdvisory()}
      {activeTab === 'news' && renderNews()}
      {activeTab === 'notifications' && renderNotifications()}
      {activeTab === 'ratings' && renderRatings()}
      {activeTab === 'disputes' && renderDisputes()}
      {activeTab === 'weather' && renderWeather()}
      {activeTab === 'audit-logs' && renderAuditLogs()}
      {activeTab === 'settings' && renderSettings()}
    </AdminLayout>

    {/* Create user modal */}
    {showCreateModal && (
      <div className="modal-overlay">
        <div className="modal">
          <div className="modal-header">
            <h3>Ongeza Mtumiaji Mpya</h3>
            <button className="close-btn" onClick={() => setShowCreateModal(false)}><i className="fas fa-times"></i></button>
          </div>
          <form onSubmit={handleCreateUser} className="modal-body">
            <div className="form-grid">
              <div className="form-group">
                <label>Jina Kamili *</label>
                <input type="text" value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} required placeholder="Mf. Juma Mwinyi" />
              </div>
              <div className="form-group">
                <label>Barua Pepe *</label>
                <input type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} required placeholder="juma@example.com" />
              </div>
              <div className="form-group">
                <label>Simu *</label>
                <input type="text" value={newUser.phone} onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })} required placeholder="+255..." />
              </div>
              <div className="form-group">
                <label>Nenosiri *</label>
                <input type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} required placeholder="Angalau herufi 6" />
              </div>
              <div className="form-group">
                <label>Jukumu *</label>
                <select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}>
                  <option value="farmer">Mkulima</option>
                  <option value="buyer">Mnunuzi / Muuzaji</option>
                  <option value="expert">Mtaalamu / Extension</option>
                  <option value="admin">Admin</option>
                  <option value="support">Support</option>
                  <option value="content_moderator">Msimamizi wa Maudhui</option>
                  <option value="finance_officer">Afisa Fedha</option>
                </select>
              </div>
              <div className="form-group">
                <label>Eneo</label>
                <input type="text" value={newUser.location} onChange={(e) => setNewUser({ ...newUser, location: e.target.value })} placeholder="Mpanda" />
              </div>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-outline" onClick={() => setShowCreateModal(false)}>Ghairi</button>
              <button type="submit" className="btn btn-primary"><i className="fas fa-save"></i> Hifadhi Mtumiaji</button>
            </div>
          </form>
        </div>
      </div>
    )}

    {/* Edit user modal */}
    {showEditModal && editingUser && (
      <div className="modal-overlay">
        <div className="modal">
          <div className="modal-header">
            <h3>Hariri {editingUser.name}</h3>
            <button className="close-btn" onClick={() => setShowEditModal(false)}><i className="fas fa-times"></i></button>
          </div>
          <form onSubmit={handleEditUser} className="modal-body">
            <div className="form-grid">
              <div className="form-group">
                <label>Jina Kamili</label>
                <input type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Simu</label>
                <input type="text" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Eneo</label>
                <input type="text" value={editForm.location} onChange={(e) => setEditForm({ ...editForm, location: e.target.value })} />
              </div>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-outline" onClick={() => setShowEditModal(false)}>Ghairi</button>
              <button type="submit" className="btn btn-primary"><i className="fas fa-save"></i> Hifadhi</button>
            </div>
          </form>
        </div>
      </div>
    )}

    {toast && (
      <div className={`admin-toast toast-${toast.type}`}>
        <i className={`fas ${toast.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`}></i>
        {toast.msg}
      </div>
    )}
    </>
  );
};

export default AdminDashboard;
