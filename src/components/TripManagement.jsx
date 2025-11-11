import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { format, parseISO, isToday, differenceInHours } from 'date-fns'
import BusSelector from './BusSelector'
import './TripManagement.css'

function TripManagement() {
  const [selectedBus, setSelectedBus] = useState(localStorage.getItem('selectedBusTripMgmt') || 'ALL')
  const [scheduledTrips, setScheduledTrips] = useState([])
  const [recentTrips, setRecentTrips] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchScheduledTrips()
    fetchRecentTrips()
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchScheduledTrips()
      fetchRecentTrips()
    }, 30000)
    
    return () => clearInterval(interval)
  }, [selectedBus])

  const handleBusChange = (busId) => {
    setSelectedBus(busId)
    localStorage.setItem('selectedBusTripMgmt', busId)
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return '#2ecc71'
      case 'upcoming':
        return '#3498db'
      case 'completed':
        return '#95a5a6'
      default:
        return '#95a5a6'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active':
        return '🚌'
      case 'upcoming':
        return '⏰'
      case 'completed':
        return '✅'
      default:
        return '❓'
    }
  }

  const fetchScheduledTrips = async () => {
    try {
      const busParam = selectedBus !== 'ALL' ? `?bus_id=${selectedBus}` : ''
      const response = await axios.get(`/api/scheduled-trips${busParam}`)
      setScheduledTrips(response.data.trips || [])
      console.log('Scheduled trips:', response.data.trips)
    } catch (error) {
      console.error('Error fetching scheduled trips:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchRecentTrips = async () => {
    try {
      // Get trips from actual passenger data instead of tripSessions
      const response = await axios.get('/api/analyze-trips')
      const passengerTrips = response.data.passengerTrips || []
      const passengersWithoutTrip = response.data.passengersWithoutTrip || 0
      const totalPassengers = response.data.totalPassengers || 0
      
      console.log('📊 Trip Analysis:')
      console.log('  Total passengers:', totalPassengers)
      console.log('  Passengers with trip_id:', totalPassengers - passengersWithoutTrip)
      console.log('  Passengers without trip_id:', passengersWithoutTrip)
      console.log('  Unique trips found:', passengerTrips.length)
      console.log('  Trip details:', passengerTrips)
      
      // Convert passenger trip data to trip format
      const allTrips = passengerTrips.map(pt => ({
        trip_id: pt._id || 'UNKNOWN',
        bus_id: pt.bus_id || 'UNKNOWN',
        route_name: pt.route_name || 'Unknown Route',
        start_time: pt.firstEntry,
        end_time: pt.lastEntry,
        status: 'completed',
        total_passengers: pt.count,
        total_unmatched: 0
      }))
      
      // Show recent trips (last 7 days) instead of only today
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      
      let recentTrips = allTrips.filter(trip => {
        try {
          if (!trip.start_time) return false
          const startTime = new Date(trip.start_time)
          return startTime >= sevenDaysAgo
        } catch (error) {
          console.error('Error parsing trip date:', error, trip)
          return false
        }
      })
      
      // Filter by selected bus
      if (selectedBus !== 'ALL') {
        recentTrips = recentTrips.filter(trip => trip.bus_id === selectedBus)
      }
      
      console.log('✅ Recent trips (last 7 days):', recentTrips.length)
      
      // Sort by start time (newest first)
      recentTrips.sort((a, b) => new Date(b.start_time) - new Date(a.start_time))
      
      setRecentTrips(recentTrips)
    } catch (error) {
      console.error('Error fetching trips:', error)
    }
  }



  const formatDateTime = (dateString) => {
    try {
      // Handle both Python format and ISO format
      if (typeof dateString === 'string' && dateString.includes(' ')) {
        dateString = dateString.replace(' ', 'T')
      }
      return format(new Date(dateString), 'MMM dd, yyyy HH:mm')
    } catch {
      return 'N/A'
    }
  }

  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60)
    const mins = Math.round(minutes % 60)
    return `${hours}h ${mins}m`
  }

  if (loading) {
    return <div className="loading">Loading trip information...</div>
  }

  console.log('RENDERING TripManagement, recentTrips.length =', recentTrips.length)

  return (
    <div className="trip-management">
      <div className="trip-header">
        <h2>🚌 Trip Session Management</h2>
        <p>Manage bus trips and track passengers per journey</p>
      </div>

      <BusSelector 
        selectedBus={selectedBus}
        onBusChange={handleBusChange}
        showAll={true}
        label="Filter by Bus:"
      />

      {/* Today's Scheduled Trips */}
      <div className="scheduled-trips-section">
        <h3>📅 Today's Schedule - {format(new Date(), 'EEEE, MMM dd, yyyy')}</h3>
        {scheduledTrips.length > 0 ? (
          <div className="schedule-grid">
            {scheduledTrips.map((trip, index) => (
              <div key={index} className={`schedule-card ${trip.status}`}>
                <div className="schedule-header">
                  <span className="schedule-icon">{getStatusIcon(trip.status)}</span>
                  <span className="schedule-title">{trip.trip_name}</span>
                  <span 
                    className="schedule-status-badge" 
                    style={{ backgroundColor: getStatusColor(trip.status) }}
                  >
                    {trip.status}
                  </span>
                </div>
                <div className="schedule-details">
                  <div className="schedule-time">
                    <span className="time-label">Boarding:</span>
                    <span className="time-value">{trip.boarding_start_time}</span>
                  </div>
                  <div className="schedule-time">
                    <span className="time-label">Departure:</span>
                    <span className="time-value">{trip.departure_time}</span>
                  </div>
                  <div className="schedule-time">
                    <span className="time-label">Arrival:</span>
                    <span className="time-value">{trip.estimated_arrival_time}</span>
                  </div>
                </div>
                <div className="schedule-route">
                  <span className="route-badge">{trip.route_name}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-schedule">
            <p>No scheduled trips for today</p>
          </div>
        )}
      </div>

      {/* Trip Statistics */}
      <div className="trip-stats-section">
        <h3>📊 Recent Activity</h3>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">🚌</div>
            <div className="stat-content">
              <div className="stat-value">{recentTrips.length}</div>
              <div className="stat-label">Completed Trips (7 Days)</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">👥</div>
            <div className="stat-content">
              <div className="stat-value">{recentTrips.reduce((sum, t) => sum + (t.total_passengers || 0), 0)}</div>
              <div className="stat-label">Total Passengers</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">📅</div>
            <div className="stat-content">
              <div className="stat-value">{recentTrips.length > 0 ? format(new Date(recentTrips[0].start_time), 'MMM dd') : '-'}</div>
              <div className="stat-label">Latest Trip</div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Trips */}
      <div className="recent-trips-section">
        <h3>Recent Trips (Last 7 Days) - Total: {recentTrips.length}</h3>
        {recentTrips.length > 0 ? (
          <div className="trips-table-container">
              <table className="trips-table">
              <thead>
                <tr>
                  <th>Bus ID</th>
                  <th>Route</th>
                  <th>Trip ID</th>
                  <th>Start Time</th>
                  <th>End Time</th>
                  <th>Duration</th>
                  <th>Passengers</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentTrips.map((trip, index) => {
                  console.log('Rendering trip row:', index, trip.trip_id)
                  return (
                    <tr key={index}>
                      <td><strong>{trip.bus_id || 'N/A'}</strong></td>
                      <td>{trip.route_name || 'N/A'}</td>
                      <td className="trip-id-cell">{trip.trip_id || 'N/A'}</td>
                      <td>{trip.start_time ? formatDateTime(trip.start_time) : 'N/A'}</td>
                      <td>{trip.end_time ? formatDateTime(trip.end_time) : '-'}</td>
                      <td>
                        {trip.end_time && trip.start_time
                          ? formatDuration((new Date(trip.end_time) - new Date(trip.start_time)) / 60000)
                          : '-'}
                      </td>
                      <td className="number-cell">{trip.total_passengers || 0}</td>
                      <td>
                        <span className={`status-badge ${trip.status}`}>
                          {trip.status || 'unknown'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="no-data">
            <p>📭 No trips found in the last 7 days</p>
            <div className="no-data-help">
              <h4>Why no trips?</h4>
              <ul>
                <li>✅ Passengers need to complete full journeys (entry + exit)</li>
                <li>✅ Python server must be running to track passengers</li>
                <li>✅ Check browser console for trip analysis details</li>
                <li>✅ Old passenger data may not have trip_id assigned</li>
              </ul>
              <p><strong>Next steps:</strong> Have passengers board and exit the bus to create new trip data</p>
            </div>
          </div>
        )}
      </div>



      <div className="trip-info-box">
        <h4>💡 How Trip Sessions Work:</h4>
        <ul>
          <li><strong>Recent Trips:</strong> Shows trips from the last 7 days</li>
          <li><strong>Trip Data:</strong> Based on actual passenger records</li>
          <li><strong>Start Trip:</strong> Begin a new journey session</li>
          <li><strong>During Trip:</strong> All passengers are tracked under this trip ID</li>
          <li><strong>End Trip:</strong> Closes the session and moves unmatched entries</li>
          <li><strong>Passenger Count:</strong> Shows completed journeys per trip</li>
        </ul>
      </div>
    </div>
  )
}

export default TripManagement
