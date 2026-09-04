import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line, AreaChart, Area
} from 'recharts';
import AdminLayout from './AdminLayout';
import { adminAPI } from '../../api/client';
import './AdminDashboard.css';

const CHART_COLORS = ['#1a7431', '#22c55e', '#f59e0b', '#3b82f6', '#16a34a', '#86efac'];

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

const AdminDashboard = ({ onPageChange, onAuth, user, onToggleChat, onRefresh }) => {
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
  const [toast, setToast] = useState(null);

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
      setUsers(res.data);
    } catch (err) {
      console.error('Error loading users:', err);
    } finally {
      setLoading(false);
    }
  }, [roleFilter, searchTerm]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    if (activeTab === 'users') loadUsers();
  }, [activeTab, loadUsers]);

  // Debounce search
  useEffect(() => {
    if (activeTab !== 'users') return;
    const t = setTimeout(() => loadUsers(), 400);
    return () => clearTimeout(t);
  }, [searchTerm, activeTab, loadUsers]);

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

  const handleDelete = async (id) => {
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

  const handleCreate = async (e) => {
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

  const handleEdit = async (e) => {
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

  const navSections = getRoleNavSections({
    role: 'admin',
    navigate,
    activeTab,
    onTab: setActiveTab,
  });

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
    ];

    const roleData = [
      { name: 'Wakulima', value: stats?.farmers ?? 0, color: '#1a7431' },
      { name: 'Wanunuzi', value: stats?.buyers ?? 0, color: '#3b82f6' },
      { name: 'Wataalamu', value: stats?.experts ?? 0, color: '#f59e0b' },
      { name: 'Admin', value: stats?.admins ?? 0, color: '#dc2626' },
    ].filter(d => d.value > 0);

    const activityData = [
      { name: 'Mazao', value: stats?.totalCrops ?? 0, icon: 'fas fa-wheat-awn' },
      { name: 'Bidhaa', value: stats?.totalProducts ?? 0, icon: 'fas fa-industry' },
      { name: 'Maagizo', value: stats?.totalOrders ?? 0, icon: 'fas fa-shopping-basket' },
      { name: 'Mikopo', value: stats?.totalLoans ?? 0, icon: 'fas fa-hand-holding-usd' },
      { name: 'Vikundi', value: stats?.totalGroups ?? 0, icon: 'fas fa-users' },
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
            <button className="action-btn" onClick={() => navigate('/admin-reports')}>
              <i className="fas fa-chart-bar"></i> Ripoti za Mfumo
            </button>
            <button className="action-btn" onClick={onToggleChat}>
              <i className="fas fa-comments"></i> Mazungumzo
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
        </select>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          <i className="fas fa-user-plus"></i> Ongeza Mtumiaji
        </button>
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
                      </div>
                    </div>
                  </td>
                  <td>{u.phone}</td>
                  <td>{u.location || u.district || 'â€”'}</td>
                  <td>
                    <span className={`role-pill role-${u.role}`}>
                      <i className={ROLE_ICONS[u.role] || 'fas fa-user'}></i> {ROLE_LABELS[u.role] || u.role}
                    </span>
                  </td>
                  <td>{u.createdAt ? new Date(u.createdAt).toLocaleDateString('sw-TZ') : 'â€”'}</td>
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
                      </select>
                      <button className="btn btn-sm btn-outline" onClick={() => openEdit(u)}>
                        <i className="fas fa-edit"></i>
                      </button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(u._id)} disabled={u._id === user?._id}>
                        <i className="fas fa-trash"></i>
                      </button>
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

  return (
    <>
    <AdminLayout
      user={user}
      roleLabel="Admin"
      roleIcon="fas fa-user-shield"
      pageTitle="Admin Panel - Usimamizi wa Mfumo"
      subtitle="Dhibiti watumiaji na majukumu yao katika mfumo mzima"
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
    </AdminLayout>

    {/* Create user modal */}
    {showCreateModal && (
      <div className="modal-overlay">
        <div className="modal">
          <div className="modal-header">
            <h3>Ongeza Mtumiaji Mpya</h3>
            <button className="close-btn" onClick={() => setShowCreateModal(false)}><i className="fas fa-times"></i></button>
          </div>
          <form onSubmit={handleCreate} className="modal-body">
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
          <form onSubmit={handleEdit} className="modal-body">
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
