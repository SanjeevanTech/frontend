import { useState, useEffect, useRef, useCallback } from 'react'
import axios from '../utils/axios'
import { format, parseISO } from 'date-fns'
import { toast } from 'react-hot-toast'
import BusSelector from '../components/BusSelector'
import DateFilter from '../components/DateFilter'
import Pagination from '../components/Pagination'
import LoadingSpinner from '../components/LoadingSpinner'

function UnmatchedPage() {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [selectedBus, setSelectedBus] = useState(localStorage.getItem('selectedBusPassengers') || 'ALL')
  const [selectedTrip, setSelectedTrip] = useState('ALL')
  const [availableTrips, setAvailableTrips] = useState([])
  const [unmatched, setUnmatched] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState('ALL')
  const [currentPage, setCurrentPage] = useState(0)
  const [totalUnmatched, setTotalUnmatched] = useState(0)
  const [filterModalOpen, setFilterModalOpen] = useState(false)
  const [isTripOpen, setIsTripOpen] = useState(false)
  const tripDropdownRef = useRef(null)
  const [tempFilters, setTempFilters] = useState({
    bus: 'ALL',
    date: new Date(),
    trip: 'ALL'
  })
  const itemsPerPage = 50

  const handleBusChange = (busId) => {
    setSelectedBus(busId)
    localStorage.setItem('selectedBusPassengers', busId)
  }

  const fetchUnmatched = useCallback(async () => {
    try {
      setLoading(true)
      const dateStr = format(selectedDate, 'yyyy-MM-dd')
      const params = new URLSearchParams({
        date: dateStr,
        limit: itemsPerPage,
        skip: currentPage * itemsPerPage
      })

      if (filterType !== 'ALL') params.append('type', filterType)
      if (selectedBus !== 'ALL') params.append('bus_id', selectedBus)
      if (selectedTrip !== 'ALL') {
        params.append('trip_id', selectedTrip)
        console.log('🔍 Fetching unmatched for trip:', selectedTrip)
      }

      console.log('📡 API Request:', `/api/unmatched?${params}`)

      const response = await axios.get(`/api/unmatched?${params}`)
      setUnmatched(response.data.unmatched || [])
      setTotalUnmatched(response.data.total || 0)
    } catch (error) {
      toast.error('Failed to fetch unmatched passengers')
      console.error('Error fetching unmatched:', error)
    } finally {
      setLoading(false)
    }
  }, [selectedDate, filterType, selectedBus, selectedTrip, currentPage, itemsPerPage])

  useEffect(() => {
    fetchUnmatched()

    const handleClickOutside = (event) => {
      if (tripDropdownRef.current && !tripDropdownRef.current.contains(event.target)) {
        setIsTripOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [selectedDate, filterType, selectedBus, selectedTrip, currentPage, fetchUnmatched])

  useEffect(() => {
    setCurrentPage(0)
  }, [selectedDate, filterType, selectedBus, selectedTrip])

  const fetchAvailableTrips = async () => {
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd')
      const params = new URLSearchParams({ date: dateStr })

      if (selectedBus !== 'ALL') params.append('bus_id', selectedBus)

      const response = await axios.get(`/api/trips?${params}`)
      const trips = response.data.trips || []

      setAvailableTrips(trips)
    } catch (err) {
      console.error('Error fetching available trips:', err)
      setAvailableTrips([])
    }
  }

  useEffect(() => {
    fetchAvailableTrips()
  }, [selectedDate, selectedBus])

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
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

  const openFilterModal = () => {
    setTempFilters({
      bus: selectedBus,
      date: selectedDate,
      trip: selectedTrip
    })
    setFilterModalOpen(true)
  }

  const applyFilters = () => {
    setSelectedBus(tempFilters.bus)
    setSelectedDate(tempFilters.date)
    setSelectedTrip(tempFilters.trip)
    localStorage.setItem('selectedBusPassengers', tempFilters.bus)
    setCurrentPage(0)
    setFilterModalOpen(false)
  }

  const resetFilters = () => {
    const now = new Date()
    setTempFilters({
      bus: 'ALL',
      date: now,
      trip: 'ALL'
    })
  }

  const filters = [
    { id: 'ALL', label: `All (${totalUnmatched})` },
    { id: 'ENTRY', label: 'Entries only' },
    { id: 'EXIT', label: 'Exits only' }
  ]

  return (
    <div className="space-y-6">
      {/* Mobile Filter Button */}
      <div className="flex flex-wrap items-center justify-between gap-3 lg:hidden">
        <button
          onClick={openFilterModal}
          className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg shadow-lg shadow-purple-500/50 hover:shadow-xl transition-all font-medium"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <span>Filters</span>
          {(selectedBus !== 'ALL' || selectedTrip !== 'ALL') && (
            <span className="bg-white/20 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
              {(selectedBus !== 'ALL' ? 1 : 0) + (selectedTrip !== 'ALL' ? 1 : 0)}
            </span>
          )}
        </button>

        <button
          onClick={fetchUnmatched}
          className="flex items-center gap-2 px-4 py-3 bg-slate-800/50 border border-purple-500/30 text-slate-200 rounded-lg hover:bg-slate-700/50 transition-all"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Desktop Inline Filters */}
      <div className="hidden lg:block rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg shadow-black/30">
        <div className="grid grid-cols-4 gap-4 items-end">
          {/* Bus Filter */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-300 block">
              Select Bus
            </label>
            <BusSelector
              selectedBus={selectedBus}
              onBusChange={handleBusChange}
              showAll={true}
              label=""
            />
          </div>

          {/* Date Filter */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-300 block">
              Select Date
            </label>
            <input
              type="date"
              value={format(selectedDate, 'yyyy-MM-dd')}
              onChange={(e) => setSelectedDate(new Date(e.target.value))}
              max={format(new Date(), 'yyyy-MM-dd')}
              className="w-full px-4 py-3 bg-slate-800/50 border border-purple-500/30 text-slate-100 rounded-lg focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all [color-scheme:dark]"
              style={{ colorScheme: 'dark' }}
            />
          </div>

          {/* Trip Filter */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-300 block">
              Select Trip
            </label>
            <select
              value={selectedTrip}
              onChange={(e) => setSelectedTrip(e.target.value)}
              className="w-full px-4 py-3 bg-slate-800/50 border border-purple-500/30 text-slate-100 rounded-lg focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all cursor-pointer"
            >
              <option value="ALL" className="bg-slate-900 text-slate-100">
                All trips {availableTrips && availableTrips.length > 0 ? `(${availableTrips.length})` : ''}
              </option>
              {availableTrips && availableTrips.map((trip, index) => {
                const tripId = typeof trip === 'string' ? trip : trip.trip_id
                // Use boarding_start_time or departure_time directly instead of start_time to avoid timezone issues
                const boardingTime = typeof trip === 'object'
                  ? (trip.boarding_start_time || trip.departure_time || '')
                  : ''
                // Get end time from end_time or estimated_arrival_time
                const endTime = typeof trip === 'object'
                  ? (trip.end_time || trip.estimated_arrival_time || '')
                  : ''

                // Extract trip number from trip_id (e.g., "SCHEDULED_BUS_JC_001_2025-11-24_0" -> "Trip 1")
                const tripMatch = tripId.match(/_(\d+)$/)
                const tripNumber = tripMatch ? parseInt(tripMatch[1]) + 1 : index + 1

                // Create display name with both start and end times
                let displayName = `Trip ${tripNumber}`
                if (boardingTime && endTime) {
                  displayName = `T${tripNumber}: ${boardingTime}-${endTime}`
                } else if (boardingTime) {
                  displayName = `T${tripNumber}: ${boardingTime}`
                }

                return (
                  <option key={`${tripId}_${index}`} value={tripId} className="bg-slate-900 text-slate-100">
                    {displayName}
                  </option>
                )
              })}
            </select>
          </div>

          {/* Refresh Button */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-300 block opacity-0">
              Action
            </label>
            <button
              onClick={fetchUnmatched}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-800/50 border border-purple-500/30 text-slate-200 rounded-lg hover:bg-slate-700/50 transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter Modal */}
      {filterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setFilterModalOpen(false)}
          />

          <div className="relative w-full sm:max-w-md bg-slate-900 border border-purple-500/30 rounded-t-3xl sm:rounded-2xl shadow-2xl shadow-purple-500/20 max-h-[90vh]">
            <div className="sticky top-0 bg-slate-900/95 backdrop-blur-sm border-b border-purple-500/20 px-6 py-5 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
                Filter Options
              </h3>
              <button
                onClick={() => setFilterModalOpen(false)}
                className="p-2 bg-slate-800/50 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Scrollable Content Area */}
            <div className="overflow-y-auto max-h-[60vh] px-6 py-6 space-y-6 custom-scrollbar">
              {/* Bus Filter */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-300">
                  <span className="text-lg">🚌</span>
                  Select Bus
                </label>
                <BusSelector
                  selectedBus={tempFilters.bus}
                  onBusChange={(bus) => setTempFilters(prev => ({ ...prev, bus }))}
                  showAll={true}
                  label=""
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-300">
                  <span className="text-lg">📅</span>
                  Select Date
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={format(tempFilters.date, 'yyyy-MM-dd')}
                    max={format(new Date(), 'yyyy-MM-dd')}
                    onChange={(e) => setTempFilters(prev => ({ ...prev, date: new Date(e.target.value) }))}
                    className="w-full h-12 rounded-lg border border-purple-500/30 bg-slate-800/50 px-4 py-3 text-sm text-slate-100 shadow-lg shadow-purple-500/10 focus:border-purple-500 focus:outline-none transition-all [color-scheme:dark]"
                  />
                </div>
              </div>

              {/* Trip Filter */}
              <div className="space-y-2" ref={tripDropdownRef}>
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-300">
                  <span className="text-lg">🎯</span>
                  Select Trip
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsTripOpen(!isTripOpen)}
                    className="w-full h-12 flex items-center justify-between px-4 rounded-lg border border-purple-500/30 bg-slate-800/50 text-sm text-slate-100 shadow-lg shadow-purple-500/10 focus:border-purple-500 focus:outline-none transition-all hover:bg-slate-800/70"
                  >
                    <span className="truncate">
                      {tempFilters.trip === 'ALL'
                        ? (availableTrips ? `All trips (${availableTrips.length})` : 'All trips')
                        : `Trip ${tempFilters.trip}`}
                    </span>
                    <span className={`transition-transform duration-200 ${isTripOpen ? 'rotate-180' : ''}`}>
                      <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </span>
                  </button>

                  {isTripOpen && availableTrips && availableTrips.length > 0 && (
                    <div className="absolute z-50 w-full mt-2 rounded-xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-150 origin-top">
                      <div className="max-h-60 overflow-y-auto custom-scrollbar">
                        <button
                          type="button"
                          onClick={() => {
                            setTempFilters(prev => ({ ...prev, trip: 'ALL' }))
                            setIsTripOpen(false)
                          }}
                          className={`w-full text-left px-4 py-3 text-sm transition-colors hover:bg-purple-500/10 ${tempFilters.trip === 'ALL' ? 'bg-purple-500/20 text-purple-300' : 'text-slate-300'}`}
                        >
                          All trips ({availableTrips.length})
                        </button>
                        {availableTrips.map((trip, index) => {
                          const tripId = typeof trip === 'string' ? trip : trip.trip_id
                          const isSelected = tempFilters.trip === tripId

                          let displayName = tripId
                          if (typeof trip === 'object') {
                            const tripMatch = tripId.match(/_(\d+)$/)
                            const tripNumber = tripMatch ? parseInt(tripMatch[1]) + 1 : index + 1
                            const timeInfo = trip.boarding_start_time || trip.departure_time || ''
                            displayName = timeInfo ? `T${tripNumber}: ${timeInfo}` : `Trip ${tripNumber}`
                          }

                          return (
                            <button
                              key={`${tripId}_${index}`}
                              type="button"
                              onClick={() => {
                                setTempFilters(prev => ({ ...prev, trip: tripId }))
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

              <div className="rounded-xl bg-slate-800/30 border border-purple-500/20 p-4">
                <p className="text-xs text-slate-400 mb-2">Current Selection:</p>
                <div className="space-y-1 text-sm">
                  <p className="text-slate-300">
                    <span className="text-slate-500">Bus:</span> <span className="font-medium text-purple-400">{tempFilters.bus}</span>
                  </p>
                  <p className="text-slate-300">
                    <span className="text-slate-500">Date:</span> <span className="font-medium text-purple-400">{format(tempFilters.date, 'MMM dd, yyyy')}</span>
                  </p>
                  {tempFilters.trip !== 'ALL' && (
                    <p className="text-slate-300">
                      <span className="text-slate-500">Trip:</span> <span className="font-medium text-purple-400">{tempFilters.trip}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-slate-900/95 backdrop-blur-sm border-t border-purple-500/20 px-6 py-4 flex gap-3">
              <button
                onClick={resetFilters}
                className="flex-1 px-4 py-3 bg-slate-800/50 border border-purple-500/30 text-slate-300 rounded-lg hover:bg-slate-700/50 transition-all font-medium"
              >
                Reset
              </button>
              <button
                onClick={applyFilters}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg shadow-lg shadow-purple-500/50 hover:shadow-xl transition-all font-semibold"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <LoadingSpinner size="xl" text="Loading unmatched passengers..." />
        </div>
      ) : (
        <div className="space-y-6">
          <header className="text-left sm:text-center px-2">
            <h3 className="text-xl sm:text-2xl font-bold text-slate-100">Unmatched passengers</h3>
            <p className="mt-1 text-xs sm:text-sm text-slate-400">Entries or exits without matching records found.</p>
          </header>

          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Filter by type</span>
            {filters.map((filter) => (
              <button
                key={filter.id}
                onClick={() => setFilterType(filter.id)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${filterType === filter.id
                  ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30'
                  : 'border border-slate-700 bg-slate-900/80 text-slate-200 hover:bg-slate-800'
                  }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {unmatched.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-16 text-center">
              <div className="text-5xl mb-3">✅</div>
              <p className="text-lg font-semibold text-slate-100">No unmatched passengers for this selection</p>
              <p className="mt-2 text-sm text-slate-400">All entries have matching exits</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="w-full overflow-x-auto rounded-xl sm:rounded-2xl border border-slate-800">
                <div className="inline-block min-w-full align-middle">
                  <table className="min-w-[1000px] w-full divide-y divide-slate-800/50 text-sm">
                    <thead className="bg-slate-950/80 text-left text-xs uppercase tracking-wide text-slate-400">
                      <tr>
                        <th className="px-5 py-4 font-semibold">Bus ID</th>
                        <th className="px-5 py-4 font-semibold">Type</th>
                        <th className="px-5 py-4 font-semibold">Face ID</th>
                        <th className="px-5 py-4 font-semibold">Time</th>
                        <th className="px-5 py-4 font-semibold">Location</th>
                        <th className="px-5 py-4 font-semibold">Device</th>
                        <th className="px-5 py-4 font-semibold">Best match</th>
                        <th className="px-5 py-4 font-semibold">Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 bg-slate-900/60 text-slate-200">
                      {unmatched.map((item, index) => (
                        <tr key={index} className="transition-colors hover:bg-slate-800/30 leading-relaxed">
                          <td className="px-5 py-4 whitespace-nowrap font-bold text-purple-400">{item.bus_id || '---'}</td>
                          <td className="px-5 py-4 whitespace-nowrap">
                            <span
                              className={`rounded-full px-3 py-1 text-[10px] font-bold ${item.type === 'ENTRY'
                                ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                }`}
                            >
                              {item.type}
                            </span>
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap font-mono text-[10px] text-slate-500">{item.face_id}</td>
                          <td className="px-5 py-4 whitespace-nowrap text-slate-300 font-mono text-xs">{formatDateTime(item.timestamp)}</td>
                          <td className="px-5 py-4 whitespace-nowrap text-[10px] text-slate-400 font-mono">{formatLocation(item.location)}</td>
                          <td className="px-5 py-4 whitespace-nowrap text-slate-400 text-xs">{item.location?.device_id || '---'}</td>
                          <td className="px-5 py-4 whitespace-nowrap font-bold text-slate-200">
                            {item.best_similarity_found !== undefined && item.best_similarity_found !== null
                              ? `${(item.best_similarity_found * 100).toFixed(1)}%`
                              : '---'}
                          </td>
                          <td className="px-5 py-4 text-xs text-slate-500 min-w-[200px]">{item.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <Pagination
                currentPage={currentPage}
                totalItems={totalUnmatched}
                itemsPerPage={itemsPerPage}
                onPageChange={handlePageChange}
                loading={loading}
              />
            </div>
          )}

          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 text-sm text-slate-300">
            <p className="text-slate-100">Total unmatched: {totalUnmatched}</p>
            <p className="mt-2 text-slate-400">
              These passengers either boarded without exiting or exited without boarding records. Review logs to reconcile.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default UnmatchedPage
