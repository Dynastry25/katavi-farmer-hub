import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { loansAPI } from '../api/client';
import { useAuth } from '../shared/context/AuthContext';
import Loading from '../components/Loading/Loading';
import './CSS/Loans.css';

const CATEGORIES = [
  { value: 'all', label: 'Mikopo Yote', icon: 'fas fa-th-large' },
  { value: 'bank', label: 'Benki', icon: 'fas fa-university' },
  { value: 'government', label: 'Serikali', icon: 'fas fa-landmark' },
  { value: 'saccos', label: 'SACCOS / Vikoba', icon: 'fas fa-users' },
  { value: 'ngo', label: 'Asasi', icon: 'fas fa-handshake' },
  { value: 'microfinance', label: 'Mikopo Ndogo', icon: 'fas fa-coins' },
];

const CATEGORY_COLORS = {
  bank: '#1d4ed8',
  government: '#166534',
  saccos: '#b45309',
  ngo: '#0369a1',
  microfinance: '#7c3aed',
  other: '#4b5563',
};

const Loans = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [applyOpen, setApplyOpen] = useState(false);
  const [applyLoading, setApplyLoading] = useState(false);
  const [applySuccess, setApplySuccess] = useState(null);
  const [myApplications, setMyApplications] = useState([]);
  const [formData, setFormData] = useState({
    amount: '',
    loanPurpose: '',
    repaymentPlan: '',
  });

  const fetchLoans = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await loansAPI.getAll();
      setLoans(res.data);
    } catch (err) {
      console.error('Fetch loans error:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLoans();
    if (user) {
      loansAPI.getMy().then(res => setMyApplications(res.data)).catch(() => {});
    }
  }, [user, fetchLoans]);

  const filteredLoans = loans.filter(loan => {
    const matchCat = selectedCategory === 'all' || loan.category === selectedCategory;
    const q = searchQuery.trim().toLowerCase();
    const matchSearch = !q || loan.name.toLowerCase().includes(q) || loan.provider.toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  const handleApply = async (e) => {
    e.preventDefault();
    if (!user) {
      navigate('/login');
      return;
    }
    setApplyLoading(true);
    try {
      const res = await loansAPI.apply({
        loan: selectedLoan._id,
        loanName: selectedLoan.name,
        amount: formData.amount || selectedLoan.amount,
        loanPurpose: formData.loanPurpose,
        repaymentPlan: formData.repaymentPlan,
      });
      setApplySuccess(res.data);
      setMyApplications(prev => [res.data, ...prev]);
      setApplyOpen(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Hitilafu imetokea wakati wa kuomba mkopo');
    } finally {
      setApplyLoading(false);
    }
  };

  const openApply = (loan) => {
    setSelectedLoan(loan);
    setFormData({ amount: loan.amount?.replace(/[^\d]/g, '') || '', loanPurpose: '', repaymentPlan: '' });
    setApplySuccess(null);
    setApplyOpen(true);
  };

  if (loading) return <Loading message="Inapakia boards za mikopo..." />;

  return (
    <div className="page loans-page">
      <div className="loans-container">
        <div className="container">
          <div className="loans-header">
            <h1>Boards za Mikopo</h1>
            <p>Linganisha mikopo ya kilimo kutoka benki, serikali, SACCOS na mashirika mengine. Omba moja kwa moja hapa.</p>
          </div>

          {/* Error state */}
          {error && (
            <div className="loans-error">
              <i className="fas fa-exclamation-triangle"></i>
              <h3>Huduma Haipatikani</h3>
              <button className="btn btn-primary" onClick={fetchLoans}>
                <i className="fas fa-sync-alt"></i> Jaribu Tena
              </button>
            </div>
          )}

          {!error && (
            <>
              {/* Search */}
              <div className="loan-controls">
                <div className="loan-search">
                  <i className="fas fa-search"></i>
                  <input
                    type="text"
                    placeholder="Tafuta mkopo au taasisi..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              {/* Category Filter */}
              <div className="loan-categories">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.value}
                    className={`loan-category-btn ${selectedCategory === cat.value ? 'active' : ''}`}
                    onClick={() => setSelectedCategory(cat.value)}
                  >
                    <i className={cat.icon}></i> {cat.label}
                  </button>
                ))}
              </div>

              {/* Loan Cards */}
              <div className="loans-grid">
                {filteredLoans.length === 0 ? (
                  <div className="loans-empty">
                    <i className="fas fa-coins"></i>
                    <h3>Hakuna Mikopo Ipatikanayo</h3>
                    <p>Badilisha chaguo lako la kutafuta.</p>
                  </div>
                ) : (
                  filteredLoans.map(loan => (
                    <div key={loan._id} className="loan-card">
                      <div className="loan-card-header" style={{ borderColor: CATEGORY_COLORS[loan.category] || CATEGORY_COLORS.other }}>
                        <div className="loan-provider-badge" style={{ background: CATEGORY_COLORS[loan.category] || CATEGORY_COLORS.other }}>
                          <i className="fas fa-university"></i>
                        </div>
                        <div className="loan-card-title">
                          <h3>{loan.name}</h3>
                          <span className="loan-provider">{loan.provider}</span>
                        </div>
                        <span className={`loan-category-tag ${loan.category}`}>{loan.category}</span>
                      </div>

                      <div className="loan-amount">
                        <span className="loan-amount-value">{loan.amount}</span>
                        <span className="loan-amount-label">Kiasi</span>
                      </div>

                      <div className="loan-details">
                        <div className="loan-detail">
                          <i className="fas fa-percent"></i>
                          <div>
                            <span className="loan-detail-label">Riba</span>
                            <span className="loan-detail-value">{loan.interest}</span>
                          </div>
                        </div>
                        <div className="loan-detail">
                          <i className="fas fa-clock"></i>
                          <div>
                            <span className="loan-detail-label">Muda</span>
                            <span className="loan-detail-value">{loan.duration}</span>
                          </div>
                        </div>
                      </div>

                      {loan.description && <p className="loan-description">{loan.description}</p>}

                      {loan.requirements && loan.requirements.length > 0 && (
                        <div className="loan-requirements">
                          <h4><i className="fas fa-list-check"></i> Masharti</h4>
                          <ul>
                            {loan.requirements.map((req, i) => <li key={i}>{req}</li>)}
                          </ul>
                        </div>
                      )}

                      <div className="loan-actions">
                        <button className="btn btn-outline" onClick={() => openApply(loan)}>
                          <i className="fas fa-eye"></i> Maelezo
                        </button>
                        <button className="btn btn-primary" onClick={() => openApply(loan)}>
                          <i className="fas fa-hand-holding-dollar"></i> Omba Mkopo
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* My Applications */}
              {user && myApplications.length > 0 && (
                <div className="my-loan-applications">
                  <h2><i className="fas fa-file-invoice"></i> Maombi yangu ya Mikopo</h2>
                  <div className="loan-applications-grid">
                    {myApplications.map(app => (
                      <div key={app._id} className={`loan-application-card status-${app.status}`}>
                        <div className="loan-app-header">
                          <h4>{app.loanName}</h4>
                          <span className={`loan-app-status ${app.status}`}>{app.status}</span>
                        </div>
                        <div className="loan-app-details">
                          <span><strong>Kiasi:</strong> {app.amount}</span>
                          <span><strong>Tarehe:</strong> {app.date}</span>
                          {app.repaymentStatus && <span><strong>Marejesho:</strong> {app.repaymentStatus}</span>}
                        </div>
                        {app.repayments && app.repayments.length > 0 && (
                          <div className="loan-app-repayments">
                            <strong>Marejesho ya awali:</strong>
                            {app.repayments.map((r, i) => (
                              <span key={i}>{r.amount} ({r.date})</span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Info section */}
              <div className="loans-info">
                <h3><i className="fas fa-lightbulb"></i> Vidokezo Muhimu kuhusu Mikopo</h3>
                <ul>
                  <li><i className="fas fa-check-circle"></i> Linganisha riba na masharti kabla ya kuomba.</li>
                  <li><i className="fas fa-check-circle"></i> Hakikisha una namba ya kitambulisho (NIDA).</li>
                  <li><i className="fas fa-check-circle"></i> Mikopo ya serikali (kama TJCC) ina riba nafuu kwa wakulima wadogo.</li>
                  <li><i className="fas fa-check-circle"></i> SACCOS za vijijini mara nyingi zinakubali dhamana ya kijamii.</li>
                  <li><i className="fas fa-check-circle"></i> Alama yako ya mikopo (credit score) inaongezeka unapomaliza mikopo kwa wakati.</li>
                </ul>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Apply Modal */}
      {applyOpen && selectedLoan && (
        <div className="cart-overlay" onClick={() => setApplyOpen(false)}>
          <div className="loan-apply-modal" onClick={(e) => e.stopPropagation()}>
            <div className="loan-apply-header">
              <h3><i className="fas fa-hand-holding-dollar"></i> Omba Mkopo</h3>
              <button onClick={() => setApplyOpen(false)}><i className="fas fa-times"></i></button>
            </div>

            {applySuccess ? (
              <div className="loan-apply-success">
                <i className="fas fa-check-circle"></i>
                <h3>Ombi Limewasilishwa!</h3>
                <p>Ombi lako la <strong>{selectedLoan.name}</strong> limepokelewa. Tutakujulisha hali ya ombi lako hivi karibuni.</p>
                <button className="btn btn-primary" onClick={() => setApplyOpen(false)}>
                  Sawa
                </button>
              </div>
            ) : (
              <form onSubmit={handleApply} className="loan-apply-form">
                <div className="loan-apply-summary">
                  <div className="loan-apply-name">{selectedLoan.name}</div>
                  <div className="loan-apply-provider">{selectedLoan.provider}</div>
                  <div className="loan-apply-terms">
                    <span><i className="fas fa-percent"></i> {selectedLoan.interest}</span>
                    <span><i className="fas fa-clock"></i> {selectedLoan.duration}</span>
                  </div>
                </div>

                <div className="form-group">
                  <label>Kiasi Unachoomba *</label>
                  <input
                    type="text"
                    value={formData.amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                    placeholder="Mf. 1,000,000"
                    required
                  />
                  <small className="form-hint">Kiasi ulichokitazama: {selectedLoan.amount}</small>
                </div>

                <div className="form-group">
                  <label>Madhumuni ya Mkopo</label>
                  <select value={formData.loanPurpose} onChange={(e) => setFormData(prev => ({ ...prev, loanPurpose: e.target.value }))}>
                    <option value="">Chagua madhumuni</option>
                    <option value="inputs">Kununua pembejeo (mbolea, mbegu)</option>
                    <option value="equipment">Kununua vifaa vya kilimo</option>
                    <option value="expansion">Kupanua shamba / uzalishaji</option>
                    <option value="marketing">Usafirishaji na masoko</option>
                    <option value="livestock">Ufugaji</option>
                    <option value="other">Nyingine</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Mpango wa Marejesho</label>
                  <textarea
                    rows="3"
                    value={formData.repaymentPlan}
                    onChange={(e) => setFormData(prev => ({ ...prev, repaymentPlan: e.target.value }))}
                    placeholder="Eleza jinsi utakavyorudisha mkopo..."
                  ></textarea>
                </div>

                <div className="loan-apply-note">
                  <i className="fas fa-info-circle"></i>
                  Ukiwa umesajiliwa, ombi lako litaunganishwa na wasifu wako wa mkulima na alama yako ya mikopo.
                </div>

                <div className="loan-apply-actions">
                  <button type="button" className="btn btn-outline" onClick={() => setApplyOpen(false)}>
                    <i className="fas fa-arrow-left"></i> Rudi
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={applyLoading}>
                    {applyLoading ? (
                      <><i className="fas fa-spinner fa-spin"></i> Inatuma...</>
                    ) : (
                      <><i className="fas fa-paper-plane"></i> Wasilisha Ombi</>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Loans;