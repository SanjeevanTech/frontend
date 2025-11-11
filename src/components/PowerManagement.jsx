import React, { useState, useEffect } from 'react';
import './PowerManagement.css';
import { API } from '../config/api';

const PowerManagement = () => {
  const [buses, setBuses] = useState({});
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    loadBuses();
    // Refresh more frequently (every 5 seconds) for real-time status updates
    const interval = setInterval(loadBuses, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadBuses = async () => {
    try {
      const response = await fetch(API.python.buses);
      const data = await response.json();
      
      // Debug: Log board data to see timestamp format
      Object.entries(data).forEach(([busId, config]) => {
        if (config.boards && config.boards.length > 0) {
          console.log(`📡 ${busId} boards:`, config.boards);
        }
      });
      
      setBuses(data);
      setLastUpdate(new Date());
      setLoading(false);
    } catch (error) {
      console.error('Error loading buses:', error);
      showNotification('Failed to load buses', 'error');
      setLoading(false);
    }
  };

  const updateBusConfig = async (busId) => {
    const config = {
      bus_id: busId,
      bus_name: document.getElementById(`${busId}-name`).value,
      deep_sleep_enabled: document.getElementById(`${busId}-sleep`).checked,
      maintenance_interval: parseInt(document.getElementById(`${busId}-interval`).value),
      maintenance_duration: parseInt(document.getElementById(`${busId}-duration`).value)
    };

    try {
      const response = await fetch(API.python.powerConfig, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      });

      const result = await response.json();

      if (result.success) {
        // Get board count for this bus
        const boardCount = buses[busId]?.boards?.length || 0;
        const onlineCount = buses[busId]?.boards?.filter(b => {
          const secondsAgo = Math.floor((new Date() - new Date(b.last_seen)) / 1000);
          return secondsAgo < 90;
        }).length || 0;
        
        showNotification(
          `✅ Config saved to server! ${onlineCount}/${boardCount} boards will sync within 30s`, 
          'success'
        );
        loadBuses();
      } else {
        showNotification('❌ Failed to update configuration', 'error');
      }
    } catch (error) {
      console.error('Error updating config:', error);
      showNotification('❌ Network error', 'error');
    }
  };

  const deleteBus = async (busId) => {
    const boardCount = buses[busId]?.boards?.length || 0;
    const confirmMsg = boardCount > 0
      ? `⚠️ Delete ${busId}?\n\nThis bus has ${boardCount} connected board(s).\nThis will remove the power config but not delete passenger data.\n\nAre you sure?`
      : `Delete ${busId}?\n\nThis will remove the power config but not delete passenger data.`;

    if (!window.confirm(confirmMsg)) return;

    try {
      const response = await fetch(`${API.python.powerConfig}?bus_id=${busId}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (result.success) {
        showNotification(`✅ Bus ${busId} deleted successfully!`, 'success');
        loadBuses(); // Reload to update list
      } else {
        showNotification(`❌ ${result.message}`, 'error');
      }
    } catch (error) {
      console.error('Error deleting bus:', error);
      showNotification('❌ Network error', 'error');
    }
  };

  const addNewBus = async () => {
    const busId = prompt('Enter new Bus ID (e.g., BUS_JC_003):');
    if (!busId || !busId.trim()) return;

    const trimmedBusId = busId.trim();
    
    // Check if bus already exists
    if (buses[trimmedBusId]) {
      showNotification('❌ Bus ID already exists', 'error');
      return;
    }

    const busName = prompt('Enter Bus Name:', trimmedBusId);
    if (!busName) return;

    // Create new bus config on server
    const newConfig = {
      bus_id: trimmedBusId,
      bus_name: busName.trim(),
      deep_sleep_enabled: true,
      trip_start: '00:00',
      trip_end: '23:59',
      maintenance_interval: 5,
      maintenance_duration: 3
    };

    try {
      const response = await fetch(API.python.powerConfig, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newConfig)
      });

      const result = await response.json();

      if (result.success) {
        showNotification(`✅ Bus ${trimmedBusId} added successfully!`, 'success');
        loadBuses(); // Reload to show new bus
      } else {
        showNotification('❌ Failed to add bus', 'error');
      }
    } catch (error) {
      console.error('Error adding bus:', error);
      showNotification('❌ Network error', 'error');
    }
  };

  const showNotification = (message, type) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const renderBoards = (boards) => {
    if (!boards || boards.length === 0) {
      return (
        <div style={{ color: '#999', fontSize: '14px', padding: '10px' }}>
          No boards connected yet
        </div>
      );
    }

    return boards.map((board, index) => {
      // Validate last_seen timestamp
      let timeDisplay = 'Never';
      let isOnline = false;
      
      if (board.last_seen) {
        const lastSeen = new Date(board.last_seen);
        
        // Check if date is valid
        if (!isNaN(lastSeen.getTime())) {
          const now = new Date();
          const secondsAgo = Math.floor((now - lastSeen) / 1000);
          const minutesAgo = Math.floor(secondsAgo / 60);
          
          // More accurate online detection: < 75 seconds
          // ESP32 sends heartbeat every 60 seconds, so 75s allows for slight delays
          isOnline = secondsAgo < 75;
          
          // Format time display
          if (secondsAgo < 0) {
            timeDisplay = 'Just now';
          } else if (secondsAgo < 60) {
            timeDisplay = `${secondsAgo}s ago`;
          } else if (minutesAgo < 60) {
            timeDisplay = `${minutesAgo}m ago`;
          } else {
            const hoursAgo = Math.floor(minutesAgo / 60);
            if (hoursAgo < 24) {
              timeDisplay = `${hoursAgo}h ago`;
            } else {
              const daysAgo = Math.floor(hoursAgo / 24);
              timeDisplay = `${daysAgo}d ago`;
            }
          }
        } else {
          console.warn(`Invalid date for board ${board.device_id}:`, board.last_seen);
        }
      }

      return (
        <div key={index} className="board-item">
          <div className="board-info">
            <div className="board-name">{board.device_id || 'Unknown Device'}</div>
            <div className="board-details">
              {board.location || 'Unknown'} • {board.ip_address || 'No IP'} • {timeDisplay}
            </div>
          </div>
          <div className={`board-status ${isOnline ? 'status-online' : 'status-offline'}`}>
            {isOnline ? '● ONLINE' : '○ OFFLINE'}
          </div>
        </div>
      );
    });
  };

  if (loading) {
    return (
      <div className="power-management">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="power-management">
      {notification && (
        <div className={`notification ${notification.type}`}>
          {notification.message}
        </div>
      )}

      <div className="header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1>🚌 ESP32 Fleet Power Management</h1>
            <p>Centralized configuration for all buses - Changes apply to all boards on the same bus</p>
          </div>
          <div style={{ 
            fontSize: '12px', 
            color: '#666',
            textAlign: 'right'
          }}>
            <div>🔄 Auto-refresh: 5s</div>
            <div>Last update: {lastUpdate.toLocaleTimeString()}</div>
          </div>
        </div>
        <div style={{ 
          background: '#e3f2fd', 
          padding: '12px', 
          borderRadius: '8px', 
          fontSize: '14px',
          marginTop: '10px',
          border: '1px solid #90caf9'
        }}>
          <strong>ℹ️ How it works:</strong> Configure power settings here. Trip schedules are managed in Schedule Admin.
          ESP32 boards sync automatically every 30 seconds. Status updates every 5 seconds.
        </div>
      </div>

      <div className="bus-grid">
        {Object.entries(buses).map(([busId, config]) => {
          const lastUpdated = config.last_updated
            ? new Date(config.last_updated).toLocaleString()
            : 'Never';

          return (
            <div key={busId} className="bus-card" id={`bus-${busId}`}>
              <div className="bus-header">
                <div className="bus-header-left">
                  <div className="bus-title">{config.bus_name || busId}</div>
                  <div className="bus-id-badge">{busId}</div>
                </div>
                <button
                  className="btn-delete-small"
                  onClick={() => deleteBus(busId)}
                  title="Delete this bus configuration"
                >
                  🗑️
                </button>
              </div>

              <div className="form-group">
                <label>Bus Name</label>
                <input
                  type="text"
                  id={`${busId}-name`}
                  defaultValue={config.bus_name || busId}
                />
              </div>

              <div className="form-group">
                <label>
                  Deep Sleep
                  <label className="toggle-switch" style={{ float: 'right' }}>
                    <input
                      type="checkbox"
                      id={`${busId}-sleep`}
                      defaultChecked={config.deep_sleep_enabled}
                    />
                    <span className="slider"></span>
                  </label>
                </label>
                <small style={{ color: '#666', fontSize: '12px', display: 'block', marginTop: '5px' }}>
                  ℹ️ Trip schedules are managed in Schedule Admin. ESP32 will wake/sleep based on configured trips.
                </small>
              </div>

              <div className="form-group">
                <label>Maintenance Windows</label>
                <div className="inline-group">
                  <div>
                    <label style={{ fontSize: '12px', color: '#999' }}>Interval (min)</label>
                    <input
                      type="number"
                      id={`${busId}-interval`}
                      defaultValue={config.maintenance_interval || 5}
                      min="1"
                      max="60"
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: '#999' }}>Duration (min)</label>
                    <input
                      type="number"
                      id={`${busId}-duration`}
                      defaultValue={config.maintenance_duration || 3}
                      min="1"
                      max="30"
                    />
                  </div>
                </div>
              </div>

              <button
                className="btn btn-primary"
                style={{ width: '100%' }}
                onClick={() => updateBusConfig(busId)}
              >
                💾 Apply to All Boards on {busId}
              </button>

              <div className="boards-list">
                <div className="boards-title">
                  📡 Connected Boards ({(config.boards || []).length})
                </div>
                <div id={`${busId}-boards`}>
                  {renderBoards(config.boards || [])}
                </div>
              </div>

              <div className="last-updated">Last updated: {lastUpdated}</div>
            </div>
          );
        })}
      </div>

      <button className="btn btn-add" onClick={addNewBus}>
        ➕ Add New Bus
      </button>
    </div>
  );
};

export default PowerManagement;
