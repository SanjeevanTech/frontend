import React, { useState, useEffect } from 'react'
import axios from 'axios'
import BusSelector from './BusSelector'
import './ScheduleAdmin.css'
import { API } from '../config/api'

function ScheduleAdmin() {
  const [selectedBus, setSelectedBus] = useState(localStorage.getItem('selectedBus') || 'BUS_JC_001')
  const [schedule, setSchedule] = useState(null)
  const [routes, setRoutes] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingIndex, setEditingIndex] = useState(null)
  const [newTrip, setNewTrip] = useState({
    direction: '',
    boarding_start_time: '',
    departure_time: '',
    estimated_arrival_time: '',
    route_id: '',
    route: '',
    active: true
  })

  useEffect(() => {
    fetchRoutes()
    if (selectedBus) {
      fetchSchedule(selectedBus)
    }
  }, [selectedBus])

  const fetchRoutes = async () => {
    try {
      const response = await axios.get(API.node.busRoutes)
      setRoutes(response.data.routes || [])
      console.log('Fetched routes:', response.data.routes)
    } catch (error) {
      console.error('Error fetching routes:', error)
    }
  }

  const handleBusChange = (busId) => {
    setSelectedBus(busId)
    localStorage.setItem('selectedBus', busId)
  }

  const fetchSchedule = async (busId) => {
    try {
      setLoading(true)
      // Get existing schedule
      const response = await axios.get(API.node.busSchedule(busId))
      if (response.data.schedule) {
        setSchedule(response.data.schedule)
      } else {
        // Create default schedule structure
        setSchedule({
          bus_id: busId,
          bus_name: busId,
          route_name: 'Bus Route',
          active: true,
          trips: []
        })
      }
    } catch (error) {
      console.error('Error fetching schedule:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddTrip = () => {
    if (!newTrip.departure_time || !newTrip.estimated_arrival_time) {
      alert('Please fill in departure time and arrival time')
      return
    }

    if (!newTrip.route_id) {
      alert('Please select a route from the dropdown')
      return
    }

    // Auto-generate trip name from route and departure time
    const selectedRoute = routes.find(r => r.route_id === newTrip.route_id)
    const routeName = selectedRoute ? selectedRoute.route_name : newTrip.route
    const tripName = `${routeName} - ${newTrip.departure_time}`

    // Create trip object with auto-generated name
    const tripData = {
      ...newTrip,
      trip_name: tripName
    }

    let updatedSchedule
    
    if (editingIndex !== null) {
      // Update existing trip
      const updatedTrips = [...schedule.trips]
      updatedTrips[editingIndex] = tripData
      updatedSchedule = {
        ...schedule,
        trips: updatedTrips
      }
    } else {
      // Add new trip
      updatedSchedule = {
        ...schedule,
        trips: [...(schedule.trips || []), tripData]
      }
    }
    
    setSchedule(updatedSchedule)
    
    // Reset form
    setEditingIndex(null)
    setNewTrip({
      direction: '',
      boarding_start_time: '',
      departure_time: '',
      estimated_arrival_time: '',
      route_id: '',
      route: '',
      active: true
    })
  }

  const handleEditTrip = (index) => {
    const trip = schedule.trips[index]
    setEditingIndex(index)
    setNewTrip({
      direction: trip.direction || '',
      boarding_start_time: trip.boarding_start_time || '',
      departure_time: trip.departure_time || '',
      estimated_arrival_time: trip.estimated_arrival_time || '',
      route_id: trip.route_id || '',
      route: trip.route || '',
      active: trip.active !== false
    })
    // Scroll to form
    document.querySelector('.add-trip-section').scrollIntoView({ behavior: 'smooth' })
  }

  const handleCancelEdit = () => {
    setEditingIndex(null)
    setNewTrip({
      direction: '',
      boarding_start_time: '',
      departure_time: '',
      estimated_arrival_time: '',
      route_id: '',
      route: '',
      active: true
    })
  }

  const handleRouteChange = (routeId) => {
    const selectedRoute = routes.find(r => r.route_id === routeId)
    if (selectedRoute) {
      setNewTrip({
        ...newTrip,
        route_id: routeId,
        route: selectedRoute.route_name
      })
    } else {
      setNewTrip({
        ...newTrip,
        route_id: '',
        route: ''
      })
    }
  }

  const handleRemoveTrip = async (index) => {
    if (!window.confirm('Remove this trip? This will save immediately.')) return
    
    const updatedSchedule = {
      ...schedule,
      trips: schedule.trips.filter((_, i) => i !== index)
    }
    
    // Save immediately
    try {
      setSaving(true)
      await axios.post(API.node.saveBusSchedule, updatedSchedule)
      
      // Sync with powerConfigs
      await axios.post(API.node.syncPowerConfig, { bus_id: updatedSchedule.bus_id })
      
      setSchedule(updatedSchedule)
      
      // Cancel edit if we're editing this trip
      if (editingIndex === index) {
        handleCancelEdit()
      }
      
      alert('✅ Trip removed and saved!')
    } catch (error) {
      console.error('Error removing trip:', error)
      console.error('Error details:', error.response?.data)
      alert('❌ Failed to remove trip: ' + (error.response?.data?.error || error.message))
    } finally {
      setSaving(false)
    }
  }

  const handleSaveSchedule = async () => {
    try {
      setSaving(true)
      
      // 1. Save schedule to MongoDB (via Node.js backend)
      await axios.post(API.node.saveBusSchedule, schedule)
      
      // 2. Sync with powerConfigs (via Node.js backend)
      const syncResult = await axios.post(API.node.syncPowerConfig, { bus_id: schedule.bus_id })
      
      // 3. Also update Python server's power config (for ESP32)
      try {
        await axios.post(API.python.powerConfig, {
          bus_id: schedule.bus_id,
          bus_name: schedule.bus_name,
          trip_start: syncResult.data.trip_start,
          trip_end: syncResult.data.trip_end,
          deep_sleep_enabled: true,
          maintenance_interval: 6,
          maintenance_duration: 4
        })
        alert('✅ Schedule saved and synced with ESP32 power config!\n\nESP32 will wake at ' + syncResult.data.trip_start + ' and sleep at ' + syncResult.data.trip_end)
      } catch (pythonError) {
        console.warn('Python server sync failed:', pythonError)
        alert('✅ Schedule saved to database!\n⚠️ ESP32 sync will happen on next board heartbeat (within 30s)')
      }
      
      fetchSchedule(selectedBus)
    } catch (error) {
      console.error('Error saving schedule:', error)
      alert('❌ Failed to save schedule: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="loading">Loading schedule...</div>
  }

  return (
    <div className="schedule-admin">
      <div className="admin-header">
        <h2>📅 Bus Schedule Management</h2>
        <p>Configure multiple trips per day for each bus</p>
      </div>

      <BusSelector 
        selectedBus={selectedBus}
        onBusChange={handleBusChange}
        showAll={false}
        label="Managing Schedule for:"
      />

      <div className="schedule-info">
        <div className="info-row">
          <label>Bus ID:</label>
          <input 
            type="text" 
            value={schedule.bus_id} 
            disabled
            style={{ background: '#f5f5f5', cursor: 'not-allowed' }}
          />
          <small style={{ color: '#7f8c8d', fontSize: '0.85rem' }}>
            ℹ️ Bus ID is set by the selector above. Cannot be changed here.
          </small>
        </div>
      </div>

      <div className="trips-section">
        <h3>🚌 Scheduled Trips ({schedule.trips?.length || 0})</h3>
        
        {schedule.trips && schedule.trips.length > 0 ? (
          <div className="trips-list">
            {schedule.trips.map((trip, index) => (
              <div key={index} className="trip-item">
                <div className="trip-header">
                  <span className="trip-number">#{index + 1}</span>
                  <span className="trip-name">{trip.trip_name}</span>
                  <div className="trip-actions">
                    <button 
                      className="btn-edit"
                      onClick={() => handleEditTrip(index)}
                      disabled={editingIndex === index}
                    >
                      ✏️ Edit
                    </button>
                    <button 
                      className="btn-remove"
                      onClick={() => handleRemoveTrip(index)}
                    >
                      🗑️ Remove
                    </button>
                  </div>
                </div>
                <div className="trip-details">
                  <div className="detail-item">
                    <span className="label">Route:</span>
                    <span className="value">{trip.route || '-'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Boarding:</span>
                    <span className="value">{trip.boarding_start_time || trip.departure_time}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Departure:</span>
                    <span className="value">{trip.departure_time}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Arrival:</span>
                    <span className="value">{trip.estimated_arrival_time}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-trips">
            <p>No trips configured. Add your first trip below.</p>
          </div>
        )}
      </div>

      <div className="add-trip-section">
        <h3>{editingIndex !== null ? '✏️ Edit Trip' : '➕ Add New Trip'}</h3>
        {editingIndex !== null && (
          <div className="edit-notice">
            <span>Editing Trip #{editingIndex + 1}</span>
            <button className="btn-cancel-edit" onClick={handleCancelEdit}>
              ❌ Cancel Edit
            </button>
          </div>
        )}
        
        <div className="auto-name-notice">
          <strong>ℹ️ Trip Name Auto-Generated</strong>
          <p>Trip name will be automatically created from: <strong>Route Name + Departure Time</strong></p>
          <p>Example: "Jaffna - Vavuniya Express - 07:00"</p>
        </div>
        
        <div className="trip-form">
          <div className="form-row">
            <div className="form-group">
              <label>Route *</label>
              <select
                value={newTrip.route_id}
                onChange={(e) => handleRouteChange(e.target.value)}
              >
                <option value="">Select Route</option>
                {routes.filter(r => r.is_active !== false).map(route => {
                  // Get first and last stop for display
                  const stops = route.stops || [];
                  const origin = stops.length > 0 ? stops[0].stop_name : 'Start';
                  const destination = stops.length > 0 ? stops[stops.length - 1].stop_name : 'End';
                  
                  return (
                    <option key={route.route_id} value={route.route_id}>
                      {route.route_name} ({origin} → {destination})
                    </option>
                  );
                })}
              </select>
              {routes.length === 0 && (
                <small style={{color: '#e74c3c'}}>⚠️ No routes available. Create routes first in Routes tab.</small>
              )}
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Boarding Start Time</label>
              <input 
                type="time"
                value={newTrip.boarding_start_time}
                onChange={(e) => setNewTrip({...newTrip, boarding_start_time: e.target.value})}
              />
              <small>Optional - defaults to departure time</small>
            </div>
            <div className="form-group">
              <label>Departure Time *</label>
              <input 
                type="time"
                value={newTrip.departure_time}
                onChange={(e) => setNewTrip({...newTrip, departure_time: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label>Arrival Time *</label>
              <input 
                type="time"
                value={newTrip.estimated_arrival_time}
                onChange={(e) => setNewTrip({...newTrip, estimated_arrival_time: e.target.value})}
              />
            </div>
          </div>

          <button className="btn-add-trip" onClick={handleAddTrip}>
            {editingIndex !== null ? '💾 Update Trip' : '➕ Add Trip to Schedule'}
          </button>
        </div>
      </div>

      <div className="save-section">
        <button 
          className="btn-save"
          onClick={handleSaveSchedule}
          disabled={saving}
        >
          {saving ? '💾 Saving...' : '💾 Save Schedule & Sync ESP32'}
        </button>
        <p className="save-note">
          ℹ️ Saving will update the schedule and automatically sync ESP32 power config
        </p>
      </div>

      <div className="info-box">
        <h4>💡 How it works:</h4>
        <ul>
          <li><strong>Auto Trip Names:</strong> Generated from route name + departure time</li>
          <li><strong>Multiple Trips:</strong> Add as many trips as needed per day</li>
          <li><strong>Same Route, Different Times:</strong> Same bus can run same route multiple times</li>
          <li><strong>ESP32 Power:</strong> Automatically calculated from first to last trip</li>
          <li><strong>Auto Sync:</strong> ESP32 boards sync every 30 seconds</li>
        </ul>
        <h4>📋 Example Schedule:</h4>
        <ul>
          <li>07:00 - Jaffna → Vavuniya (Trip: "Jaffna - Vavuniya Express - 07:00")</li>
          <li>15:00 - Vavuniya → Jaffna (Trip: "Vavuniya - Jaffna Express - 15:00")</li>
          <li>21:00 - Jaffna → Vavuniya (Trip: "Jaffna - Vavuniya Express - 21:00")</li>
        </ul>
      </div>
    </div>
  )
}

export default ScheduleAdmin
