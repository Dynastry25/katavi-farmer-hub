import React from 'react';
import './Loading.css';

const Loading = ({ message = "Inapakia..." }) => {
  return (
    <div className="loading-overlay">
      <div className="loading-container">
        <div className="loading-spinner">
          <div className="spinner-circle"></div>
          <div className="spinner-circle"></div>
          <div className="spinner-circle"></div>
        </div>
        <p className="loading-text">{message}</p>
      </div>
    </div>
  );
};

export default Loading;