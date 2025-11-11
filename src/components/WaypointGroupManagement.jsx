import React, { useState, useEffect } from 'react';
import axios from '../utils/axios';
import './WaypointGroupManagement.css';
import { API } from '../config/api';

const API_BASE = API.node.busRoutes.replace('/bus-routes', ''); // Get base path

function WaypointGroupManagement() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  
  const [formData, setFormData] = useState({
    group_name: ''
  });
  
  const [waypoints, setWaypoints] = useState([
    { name: '', latitude: '', longitude: '', order: 1 }
  ]);

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/waypoint-groups`);
      setGroups(response.data.groups || []);
    } catch (error) {
      console.error('Error fetching waypoint groups:', error);
      alert('Failed to fetch waypoint groups');
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

  const handleWaypointChange = (index, field, value) => {
    const newWaypoints = [...waypoints];
    newWaypoints[index][field] = value;
    setWaypoints(newWaypoints);
  };

  const addWaypoint = () => {
    setWaypoints([
      ...waypoints,
      { name: '', latitude: '', longitude: '', order: waypoints.length + 1 }
    ]);
  };

  const removeWaypoint = (index) => {
    if (waypoints.length <= 2) {
      alert('Waypoint group must have at least 2 waypoints');
      return;
    }
    const newWaypoints = waypoints.filter((_, i) => i !== index);
    newWaypoints.forEach((wp, i) => {
      wp.order = i + 1;
    });
    setWaypoints(newWaypoints);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (waypoints.length < 2) {
      alert('Waypoint group must have at least 2 waypoints');
      return;
    }

    for (let wp of waypoints) {
      if (!wp.name || !wp.latitude || !wp.longitude) {
        alert('All waypoints must have name, latitude, and longitude');
        return;
      }
    }

    try {
      const payload = {
        ...formData,
        waypoints: waypoints.map(wp => ({
          ...wp,
          latitude: parseFloat(wp.latitude),
          longitude: parseFloat(wp.longitude)
        }))
      };

      if (editingGroup) {
        await axios.put(`${API_BASE}/waypoint-groups/${editingGroup.group_id}`, payload);
        alert('✅ Waypoint group updated successfully!');
      } else {
        await axios.post(`${API_BASE}/waypoint-groups`, payload);
        alert('✅ Waypoint group created successfully!');
      }

      resetForm();
      fetchGroups();
      setShowAddForm(false);
    } catch (error) {
      console.error('Error saving waypoint group:', error);
      alert(error.response?.data?.message || 'Failed to save waypoint group');
    }
  };

  const resetForm = () => {
    setFormData({
      group_name: ''
    });
    setWaypoints([
      { name: '', latitude: '', longitude: '', order: 1 }
    ]);
    setEditingGroup(null);
  };

  const editGroup = (group) => {
    setEditingGroup(group);
    setFormData({
      group_name: group.group_name
    });
    setWaypoints(group.waypoints || []);
    setShowAddForm(true);
  };

  const deleteGroup = async (group_id) => {
    if (!window.confirm('Are you sure you want to deactivate this waypoint group?')) {
      return;
    }

    try {
      await axios.delete(`${API_BASE}/waypoint-groups/${group_id}`);
      alert('✅ Waypoint group deactivated successfully!');
      fetchGroups();
    } catch (error) {
      console.error('Error deleting waypoint group:', error);
      alert('Failed to delete waypoint group');
    }
  };

  return (
    <div className="waypoint-group-management">
      <div className="header">
        <h1>📍 Waypoint Group Management</h1>
        <p className="subtitle">Create reusable waypoint sequences for your bus routes</p>
        <button 
          className="add-btn"
          onClick={() => {
            resetForm();
            setShowAddForm(!showAddForm);
          }}
        >
          {showAddForm ? '✕ Cancel' : '➕ Add Waypoint Group'}
        </button>
      </div>

      {showAddForm && (
        <div className="form-container">
          <h2>{editingGroup ? '✏️ Edit Waypoint Group' : '➕ Add New Waypoint Group'}</h2>
          <form onSubmit={handleSubmit} className="waypoint-form">
            <div className="form-section">
              <h3>Group Information</h3>
              
              <div className="form-group">
                <label>Group Name *</label>
                <input
                  type="text"
                  name="group_name"
                  value={formData.group_name}
                  onChange={handleInputChange}
                  placeholder="e.g., Jaffna North, Central Colombo"
                  required
                />
              </div>


            </div>

            <div className="form-section">
              <div className="waypoints-header">
                <h3>Waypoints ({waypoints.length})</h3>
                <button type="button" onClick={addWaypoint} className="add-waypoint-btn">
                  ➕ Add Waypoint
                </button>
              </div>

              <div className="waypoints-list">
                {waypoints.map((wp, index) => (
                  <div key={index} className="waypoint-item">
                    <div className="waypoint-number">{index + 1}</div>
                    
                    <div className="waypoint-fields">
                      <input
                        type="text"
                        placeholder="Waypoint Name *"
                        value={wp.name}
                        onChange={(e) => handleWaypointChange(index, 'name', e.target.value)}
                        required
                      />
                      
                      <input
                        type="number"
                        placeholder="Latitude *"
                        value={wp.latitude}
                        onChange={(e) => handleWaypointChange(index, 'latitude', e.target.value)}
                        step="0.000001"
                        required
                      />
                      
                      <input
                        type="number"
                        placeholder="Longitude *"
                        value={wp.longitude}
                        onChange={(e) => handleWaypointChange(index, 'longitude', e.target.value)}
                        step="0.000001"
                        required
                      />
                    </div>

                    {waypoints.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeWaypoint(index)}
                        className="remove-waypoint-btn"
                        title="Remove waypoint"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="form-hint">
                💡 Tip: Add waypoints in order. These can be reused in multiple bus routes.
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="submit-btn">
                💾 {editingGroup ? 'Update Group' : 'Create Group'}
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

      <div className="groups-list">
        <h2>Waypoint Groups ({groups.length})</h2>
        
        {loading ? (
          <p>Loading waypoint groups...</p>
        ) : groups.length === 0 ? (
          <p className="no-groups">No waypoint groups found. Create your first group!</p>
        ) : (
          <div className="groups-grid">
            {groups.map(group => (
              <div key={group.group_id} className={`group-card ${!group.is_active ? 'inactive' : ''}`}>
                <div className="group-card-header">
                  <h3>{group.group_name}</h3>
                  <span className="waypoint-count-badge">
                    📍 {group.waypoints?.length || 0} waypoints
                  </span>
                </div>

                <div className="waypoints-flow">
                  {group.waypoints?.map((wp, idx) => (
                    <React.Fragment key={idx}>
                      <span className="waypoint-name">{wp.name}</span>
                      {idx < group.waypoints.length - 1 && <span className="arrow">→</span>}
                    </React.Fragment>
                  ))}
                </div>

                <div className="group-actions">
                  <button onClick={() => editGroup(group)} className="edit-btn">
                    ✏️ Edit
                  </button>
                  <button onClick={() => deleteGroup(group.group_id)} className="delete-btn">
                    🗑️ Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default WaypointGroupManagement;
