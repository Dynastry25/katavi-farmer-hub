import React, { useState, useEffect } from 'react';
import Navigation from './Navbar/Navbar';
import Footer from './Footer/Footer';
import { farmerGroupsAPI } from '../api/client';
import './FarmerGroups.css';

const FarmerGroups = ({ onPageChange, onAuth, user }) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGroup, setNewGroup] = useState({
    name: '',
    description: '',
    location: '',
    cropType: '',
    maxMembers: ''
  });
  const [apiGroups, setApiGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const res = await farmerGroupsAPI.getAll();
        if (res.data && res.data.length > 0) setApiGroups(res.data);
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchGroups();
  }, []);

  const farmerGroups = apiGroups.length > 0 ? apiGroups.map(g => ({ ...g, id: g._id, members: g.members?.length || 0 })) : [
    { id: 1, name: 'Wakulima wa Mpanda', description: 'Kikundi cha wakulima wa eneo la Mpanda kinacholima mazao mbalimbali', location: 'Mpanda', cropType: 'Mimea Mbalimbali', members: 25, maxMembers: 50, createdBy: 'Juma Mwinyi', createdDate: '2024-01-01' },
    { id: 2, name: 'Wakulima wa Mahindi Mlele', description: 'Kikundi maalum cha wakulima wa mahindi katika eneo la Mlele', location: 'Mlele', cropType: 'Mahindi', members: 15, maxMembers: 30, createdBy: 'Asha Hassan', createdDate: '2024-01-10' },
  ];

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    try {
      await farmerGroupsAPI.create(newGroup);
      alert('Kikundi kipya kimeundwa!');
      setShowCreateModal(false);
      const res = await farmerGroupsAPI.getAll();
      if (res.data) setApiGroups(res.data);
    } catch (error) {
      console.error('Error:', error);
      alert('Hitilafu imetokea');
    }
  };

  return (
    <div className="page farmer-groups-page">
      <Navigation 
        currentPage="farmer-groups"
        onPageChange={onPageChange}
        onAuth={onAuth}
        user={user}
      />
      
      <div className="groups-container">
        <div className="container">
          <div className="groups-header">
            <div className="header-content">
              <h1>Vikundi vya Wakulima</h1>
              <p>Jiunge na wakulima wengine wa eneo lako na kuongeza nguvu zako za kilimo</p>
            </div>
            <button 
              className="btn btn-primary"
              onClick={() => setShowCreateModal(true)}
            >
              <i className="fas fa-plus"></i> Unda Kikundi Kipya
            </button>
          </div>

          <div className="groups-grid">
            {farmerGroups.map(group => (
              <div key={group.id} className="group-card">
                <div className="group-header">
                  <h3>{group.name}</h3>
                  <span className="member-count">
                    {group.members}/{group.maxMembers} Wanachama
                  </span>
                </div>
                
                <div className="group-info">
                  <div className="info-item">
                    <i className="fas fa-map-marker-alt"></i>
                    {group.location}
                  </div>
                  <div className="info-item">
                    <i className="fas fa-seedling"></i>
                    {group.cropType}
                  </div>
                  <div className="info-item">
                    <i className="fas fa-user"></i>
                    {group.createdBy}
                  </div>
                </div>

                <p className="group-description">{group.description}</p>

                <div className="group-progress">
                  <div className="progress-bar">
                    <div 
                      className="progress-fill"
                      style={{ width: `${(group.members / group.maxMembers) * 100}%` }}
                    ></div>
                  </div>
                  <span>{Math.round((group.members / group.maxMembers) * 100)}% imejazwa</span>
                </div>

                <div className="group-actions">
                  <button className="btn btn-primary">
                    <i className="fas fa-eye"></i> Angalia
                  </button>
                  <button className="btn btn-success">
                    <i className="fas fa-user-plus"></i> Jiunge
                  </button>
                  <button className="btn btn-outline">
                    <i className="fas fa-comments"></i> Wasiliana
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Create Group Modal */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Unda Kikundi Kipya cha Wakulima</h3>
              <button className="close-btn1" onClick={() => setShowCreateModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <form onSubmit={handleCreateGroup} className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label>Jina la Kikundi *</label>
                  <input
                    type="text"
                    value={newGroup.name}
                    onChange={(e) => setNewGroup({...newGroup, name: e.target.value})}
                    required
                    placeholder="Weka jina la kikundi"
                  />
                </div>
                <div className="form-group">
                  <label>Eneo *</label>
                  <input
                    type="text"
                    value={newGroup.location}
                    onChange={(e) => setNewGroup({...newGroup, location: e.target.value})}
                    required
                    placeholder="Eneo la kikundi"
                  />
                </div>
                <div className="form-group">
                  <label>Aina ya Mazao</label>
                  <input
                    type="text"
                    value={newGroup.cropType}
                    onChange={(e) => setNewGroup({...newGroup, cropType: e.target.value})}
                    placeholder="Mazao unayolima"
                  />
                </div>
                <div className="form-group">
                  <label>Idadi ya Wanachama</label>
                  <input
                    type="number"
                    value={newGroup.maxMembers}
                    onChange={(e) => setNewGroup({...newGroup, maxMembers: e.target.value})}
                    placeholder="Wanachama wanaokubalika"
                  />
                </div>
                <div className="form-group full-width">
                  <label>Maelezo ya Kikundi</label>
                  <textarea
                    value={newGroup.description}
                    onChange={(e) => setNewGroup({...newGroup, description: e.target.value})}
                    placeholder="Eleza lengo na malengo ya kikundi..."
                    rows="4"
                  />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowCreateModal(false)}>
                  Ghairi
                </button>
                <button type="submit" className="btn btn-primary">
                  <i className="fas fa-save"></i> Unda Kikundi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer onPageChange={onPageChange} />
    </div>
  );
};

export default FarmerGroups;