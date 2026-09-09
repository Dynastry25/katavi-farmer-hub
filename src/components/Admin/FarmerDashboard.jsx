import React, { useState, useEffect, useCallback } from 'react';
import { cropsAPI, productsAPI, ordersAPI, marketPricesAPI, priceAlertsAPI, farmerFinanceAPI, shambaAPI, aiAPI, uploadAPI } from '../../api/client';
import { useNavigate } from 'react-router-dom';
import { printView } from '../../shared/utils/export';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import AdminLayout from './AdminLayout';
import { getRoleNavSections } from './roleNav';
import RatingModal from './RatingModal';
import FarmerGroups from '../FarmerGroups';
import Loans from '../Loans';
import ChatSystem from '../ChatSystem/ChatSystem';
import { useAuth } from '../../shared/context/AuthContext';
import './FarmerDashboard.css';

const FarmerDashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [showAddCropModal, setShowAddCropModal] = useState(false);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingOrder, setRatingOrder] = useState(null);
  const navigate = useNavigate();

  const [apiCrops, setApiCrops] = useState([]);
  const [apiOrders, setApiOrders] = useState([]);
  const [apiProducts, setApiProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [priceCrops, setPriceCrops] = useState([]);
  const [priceTrend, setPriceTrend] = useState([]);
  const [trendCrop, setTrendCrop] = useState('');
  const [priceAlerts, setPriceAlerts] = useState([]);
  const [loadingPrices, setLoadingPrices] = useState(false);

  const [plSummary, setPlSummary] = useState(null);
  const [plMonths, setPlMonths] = useState(6);
  const [loadingPL, setLoadingPL] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ category: 'inputs', amount: '', description: '' });

  const [landGuidance, setLandGuidance] = useState([]);
  const [plantingRec, setPlantingRec] = useState(null);
  const [stageResult, setStageResult] = useState(null);
  const [diseases, setDiseases] = useState([]);
  const [landForm, setLandForm] = useState({ ward: '', district: '', cropName: '' });
  const [plantingForm, setPlantingForm] = useState({ cropName: '', ward: '', district: '' });
  const [stageForm, setStageForm] = useState({ cropName: '', plantingDate: '' });
  const [diseaseCrop, setDiseaseCrop] = useState('');
  const [aiCropResult, setAiCropResult] = useState(null);
  const [assistantStep, setAssistantStep] = useState(null);
  const [aiFile, setAiFile] = useState(null);
  const [aiPreview, setAiPreview] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiUseUrl, setAiUseUrl] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [cropsRes, ordersRes, productsRes] = await Promise.all([
        cropsAPI.getAll(),
        ordersAPI.getAll(),
        productsAPI.getMy(),
      ]);
      setApiCrops(cropsRes.data?.crops || cropsRes.data || []);
      setApiOrders(ordersRes.data || []);
      setApiProducts(productsRes.data || []);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const loadPriceIntelligence = useCallback(async () => {
    if (!apiCrops || apiCrops.length === 0) return;
    setLoadingPrices(true);
    try {
      const names = [...new Set(apiCrops.map(c => (c.name || c.crop || '').trim()).filter(Boolean))];
      const [alertsRes, ...rows] = await Promise.all([
        priceAlertsAPI.getMy(),
        ...names.map(async (name) => {
          const [latestRes, avgRes] = await Promise.all([
            marketPricesAPI.getAll({ cropName: name }),
            marketPricesAPI.getAverage({ cropName: name, days: 30 }),
          ]);
          const latest = Array.isArray(latestRes.data) ? latestRes.data[0] : null;
          const avg = avgRes.data?.avgPrice || 0;
          const today = latest?.pricePerUnit || 0;
          const diffPct = avg > 0 && today > 0 ? ((today - avg) / avg) * 100 : null;
          return { name, today, avg, diffPct, unit: latest?.unit || 'kg' };
        }),
      ]);
      setPriceAlerts(Array.isArray(alertsRes.data) ? alertsRes.data : []);
      setPriceCrops(rows);
      setTrendCrop(prev => prev || names[0]);
    } catch (err) {
      console.error('Error loading price intelligence:', err);
    } finally {
      setLoadingPrices(false);
    }
  }, [apiCrops]);

  const loadPriceTrend = useCallback(async () => {
    if (!trendCrop) {
      setPriceTrend([]);
      return;
    }
    try {
      const res = await marketPricesAPI.getTrend({ cropName: trendCrop, months: 6 });
      setPriceTrend(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Error loading price trend:', err);
    }
  }, [trendCrop]);

  useEffect(() => {
    if (activeTab === 'prices') loadPriceIntelligence();
  }, [activeTab, loadPriceIntelligence]);

  useEffect(() => {
    if (activeTab === 'prices') loadPriceTrend();
  }, [activeTab, loadPriceTrend]);

  const loadPL = useCallback(async () => {
    setLoadingPL(true);
    try {
      const res = await farmerFinanceAPI.summary(plMonths);
      setPlSummary(res.data);
    } catch (err) {
      console.error('Error loading P&L:', err);
    } finally {
      setLoadingPL(false);
    }
  }, [plMonths]);

  useEffect(() => {
    if (activeTab === 'finance') loadPL();
  }, [activeTab, loadPL]);

  const handleAddExpense = async (e) => {
    e.preventDefault();
    try {
      await farmerFinanceAPI.addExpense(expenseForm);
      setExpenseForm({ category: 'inputs', amount: '', description: '' });
      await loadPL();
    } catch (err) {
      alert('Kuna tatizo katika kuhifadhi gharama. Jaribu tena.');
      console.error('Add expense error:', err);
    }
  };

  const handleRemoveExpense = async (id) => {
    try {
      await farmerFinanceAPI.removeExpense(id);
      await loadPL();
    } catch (err) {
      console.error('Remove expense error:', err);
    }
  };

  const handleExportPL = () => {
    if (!plSummary) return;
    const rows = [
      ...Object.entries(plSummary.income.byCrop || {}).map(([crop, amount]) => ['Mapato - ' + crop, `TZS ${amount.toLocaleString()}`]),
      ...Object.entries(plSummary.expenses.byCategory || {}).map(([cat, amount]) => ['Matumizi - ' + cat, `TZS ${amount.toLocaleString()}`]),
    ];
    printView({
      title: 'Ripoti ya Faida na Hasara (Mkulima)',
      subtitle: `Kipindi: miezi ${plSummary.period.months} — ${
        new Date(plSummary.period.from).toLocaleDateString('sw-TZ')
      } hadi ${new Date(plSummary.period.to).toLocaleDateString('sw-TZ')}`,
      headers: ['Maelezo', 'Kiasi (TZS)'],
      rows,
      statGroups: [
        { label: 'Mapato', value: plSummary.income.total.toLocaleString() },
        { label: 'Matumizi', value: plSummary.expenses.total.toLocaleString() },
        { label: 'Faida/Hasara', value: plSummary.profit.toLocaleString() },
      ],
    });
  };

  // ---- Shamba Assistant handlers ----
  const loadLandGuidance = async (e) => {
    e && e.preventDefault();
    try {
      const params = {};
      if (landForm.ward) params.ward = landForm.ward;
      if (landForm.district) params.district = landForm.district;
      if (landForm.cropName) params.cropName = landForm.cropName;
      const res = await shambaAPI.getLandGuidance(params);
      setLandGuidance(Array.isArray(res.data) ? res.data : []);
      if (Array.isArray(res.data) && res.data.length === 0) {
        alert('Hakuna data ya udongo kwa chaguo hilo. Jaza wilaya ya Katavi kama Mlele/Mpanda/Tanganyika.');
      }
    } catch (err) { console.error('Land guidance error:', err); }
  };

  const loadPlantingRec = async (e) => {
    e && e.preventDefault();
    if (!plantingForm.cropName) { alert('Taja zao unalotaka'); return; }
    try {
      const res = await shambaAPI.getPlanting(plantingForm);
      setPlantingRec(res.data);
    } catch (err) { console.error('Planting rec error:', err); }
  };

  const loadCycleStage = async (e) => {
    e && e.preventDefault();
    if (!stageForm.cropName) { alert('Taja zao'); return; }
    try {
      const res = await shambaAPI.getCycleStage(stageForm);
      setStageResult(res.data);
    } catch (err) {
      console.error('Cycle stage error:', err);
      alert('Hakuna ratiba ya hatua kwa zao hili bado. Tafadhali jaribu lingine (mf. Mahindi, Mpunga, Maharage).');
    }
  };

  const loadDiseases = async () => {
    try {
      const res = await shambaAPI.getDiseases(diseaseCrop || undefined);
      setDiseases(Array.isArray(res.data) ? res.data : []);
    } catch (err) { console.error('Disease library error:', err); }
  };

  const runAiCropDetect = async () => {
    setAiLoading(true);
    try {
      let imageUrl = aiCropResult?.imageUrl || '';
      if (aiFile) {
        const fd = new FormData();
        fd.append('image', aiFile);
        const up = await uploadAPI.upload(fd);
        imageUrl = up.data.url;
      }
      if (!imageUrl) {
        alert('Pakia picha ya jani au weka URL — kisha jaribu tena.');
        return;
      }
      const res = await aiAPI.detectCropDisease({ imageUrl, cropHint: aiCropResult?.cropHint });
      setAiCropResult({ imageUrl, cropHint: aiCropResult?.cropHint, result: res.data });
    } catch (err) {
      console.error('AI crop detect error:', err);
      alert('AI imeshindwa kutambua picha. Jaribu tena baada ya muda.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleAiFileChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setAiFile(file);
    setAiPreview(URL.createObjectURL(file));
    setAiCropResult(null);
    setAiUseUrl(false);
  };

  const goToAssistantStep = (id) => {
    setAssistantStep(prev => (prev === id ? null : id));
    const el = document.getElementById('assistant-' + id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleToggleAlert = async (crop) => {
    try {
      const existing = priceAlerts.find(a => (a.crop || '').toLowerCase() === String(crop).toLowerCase());
      if (existing) {
        await priceAlertsAPI.remove(existing._id);
        setPriceAlerts(prev => prev.filter(a => a._id !== existing._id));
      } else {
        const res = await priceAlertsAPI.create({ crop, thresholdPct: 10 });
        setPriceAlerts(prev => [res.data, ...prev]);
        alert(`Utaarifiwa SMS/Push bei ya ${crop} ikibadilika zaidi ya 10%`);
      }
    } catch (err) {
      console.error('Toggle alert error:', err);
    }
  };

  const [newCrop, setNewCrop] = useState({
    name: '',
    category: '',
    quantity: '',
    price: '',
    description: '',
    harvestDate: '',
    location: user?.location || '',
    image: '',
    unit: 'kg',
    stockQuantity: ''
  });
  const [editingCropId, setEditingCropId] = useState(null);
  const [uploadingImgId, setUploadingImgId] = useState(null);
  const [approvalQty, setApprovalQty] = useState('');
  const [orderBusy, setOrderBusy] = useState(false);

  const [newProduct, setNewProduct] = useState({
    name: '',
    category: '',
    quantity: '',
    price: '',
    description: '',
    processingMethod: '',
    shelfLife: ''
  });

  // Crops from API for farmer
  const myCrops = apiCrops.filter(crop => crop.farmer === user?.name || String(crop.farmer) === String(user?._id));
  const myProducts = apiProducts.length > 0 ? apiProducts : [
    { id: 1, name: 'Unga wa Mahindi', category: 'Vyakula Vilivyotengenezwa', quantity: '50kg', price: 'TZS 2,500/kg', description: 'Unga wa mahindi safi uliotengenezwa kwa ustadi', status: 'available' },
  ];

  const orders = apiOrders.length > 0 ? apiOrders : [
    { id: 1, crop: 'Mahindi', buyer: 'John Doe', quantity: '50kg', price: 'TZS 150,000', status: 'pending', orderDate: '2024-01-15', deliveryDate: '2024-01-20', contact: '+255 789 456 123' },
    { id: 2, crop: 'Mpunga', buyer: 'Jane Smith', quantity: '100kg', price: 'TZS 300,000', status: 'completed', orderDate: '2024-01-10', deliveryDate: '2024-01-12', contact: '+255 789 456 124' },
  ];

  const farmerStats = {
    totalCrops: myCrops.length,
    activeListings: myCrops.filter(crop => crop.status === 'available').length,
    totalProducts: myProducts.length,
    totalSales: 12,
    revenue: 'TZS 2,450,000',
    pendingOrders: orders.filter(order => order.status === 'pending').length,
    completedOrders: orders.filter(order => order.status === 'completed').length
  };

  const recentActivities = [
    {
      id: 1,
      type: 'sale',
      description: 'Umekuza mahindi kwa TZS 450,000',
      time: '2 saa zilizopita',
      icon: 'fas fa-coins'
    },
    {
      id: 2,
      type: 'message',
      description: 'Ulipokea ujumbe kutoka kwa mnunuzi',
      time: '5 saa zilizopita',
      icon: 'fas fa-comment'
    },
    {
      id: 3,
      type: 'order',
      description: 'Agizo jipya la mpunga',
      time: '1 siku iliyopita',
      icon: 'fas fa-box'
    },
    {
      id: 4,
      type: 'weather',
      description: 'Mvua inatarajiwa kesho',
      time: '1 siku iliyopita',
      icon: 'fas fa-cloud-rain'
    }
  ];

  const openCropModal = (crop) => {
    setEditingCropId(crop ? (crop._id || crop.id) : null);
    setNewCrop({
      name: crop?.name || '',
      category: crop?.category || crop?.type || '',
      quantity: crop?.quantity ?? '',
      price: crop?.price ?? '',
      description: crop?.description || '',
      harvestDate: crop?.harvestDate ? String(crop.harvestDate).slice(0, 10) : '',
      location: crop?.location || user?.location || '',
      image: crop?.image || '',
      unit: crop?.unit || 'kg',
      stockQuantity: crop?.stockQuantity ?? (Number(String(crop?.quantity || '').replace(/[^0-9.]/g, '')) || ''),
    });
    setShowAddCropModal(true);
  };

  const closeCropModal = () => {
    setShowAddCropModal(false);
    setEditingCropId(null);
    setNewCrop({
      name: '', category: '', quantity: '', price: '', description: '', harvestDate: '',
      location: user?.location || '', image: '', unit: 'kg', stockQuantity: ''
    });
  };

  const handleAddCrop = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...newCrop,
        stockQuantity: Number(newCrop.stockQuantity) || 0,
        unit: newCrop.unit,
      };
      if (editingCropId) {
        await cropsAPI.update(editingCropId, payload);
        alert('Zao limesasishwa kikamilifu!');
      } else {
        await cropsAPI.create(payload);
        alert('Zao jipya limeongezwa kikamilifu!');
      }
      setShowAddCropModal(false);
      setEditingCropId(null);
      fetchData();
    } catch (error) {
      console.error('Error:', error);
      alert('Hitilafu imetokea');
    }
  };

  const handleDeleteCrop = async (crop) => {
    const id = crop._id || crop.id;
    if (!id) return;
    if (!window.confirm(`Una uhakika unataka kufuta "${crop.name}"? Kitendo hiki hakirudishwi.`)) return;
    try {
      await cropsAPI.delete(id);
      alert('Zao limefutwa');
      fetchData();
    } catch (error) {
      console.error('Delete crop error:', error);
      alert('Hitilafu imetokea wakati wa kufuta');
    }
  };

  const handleCropImageChange = async (crop, e) => {
    const file = e.target.files && e.target.files[0];
    if (!file || !(crop._id || crop.id)) return;
    setUploadingImgId(crop._id || crop.id);
    try {
      const fd = new FormData();
      fd.append('image', file);
      await cropsAPI.uploadImage(crop._id || crop.id, fd);
      alert('Picha imesajiliwa!');
      await fetchData();
    } catch (error) {
      console.error('Upload crop image error:', error);
      alert('Hitilafu imetokea kupakia picha');
    } finally {
      setUploadingImgId(null);
      e.target.value = '';
    }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    try {
      await productsAPI.create(newProduct);
      alert('Bidhaa mpya imeongezwa kikamilifu!');
      setShowAddProductModal(false);
    } catch (error) {
      console.error('Error:', error);
      alert('Hitilafu imetokea');
    }
  };

  const STATUS_LABELS = {
    pending: 'Inasubiri',
    approved: 'Imekubaliwa',
    partially_approved: 'Imekubaliwa Kwa Sehemu',
    rejected: 'Imekataliwa',
    expired: 'Imeisha Muda',
  };

  const stockOf = (crop) => crop.stockQuantity ?? (Number(String(crop.quantity || '').replace(/[^0-9.]/g, '')) || 0);

  const orderIdOf = (o) => o._id || o.id;
  const cropLabelOf = (o) => o.cropName || (o.crop && typeof o.crop === 'object' ? o.crop.name : o.crop) || 'Bila jina';
  const buyerLabelOf = (o) => o.buyerName || (o.buyer && typeof o.buyer === 'object' ? o.buyer.name : o.buyer) || 'Bila jina';
  const qtyLabelOf = (o) => (o.requestedQuantity != null ? `${o.requestedQuantity} ${o.unit || ''}` : o.quantity);
  const statusLabelOf = (s) => STATUS_LABELS[s] || s || '-';

  const handleOrderAction = async (order, action) => {
    try {
      const orderId = orderIdOf(order);
      if (action === 'accept') {
        const fallback = Number(order.requestedQuantity) || 1;
        const approved = Math.max(1, Number(approvalQty) || fallback);
        await ordersAPI.approve(orderId, { approvedQuantity: approved });
        alert(approved >= order.requestedQuantity
          ? 'Umeidhinisha agizo kikamilifu'
          : `Umeidhinisha kiasi cha ${approved} ${order.unit || ''}`);
      } else {
        await ordersAPI.reject(orderId);
        alert('Umekataa agizo na umeitoa hisa (reservation)');
      }
      await fetchData();
    } catch (error) {
      console.error('Order action error:', error);
      alert(error.response?.data?.message || 'Hitilafu imetokea');
    }
    setShowOrderModal(false);
    setApprovalQty('');
  };

  const renderOverview = () => {
    const orderChartData = [
      { name: 'Yamekamilika', value: farmerStats.completedOrders },
      { name: 'Yanasubiri', value: farmerStats.pendingOrders },
    ].filter(d => d.value > 0);
    const typeCounts = {};
    myCrops.forEach(c => { const t = c.type || c.category || c.crop || 'Bila Aina'; typeCounts[t] = (typeCounts[t] || 0) + 1; });
    const types = Object.keys(typeCounts);
    const max = Math.max(1, ...Object.values(typeCounts));
    const cropTypeData = types.map(name => ({ name, count: typeCounts[name], pct: Math.round((typeCounts[name] / max) * 100) }));
    return (
    <div className="farmer-overview">
      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon"><i className="fas fa-wheat-awn"></i></div>
          <div className="stat-content">
            <div className="stat-number">{farmerStats.totalCrops}</div>
            <div className="stat-label">Mazao Yaliyowekwa</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><i className="fas fa-box"></i></div>
          <div className="stat-content">
            <div className="stat-number">{farmerStats.activeListings}</div>
            <div className="stat-label">Mazao Yanayopatikana</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><i className="fas fa-coins"></i></div>
          <div className="stat-content">
            <div className="stat-number">{farmerStats.totalSales}</div>
            <div className="stat-label">Mauzo Yaliyokamilika</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><i className="fas fa-hourglass-half"></i></div>
          <div className="stat-content">
            <div className="stat-number">{farmerStats.pendingOrders}</div>
            <div className="stat-label">Maagizo Yanayosubiri</div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="dash-charts-row">
        <div className="dash-chart-card">
          <h3>Maagizo kwa Hali</h3>
          <ResponsiveContainer width="100%" height={230}>
            <PieChart>
              <Pie data={orderChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={4} label>
                <Cell fill="#16a34a" />
                <Cell fill="#f59e0b" />
                <Cell fill="#ef4444" />
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="dash-chart-card">
          <h3>Mazao kwa Aina</h3>
          <div className="crop-type-list">
            {cropTypeData.length === 0 ? (
              <div className="no-data">Hakuna mazao bado</div>
            ) : cropTypeData.map(c => (
              <div className="crop-type-bar" key={c.name}>
                <div className="ct-label">{c.name}</div>
                <div className="ct-track">
                  <div className="ct-fill" style={{ width: c.pct + '%' }}></div>
                </div>
                <div className="ct-count">{c.count}</div>
              </div>
            ))}
          </div>
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
          <button className="action-btn" onClick={() => openCropModal(null)}>
            <i className="fas fa-seedling"></i>
            <span>Ongeza Zao Jipya</span>
          </button>
          <button className="action-btn" onClick={() => setShowAddProductModal(true)}>
            <i className="fas fa-industry"></i>
            <span>Ongeza Bidhaa</span>
          </button>
          <button className="action-btn" onClick={() => setActiveTab('orders')}>
            <i className="fas fa-shopping-cart"></i>
            <span>Angalia Maagizo</span>
          </button>
          <button className="action-btn" onClick={() => setActiveTab('analytics')}>
            <i className="fas fa-chart-line"></i>
            <span>Takwimu za Biashara</span>
          </button>
        </div>
      </div>
    </div>
    );
  };

  const renderMyCrops = () => (
    <div className="farmer-section">
      <div className="section-header">
        <h3>Mazao Yangu</h3>
        <button className="btn btn-primary" onClick={() => openCropModal(null)}>
          <i className="fas fa-plus"></i> Ongeza Zao Jipya
        </button>
      </div>

      {myCrops.length > 0 ? (
        <div className="crops-grid">
          {myCrops.map(crop => (
            <div key={crop._id || crop.id} className="crop-card">
              <div className="crop-image">
                {crop.image ? (
                  <img src={crop.image} alt={crop.name} loading="lazy" />
                ) : (
                  <i className="fas fa-wheat-awn"></i>
                )}
              </div>
              <div className="crop-content">
                <h4>{crop.name}</h4>
                <p>{crop.description}</p>
                <div className="crop-details">
                  <span><strong>Bei:</strong> {crop.price}/{crop.unit || 'kg'}</span>
                  <span><strong>Stock:</strong> {stockOf(crop)} {crop.unit || 'kg'}</span>
                  <span><strong>Eneo:</strong> {crop.location}</span>
                </div>
                <div className="crop-status">
                  <span className={`status-badge ${crop.status}`}>
                    {crop.status === 'available' ? 'Inapatikana' : 
                     crop.status === 'low_stock' ? 'Hisa Ndogo' : 
                     crop.status === 'out_of_stock' ? 'Imeisha' : 
                     crop.status === 'reserved' ? 'Imehifadhiwa' : 'Imeuzwa'}
                  </span>
                </div>
                <div className="crop-actions">
                  <button className="btn btn-sm btn-outline" onClick={() => openCropModal(crop)}>
                    <i className="fas fa-edit"></i> Hariri
                  </button>
                  <button className="btn btn-sm btn-primary" onClick={() => document.getElementById(`crop-img-${crop._id || crop.id}`).click()}>
                    <i className={`fas ${uploadingImgId === (crop._id || crop.id) ? 'fa-spinner fa-spin' : 'fa-image'}`}></i>
                    {uploadingImgId === (crop._id || crop.id) ? ' Inapakia...' : ' Ongeza Picha'}
                  </button>
                  <button className="btn btn-sm btn-danger" onClick={() => handleDeleteCrop(crop)}>
                    <i className="fas fa-trash"></i> Futa
                  </button>
                  <input
                    type="file"
                    id={`crop-img-${crop._id || crop.id}`}
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => handleCropImageChange(crop, e)}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <i className="fas fa-seedling"></i>
          <h4>Huna mazao yaliyowekwa bado</h4>
          <p>Anza kuuza mazao yako kwa kuongeza zao jipya</p>
          <button className="btn btn-primary" onClick={() => openCropModal(null)}>
            <i className="fas fa-plus"></i> Ongeza Zao la Kwanza
          </button>
        </div>
      )}
    </div>
  );

  const renderMyProducts = () => (
    <div className="farmer-section">
      <div className="section-header">
        <h3>Bidhaa Zangu Zilizotengenezwa</h3>
        <button className="btn btn-primary" onClick={() => setShowAddProductModal(true)}>
          <i className="fas fa-plus"></i> Ongeza Bidhaa Mpya
        </button>
      </div>

      {myProducts.length > 0 ? (
        <div className="products-grid">
          {myProducts.map(product => (
            <div key={product.id} className="product-card">
              <div className="product-image">
                {product.image && product.image.includes('fa-') ? 
                  <i className={product.image.replace(/<\/?i[^>]*>/g, '').trim()}></i> : 
                  (product.image || <i className="fas fa-industry"></i>)}
              </div>
              <div className="product-content">
                <h4>{product.name}</h4>
                <p>{product.description}</p>
                <div className="product-details">
                  <span><strong>Kategoria:</strong> {product.category}</span>
                  <span><strong>Kiasi:</strong> {product.quantity}</span>
                  <span><strong>Bei:</strong> {product.price}</span>
                </div>
                <div className="product-actions">
                  <button className="btn btn-sm btn-outline">Hariri</button>
                  <button className="btn btn-sm btn-primary">Pakia Picha</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <i className="fas fa-industry"></i>
          <h4>Huna bidhaa zilizotengenezwa bado</h4>
          <p>Ongeza bidhaa zilizotengenezwa kutoka kwa mazao yako</p>
          <button className="btn btn-primary" onClick={() => setShowAddProductModal(true)}>
            <i className="fas fa-plus"></i> Ongeza Bidhaa ya Kwanza
          </button>
        </div>
      )}
    </div>
  );

  const renderOrders = () => (
    <div className="farmer-section">
      <h3>Maagizo Yangu</h3>
      <div className="orders-table-container">
        <table className="orders-table">
          <thead>
            <tr>
              <th>Zao/Bidhaa</th>
              <th>Mnunuzi</th>
              <th>Kiasi</th>
              <th>Bei</th>
              <th>Tarehe ya Agizo</th>
              <th>Hali</th>
              <th>Vitendo</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(order => (
              <tr key={orderIdOf(order)}>
                <td>{cropLabelOf(order)}</td>
                <td>{buyerLabelOf(order)}</td>
                <td>{qtyLabelOf(order)}</td>
                <td>{order.price}</td>
                <td>{order.orderDate || (order.createdAt ? new Date(order.createdAt).toLocaleDateString() : '-')}</td>
                <td>
                  <span className={`status-badge ${order.status}`}>
                    {statusLabelOf(order.status)}
                  </span>
                </td>
                <td>
                  <div className="order-actions">
                    <button 
                      className="btn btn-sm btn-outline"
                      onClick={() => {
                        setSelectedOrder(order);
                        setShowOrderModal(true);
                      }}
                    >
                      Angalia
                    </button>
                    {order.status === 'pending' && (
                      <>
                        <button 
                          className="btn btn-sm btn-success"
                          onClick={() => handleOrderAction(order, 'accept')}
                        >
                          Kubali
                        </button>
                        <button 
                          className="btn btn-sm btn-danger"
                          onClick={() => handleOrderAction(order, 'reject')}
                        >
                          Kataa
                        </button>
                      </>
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
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderAnalytics = () => (
    <div className="farmer-section">
      <h3>Takwimu za Biashara</h3>
      <div className="analytics-grid">
        <div className="analytics-card">
          <h4>Mapato ya Mwezi</h4>
          <div className="analytics-value">TZS 1,250,000</div>
          <div className="analytics-trend positive">+15% kutoka mwezi uliopita</div>
        </div>
        <div className="analytics-card">
          <h4>Mauzo ya Mwezi</h4>
          <div className="analytics-value">8</div>
          <div className="analytics-trend positive">+25% kutoka mwezi uliopita</div>
        </div>
        <div className="analytics-card">
          <h4>Mazao Yanayovuma</h4>
          <div className="analytics-value">Mahindi</div>
          <div className="analytics-trend">60% ya mauzo yote</div>
        </div>
        <div className="analytics-card">
          <h4>Wanunuzi Wapya</h4>
          <div className="analytics-value">3</div>
          <div className="analytics-trend positive">+50% kutoka mwezi uliopita</div>
        </div>
      </div>
    </div>
  );

  const renderPriceIntelligence = () => (
    <div className="farmer-price-module">
      <div className="section-card">
        <h3><i className="fas fa-chart-line"></i> Bei ya Leo na Wastani wa Soko</h3>
        {loadingPrices ? (
          <div className="admin-loading"><i className="fas fa-spinner fa-spin"></i> Inachambua bei...</div>
        ) : priceCrops.length === 0 ? (
          <p className="empty-state" style={{ padding: '20px 0' }}>
            <i className="fas fa-seedling"></i> Ongeza mazao unayolima ili kuona bei zake. (Tab: Mazao Yangu)
          </p>
        ) : (
          <div className="price-intel-grid">
            {priceCrops.map(c => (
              <div key={c.name} className="price-intel-card">
                <div className="price-intel-head">
                  <strong>{c.name}</strong>
                  <span className="price-intel-unit">per {c.unit}</span>
                </div>
                <div className="price-intel-today">TZS {c.today.toLocaleString()}</div>
                <div className="price-intel-avg">Wastani (siku 30): TZS {c.avg.toLocaleString()}</div>
                <div className={`price-intel-diff ${c.diffPct === null ? '' : c.diffPct >= 0 ? 'positive' : 'negative'}`}>
                  {c.diffPct === null
                    ? 'Hakuna data ya wastani'
                    : `${c.diffPct >= 0 ? '▲ +' : '▼ '}${Math.abs(c.diffPct).toFixed(1)}% vs wastani`}
                </div>
                <button
                  className={`btn btn-sm ${priceAlerts.some(a => (a.crop || '').toLowerCase() === c.name.toLowerCase()) ? 'btn-outline' : 'btn-primary'}`}
                  onClick={() => handleToggleAlert(c.name)}
                  style={{ marginTop: '10px', width: '100%' }}
                >
                  <i className="fas fa-bell"></i>{' '}
                  {priceAlerts.some(a => (a.crop || '').toLowerCase() === c.name.toLowerCase()) ? 'Fuatilia (SMS/Push) — ONA' : 'Fuatilia kwa SMS/Push'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="section-card">
        <h3><i className="fas fa-chart-area"></i> Mwenendo wa Bei (miezi 6)</h3>
        {priceCrops.length > 0 && (
          <select
            className="role-filter"
            style={{ marginBottom: '14px' }}
            value={trendCrop}
            onChange={(e) => setTrendCrop(e.target.value)}
          >
            {[...new Set(priceCrops.map(c => c.name))].map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        )}
        {priceTrend.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={priceTrend} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => [`TZS ${Number(v).toLocaleString()}`, 'Bei']} />
              <Line type="monotone" dataKey="price" stroke="#1a7431" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="empty-state" style={{ padding: '20px 0' }}>
            <i className="fas fa-chart-line"></i> Hakuna data ya mwenendo kwa zao hili bado.
          </p>
        )}
      </div>

      {priceAlerts.length > 0 && (
        <div className="section-card">
          <h3><i className="fas fa-bell"></i> Fuatilia Bei Zangu</h3>
          <div className="alert-list">
            {priceAlerts.map(a => (
              <div key={a._id} className="alert-row">
                <span><i className="fas fa-leaf"></i> <strong>{a.crop}</strong> — mabadiliko ≥ {a.thresholdPct}%</span>
                <button className="btn btn-sm btn-outline" onClick={() => handleToggleAlert(a.crop)}>
                  <i className="fas fa-times"></i> Ondoa
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderFinance = () => {
    if (loadingPL) {
      return (
        <div className="section-card">
          <div className="admin-loading"><i className="fas fa-spinner fa-spin"></i> Inahesabu faida na hasara...</div>
        </div>
      );
    }
    if (!plSummary) {
      return (
        <div className="section-card">
          <p className="empty-state" style={{ padding: '20px 0' }}>Hakuna data ya kifedha kwa aina hii ya mkulima.</p>
        </div>
      );
    }
    const s = plSummary;
    const statusLabel = s.status === 'loss'
      ? { text: 'Hasara', cls: 'negative' }
      : s.status === 'profit'
        ? { text: 'Faida', cls: 'positive' }
        : { text: 'Sawa (kubali)', cls: 'neutral' };

    return (
      <div className="farmer-price-module">
        <div className="section-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <h3 style={{ margin: 0 }}><i className="fas fa-wallet"></i> Ripoti ya Faida na Hasara</h3>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <select className="role-filter" value={plMonths} onChange={(e) => setPlMonths(Number(e.target.value))}>
                <option value={3}>Miezi 3</option>
                <option value={6}>Miezi 6 (Msimu)</option>
                <option value={12}>Mwaka 1</option>
                <option value={24}>Miaka 2</option>
              </select>
              <button className="btn btn-sm btn-primary" onClick={handleExportPL}>
                <i className="fas fa-file-pdf"></i> PDF
              </button>
            </div>
          </div>

          <div className="pl-cards">
            <div className="pl-card">
              <span className="pl-label">Jumla ya Mapato</span>
              <span className="pl-value">TZS {s.income.total.toLocaleString()}</span>
              <span className="pl-sub">Mauzo yaliyokamilika ({s.period.months} miezi)</span>
            </div>
            <div className="pl-card">
              <span className="pl-label">Jumla ya Matumizi</span>
              <span className="pl-value">TZS {s.expenses.total.toLocaleString()}</span>
              <span className="pl-sub">Mikopo {s.expenses.loanRepayments.toLocaleString()} | Pembejeo+ {s.expenses.manual.toLocaleString()}</span>
            </div>
            <div className={`pl-card ${statusLabel.cls}`}>
              <span className="pl-label">Faida / Hasara</span>
              <span className="pl-value">TZS {s.profit.toLocaleString()}</span>
              <span className="pl-sub">{statusLabel.text}</span>
            </div>
          </div>
        </div>

        <div className="section-card">
          <h3><i className="fas fa-chart-column"></i> Mwenendo wa Faida kwa Mwezi</h3>
          {s.trend && s.trend.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={s.trend} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v, name) => [`TZS ${Number(v).toLocaleString()}`, name === 'income' ? 'Mapato' : name === 'profit' ? 'Faida' : 'Matumizi']} />
                <Legend />
                <Line type="monotone" dataKey="income" name="Mapato" stroke="#1a7431" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="expenses" name="Matumizi" stroke="#8d6e63" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="profit" name="Faida" stroke="#ff9800" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="empty-state" style={{ padding: '14px 0' }}>Hakuna data ya miezi bado.</p>
          )}
        </div>

        <div className="pl-cols">
          <div className="section-card">
            <h3><i className="fas fa-seedling"></i> Mapato kwa Zao</h3>
            <div className="table-scroll">
              <table className="admin-table">
                <thead>
                  <tr><th>Zao</th><th style={{ textAlign: 'right' }}>Kiasi (TZS)</th></tr>
                </thead>
                <tbody>
                  {Object.entries(s.income.byCrop || {}).map(([crop, amount]) => (
                    <tr key={crop}>
                      <td>{crop}</td>
                      <td style={{ textAlign: 'right' }}>{amount.toLocaleString()}</td>
                    </tr>
                  ))}
                  {Object.keys(s.income.byCrop || {}).length === 0 && (
                    <tr><td colSpan={2}>Hakuna mauzo yaliyokamilika</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="section-card">
            <h3><i className="fas fa-receipt"></i> Matumizi kwa Kategoria</h3>
            <div className="table-scroll">
              <table className="admin-table">
                <thead>
                  <tr><th>Kategoria</th><th style={{ textAlign: 'right' }}>Kiasi (TZS)</th></tr>
                </thead>
                <tbody>
                  {Object.entries(s.expenses.byCategory || {}).map(([cat, amount]) => (
                    <tr key={cat}>
                      <td>{cat}</td>
                      <td style={{ textAlign: 'right' }}>{amount.toLocaleString()}</td>
                    </tr>
                  ))}
                  {Object.keys(s.expenses.byCategory || {}).length === 0 && (
                    <tr><td colSpan={2}>Hakuna matumizi yaliyorekodiwa</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="pl-cols">
          <div className="section-card">
            <h3><i className="fas fa-plus-circle"></i> Ongeza Gharama</h3>
            <form onSubmit={handleAddExpense} className="expense-form">
              <select
                value={expenseForm.category}
                onChange={(e) => setExpenseForm(f => ({ ...f, category: e.target.value }))}
              >
                <option value="inputs">Pembejeo (mbolea/dawa)</option>
                <option value="seeds">Mbegu</option>
                <option value="labor">Wafanyakazi</option>
                <option value="transport">Usafiri</option>
                <option value="equipment">Vifaa/Mashine</option>
                <option value="other">Nyingine</option>
              </select>
              <input
                type="number"
                min="1"
                placeholder="Kiasi (TZS)"
                value={expenseForm.amount}
                onChange={(e) => setExpenseForm(f => ({ ...f, amount: e.target.value }))}
                required
              />
              <input
                type="text"
                placeholder="Maelezo (mf. mbolea ya mahindi)"
                value={expenseForm.description}
                onChange={(e) => setExpenseForm(f => ({ ...f, description: e.target.value }))}
              />
              <button type="submit" className="btn btn-primary">Hifadhi</button>
            </form>

            <h3 style={{ marginTop: '20px' }}><i className="fas fa-list"></i> Rekodi za Gharama</h3>
            {(s.expenses.items || []).length > 0 ? (
              <ul className="expense-list">
                {(s.expenses.items || []).map(it => (
                  <li key={it._id}>
                    <span>
                      {new Date(it.date).toLocaleDateString('sw-TZ')} — <strong>{it.category}</strong>
                      {it.description ? `: ${it.description}` : ''}
                    </span>
                    <span className="expense-amount">TZS {it.amount.toLocaleString()}
                      <button className="btn btn-sm btn-outline" onClick={() => handleRemoveExpense(it._id)}>
                        <i className="fas fa-trash"></i>
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty-state" style={{ padding: '10px 0' }}>Hakuna gharama zilizorekodiwa.</p>
            )}
          </div>

          <div className="section-card">
            <h3><i className="fas fa-lightbulb"></i> Mapendekezo</h3>
            <ul className="rec-list">
              {(s.recommendations || []).map((r, i) => (
                <li key={i}><i className="fas fa-chevron-circle-right"></i> {r}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    );
  };

  const renderGroups = () => (
    <div className="farmer-module">
      <FarmerGroups />
    </div>
  );

  const renderChat = () => (
    <div className="farmer-module">
      <div className="chat-embed">
        <ChatSystem onPageChange={setActiveTab} />
      </div>
    </div>
  );

  const renderShambaAssistant = () => (
    <div className="farmer-price-module">
      <div className="assistant-hero">
        <i className="fas fa-map-marked-alt"></i>
        <div>
          <h3>Uko katika hatua gani sasa?</h3>
          <p>Chagua kilicho rahisi kwako hapa chini — vidokezo vinazingatia hatua yako pekee, kutoka shamba hadi soko.</p>
        </div>
      </div>

      <div className="quick-start">
        <button type="button" className={`quick-card ${assistantStep === 'ai' ? 'active' : ''}`} onClick={() => goToAssistantStep('ai')}>
          <i className="fas fa-camera"></i>
          <strong>Nina picha ya jani?</strong>
          <span>AI itambue ugonjwa</span>
        </button>
        <button type="button" className={`quick-card ${assistantStep === 'planting' ? 'active' : ''}`} onClick={() => goToAssistantStep('planting')}>
          <i className="fas fa-cloud-rain"></i>
          <strong>Nataka kupanda</strong>
          <span>Muda mzuri wa kupanda</span>
        </button>
        <button type="button" className={`quick-card ${assistantStep === 'land' ? 'active' : ''}`} onClick={() => goToAssistantStep('land')}>
          <i className="fas fa-soil"></i>
          <strong>Nipe zao linalofaa</strong>
          <span>Udongo wa kata yangu</span>
        </button>
        <button type="button" className={`quick-card ${assistantStep === 'cycle' ? 'active' : ''}`} onClick={() => goToAssistantStep('cycle')}>
          <i className="fas fa-seedling"></i>
          <strong>Zao limepandwa</strong>
          <span>Hatua ya sasa + vidokezo</span>
        </button>
        <button type="button" className={`quick-card ${assistantStep === 'library' ? 'active' : ''}`} onClick={() => goToAssistantStep('library')}>
          <i className="fas fa-book-medical"></i>
          <strong>Magonjwa ya mazao</strong>
          <span>Dalili na tiba</span>
        </button>
      </div>

      <div className="pl-cols">
        <div className="section-card" id="assistant-land">
          <h3><i className="fas fa-soil"></i> Uchaguzi wa Zao kwa Udongo (Kata/Wilaya)</h3>
          <form onSubmit={loadLandGuidance} className="expense-form">
            <div className="form-row">
              <input type="text" placeholder="Wilaya (Mpanda/Mlele/Tanganyika)" value={landForm.district}
                onChange={(e) => setLandForm(f => ({ ...f, district: e.target.value }))} />
              <input type="text" placeholder="Kata" value={landForm.ward}
                onChange={(e) => setLandForm(f => ({ ...f, ward: e.target.value }))} />
            </div>
            <input type="text" placeholder="Zao (hiari — mf. mahindi)" value={landForm.cropName}
              onChange={(e) => setLandForm(f => ({ ...f, cropName: e.target.value }))} />
            <button type="submit" className="btn btn-primary"><i className="fas fa-search"></i> Tafuta Inayofaa</button>
          </form>
          {landGuidance.length > 0 && (
            <div className="table-scroll" style={{ marginTop: '12px' }}>
              <table className="admin-table">
                <thead><tr><th>Kata</th><th>Udongo</th><th>Mazao yanayofaa</th></tr></thead>
                <tbody>
                  {landGuidance.map((g, i) => (
                    <tr key={g._id || i}>
                      <td>{g.ward} ({g.district})</td>
                      <td>{g.soilType}</td>
                      <td>{(g.suitableCrops || []).join(', ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="section-card" id="assistant-planting">
          <h3><i className="fas fa-cloud-rain"></i> Muda Mzuri wa Kupanda (Hali ya Hewa)</h3>
          <form onSubmit={loadPlantingRec} className="expense-form">
            <input type="text" placeholder="Zao (mf. Mahindi)" value={plantingForm.cropName}
              onChange={(e) => setPlantingForm(f => ({ ...f, cropName: e.target.value }))} required />
            <input type="text" placeholder="Wilaya (mf. Mpanda)" value={plantingForm.district}
              onChange={(e) => setPlantingForm(f => ({ ...f, district: e.target.value }))} />
            <button type="submit" className="btn btn-primary"><i className="fas fa-lightbulb"></i> Ona Ushauri</button>
          </form>
          {plantingRec && (
            <div className={`planting-recommendation rating-${plantingRec.rating}`} style={{ marginTop: '12px' }}>
              <div className="planting-head">
                <i className={`fas ${plantingRec.rating === 'good' ? 'fa-thumbs-up' : plantingRec.rating === 'wait' ? 'fa-clock' : 'fa-exclamation-triangle'}`}></i>
                <strong>
                  {plantingRec.rating === 'good' ? 'Wakati Mzuri!' : plantingRec.rating === 'caution' ? 'Tahadhari' : 'Subiri Bora'}
                </strong>
              </div>
              <p>{plantingRec.message}</p>
              {plantingRec.idealWindow && (
                <p className="planting-tip"><i className="fas fa-calendar-alt"></i> {plantingRec.idealWindow.label}: {plantingRec.idealWindow.tip}</p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="pl-cols">
        <div className="section-card" id="assistant-cycle">
          <h3><i className="fas fa-seedling"></i> Ratiba ya Hatua (Crop Cycle Tracker)</h3>
          <form onSubmit={loadCycleStage} className="expense-form">
            <input type="text" placeholder="Zao (mf. Mahindi)" value={stageForm.cropName}
              onChange={(e) => setStageForm(f => ({ ...f, cropName: e.target.value }))} required />
            <input type="date" placeholder="Tarehe ya kupanda" value={stageForm.plantingDate}
              onChange={(e) => setStageForm(f => ({ ...f, plantingDate: e.target.value }))} />
            <button type="submit" className="btn btn-primary"><i className="fas fa-code-branch"></i> Angalia Hatua Yako</button>
          </form>
          {stageResult && (
            <div className="cycle-current" style={{ marginTop: '14px' }}>
              <div className="cycle-badge">
                <i className={`${stageResult.icon || 'fas fa-leaf'}`}></i>
              </div>
              <div className="cycle-info">
                <h4>{stageResult.label}</h4>
                <p className="cycle-days">Siku {stageResult.daysSincePlanting} tangu kupanda</p>
                {stageResult.tip && <p>{stageResult.tip}</p>}
                {stageResult.alert && <p className="cycle-alert"><i className="fas fa-exclamation-triangle"></i> {stageResult.alert}</p>}
              </div>
            </div>
          )}
        </div>

        <div className="section-card" id="assistant-library">
          <h3><i className="fas fa-book-medical"></i> Maktaba ya Magonjwa ya Mazao</h3>
          <div className="expense-form">
            <input type="text" placeholder="Zao (mf. Mahindi, Mpunga, Maharage)" value={diseaseCrop}
              onChange={(e) => setDiseaseCrop(e.target.value)} />
            <button type="button" className="btn btn-primary" onClick={loadDiseases}><i className="fas fa-bug"></i> Ona Magonjwa</button>
          </div>
          {diseases.length > 0 && (
            <div className="disease-list" style={{ marginTop: '12px' }}>
              {diseases.map(d => (
                <div key={d._id} className="disease-item">
                  <strong>{d.name}</strong>
                  <span className="disease-severity"><i className="fas fa-circle"></i> {d.severity}</span>
                  {d.symptoms && <p><b>Dalili:</b> {d.symptoms}</p>}
                  {d.prevention && <p><b>Kinga:</b> {d.prevention}</p>}
                  {d.treatment && <p><b>Tiba:</b> {d.treatment}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="section-card" id="assistant-ai">
        <h3><i className="fas fa-microscope"></i> AI Uchunguzi wa Magonjwa (Picha)</h3>
        <p className="ai-intro">Pakia picha ya jani lenye dalili, ama piga picha moja kwa moja — AI itakujibu ugonjwa unaoshukiwa na hatua ya kuchukua.</p>
        <div className="ai-upload">
          <label className={`upload-box ${aiPreview ? 'has-img' : ''}`}>
            <input type="file" accept="image/*" onChange={handleAiFileChange} />
            {aiPreview ? (
              <img src={aiPreview} alt="Picha ya zao" />
            ) : (
              <span>
                <i className="fas fa-cloud-upload-alt"></i>
                <strong>Gusa ili kupakia picha ya jani</strong>
                <small>JPG / PNG — picha ya karibu bora</small>
              </span>
            )}
          </label>
          <div className="ai-upload-fields">
            <input type="text" placeholder="Zao (dalili — mf. Mahindi)" value={aiCropResult?.cropHint || ''}
              onChange={(e) => setAiCropResult(p => ({ ...(p || {}), cropHint: e.target.value }))} />
            <button type="button" className="btn btn-primary" onClick={runAiCropDetect} disabled={aiLoading}>
              {aiLoading
                ? <><i className="fas fa-spinner fa-spin"></i> Inachunguza...</>
                : <><i className="fas fa-magnifying-glass-chart"></i> Chunguza Picha</>}
            </button>
            <button type="button" className="ai-url-toggle" onClick={() => setAiUseUrl(v => !v)}>
              <i className={`fas ${aiUseUrl ? 'fa-chevron-up' : 'fa-link'}`}></i>
              {aiUseUrl ? 'Ficha ingizo la URL' : 'Weka URL ya picha kwa mkono (badala ya kupakia)'}
            </button>
            {aiUseUrl && (
              <input type="text" placeholder="https://... (URL ya picha iliyopakiwa tayari)" value={aiCropResult?.imageUrl || ''}
                onChange={(e) => setAiCropResult(p => ({ ...(p || {}), imageUrl: e.target.value }))} />
            )}
          </div>
        </div>
        {aiCropResult?.result?.detection && (
          <div className="ai-result">
            {aiPreview && <img src={aiPreview} alt="Picha ya zao" />}
            <div className="ai-result-info">
              <strong>{aiCropResult.result.detection.cropLabel || aiCropResult.result.detection.crop}</strong>
              <p><b>Matatizo:</b> {(aiCropResult.result.detection.issues || []).join(', ')}</p>
              <p><b>Ushauri:</b> {aiCropResult.result.detection.recommendation}</p>
              <p><b>Hatua:</b> {aiCropResult.result.detection.action}</p>
              {aiCropResult.result.source === 'vision_api_gemini' && <span className="ai-source">Jenasi ya Gemini</span>}
              {aiCropResult.result.source === 'vision_api_openrouter' && <span className="ai-source">OpenRouter GPT-Zao</span>}
              {aiCropResult.result.mocked && <p className="cycle-alert"><i className="fas fa-info-circle"></i> {aiCropResult.result.detection.note}</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderLoans = () => (
    <div className="farmer-module">
      <Loans />
    </div>
  );

  const navSections = getRoleNavSections({
    role: 'farmer',
    navigate,
    activeTab,
    badges: { orders: farmerStats.pendingOrders },
    onTab: setActiveTab,
  });

  return (
    <>
    <AdminLayout
      user={user}
      roleLabel="Mkulima"
      roleIcon="fas fa-tractor"
      pageTitle="Dashibodi ya Mkulima"
      subtitle="Dashibodi yako ya kusimamia shughuli zako za kilimo na biashara"
      headerBadge={<div className="admin-badge"><i className="fas fa-tractor"></i> Mkulima Waandaliwa</div>}
      navSections={navSections}
      onLogout={logout}
      headerActions={
        <>
          <button className="btn btn-primary" onClick={() => openCropModal(null)}>
            <i className="fas fa-plus"></i> Ongeza Zao
          </button>
          <button className="btn btn-success" onClick={() => setActiveTab('loans')}>
            <i className="fas fa-hand-holding-usd"></i> Mikopo Yangu
          </button>
      </>
      }
    >
      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'mycrops' && renderMyCrops()}
      {activeTab === 'products' && renderMyProducts()}
      {activeTab === 'orders' && renderOrders()}
      {activeTab === 'prices' && renderPriceIntelligence()}
      {activeTab === 'finance' && renderFinance()}
      {activeTab === 'assistant' && renderShambaAssistant()}
      {activeTab === 'groups' && renderGroups()}
      {activeTab === 'chat' && renderChat()}
      {activeTab === 'loans' && renderLoans()}
      {activeTab === 'analytics' && renderAnalytics()}
    </AdminLayout>

    {/* Add/Edit Crop Modal */}
    {showAddCropModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>{editingCropId ? 'Hariri Zao' : 'Ongeza Zao Jipya'}</h3>
              <button className="close-btn" onClick={closeCropModal}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <form onSubmit={handleAddCrop} className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label>Jina la Zao *</label>
                  <input
                    type="text"
                    value={newCrop.name}
                    onChange={(e) => setNewCrop({...newCrop, name: e.target.value})}
                    required
                    placeholder="Mf. Mahindi, Mpunga, nk"
                  />
                </div>
                <div className="form-group">
                  <label>Aina ya Zao *</label>
                  <select
                    value={newCrop.category}
                    onChange={(e) => setNewCrop({...newCrop, category: e.target.value})}
                    required
                  >
                    <option value="">Chagua aina</option>
                    <option value="cereals">Nafaka</option>
                    <option value="legumes">Mikunde</option>
                    <option value="vegetables">Mboga</option>
                    <option value="fruits">Matunda</option>
                    <option value="tubers">Viazi/Mizizi</option>
                    <option value="oilseeds">Mbegu za Mafuta</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Kiasi Kinachopatikana (Stock) *</label>
                  <input
                    type="number"
                    min="0"
                    value={newCrop.stockQuantity}
                    onChange={(e) => setNewCrop({...newCrop, stockQuantity: e.target.value})}
                    required
                    placeholder="Mf. 100"
                  />
                </div>
                <div className="form-group">
                  <label>Kipimo (Unit) *</label>
                  <select
                    value={newCrop.unit}
                    onChange={(e) => setNewCrop({...newCrop, unit: e.target.value})}
                    required
                  >
                    <option value="kg">Kilogramu (kg)</option>
                    <option value="gunia">Gunia</option>
                    <option value="debe">Debe</option>
                    <option value="tani">Tani</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Bei (TZS) *</label>
                  <input
                    type="number"
                    value={newCrop.price}
                    onChange={(e) => setNewCrop({...newCrop, price: e.target.value})}
                    required
                    placeholder="Mf. 1500"
                  />
                </div>
                <div className="form-group full-width">
                  <label>Maelezo</label>
                  <textarea
                    value={newCrop.description}
                    onChange={(e) => setNewCrop({...newCrop, description: e.target.value})}
                    placeholder="Maelezo ya zao lako..."
                    rows="3"
                  />
                </div>
                <div className="form-group">
                  <label>Tarehe ya Uvunaji</label>
                  <input
                    type="date"
                    value={newCrop.harvestDate}
                    onChange={(e) => setNewCrop({...newCrop, harvestDate: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Eneo</label>
                  <input
                    type="text"
                    value={newCrop.location}
                    onChange={(e) => setNewCrop({...newCrop, location: e.target.value})}
                    placeholder="Eneo la shamba"
                  />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={closeCropModal}>
                  Ghairi
                </button>
                <button type="submit" className="btn btn-primary">
                  <i className="fas fa-save"></i> {editingCropId ? 'Hifadhi Mabadiliko' : 'Hifadhi Zao'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Product Modal */}
      {showAddProductModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Ongeza Bidhaa Mpya</h3>
              <button className="close-btn" onClick={() => setShowAddProductModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <form onSubmit={handleAddProduct} className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label>Jina la Bidhaa *</label>
                  <input
                    type="text"
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                    required
                    placeholder="Mf. Unga wa Mahindi, Mafuta ya Alizeti"
                  />
                </div>
                <div className="form-group">
                  <label>Kategoria *</label>
                  <select
                    value={newProduct.category}
                    onChange={(e) => setNewProduct({...newProduct, category: e.target.value})}
                    required
                  >
                    <option value="">Chagua kategoria</option>
                    <option value="processed_food">Vyakula Vilivyotengenezwa</option>
                    <option value="beverages">Vinywaji</option>
                    <option value="oils">Mafuta</option>
                    <option value="flours">Unga</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Kiasi *</label>
                  <input
                    type="text"
                    value={newProduct.quantity}
                    onChange={(e) => setNewProduct({...newProduct, quantity: e.target.value})}
                    required
                    placeholder="Mf. 50kg, 20L, nk"
                  />
                </div>
                <div className="form-group">
                  <label>Bei *</label>
                  <input
                    type="text"
                    value={newProduct.price}
                    onChange={(e) => setNewProduct({...newProduct, price: e.target.value})}
                    required
                    placeholder="Mf. TZS 2,500/kg"
                  />
                </div>
                <div className="form-group full-width">
                  <label>Maelezo</label>
                  <textarea
                    value={newProduct.description}
                    onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
                    placeholder="Maelezo ya bidhaa..."
                    rows="3"
                  />
                </div>
                <div className="form-group">
                  <label>Mbinu ya Uandaaaji</label>
                  <input
                    type="text"
                    value={newProduct.processingMethod}
                    onChange={(e) => setNewProduct({...newProduct, processingMethod: e.target.value})}
                    placeholder="Mf. Kusaga, Kutengenezea, nk"
                  />
                </div>
                <div className="form-group">
                  <label>Muda wa Kumaliza</label>
                  <input
                    type="text"
                    value={newProduct.shelfLife}
                    onChange={(e) => setNewProduct({...newProduct, shelfLife: e.target.value})}
                    placeholder="Mf. Miezi 6"
                  />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowAddProductModal(false)}>
                  Ghairi
                </button>
                <button type="submit" className="btn btn-primary">
                  <i className="fas fa-save"></i> Hifadhi Bidhaa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Order Details Modal */}
      {showOrderModal && selectedOrder && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Maelezo ya Agizo #{orderIdOf(selectedOrder)}</h3>
              <button className="close-btn" onClick={() => setShowOrderModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <div className="order-details">
                <div className="detail-row">
                  <label>Zao/Bidhaa:</label>
                  <span>{cropLabelOf(selectedOrder)}</span>
                </div>
                <div className="detail-row">
                  <label>Mnunuzi:</label>
                  <span>{buyerLabelOf(selectedOrder)}</span>
                </div>
                <div className="detail-row">
                  <label>Kiasi Kilichoombwa:</label>
                  <span>{qtyLabelOf(selectedOrder)}</span>
                </div>
                {selectedOrder.approvedQuantity != null && (
                  <div className="detail-row">
                    <label>Kiasi Kilichoidhinishwa:</label>
                    <span>{selectedOrder.approvedQuantity} {selectedOrder.unit || ''}</span>
                  </div>
                )}
                <div className="detail-row">
                  <label>Bei:</label>
                  <span>{selectedOrder.price}</span>
                </div>
                <div className="detail-row">
                  <label>Tarehe ya Agizo:</label>
                  <span>{selectedOrder.orderDate || (selectedOrder.createdAt ? new Date(selectedOrder.createdAt).toLocaleDateString() : '-')}</span>
                </div>
                <div className="detail-row">
                  <label>Tarehe ya Mwisho Kujibu:</label>
                  <span>{selectedOrder.expiresAt ? new Date(selectedOrder.expiresAt).toLocaleString() : '-'}</span>
                </div>
                <div className="detail-row">
                  <label>Namba ya Simu:</label>
                  <span>{selectedOrder.contact || '-'}</span>
                </div>
                <div className="detail-row">
                  <label>Hali:</label>
                  <span className={`status-badge ${selectedOrder.status}`}>
                    {statusLabelOf(selectedOrder.status)}
                  </span>
                </div>
              </div>
              {selectedOrder.status === 'pending' && (
                <div className="approval-box">
                  <label htmlFor="approvalQty">Kiasi Unachokubali ({selectedOrder.unit || 'kg'}):</label>
                  <input
                    id="approvalQty"
                    type="number"
                    min="1"
                    max={selectedOrder.requestedQuantity}
                    value={approvalQty}
                    onChange={(e) => setApprovalQty(e.target.value)}
                    placeholder={`Hadi ${selectedOrder.requestedQuantity} ${selectedOrder.unit || ''}`}
                  />
                  <small>Ukiacha tupu kutathminiwa kama kiasi kizima kilichoombwa.</small>
                </div>
              )}
              {selectedOrder.status === 'pending' && (
                <div className="modal-actions">
                  <button 
                    className="btn btn-success"
                    onClick={() => handleOrderAction(selectedOrder, 'accept')}
                  >
                    <i className="fas fa-check"></i> Kubali Agizo
                  </button>
                  <button 
                    className="btn btn-danger"
                    onClick={() => handleOrderAction(selectedOrder, 'reject')}
                  >
                    <i className="fas fa-times"></i> Kataa Agizo
                  </button>
                </div>
              )}
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
            fetchData();
          }}
        />
      )}
    </>
  );
};

export default FarmerDashboard;