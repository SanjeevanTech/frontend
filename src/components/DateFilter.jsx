import React from 'react'
import { format } from 'date-fns'
import './DateFilter.css'

function DateFilter({ selectedDate, onDateChange, onRefresh, selectedTrip, onTripChange, availableTrips }) {
  const handleDateChange = (e) => {
    onDateChange(new Date(e.target.value))
  }

  const goToToday = () => {
    onDateChange(new Date())
  }

  return (
    <div className="date-filter">
      <div className="filter-controls">
        <div className="date-input-group">
          <label htmlFor="date-picker">Select Date:</label>
          <input
            id="date-picker"
            type="date"
            value={format(selectedDate, 'yyyy-MM-dd')}
            onChange={handleDateChange}
            max={format(new Date(), 'yyyy-MM-dd')}
          />
        </div>
        
        {availableTrips && availableTrips.length > 0 && (
          <div className="date-input-group">
            <label htmlFor="trip-filter">Trip:</label>
            <select
              id="trip-filter"
              value={selectedTrip || 'ALL'}
              onChange={(e) => onTripChange && onTripChange(e.target.value)}
            >
              <option value="ALL">All Trips ({availableTrips.length})</option>
              {availableTrips.map((trip, index) => {
                const tripId = typeof trip === 'string' ? trip : trip.trip_id;
                
                // For scheduled trips, show trip name and times
                if (typeof trip === 'object' && trip.scheduled) {
                  // Show boarding and departure times to distinguish trips with same name
                  const timeInfo = trip.boarding_start_time && trip.boarding_start_time !== trip.departure_time
                    ? `Boarding: ${trip.boarding_start_time}, Depart: ${trip.departure_time}`
                    : `Depart: ${trip.departure_time}`;
                  
                  const displayName = trip.trip_name 
                    ? `${trip.trip_name} (${timeInfo})`
                    : `${trip.route || tripId} (${timeInfo})`;
                  
                  return (
                    <option key={`${tripId}_${index}`} value={tripId}>
                      {displayName}
                    </option>
                  );
                }
                
                // Fallback for non-scheduled trips
                const boardingTime = typeof trip === 'object' && trip.start_time 
                  ? format(new Date(trip.start_time), 'HH:mm')
                  : '';
                
                const displayName = boardingTime
                  ? `${tripId} (${boardingTime})`
                  : tripId;
                
                return (
                  <option key={`${tripId}_${index}`} value={tripId}>
                    {displayName}
                  </option>
                );
              })}
            </select>
          </div>
        )}
        
        <button className="btn btn-secondary" onClick={goToToday}>
          Today
        </button>
        
        <button className="btn btn-primary" onClick={onRefresh}>
          🔄 Refresh
        </button>
      </div>
      
      <div className="selected-date-display">
        Showing data for: <strong>{format(selectedDate, 'MMMM dd, yyyy')}</strong>
        {selectedTrip && selectedTrip !== 'ALL' && (
          <span> | Trip: <strong>{selectedTrip}</strong></span>
        )}
      </div>
    </div>
  )
}

export default DateFilter
