import { useState, useEffect, useRef, useCallback } from 'react'
import axios from '../utils/axios'
import { format, parseISO } from 'date-fns'
import { toast } from 'react-hot-toast'
import BusSelector from '../components/BusSelector'
import DateFilter from '../components/DateFilter'
import Pagination from '../components/Pagination'
import LoadingSpinner from '../components/LoadingSpinner'

function PassengersPage() {
  const [passengers, setPassengers] = useState([])
  const [filteredPassengers, setFilteredPassengers] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [selectedBus, setSelectedBus] = useState(localStorage.getItem('selectedBusPassengers') || 'ALL')
  const [selectedTrip, setSelectedTrip] = useState('ALL')
  const [availableTrips, setAvailableTrips] = useState([])
  const [stats, setStats] = useState({
    totalPassengers: 0,
    totalRevenue: 0,
    routeDistance: 0
  })
  const [currentPage, setCurrentPage] = useState(0)
  const [totalPassengers, setTotalPassengers] = useState(0)
  const [locationNames, setLocationNames] = useState({})
  const [filterModalOpen, setFilterModalOpen] = useState(false)
  const [isTripOpen, setIsTripOpen] = useState(false)
  const tripDropdownRef = useRef(null)
  const [tempFilters, setTempFilters] = useState({
    bus: 'ALL',
    date: new Date(),
    trip: 'ALL'
  })
  const itemsPerPage = 50

  const fetchPassengers = useCallback(async () => {
    try {
      setLoading(true)
      const dateStr = format(selectedDate, 'yyyy-MM-dd')
      const params = new URLSearchParams({
        limit: itemsPerPage,
        skip: currentPage * itemsPerPage,
        date: dateStr
      })

      if (selectedBus !== 'ALL') params.append('bus_id', selectedBus)
      if (selectedTrip !== 'ALL') {
        params.append('trip_id', selectedTrip)
        console.log('🔍 Fetching passengers for trip:', selectedTrip)
      }

      console.log('📡 API Request:', `/api/passengers?${params}`)
      const response = await axios.get(`/api/passengers?${params}`)
      console.log('📦 API Response:', response.data)
      const passengers = response.data.passengers || []
      const total = response.data.total || 0

      setPassengers(passengers)
      setFilteredPassengers(passengers)
      setTotalPassengers(total)

      calculateStats(passengers)
    } catch (err) {
      toast.error('Failed to fetch passenger data')
      console.error('Error fetching passengers:', err)
    } finally {
      setLoading(false)
    }
  }, [selectedDate, selectedBus, selectedTrip, currentPage, itemsPerPage]) // Added itemsPerPage to dependencies

  useEffect(() => {
    fetchPassengers()

    const handleClickOutside = (event) => {
      if (tripDropdownRef.current && !tripDropdownRef.current.contains(event.target)) {
        setIsTripOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [fetchPassengers]) // fetchPassengers is now memoized with useCallback

  useEffect(() => {
    fetchAvailableTrips()
  }, [selectedDate, selectedBus])

  const handleBusChange = (busId) => {
    setSelectedBus(busId)
    localStorage.setItem('selectedBusPassengers', busId)
    setCurrentPage(0)
  }

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

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

  const calculateStats = async (data) => {
    const totalPassengers = data.length
    const totalRevenue = data.reduce((sum, p) => sum + (p.price || 0), 0)

    let routeDistance = 0
    if (data.length > 0) {
      try {
        const dateStr = format(selectedDate, 'yyyy-MM-dd')
        const params = new URLSearchParams({ date: dateStr })

        if (selectedTrip !== 'ALL') params.append('trip_id', selectedTrip)
        if (selectedBus !== 'ALL') params.append('bus_id', selectedBus)

        const response = await axios.get(`/api/route-distance?${params}`)

        if (response.data.success) {
          routeDistance = response.data.distance_km
        }
      } catch (error) {
        console.error('Error calculating route distance:', error)
      }
    }

    setStats({
      totalPassengers,
      totalRevenue: totalRevenue.toFixed(2),
      routeDistance: routeDistance.toFixed(2)
    })
  }

  // PassengerTable helper functions
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

  const getLocationName = async (lat, lon, key) => {
    if (locationNames[key]) return

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
        'Unknown location'

      setLocationNames(prev => ({ ...prev, [key]: name }))
    } catch (error) {
      console.error('Error fetching location name:', error)
    }
  }

  const getStageNumber = (passenger) => {
    if (passenger.stage_number) {
      return passenger.stage_number
    }
    const distance = passenger.distance_info?.distance_km || 0
    return distance > 0 ? Math.ceil(distance / 3.5) : 0
  }

  // Fetch location names for passengers
  useEffect(() => {
    filteredPassengers.forEach((passenger, index) => {
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

  // Stats cards data
  const statCards = [
    {
      label: 'Passengers',
      value: stats.totalPassengers,
      helper: 'Journeys captured today'
    },
    {
      label: 'Route distance (km)',
      value: stats.routeDistance,
      helper: 'Distance travelled'
    },
    {
      label: 'Revenue (Rs.)',
      value: stats.totalRevenue,
      helper: 'Recorded fare totals'
    }
  ]

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
          onClick={fetchPassengers}
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
              onClick={fetchPassengers}
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
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setFilterModalOpen(false)}
          />

          {/* Modal */}
          <div className="relative w-full sm:max-w-xl bg-slate-900 border border-purple-500/30 rounded-t-3xl sm:rounded-2xl shadow-2xl shadow-purple-500/20 max-h-[90vh]">
            {/* Header */}
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

              {/* Date Filter */}
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

              {/* Active Filters Summary */}
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

            {/* Footer Actions */}
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {statCards.map((card, idx) => (
          <div
            key={card.label}
            className={`rounded-xl sm:rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:p-5 shadow-inner shadow-black/20 ${idx === 2 ? 'sm:col-span-2 lg:col-span-1' : ''
              }`}
          >
            <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-slate-400 truncate">{card.label}</p>
            <p className="mt-1 sm:mt-2 text-xl sm:text-3xl font-bold text-slate-100">{card.value}</p>
            <p className="mt-0.5 sm:mt-1 text-[10px] sm:text-xs text-slate-500 truncate">{card.helper}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <LoadingSpinner size="xl" text="Loading passenger data..." />
        </div>
      ) : filteredPassengers.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 sm:p-12 text-center">
          <div className="text-4xl sm:text-5xl mb-3">📭</div>
          <p className="text-base sm:text-lg text-slate-400 break-words max-w-md mx-auto">
            No passenger data found for the selected {selectedBus === 'ALL' ? 'filters' : `bus (${selectedBus})`}
          </p>
        </div>
      ) : (
        <>
          {/* Passenger Table */}
          <div className="w-full overflow-x-auto rounded-xl sm:rounded-2xl border border-slate-800 bg-slate-900/60 shadow-inner shadow-black/20">
            <div className="inline-block min-w-full align-middle">
              <table className="min-w-[1240px] w-full table-fixed lg:table-auto border-collapse">
                <thead className="bg-slate-950/70 text-left text-xs uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="w-24 px-4 py-4 font-semibold">Bus ID</th>
                    <th className="w-32 px-4 py-4 font-semibold">Route</th>
                    <th className="w-32 px-4 py-4 font-semibold">Passenger ID</th>
                    <th className="w-24 px-4 py-4 font-semibold">Entry Time</th>
                    <th className="w-56 px-4 py-4 font-semibold">Entry Location</th>
                    <th className="w-24 px-4 py-4 font-semibold">Exit Time</th>
                    <th className="w-56 px-4 py-4 font-semibold">Exit Location</th>
                    <th className="w-24 px-4 py-4 font-semibold hidden md:table-cell">Dur (Min)</th>
                    <th className="w-24 px-4 py-4 font-semibold">Dist (Km)</th>
                    <th className="w-28 px-4 py-4 font-semibold">Price</th>
                    <th className="w-24 px-4 py-4 font-semibold hidden lg:table-cell">Similarity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50 text-sm text-slate-200">
                  {filteredPassengers.map((passenger, index) => (
                    <tr key={passenger.id || index} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-4 whitespace-nowrap font-medium text-purple-400">{passenger.bus_id || '---'}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-slate-300">{passenger.route_name || 'Generic'}</td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="font-mono">{passenger.id}</span>
                          {passenger.is_season_ticket && (
                            <span className="text-base text-amber-400" title="Season Ticket Holder">🎫</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-slate-300 font-mono text-xs">{formatDateTime(passenger.entry_timestamp)}</td>
                      <td className="px-4 py-4">
                        <button
                          className="w-full text-left rounded-lg bg-slate-800/30 border border-slate-700/50 px-3 py-2 transition hover:border-purple-500/50 hover:bg-purple-500/5"
                          onClick={() => openInGoogleMaps(passenger.entryLocation)}
                        >
                          <div className="font-medium text-slate-200 truncate" title={passenger.entryLocation?.location_name}>
                            {passenger.entryLocation?.location_name || locationNames[`entry-${index}`] || 'Locating…'}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">{formatLocation(passenger.entryLocation)}</div>
                        </button>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-slate-300 font-mono text-xs">{formatDateTime(passenger.exit_timestamp)}</td>
                      <td className="px-4 py-4">
                        <button
                          className="w-full text-left rounded-lg bg-slate-800/30 border border-slate-700/50 px-3 py-2 transition hover:border-purple-500/50 hover:bg-purple-500/5"
                          onClick={() => openInGoogleMaps(passenger.exitLocation)}
                        >
                          <div className="font-medium text-slate-200 truncate" title={passenger.exitLocation?.location_name}>
                            {passenger.exitLocation?.location_name || locationNames[`exit-${index}`] || 'Locating…'}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">{formatLocation(passenger.exitLocation)}</div>
                        </button>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-slate-400 hidden md:table-cell">{passenger.journey_duration_minutes?.toFixed(1) || '0'}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-slate-300 font-medium">
                        {passenger.distance_info?.distance_km?.toFixed(2) || '0.00'} km
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="font-bold text-emerald-400 font-mono">Rs. {passenger.price?.toFixed(2) || '0.00'}</div>
                        {passenger.is_season_ticket && <div className="text-[10px] text-amber-400/70">Season</div>}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap hidden lg:table-cell">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold ${passenger.similarity_score > 0.9
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : passenger.similarity_score > 0.8
                              ? 'bg-amber-500/10 text-amber-400'
                              : 'bg-rose-500/10 text-rose-400'
                            }`}
                        >
                          {(passenger.similarity_score * 100).toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-6">
            <Pagination
              currentPage={currentPage}
              totalItems={totalPassengers}
              itemsPerPage={itemsPerPage}
              onPageChange={handlePageChange}
              loading={loading}
            />
          </div>
        </>
      )}
    </div>
  )
}

export default PassengersPage
