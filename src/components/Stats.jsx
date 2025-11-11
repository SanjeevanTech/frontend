import React from 'react'
import './Stats.css'

function Stats({ stats }) {
  return (
    <div className="stats-container">
      <div className="stat-card">
        <div className="stat-icon">👥</div>
        <div className="stat-content">
          <div className="stat-value">{stats.totalPassengers}</div>
          <div className="stat-label">Passengers</div>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-icon">🚌</div>
        <div className="stat-content">
          <div className="stat-value">{stats.routeDistance} km</div>
          <div className="stat-label">Route Distance</div>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-icon">💰</div>
        <div className="stat-content">
          <div className="stat-value">Rs. {stats.totalRevenue}</div>
          <div className="stat-label">Revenue</div>
        </div>
      </div>
    </div>
  )
}

export default Stats
