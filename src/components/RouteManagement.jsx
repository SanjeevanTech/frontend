import React, { useState, useEffect } from 'react';
import axios from '../utils/axios';
import './RouteManagement.css';
import { API } from '../config/api';

const API_BASE = API.node.busRoutes.replace('/bus-routes', ''); // Get base path

function RouteManagement() {
  const [routes, setRoutes] = useState([]);
  const [waypointGroups, setWaypointGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingRoute, setEditingRoute] = useState(null);
  const [useWaypointGroups, setUseWaypointGroups] = useState(true);
  
  const [formData, setFormData] = useState({
    route_name: '',
    description: '',
    estimated_duration_hours: 0,
    assigned_buses: ''
  });
  
  const [selectedGroups, setSelectedGroups] = useState([]);
  
  const [stops, setStops] = useState([
    { stop_name: '', latitude: '', longitude: '', stop_order: 1, distance_from_start_km: 0 }
  ]);

  useEffect(() => {
    fetchRoutes();
    fetchWaypointGroups();
  }, []);

  const fetchWaypointGroups = async () => {
    try {
      const response = await axios.get(`${API_BASE}/waypoint-groups?active_only=true`);
      setWaypointGroups(response.data.groups || []);
    } catch (error) {
      console.error('Error fetching waypoint groups:', error);
    }
  };

  const fetchRoutes = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/bus-routes`);
      setRoutes(response.data.routes || []);
    } catch (error) {
      console.error('Error fetching routes:', error);
      alert('Failed to fetch routes');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleStopChange = (index, field, value) => {
    const newStops = [...stops];
    newStops[index][field] = value;
    setStops(newStops);
  };

  const addStop = () => {
    setStops([
      ...stops,
      { 
        stop_name: '', 
        latitude: '', 
        longitude: '', 
        stop_order: stops.length + 1, 
        distance_from_start_km: 0 
      }
    ]);
  };

  const removeStop = (index) => {
    if (stops.length <= 2) {
      alert('Route must have at least 2 stops');
      return;
    }
    const newStops = stops.filter((_, i) => i !== index);
    // Reorder stops
    newStops.forEach((stop, i) => {
      stop.stop_order = i + 1;
    });
    setStops(newStops);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (useWaypointGroups) {
      if (selectedGroups.length === 0) {
        alert('Please select at least one waypoint group');
        return;
      }
    } else {
      if (stops.length < 2) {
        alert('Route must have at least 2 stops');
        return;
      }

      // Validate stops
      for (let stop of stops) {
        if (!stop.stop_name || !stop.latitude || !stop.longitude) {
          alert('All stops must have name, latitude, and longitude');
          return;
        }
      }
    }

    try {
      const payload = {
        ...formData,
        estimated_duration_hours: parseFloat(formData.estimated_duration_hours) || 0,
        assigned_buses: formData.assigned_buses ? formData.assigned_buses.split(',').map(b => b.trim()) : []
      };

      if (useWaypointGroups) {
        payload.waypoint_groups = selectedGroups.map((groupId, index) => ({
          group_id: groupId,
          order: index + 1
        }));
      } else {
        payload.stops = stops.map(stop => ({
          ...stop,
          latitude: parseFloat(stop.latitude),
          longitude: parseFloat(stop.longitude),
          distance_from_start_km: parseFloat(stop.distance_from_start_km) || 0
        }));
      }

      if (editingRoute) {
        await axios.put(`${API_BASE}/bus-routes/${editingRoute.route_id}`, payload);
        alert('✅ Route updated successfully!');
      } else {
        await axios.post(`${API_BASE}/bus-routes`, payload);
        alert('✅ Route created successfully!');
      }

      resetForm();
      fetchRoutes();
      setShowAddForm(false);
    } catch (error) {
      console.error('Error saving route:', error);
      alert(error.response?.data?.message || 'Failed to save route');
    }
  };

  const resetForm = () => {
    setFormData({
      route_name: '',
      description: '',
      estimated_duration_hours: 0,
      assigned_buses: ''
    });
    setStops([
      { stop_name: '', latitude: '', longitude: '', stop_order: 1, distance_from_start_km: 0 }
    ]);
    setSelectedGroups([]);
    setEditingRoute(null);
    setUseWaypointGroups(true);
  };

  const toggleGroupSelection = (groupId) => {
    if (selectedGroups.includes(groupId)) {
      setSelectedGroups(selectedGroups.filter(id => id !== groupId));
    } else {
      setSelectedGroups([...selectedGroups, groupId]);
    }
  };

  const editRoute = (route) => {
    setEditingRoute(route);
    setFormData({
      route_name: route.route_name,
      description: route.description || '',
      estimated_duration_hours: route.estimated_duration_hours || 0,
      assigned_buses: route.assigned_buses?.join(', ') || ''
    });
    setStops(route.stops || []);
    setShowAddForm(true);
  };

  const deleteRoute = async (route_id) => {
    if (!window.confirm('Are you sure you want to deactivate this route?')) {
      return;
    }

    try {
      await axios.delete(`${API_BASE}/bus-routes/${route_id}`);
      alert('✅ Route deactivated successfully!');
      fetchRoutes();
    } catch (error) {
      console.error('Error deleting route:', error);
      alert('Failed to delete route');
    }
  };

  const reactivateRoute = async (route_id) => {
    try {
      await axios.put(`${API_BASE}/bus-routes/${route_id}`, { is_active: true });
      alert('✅ Route reactivated successfully!');
      fetchRoutes();
    } catch (error) {
      console.error('Error reactivating route:', error);
      alert('Failed to reactivate route');
    }
  };

  return (
    <div className="route-management">
      <div className="route-header">
        <h1>🗺️ Bus Route Management</h1>
        <button 
          className="add-route-btn"
          onClick={() => {
            resetForm();
            setShowAddForm(!showAddForm);
          }}
        >
          {showAddForm ? '✕ Cancel' : '➕ Add New Route'}
        </button>
      </div>

      {showAddForm && (
        <div className="route-form-container">
          <h2>{editingRoute ? '✏️ Edit Route' : '➕ Add New Route'}</h2>
          <form onSubmit={handleSubmit} className="route-form">
            <div className="form-section">
              <h3>Route Information</h3>
              
              <div className="form-group">
                <label>Route Name *</label>
                <input
                  type="text"
                  name="route_name"
                  value={formData.route_name}
                  onChange={handleInputChange}
                  placeholder="e.g., Jaffna-Colombo"
                  required
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Route description..."
                  rows="2"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Estimated Duration (hours)</label>
                  <input
                    type="number"
                    name="estimated_duration_hours"
                    value={formData.estimated_duration_hours}
                    onChange={handleInputChange}
                    step="0.5"
                    min="0"
                  />
                </div>

                <div className="form-group">
                  <label>Assigned Buses (comma-separated)</label>
                  <input
                    type="text"
                    name="assigned_buses"
                    value={formData.assigned_buses}
                    onChange={handleInputChange}
                    placeholder="e.g., BUS_JC_001, BUS_JC_002"
                  />
                </div>
              </div>
            </div>

            <div className="form-section">
              <div className="method-selector">
                <label>
                  <input
                    type="radio"
                    checked={useWaypointGroups}
                    onChange={() => setUseWaypointGroups(true)}
                  />
                  Use Waypoint Groups (Recommended)
                </label>
                <label>
                  <input
                    type="radio"
                    checked={!useWaypointGroups}
                    onChange={() => setUseWaypointGroups(false)}
                  />
                  Manual Stops
                </label>
              </div>

              {useWaypointGroups ? (
                <div className="waypoint-groups-section">
                  <h3>Select Waypoint Groups</h3>
                  <p className="hint">Select groups in order from start to end</p>
                  
                  {waypointGroups.length === 0 ? (
                    <div className="no-groups-warning">
                      <p>⚠️ No waypoint groups available.</p>
                      <p>Please create waypoint groups first in the Waypoint Groups page.</p>
                    </div>
                  ) : (
                    <div className="groups-selector">
                      {waypointGroups.map(group => (
                        <div
                          key={group.group_id}
                          className={`group-option ${selectedGroups.includes(group.group_id) ? 'selected' : ''}`}
                          onClick={() => toggleGroupSelection(group.group_id)}
                        >
                          <div className="group-option-header">
                            <input
                              type="checkbox"
                              checked={selectedGroups.includes(group.group_id)}
                              onChange={() => {}}
                            />
                            <strong>{group.group_name}</strong>
                            <span className="waypoint-count-tag">
                              {group.waypoints?.length || 0} stops
                            </span>
                          </div>
                          <div className="group-option-waypoints">
                            {group.waypoints?.slice(0, 3).map((wp, idx) => (
                              <span key={idx}>{wp.name}</span>
                            ))}
                            {group.waypoints?.length > 3 && <span>+{group.waypoints.length - 3} more</span>}
                          </div>
                          {selectedGroups.includes(group.group_id) && (
                            <div className="selection-order">
                              Order: {selectedGroups.indexOf(group.group_id) + 1}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {selectedGroups.length > 0 && (
                    <div className="selected-groups-preview">
                      <h4>Selected Route Preview:</h4>
                      <div className="route-preview">
                        {selectedGroups.map((groupId, idx) => {
                          const group = waypointGroups.find(g => g.group_id === groupId);
                          return (
                            <React.Fragment key={groupId}>
                              <span className="group-preview">{group?.group_name}</span>
                              {idx < selectedGroups.length - 1 && <span className="arrow">→</span>}
                            </React.Fragment>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div className="stops-header">
                    <h3>Route Stops ({stops.length})</h3>
                    <button type="button" onClick={addStop} className="add-stop-btn">
                      ➕ Add Stop
                    </button>
                  </div>

                  <div className="stops-list">
                {stops.map((stop, index) => (
                  <div key={index} className="stop-item">
                    <div className="stop-number">{index + 1}</div>
                    
                    <div className="stop-fields">
                      <input
                        type="text"
                        placeholder="Stop Name *"
                        value={stop.stop_name}
                        onChange={(e) => handleStopChange(index, 'stop_name', e.target.value)}
                        required
                      />
                      
                      <input
                        type="number"
                        placeholder="Latitude *"
                        value={stop.latitude}
                        onChange={(e) => handleStopChange(index, 'latitude', e.target.value)}
                        step="0.000001"
                        required
                      />
                      
                      <input
                        type="number"
                        placeholder="Longitude *"
                        value={stop.longitude}
                        onChange={(e) => handleStopChange(index, 'longitude', e.target.value)}
                        step="0.000001"
                        required
                      />
                      
                      <input
                        type="number"
                        placeholder="Distance (km)"
                        value={stop.distance_from_start_km}
                        onChange={(e) => handleStopChange(index, 'distance_from_start_km', e.target.value)}
                        step="0.1"
                        min="0"
                      />
                    </div>

                    {stops.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeStop(index)}
                        className="remove-stop-btn"
                        title="Remove stop"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                ))}
              </div>

                  <div className="form-hint">
                    💡 Tip: Add stops in order from start to end. Distance is cumulative from the first stop.
                  </div>
                </>
              )}
            </div>

            <div className="form-actions">
              <button type="submit" className="submit-btn">
                💾 {editingRoute ? 'Update Route' : 'Create Route'}
              </button>
              <button 
                type="button" 
                onClick={() => {
                  resetForm();
                  setShowAddForm(false);
                }}
                className="cancel-btn"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="routes-list">
        <h2>Routes ({routes.length})</h2>
        
        {loading ? (
          <p>Loading routes...</p>
        ) : routes.length === 0 ? (
          <p className="no-routes">No routes found. Add your first route!</p>
        ) : (
          <div className="routes-grid">
            {routes.map(route => (
              <div key={route.route_id} className={`route-card ${!route.is_active ? 'inactive' : ''}`}>
                <div className="route-card-header">
                  <h3>{route.route_name}</h3>
                  <span className={`status-badge ${route.is_active ? 'active' : 'inactive'}`}>
                    {route.is_active ? '✓ Active' : '⏸ Inactive'}
                  </span>
                </div>

                {route.description && (
                  <p className="route-description">{route.description}</p>
                )}

                <div className="route-info">
                  <div className="info-item">
                    <span className="label">Stops:</span>
                    <span className="value">{route.stops?.length || 0}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">Distance:</span>
                    <span className="value">{route.total_distance_km} km</span>
                  </div>
                  <div className="info-item">
                    <span className="label">Duration:</span>
                    <span className="value">{route.estimated_duration_hours} hrs</span>
                  </div>
                </div>

                {route.waypoint_groups && route.waypoint_groups.length > 0 && (
                  <div className="route-groups">
                    <strong>Waypoint Groups:</strong>
                    <div className="groups-flow">
                      {route.waypoint_groups.map((wg, idx) => {
                        const group = waypointGroups.find(g => g.group_id === wg.group_id);
                        return (
                          <React.Fragment key={idx}>
                            <span className="group-badge">{group?.group_name || wg.group_id}</span>
                            {idx < route.waypoint_groups.length - 1 && <span className="arrow">→</span>}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="route-stops">
                  <strong>All Stops ({route.stops?.length || 0}):</strong>
                  <div className="stops-flow">
                    {route.stops?.slice(0, 5).map((stop, idx) => (
                      <React.Fragment key={idx}>
                        <span className="stop-name">{stop.stop_name}</span>
                        {idx < Math.min(4, route.stops.length - 1) && <span className="arrow">→</span>}
                      </React.Fragment>
                    ))}
                    {route.stops?.length > 5 && (
                      <span className="more-stops">+{route.stops.length - 5} more</span>
                    )}
                  </div>
                </div>

                {route.assigned_buses && route.assigned_buses.length > 0 && (
                  <div className="assigned-buses">
                    <strong>Buses:</strong> {route.assigned_buses.join(', ')}
                  </div>
                )}

                <div className="route-actions">
                  <button onClick={() => editRoute(route)} className="edit-btn">
                    ✏️ Edit
                  </button>
                  {route.is_active ? (
                    <button onClick={() => deleteRoute(route.route_id)} className="deactivate-btn">
                      ⏸️ Deactivate
                    </button>
                  ) : (
                    <button onClick={() => reactivateRoute(route.route_id)} className="activate-btn">
                      ▶️ Reactivate
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default RouteManagement;
