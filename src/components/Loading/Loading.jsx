import React from 'react';
import './Loading.css';

const Loading = ({ message = "Inapakia...", subMessage = "Tafadhali subiri" }) => {
  return (
    <div className="loading-overlay">
      <div className="loading-container">
        <div className="loading-animation">
          <div className="loading-logo">
            <i className="fas fa-seedling"></i>
          </div>
          <div className="loading-spinner"></div>
        </div>
        
        <div className="loading-content">
          <h2 className="loading-title">{message}</h2>
          <p className="loading-subtitle">{subMessage}</p>
          
          <div className="loading-progress">
            <div className="progress-bar">
              <div className="progress-fill"></div>
            </div>
            <div className="progress-text">Inapakia...</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Loading;