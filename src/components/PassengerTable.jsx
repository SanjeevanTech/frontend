import React from 'react'
import { format, parseISO } from 'date-fns'
import './PassengerTable.css'

function PassengerTable({ passengers, selectedBus = 'ALL' }) {
  // Filter passengers by selected bus
  const filteredPassengers = selectedBus === 'ALL' 
    ? passengers 
    : passengers.filter(p => p.bus_id === selectedBus)

  if (!filteredPassengers || filteredPassengers.length === 0) {
    return (
      <div className="no-data">
        <p>📭 No passenger data found for the selected {selectedBus === 'ALL' ? 'date' : `bus (${selectedBus})`}</p>
      </div>
    )
  }

  const formatDateTime = (dateString) => {
    try {
      return format(parseISO(dateString), 'HH:mm:ss')
    } catch {
      return 'N/A'
    }
  }

  const formatLocation = (location) => {
    if (!location) return 'N/A'
    return `${location.latitude?.toFixed(6)}, ${location.longitude?.toFixed(6)}`
  }

  const openInGoogleMaps = (location) => {
    if (!location || !location.latitude || !location.longitude) return
    const url = `https://www.google.com/maps?q=${location.latitude},${location.longitude}`
    window.open(url, '_blank')
  }

  // Hybrid approach: Use stored location_name if available, otherwise fetch from API
  const [locationNames, setLocationNames] = React.useState({})

  const getLocationName = async (lat, lon, key) => {
    if (locationNames[key]) return // Already fetched
    
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=14&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'BusPassengerTracker/1.0'
          }
        }
      )
      const data = await response.json()
      
      const address = data.address || {}
      const name = address.city || address.town || address.village || 
                   address.suburb || address.county || address.state || 
                   'Unknown Location'
      
      setLocationNames(prev => ({...prev, [key]: name}))
    } catch (error) {
      console.error('Error fetching location name:', error)
    }
  }

  // Fetch location names for old data without location_name field
  React.useEffect(() => {
    filteredPassengers.forEach((passenger, index) => {
      // Entry location - only fetch if not stored in database
      if (!passenger.entryLocation?.location_name && 
          passenger.entryLocation?.latitude && 
          passenger.entryLocation?.longitude) {
        const key = `entry-${index}`
        setTimeout(() => {
          getLocationName(
            passenger.entryLocation.latitude,
            passenger.entryLocation.longitude,
            key
          )
        }, index * 200)
      }
      
      // Exit location - only fetch if not stored in database
      if (!passenger.exitLocation?.location_name && 
          passenger.exitLocation?.latitude && 
          passenger.exitLocation?.longitude) {
        const key = `exit-${index}`
        setTimeout(() => {
          getLocationName(
            passenger.exitLocation.latitude,
            passenger.exitLocation.longitude,
            key
          )
        }, (index * 200) + 100)
      }
    })
  }, [filteredPassengers])

  const getStageNumber = (passenger) => {
    // If stage_number exists, use it
    if (passenger.stage_number) {
      return passenger.stage_number
    }
    // Otherwise calculate from distance (3.5 km per stage)
    const distance = passenger.distance_info?.distance_km || 0
    return distance > 0 ? Math.ceil(distance / 3.5) : 0
  }

  return (
    <div className="table-container">
      <table className="passenger-table">
        <thead>
          <tr>
            <th>Bus ID</th>
            <th>Route</th>
            <th>Passenger ID</th>
            <th>Entry Time</th>
            <th>Entry Location</th>
            <th>Exit Time</th>
            <th>Exit Location</th>
            <th>Duration (min)</th>
            <th>Distance (km)</th>
            <th>Price (Rs.)</th>
            <th>Similarity</th>
          </tr>
        </thead>
        <tbody>
          {filteredPassengers.map((passenger, index) => (
            <tr key={passenger.id || index}>
              <td><strong>{passenger.bus_id || 'N/A'}</strong></td>
              <td>{passenger.route_name || 'N/A'}</td>
              <td className="passenger-id">
                {passenger.id}
                {passenger.is_season_ticket && (
                  <span className="season-ticket-badge" title="Season Ticket Holder">
                    🎫
                  </span>
                )}
              </td>
              <td>{formatDateTime(passenger.entry_timestamp)}</td>
              <td className="location-cell">
                <div 
                  className="location-wrapper"
                  onClick={() => openInGoogleMaps(passenger.entryLocation)}
                  title="Click to open in Google Maps"
                >
                  <div className="location-name">
                    {passenger.entryLocation?.location_name || locationNames[`entry-${index}`] || '📍 Loading...'}
                  </div>
                  <div className="location-coords">
                    {formatLocation(passenger.entryLocation)}
                  </div>
                  <span className="map-icon">🗺️</span>
                </div>
              </td>
              <td>{formatDateTime(passenger.exit_timestamp)}</td>
              <td className="location-cell">
                <div 
                  className="location-wrapper"
                  onClick={() => openInGoogleMaps(passenger.exitLocation)}
                  title="Click to open in Google Maps"
                >
                  <div className="location-name">
                    {passenger.exitLocation?.location_name || locationNames[`exit-${index}`] || '📍 Loading...'}
                  </div>
                  <div className="location-coords">
                    {formatLocation(passenger.exitLocation)}
                  </div>
                  <span className="map-icon">🗺️</span>
                </div>
              </td>
              <td>{passenger.journey_duration_minutes?.toFixed(1) || 'N/A'}</td>
              <td className="distance-cell">
                {passenger.distance_info?.distance_km?.toFixed(2) || 'N/A'}
              </td>
              <td className="price-cell">
                <strong className={passenger.is_season_ticket ? 'season-ticket-price' : ''}>
                  Rs. {passenger.price?.toFixed(2) || '0.00'}
                </strong>
                {passenger.is_season_ticket && passenger.price === 0 && (
                  <div className="season-ticket-label">Season Ticket</div>
                )}
                {!passenger.is_season_ticket && getStageNumber(passenger) > 0 && (
                  <div className="stage-info">Stage {getStageNumber(passenger)}</div>
                )}
              </td>
              <td className="similarity-cell">
                <span className={`similarity-badge ${
                  passenger.similarity_score > 0.9 ? 'high' : 
                  passenger.similarity_score > 0.8 ? 'medium' : 'low'
                }`}>
                  {(passenger.similarity_score * 100).toFixed(1)}%
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default PassengerTable
