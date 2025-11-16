import React from 'react'
import { format } from 'date-fns'

function DateFilter({ selectedDate, onDateChange, onRefresh, selectedTrip, onTripChange, availableTrips }) {
  const handleDateChange = (e) => {
    onDateChange(new Date(e.target.value))
  }

  const goToToday = () => {
    onDateChange(new Date())
  }

  return (
    <div className="space-y-4 rounded-2xl border border-purple-500/30 bg-slate-800/30 backdrop-blur-sm p-5 shadow-lg shadow-purple-500/10">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[200px]">
          <label htmlFor="date-picker" className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-300">
            <span>📅</span>
            Select date
          </label>
          <input
            id="date-picker"
            type="date"
            value={format(selectedDate, 'yyyy-MM-dd')}
            onChange={handleDateChange}
            max={format(new Date(), 'yyyy-MM-dd')}
            className="w-full rounded-lg border border-purple-500/30 bg-slate-800/50 px-4 py-3 text-sm text-slate-100 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
          />
        </div>

        {availableTrips && availableTrips.length > 0 && (
          <div className="flex-1 min-w-[200px]">
            <label htmlFor="trip-filter" className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-300">
              <span>🎯</span>
              Trip
            </label>
            <select
              id="trip-filter"
              value={selectedTrip || 'ALL'}
              onChange={(e) => onTripChange && onTripChange(e.target.value)}
              className="w-full rounded-lg border border-purple-500/30 bg-slate-800/50 px-4 py-3 text-sm text-slate-100 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all cursor-pointer"
            >
              <option value="ALL">All trips ({availableTrips.length})</option>
              {availableTrips.map((trip, index) => {
                const tripId = typeof trip === 'string' ? trip : trip.trip_id

                if (typeof trip === 'object' && trip.scheduled) {
                  const timeInfo =
                    trip.boarding_start_time && trip.boarding_start_time !== trip.departure_time
                      ? `Boarding ${trip.boarding_start_time} · Depart ${trip.departure_time}`
                      : `Depart ${trip.departure_time}`

                  const displayName = trip.trip_name
                    ? `${trip.trip_name} (${timeInfo})`
                    : `${trip.route || tripId} (${timeInfo})`

                  return (
                    <option key={`${tripId}_${index}`} value={tripId}>
                      {displayName}
                    </option>
                  )
                }

                const boardingTime = typeof trip === 'object' && trip.start_time
                  ? format(new Date(trip.start_time), 'HH:mm')
                  : ''

                const displayName = boardingTime ? `${tripId} (${boardingTime})` : tripId

                return (
                  <option key={`${tripId}_${index}`} value={tripId}>
                    {displayName}
                  </option>
                )
              })}
            </select>
          </div>
        )}

        <button
          onClick={goToToday}
          className="px-5 py-3 rounded-lg border border-purple-500/30 bg-slate-800/50 text-sm font-medium text-slate-200 transition-all hover:border-purple-500/50 hover:bg-slate-700/50 hover:shadow-lg hover:shadow-purple-500/20"
        >
          Today
        </button>

        <button
          onClick={onRefresh}
          className="px-5 py-3 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-sm font-semibold text-white shadow-lg shadow-purple-500/50 transition-all hover:shadow-xl hover:shadow-purple-500/60 hover:scale-105"
        >
          🔄 Refresh
        </button>
      </div>

      <div className="rounded-xl border border-purple-500/20 bg-slate-900/50 px-4 py-3 text-sm text-slate-300">
        <span className="text-slate-400">Showing data for</span> <span className="font-semibold text-purple-400">{format(selectedDate, 'MMMM dd, yyyy')}</span>
        {selectedTrip && selectedTrip !== 'ALL' && (
          <span className="ml-2 text-slate-400">• Trip <span className="font-medium text-purple-400">{selectedTrip}</span></span>
        )}
      </div>
    </div>
  )
}

export default DateFilter
