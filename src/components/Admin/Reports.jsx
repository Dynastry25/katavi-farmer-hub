import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from './AdminLayout';
import { getRoleNavSections } from './roleNav';
import { cropsAPI, ordersAPI, productsAPI, adviceAPI, adminAPI } from '../../api/client';
import './Reports.css';

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

const Reports = ({ user: propUser, onAuth }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState(propUser);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [activities, setActivities] = useState([]);

  const role = user?.role || 'farmer';

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
    loadReport(current.role || 'farmer');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propUser]);

  const timeAgo = (dateStr) => {
    if (!dateStr) return 'Hivi karibuni';
    try {
      const d = new Date(dateStr);
      const diff = Date.now() - d.getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 1) return 'Sasa hivi';
      if (mins < 60) return `${mins} dk zilizopita`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return `${hrs} saa zilizopita`;
      const days = Math.floor(hrs / 24);
      if (days < 30) return `${days} siku zilizopita`;
      return d.toLocaleDateString('sw-TZ');
    } catch (e) {
      return 'Hivi karibuni';
    }
  };

  const loadReport = async (r) => {
    setLoading(true);
    try {
      let act = [];
      let st = {};

      if (r === 'admin') {
        const res = await adminAPI.getStats();
        const data = res.data || {};
        st = {
          users: data.totalUsers ?? 0,
          farmers: data.farmers ?? 0,
          buyers: data.buyers ?? 0,
          experts: data.experts ?? 0,
          crops: data.totalCrops ?? 0,
          orders: data.totalOrders ?? 0,
          products: data.totalProducts ?? 0,
          loans: data.totalLoans ?? 0,
          groups: data.totalGroups ?? 0,
        };
        const recent = data.recentUsers || [];
        act = recent.map(u => ({
          id: 'ru' + u._id,
          icon: ROLE_ICONS[u.role] || 'fas fa-user',
          text: `${u.name} amejiunga kama ${ROLE_LABELS[u.role] || u.role}`,
          time: timeAgo(u.createdAt),
        }));
      } else if (r === 'farmer') {
        let crops = [], orders = [], products = [];
        try {
          const [c, o, p] = await Promise.all([cropsAPI.getAll(), ordersAPI.getAll(), productsAPI.getMy()]);
          crops = c.data || [];
          orders = o.data || [];
          products = p.data || [];
        } catch (e) { /* tolerate */ }
        st = {
          crops: crops.length,
          products: products.length,
          orders: orders.length,
          completed: orders.filter(o => (o.status || '').toLowerCase() === 'completed').length,
        };
        crops.forEach(c => act.push({
          id: 'c' + (c._id || c.id), icon: 'fas fa-wheat-awn',
          text: `Uliongeza zao: ${c.crop || c.name || 'Mazao'} (${c.quantity || ''})`, time: timeAgo(c.createdAt),
        }));
        products.forEach(p => act.push({
          id: 'p' + (p._id || p.id), icon: 'fas fa-industry',
          text: `Uliongeza bidhaa: ${p.name || 'Bidhaa'}`, time: timeAgo(p.createdAt),
        }));
        orders.forEach(o => act.push({
          id: 'o' + (o._id || o.id), icon: 'fas fa-shopping-cart',
          text: `Agizo: ${o.crop || ''} (${o.status || 'pending'})`, time: timeAgo(o.createdAt),
        }));
      } else if (r === 'buyer') {
        let orders = [];
        try {
          const o = await ordersAPI.getAll();
          orders = o.data || [];
        } catch (e) {}
        st = {
          orders: orders.length,
          pending: orders.filter(o => (o.status || '').toLowerCase() === 'pending').length,
          completed: orders.filter(o => (o.status || '').toLowerCase() === 'completed').length,
        };
        orders.forEach(o => act.push({
          id: 'o' + (o._id || o.id), icon: 'fas fa-shopping-basket',
          text: `Uliweka agizo: ${o.crop || ''} (${o.status || 'pending'})`, time: timeAgo(o.createdAt),
        }));
      } else if (r === 'expert') {
        let articles = [];
        try {
          const a = await adviceAPI.getArticles();
          articles = a.data || [];
        } catch (e) {}
        st = {
          articles: articles.length,
          answered: 47,
          pending: 3,
          rating: 4.8,
        };
        articles.forEach(a => act.push({
          id: 'a' + (a._id || a.id), icon: 'fas fa-newspaper',
          text: `Uliandika makala: ${a.title || 'Makala'}`, time: timeAgo(a.createdAt),
        }));
      }

      act.sort((a, b) => (a.order || 0) - (b.order || 0));
      setStats(st);
      setActivities(act.length ? act : [
        { id: 'x1', icon: 'fas fa-user-plus', text: 'Umejiunga na mfumo', time: timeAgo(user?.createdAt || user?.registrationDate) },
      ]);
    } catch (e) {
      setStats({});
      setActivities([{ id: 'x2', icon: 'fas fa-info-circle', text: 'Hakuna activiti za kionyesha kwa sasa', time: 'Hivi karibuni' }]);
    } finally {
      setLoading(false);
    }
  };

  const statCards = () => {
    const map = {
      admin: [
        { label: 'Watumiaji', value: stats.users ?? 0, icon: 'fas fa-users' },
        { label: 'Wakulima', value: stats.farmers ?? 0, icon: 'fas fa-tractor' },
        { label: 'Wanunuzi', value: stats.buyers ?? 0, icon: 'fas fa-shopping-cart' },
        { label: 'Wataalamu', value: stats.experts ?? 0, icon: 'fas fa-graduation-cap' },
        { label: 'Mazao', value: stats.crops ?? 0, icon: 'fas fa-wheat-awn' },
        { label: 'Maagizo', value: stats.orders ?? 0, icon: 'fas fa-shopping-basket' },
      ],
      farmer: [
        { label: 'Mazao', value: stats.crops ?? 0, icon: 'fas fa-wheat-awn' },
        { label: 'Bidhaa', value: stats.products ?? 0, icon: 'fas fa-industry' },
        { label: 'Maagizo', value: stats.orders ?? 0, icon: 'fas fa-shopping-cart' },
        { label: 'Yaliyokamilika', value: stats.completed ?? 0, icon: 'fas fa-check-circle' },
      ],
      buyer: [
        { label: 'Maagizo Yote', value: stats.orders ?? 0, icon: 'fas fa-shopping-basket' },
        { label: 'Yanasubiri', value: stats.pending ?? 0, icon: 'fas fa-hourglass-half' },
        { label: 'Yaliyokamilika', value: stats.completed ?? 0, icon: 'fas fa-check-circle' },
      ],
      expert: [
        { label: 'Makala', value: stats.articles ?? 0, icon: 'fas fa-newspaper' },
        { label: 'Yaliyojibiwa', value: stats.answered ?? 0, icon: 'fas fa-comments' },
        { label: 'Yanasubiri', value: stats.pending ?? 0, icon: 'fas fa-hourglass-half' },
        { label: 'Tathmini', value: stats.rating ?? 0, icon: 'fas fa-star' },
      ],
    };
    return map[role] || [];
  };

  const navSections = getRoleNavSections({
    role,
    navigate,
    activeTab: 'reports',
  });

  const cards = statCards();

  return (
    <AdminLayout
      user={user}
      roleLabel={ROLE_LABELS[role]}
      roleIcon={ROLE_ICONS[role]}
      pageTitle="Ripoti yangu - Shughuli"
      subtitle="Activity na takwimu za shughuli zako"
      navSections={navSections}
      onLogout={() => onAuth('logout')}
    >
      {loading ? (
        <div className="report-loading">Inapakia ripoti yako...</div>
      ) : (
        <div className="my-report">
          <div className="report-summary-card">
            <div className="report-avatar"><i className={ROLE_ICONS[role]}></i></div>
            <div>
              <h2>{user?.name}</h2>
              <p className="report-role">{ROLE_LABELS[role]} - Muhtasari wa Shughuli</p>
            </div>
          </div>

          <div className="report-stat-grid">
            {cards.map((c, i) => (
              <div className="report-stat-card" key={i}>
                <div className="report-stat-icon"><i className={c.icon}></i></div>
                <div>
                  <div className="report-stat-value">{c.value}</div>
                  <div className="report-stat-label">{c.label}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="report-activity">
            <h3>Shughuli Zake Hivi Karibuni</h3>
            {activities.length === 0 ? (
              <div className="no-data">Hakuna shughuli bado</div>
            ) : (
              <div className="report-timeline">
                {activities.slice(0, 12).map(a => (
                  <div className="timeline-item" key={a.id}>
                    <div className="timeline-icon"><i className={a.icon}></i></div>
                    <div className="timeline-content">
                      <p>{a.text}</p>
                      <span>{a.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default Reports;
