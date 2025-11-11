import React from 'react';
import './ExternalDashboard.css';

function ExternalDashboard() {
  return (
    <div className="external-dashboard">
      <div className="iframe-container">
        <iframe 
          src="http://10.196.219.114/" 
          title="External Dashboard"
          className="dashboard-iframe"
        />
      </div>
    </div>
  );
}

export default ExternalDashboard;
