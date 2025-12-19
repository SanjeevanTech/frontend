import React, { useState, useRef, useEffect } from 'react'
import { format } from 'date-fns'

function DateFilter({ selectedDate, onDateChange, onRefresh, selectedTrip, onTripChange, availableTrips }) {
  const [isTripOpen, setIsTripOpen] = useState(false)
  const tripDropdownRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (tripDropdownRef.current && !tripDropdownRef.current.contains(event.target)) {
        setIsTripOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleDateChange = (e) => {
    onDateChange(new Date(e.target.value))
  }

  const goToToday = () => {
    onDateChange(new Date())
  }

  return (
    <div className="space-y-4 rounded-2xl border border-purple-500/30 bg-slate-800/30 backdrop-blur-sm p-5 shadow-lg shadow-purple-500/10">
      <div className="flex flex-wrap items-end gap-3">
        {/* Date Selector */}
        <div className="flex-1 min-w-[160px]">
          <label htmlFor="date-picker" className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-300">
            <span>📅</span>
            Select date
          </label>
          <div className="relative">
            <input
              id="date-picker"
              type="date"
              value={format(selectedDate, 'yyyy-MM-dd')}
              onChange={handleDateChange}
              max={format(new Date(), 'yyyy-MM-dd')}
              className="w-full h-12 rounded-lg border border-purple-500/30 bg-slate-800/50 px-4 py-3 text-sm text-slate-100 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all [color-scheme:dark]"
            />
          </div>
        </div>

        {/* Custom Trip Dropdown */}
        {availableTrips && availableTrips.length > 0 && (
          <div className="flex-1 min-w-[200px]" ref={tripDropdownRef}>
            <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-300">
              <span>🎯</span>
              Trip
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsTripOpen(!isTripOpen)}
                className="w-full h-12 flex items-center justify-between px-4 rounded-lg border border-purple-500/30 bg-slate-800/50 text-sm text-slate-100 focus:border-purple-500 focus:outline-none transition-all hover:bg-slate-800/70"
              >
                <span className="truncate">
                  {selectedTrip === 'ALL' || !selectedTrip
                    ? `All trips (${availableTrips.length})`
                    : `Trip ${selectedTrip}`}
                </span>
                <span className={`transition-transform duration-200 ${isTripOpen ? 'rotate-180' : ''}`}>
                  <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
              </button>

              {isTripOpen && (
                <div className="absolute z-50 w-full mt-2 rounded-xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-150 origin-top">
                  <div className="max-h-60 overflow-y-auto custom-scrollbar">
                    <button
                      type="button"
                      onClick={() => {
                        onTripChange && onTripChange('ALL')
                        setIsTripOpen(false)
                      }}
                      className={`w-full text-left px-4 py-3 text-sm transition-colors hover:bg-purple-500/10 ${(!selectedTrip || selectedTrip === 'ALL') ? 'bg-purple-500/20 text-purple-300' : 'text-slate-300'}`}
                    >
                      All trips ({availableTrips.length})
                    </button>
                    {availableTrips.map((trip, index) => {
                      const tripId = typeof trip === 'string' ? trip : trip.trip_id
                      const isSelected = selectedTrip === tripId

                      let displayName = tripId
                      if (typeof trip === 'object') {
                        const tripNumber = trip.trip_name?.match(/\d+/)?.[0] || tripId
                        const timeInfo = trip.boarding_start_time || trip.start_time
                          ? format(new Date(trip.boarding_start_time || trip.start_time), 'HH:mm')
                          : ''
                        displayName = timeInfo ? `T${tripNumber}: ${timeInfo}` : `Trip ${tripNumber}`
                      }

                      return (
                        <button
                          key={`${tripId}_${index}`}
                          type="button"
                          onClick={() => {
                            onTripChange && onTripChange(tripId)
                            setIsTripOpen(false)
                          }}
                          className={`w-full text-left px-4 py-3 text-sm transition-colors hover:bg-purple-500/10 ${isSelected ? 'bg-purple-500/20 text-purple-300' : 'text-slate-300'}`}
                        >
                          {displayName}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={goToToday}
            className="h-12 px-4 rounded-lg border border-purple-500/30 bg-slate-800/50 text-xs font-medium text-slate-200 transition-all hover:bg-slate-700/50"
          >
            Today
          </button>

          <button
            onClick={onRefresh}
            className="h-12 px-4 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-xs font-bold text-white shadow-lg shadow-purple-500/50 transition-all active:scale-95"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-purple-500/20 bg-slate-900/50 px-4 py-3 text-xs sm:text-sm text-slate-300">
        <span className="text-slate-400">Showing:</span> <span className="font-semibold text-purple-400">{format(selectedDate, 'MMM dd, yyyy')}</span>
        {selectedTrip && selectedTrip !== 'ALL' && (
          <span className="ml-2 text-slate-400">• Trip <span className="font-medium text-purple-400">{selectedTrip}</span></span>
        )}
      </div>
    </div>
  )
}

export default DateFilter
