import React, { useState } from 'react';
import Navigation from './Navbar/Navbar';
import Footer from './Footer/Footer';
import './Loans.css';

const Loans = ({ onPageChange, onAuth, user }) => {
  const [activeTab, setActiveTab] = useState('available');
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState(null);

  const loanProducts = [
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

  const myLoans = [
    {
      id: 1,
      product: 'Mkopo wa Kilimo',
      amount: 'TZS 10,000,000',
      date: '2024-01-15',
      status: 'approved',
      remaining: 'TZS 8,500,000',
      nextPayment: '2024-02-15'
    }
  ];

  const handleApplyForLoan = (loan) => {
    setSelectedLoan(loan);
    setShowApplicationModal(true);
  };

  const renderAvailableLoans = () => (
    <div className="loans-section">
      <h3>Mikopo Inayopatikana</h3>
      <div className="loans-grid">
        {loanProducts.map(loan => (
          <div key={loan.id} className="loan-card">
            <div className="loan-header">
              <h4>{loan.name}</h4>
              <span className="provider">{loan.provider}</span>
            </div>
            <div className="loan-details">
              <div className="detail-item">
                <span className="label">Kiasi:</span>
                <span className="value">{loan.amount}</span>
              </div>
              <div className="detail-item">
                <span className="label">Riba:</span>
                <span className="value">{loan.interest}</span>
              </div>
              <div className="detail-item">
                <span className="label">Muda:</span>
                <span className="value">{loan.duration}</span>
              </div>
            </div>
            <p className="loan-description">{loan.description}</p>
            <div className="loan-requirements">
              <strong>Mahitaji:</strong>
              <ul>
                {loan.requirements.map((req, index) => (
                  <li key={index}>{req}</li>
                ))}
              </ul>
            </div>
            <button 
              className="btn btn-primary"
              onClick={() => handleApplyForLoan(loan)}
            >
              <i className="fas fa-edit"></i> Omba Mkopo
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  const renderMyLoans = () => (
    <div className="loans-section">
      <h3>Mikopo Yangu</h3>
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
            <h1>Mfumo wa Mikopo kwa Wakulima</h1>
            <p>Pata mikopo kwa urahisi kwa shughuli zako za kilimo na biashara</p>
          </div>

          <div className="loans-tabs">
            <button 
              className={`tab-btn ${activeTab === 'available' ? 'active' : ''}`}
              onClick={() => setActiveTab('available')}
            >
              Mikopo Inayopatikana
            </button>
            <button 
              className={`tab-btn ${activeTab === 'myLoans' ? 'active' : ''}`}
              onClick={() => setActiveTab('myLoans')}
            >
              Mikopo Yangu
            </button>
            <button 
              className={`tab-btn ${activeTab === 'calculator' ? 'active' : ''}`}
              onClick={() => setActiveTab('calculator')}
            >
              Kikokotoo cha Mikopo
            </button>
          </div>

          <div className="loans-content">
            {activeTab === 'available' && renderAvailableLoans()}
            {activeTab === 'myLoans' && renderMyLoans()}
            {activeTab === 'calculator' && (
              <div className="loan-calculator">
                <h3>Kikokotoo cha Mikopo</h3>
                {/* Calculator implementation */}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Application Modal */}
      {showApplicationModal && selectedLoan && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Omba Mkopo - {selectedLoan.name}</h3>
              <button className="close-btn" onClick={() => setShowApplicationModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              {/* Loan application form */}
            </div>
          </div>
        </div>
      )}

      <Footer onPageChange={onPageChange} />
    </div>
  );
};

export default Loans;