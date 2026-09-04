import React, { useState, useEffect } from 'react';
import { loansAPI } from '../api/client';
import Navigation from './Navbar/Navbar';
import Footer from './Footer/Footer';
import Loading from './Loading/Loading';
import './Loans.css';

const LoanCalculator = () => {
  const [amount, setAmount] = useState(1000000);
  const [interest, setInterest] = useState(12);
  const [months, setMonths] = useState(12);

  const monthlyRate = interest / 100 / 12;
  const monthlyPayment = amount * monthlyRate / (1 - Math.pow(1 + monthlyRate, -months));
  const totalPayment = monthlyPayment * months;
  const totalInterest = totalPayment - amount;

  const formatTZS = (value) =>
    'TZS ' + Math.round(value).toLocaleString('sw-TZ');

  return (
    <div className="loan-calculator">
      <div className="loans-section-heading">
        <h3><i className="fas fa-calculator"></i> Kikokotoo cha Mikopo</h3>
        <p>Piga hesabu ya malipo ya mkopo wako kabla ya kuomba</p>
      </div>
      <div className="calculator-form">
        <div className="calc-group">
          <label>Kiasi cha Mkopo</label>
          <input
            type="number"
            value={amount}
            min="100000"
            step="50000"
            onChange={(e) => setAmount(Number(e.target.value))}
          />
        </div>
        <div className="calc-group">
          <label>Riba (% kwa mwaka)</label>
          <input
            type="number"
            value={interest}
            min="1"
            step="0.5"
            onChange={(e) => setInterest(Number(e.target.value))}
          />
        </div>
        <div className="calc-group">
          <label>Muda wa Mkopo (miezi)</label>
          <input
            type="number"
            value={months}
            min="1"
            max="60"
            onChange={(e) => setMonths(Number(e.target.value))}
          />
        </div>
      </div>
      <div className="calc-result">
        <h4>Malipo Yako ya Kila Mwezi</h4>
        <div className="calc-amount">{formatTZS(monthlyPayment)}</div>
        <div className="calc-breakdown">
          <div className="breakdown-item">
            <div className="breakdown-value">{formatTZS(totalPayment)}</div>
            <div className="breakdown-label">Jumla ya Malipo</div>
          </div>
          <div className="breakdown-item">
            <div className="breakdown-value">{formatTZS(totalInterest)}</div>
            <div className="breakdown-label">Jumla ya Riba</div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Loans = ({ onPageChange, onAuth, user }) => {
  const [activeTab, setActiveTab] = useState('available');
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [apiLoans, setApiLoans] = useState([]);
  const [apiMyLoans, setApiMyLoans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLoans = async () => {
      try {
        const [loansRes, myLoansRes] = await Promise.all([
          loansAPI.getAll(),
          loansAPI.getMy().catch(() => ({ data: [] })),
        ]);
        if (loansRes.data && loansRes.data.length > 0) setApiLoans(loansRes.data);
        if (myLoansRes.data && myLoansRes.data.length > 0) setApiMyLoans(myLoansRes.data);
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchLoans();
  }, []);

  const loanProducts = apiLoans.length > 0 ? apiLoans : [
    {
      id: 1,
      name: 'Mkopo wa Kilimo',
      provider: 'NMB Bank',
      amount: 'Hadi TZS 50,000,000',
      interest: '12% kwa mwaka',
      duration: 'Hadi miezi 36',
      requirements: ['Kitambulisho cha taifa', 'Hati miliki ya ardhi', 'Mpango wa kilimo'],
      description: 'Mkopo maalum kwa wakulima wa mazao na mifugo',
      category: 'agriculture'
    },
    {
      id: 2,
      name: 'Mkopo wa Biashara',
      provider: 'CRDB Bank',
      amount: 'Hadi TZS 100,000,000',
      interest: '15% kwa mwaka',
      duration: 'Hadi miezi 48',
      requirements: ['Leseni ya biashara', 'Taarifa za benki za miezi 6', 'Dhamana'],
      description: 'Mkopo kwa wafanyabiashara wa mazao na pembejeo',
      category: 'business'
    },
    {
      id: 3,
      name: 'Mkopo wa Vifaa',
      provider: 'Akiba Commercial Bank',
      amount: 'Hadi TZS 20,000,000',
      interest: '10% kwa mwaka',
      duration: 'Hadi miezi 24',
      requirements: ['Kitambulisho', 'Makubaliano ya ununuzi', 'Kiasi kidogo cha awali'],
      description: 'Mkopo maalum wa kununua vifaa vya kilimo',
      category: 'equipment'
    }
  ];

  const myLoans = apiMyLoans.length > 0 ? apiMyLoans : [
    { id: 1, product: 'Mkopo wa Kilimo', amount: 'TZS 10,000,000', date: '2024-01-15', status: 'approved', remaining: 'TZS 8,500,000', nextPayment: '2024-02-15' },
  ];

  const handleApplyForLoan = (loan) => {
    setSelectedLoan(loan);
    setShowApplicationModal(true);
  };

  const renderAvailableLoans = () => (
    <div className="loans-section">
      <div className="loans-section-heading">
        <h3><i className="fas fa-hand-holding-usd"></i> Mikopo Inayopatikana</h3>
        <p>Chagua mkopo unaofaa kwa shughuli zako za kilimo</p>
      </div>
      <div className="loans-grid">
        {loanProducts.map(loan => (
          <div key={loan.id} className="loan-card">
            <div className="loan-header">
              <div className="loan-title-group">
                <div className="loan-icon"><i className="fas fa-coins"></i></div>
                <h4>{loan.name}</h4>
              </div>
              <span className="provider"><i className="fas fa-bank"></i> {loan.provider}</span>
            </div>
            <div className="loan-details">
              <div className="detail-item">
                <span className="label"><i className="fas fa-money-bill-wave"></i> Kiasi:</span>
                <span className="value">{loan.amount}</span>
              </div>
              <div className="detail-item">
                <span className="label"><i className="fas fa-percent"></i> Riba:</span>
                <span className="value">{loan.interest}</span>
              </div>
              <div className="detail-item">
                <span className="label"><i className="fas fa-clock"></i> Muda:</span>
                <span className="value">{loan.duration}</span>
              </div>
            </div>
            <p className="loan-description">{loan.description}</p>
            <div className="loan-requirements">
              <strong><i className="fas fa-list-check"></i> Mahitaji:</strong>
              <ul>
                {loan.requirements.map((req, index) => (
                  <li key={index}><i className="fas fa-check-circle"></i> {req}</li>
                ))}
              </ul>
            </div>
            <button 
              className="btn btn-primary loan-apply-btn"
              onClick={() => handleApplyForLoan(loan)}
            >
              <i className="fas fa-file-signature"></i> Omba Mkopo
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  const renderMyLoans = () => (
    <div className="loans-section">
      <div className="loans-section-heading">
        <h3><i className="fas fa-folder-open"></i> Mikopo Yangu</h3>
        <p>Fuatilia mikopo yako na malipo yanayofuata</p>
      </div>
      <div className="loans-table">
        <table>
          <thead>
            <tr>
              <th>Aina ya Mkopo</th>
              <th>Kiasi</th>
              <th>Tarehe</th>
              <th>Hali</th>
              <th>Kilichobaki</th>
              <th>Malipo Yanayofuata</th>
              <th>Vitendo</th>
            </tr>
          </thead>
          <tbody>
            {myLoans.map(loan => (
              <tr key={loan.id}>
                <td>{loan.product}</td>
                <td>{loan.amount}</td>
                <td>{loan.date}</td>
                <td><span className={`status-badge ${loan.status}`}>{loan.status}</span></td>
                <td>{loan.remaining}</td>
                <td>{loan.nextPayment}</td>
                <td>
                  <button className="btn btn-sm btn-outline">Angalia Maelezo</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  if (loading) {
    return <Loading message="Inapakia mikopo..." />;
  }

  return (
    <div className="page loans-page">
      <Navigation 
        currentPage="loans"
        onPageChange={onPageChange}
        onAuth={onAuth}
        user={user}
      />
      
      <div className="loans-container">
        <div className="container">
          <div className="loans-header">
            <div className="loans-header-badge"><i className="fas fa-hand-holding-heart"></i> Mfumo wa Mikopo</div>
            <h1>Mikopo kwa Wakulima</h1>
            <p>Pata mikopo kwa urahisi kwa shughuli zako za kilimo na biashara</p>
            <div className="loans-header-actions">
              <button className="btn btn-primary"><i className="fas fa-file-signature"></i> Omba Mkopo Sasa</button>
              <button className="btn btn-outline" onClick={() => setActiveTab('calculator')}>
                <i className="fas fa-calculator"></i> Kikokotoo cha Mikopo
              </button>
            </div>
          </div>

          <div className="loan-stats">
            <div className="stat-card">
              <div className="stat-icon"><i className="fas fa-percent"></i></div>
              <div className="stat-value">Asilimia 10</div>
              <div className="stat-label">Riba ya chini kabisa</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon"><i className="fas fa-clock"></i></div>
              <div className="stat-value">Siku 5</div>
              <div className="stat-label">Muda wa kupata mkopo</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon"><i className="fas fa-bank"></i></div>
              <div className="stat-value">3+</div>
              <div className="stat-label">Benki washirika</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon"><i className="fas fa-check-circle"></i></div>
              <div className="stat-value">100%</div>
              <div className="stat-label">Usalama wa endelea</div>
            </div>
          </div>

          <div className="loans-tabs">
            <button 
              className={`tab-btn ${activeTab === 'available' ? 'active' : ''}`}
              onClick={() => setActiveTab('available')}
            >
              <i className="fas fa-hand-holding-usd"></i> Mikopo Inayopatikana
            </button>
            <button 
              className={`tab-btn ${activeTab === 'myLoans' ? 'active' : ''}`}
              onClick={() => setActiveTab('myLoans')}
            >
              <i className="fas fa-folder-open"></i> Mikopo Yangu
            </button>
            <button 
              className={`tab-btn ${activeTab === 'calculator' ? 'active' : ''}`}
              onClick={() => setActiveTab('calculator')}
            >
              <i className="fas fa-calculator"></i> Kikokotoo cha Mikopo
            </button>
          </div>

          <div className="loans-content">
            {activeTab === 'available' && renderAvailableLoans()}
            {activeTab === 'myLoans' && renderMyLoans()}
            {activeTab === 'calculator' && <LoanCalculator />}
          </div>
        </div>
      </div>

      {/* Application Modal */}
      {showApplicationModal && selectedLoan && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3><i className="fas fa-file-signature"></i> Omba Mkopo - {selectedLoan.name}</h3>
              <button className="close-btn" onClick={() => setShowApplicationModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <p className="modal-intro">Jaza taarifa zako za awali ili mwombaji wa mkopo azingatiwe na benki mshirika. Tutawasiliana nawe haraka.</p>
              <div className="application-form">
                <div className="form-group full-width">
                  <label>Jina Kamili</label>
                  <input type="text" placeholder="Ingiza jina lako kamili" />
                </div>
                <div className="form-group">
                  <label>Namba ya Simu</label>
                  <input type="tel" placeholder="+255 7XX XXX XXX" />
                </div>
                <div className="form-group">
                  <label>Barua Pepe</label>
                  <input type="email" placeholder="example@email.com" />
                </div>
                <div className="form-group full-width">
                  <label>Kiasi Unachoomba</label>
                  <input type="text" placeholder="TZS ..." />
                </div>
                <div className="form-group full-width">
                  <label>Maelezo ya Shughuli</label>
                  <textarea placeholder="Eleza shughuli yako ya kilimo na jinsi utakavyotumia mkopo..."></textarea>
                </div>
              </div>
              <div className="modal-actions">
                <button className="btn btn-outline" onClick={() => setShowApplicationModal(false)}><i className="fas fa-times"></i> Ghairi</button>
                <button className="btn btn-primary"><i className="fas fa-paper-plane"></i> Tumba Ombi</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer onPageChange={onPageChange} />
    </div>
  );
};

export default Loans;