import React, { useState } from 'react';
import Navigation from './Navbar/Navbar';
import Footer from './Footer/Footer';
import './Reports.css';

const Reports = ({ onPageChange, onAuth, user, crops }) => {
  const [reportType, setReportType] = useState('sales');
  const [dateRange, setDateRange] = useState('monthly');

  // Generate sample report data
  const generateSalesReport = () => {
    return crops.map(crop => ({
      name: crop.name,
      quantity: crop.quantity,
      price: crop.price,
      totalValue: crop.quantity * crop.price,
      trend: Math.random() > 0.5 ? 'up' : 'down'
    }));
  };

  const salesData = generateSalesReport();

  return (
    <div className="page reports-page">
      <Navigation 
        currentPage="reports"
        onPageChange={onPageChange}
        onAuth={onAuth}
        user={user}
      />
      
      <div className="reports-container">
        <div className="container">
          <div className="reports-header">
            <h1>Ripoti na Takwimu</h1>
            <p>Fuata utendaji wa biashara yako ya kilimo kwa kina</p>
          </div>

          <div className="reports-controls">
            <select 
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="report-select"
            >
              <option value="sales">Ripoti ya Mauzo</option>
              <option value="inventory">Ripoti ya Hisa</option>
              <option value="performance">Utendaji wa Mazao</option>
              <option value="financial">Ripoti ya Kifedha</option>
            </select>
            
            <select 
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="date-select"
            >
              <option value="weekly">Wiki hii</option>
              <option value="monthly">Mwezi huu</option>
              <option value="quarterly">Robo mwaka</option>
              <option value="yearly">Mwaka huu</option>
            </select>
            
            <button className="btn btn-primary">
              <i className="fas fa-download"></i> Pakua Ripoti
            </button>
          </div>

          <div className="reports-content">
            <div className="stats-overview">
              <div className="stat-card">
                <div className="stat-value">TZS {salesData.reduce((sum, item) => sum + item.totalValue, 0).toLocaleString()}</div>
                <div className="stat-label">Jumla ya Thamani ya Mazao</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{salesData.length}</div>
                <div className="stat-label">Aina za Mazao</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{salesData.reduce((sum, item) => sum + item.quantity, 0)}kg</div>
                <div className="stat-label">Jumla ya Kiasi</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">
                  TZS {Math.round(salesData.reduce((sum, item) => sum + item.price, 0) / salesData.length).toLocaleString()}
                </div>
                <div className="stat-label">Wastani wa Bei</div>
              </div>
            </div>

            <div className="report-table">
              <h3>Ripoti ya Mazao</h3>
              <table>
                <thead>
                  <tr>
                    <th>Zao</th>
                    <th>Kiasi (kg)</th>
                    <th>Bei ya Kipekee (TZS)</th>
                    <th>Thamani ya Jumla (TZS)</th>
                    <th>Mwenendo</th>
                  </tr>
                </thead>
                <tbody>
                  {salesData.map((item, index) => (
                    <tr key={index}>
                      <td>{item.name}</td>
                      <td>{item.quantity}</td>
                      <td>{item.price}</td>
                      <td>{item.totalValue.toLocaleString()}</td>
                      <td>
                        <span className={`trend ${item.trend}`}>
                          {item.trend === 'up' ? '📈' : '📉'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="charts-section">
              <div className="chart-container">
                <h4>Mgawanyiko wa Mazao kwa Thamani</h4>
                <div className="chart">
                  {/* Chart implementation would go here */}
                  <div className="chart-placeholder">
                    <i className="fas fa-chart-pie"></i>
                    <p>Wacha ionyeshe chati hapa</p>
                  </div>
                </div>
              </div>
              
              <div className="chart-container">
                <h4>Mwenendo wa Bei</h4>
                <div className="chart">
                  <div className="chart-placeholder">
                    <i className="fas fa-chart-line"></i>
                    <p>Wacha ionyeshe chati ya mstari hapa</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer onPageChange={onPageChange} />
    </div>
  );
};

export default Reports;