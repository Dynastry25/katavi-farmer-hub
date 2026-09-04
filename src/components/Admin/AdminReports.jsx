import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area
} from 'recharts';
import AdminLayout from './AdminLayout';
import { adminAPI } from '../../api/client';
import './AdminDashboard.css';

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

const AdminReports = ({ onPageChange, onAuth, user, onToggleChat, onRefresh }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('reports');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const res = await adminAPI.getStats();
        setStats(res.data);
      } catch (err) {
        console.error('Admin reports stats error:', err);
      } finally {
        setLoading(false);
      }
    };
    loadStats();
  }, []);

  const navSections = [
    {
      label: 'Kuabiri',
      links: [
        { id: 'overview', label: 'Mapitio ya Mfumo', icon: 'fas fa-chart-pie', active: false, onClick: () => navigate('/admin-dashboard') },
        { id: 'users', label: 'Watumiaji', icon: 'fas fa-users-cog', active: false, onClick: () => navigate('/admin-dashboard') },
        { id: 'reports', label: 'Ripoti', icon: 'fas fa-chart-bar', active: true },
      ]
    },
    {
      label: 'Akaunti',
      links: [
        { id: 'profile', label: 'Wasifu', icon: 'fas fa-user-cog', active: false, onClick: () => navigate('/admin-dashboard') },
      ]
    }
  ];

  const reportCards = [
    { label: 'Jumla ya Watumiaji', value: stats?.totalUsers ?? 0, icon: 'fas fa-users' },
    { label: 'Mazao', value: stats?.totalCrops ?? 0, icon: 'fas fa-wheat-awn' },
    { label: 'Bidhaa', value: stats?.totalProducts ?? 0, icon: 'fas fa-industry' },
    { label: 'Maagizo', value: stats?.totalOrders ?? 0, icon: 'fas fa-shopping-basket' },
    { label: 'Mikopo', value: stats?.totalLoans ?? 0, icon: 'fas fa-hand-holding-usd' },
    { label: 'Vikundi', value: stats?.totalGroups ?? 0, icon: 'fas fa-users' },
  ];

  const roleData = [
    { name: 'Wakulima', value: stats?.farmers ?? 0, color: '#1a7431' },
    { name: 'Wanunuzi', value: stats?.buyers ?? 0, color: '#3b82f6' },
    { name: 'Wataalamu', value: stats?.experts ?? 0, color: '#f59e0b' },
    { name: 'Admin', value: stats?.admins ?? 0, color: '#dc2626' },
  ].filter(d => d.value > 0);

  const growthData = (stats?.monthlyUsers && stats.monthlyUsers.length)
    ? stats.monthlyUsers
    : [
        { month: 'Jan', users: 4 }, { month: 'Feb', users: 7 }, { month: 'Mar', users: 9 },
        { month: 'Apr', users: 12 }, { month: 'May', users: 15 }, { month: 'Juni', users: 20 },
      ];

  const recentUsers = stats?.recentUsers || [];

  return (
    <AdminLayout
      user={user}
      roleLabel="Admin"
      roleIcon="fas fa-user-shield"
      pageTitle="Ripoti za Mfumo"
      subtitle="Takwimu na ripoti za shughuli zote katika mfumo"
      navSections={navSections}
      onLogout={() => onAuth('logout')}
    >
      {loading ? (
        <div className="admin-loading">Inapakia ripoti...</div>
      ) : (
        <div className="admin-reports">
          <div className="admin-stat-grid">
            {reportCards.map((c, i) => (
              <div className="admin-stat-card" key={i}>
                <div className="admin-stat-icon"><i className={c.icon}></i></div>
                <div className="admin-stat-content">
                  <div className="admin-stat-value">{c.value}</div>
                  <div className="admin-stat-label">{c.label}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="admin-charts-row">
            <div className="admin-chart-card">
              <h3>Watumiaji kwa Jukumu</h3>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={roleData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={95} paddingAngle={3}>
                    {roleData.map((entry, i) => (<Cell key={i} fill={entry.color} />))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="admin-chart-card">
              <h3>Ukuaji wa Watumiaji (miezi 6)</h3>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={growthData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <defs>
                    <linearGradient id="reportsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1a7431" stopOpacity={0.7} />
                      <stop offset="95%" stopColor="#1a7431" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="users" name="Watumiaji" stroke="#1a7431" fill="url(#reportsGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="admin-charts-row">
            <div className="admin-chart-card">
              <h3>Shughuli za Jukwaa</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={[
                  { name: 'Mazao', value: stats?.totalCrops ?? 0 },
                  { name: 'Bidhaa', value: stats?.totalProducts ?? 0 },
                  { name: 'Maagizo', value: stats?.totalOrders ?? 0 },
                  { name: 'Mikopo', value: stats?.totalLoans ?? 0 },
                  { name: 'Vikundi', value: stats?.totalGroups ?? 0 },
                ]} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" name="Idadi" fill="#1a7431" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="admin-chart-card">
              <h3>Watumiaji Waingiapo Hivi Karibuni</h3>
              <div className="recent-users">
                {recentUsers.length === 0 ? (
                  <div className="no-data">Hakuna data ya watumiaji</div>
                ) : recentUsers.map(u => (
                  <div className="recent-user" key={u._id}>
                    <span className={`ru-avatar role-${u.role}`}><i className={ROLE_ICONS[u.role] || 'fas fa-user'}></i></span>
                    <div className="ru-meta">
                      <strong>{u.name}</strong>
                      <span>{u.email}</span>
                    </div>
                    <span className={`role-pill role-${u.role}`}>{ROLE_LABELS[u.role] || u.role}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminReports;
