import { useState, useEffect } from 'react'
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
  const [tempFilters, setTempFilters] = useState({
    bus: 'ALL',
    date: new Date(),
    trip: 'ALL'
  })
  const itemsPerPage = 50

  useEffect(() => {
    fetchPassengers()
  }, [selectedDate, selectedTrip, selectedBus, currentPage])

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

  const fetchPassengers = async () => {
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
      <div className="flex items-center justify-between gap-4 lg:hidden">
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
                  displayName = `Trip ${tripNumber} - ${boardingTime} → ${endTime}`
                } else if (boardingTime) {
                  displayName = `Trip ${tripNumber} - ${boardingTime}`
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
          <div className="relative w-full sm:max-w-lg bg-slate-900 border border-purple-500/30 rounded-t-3xl sm:rounded-2xl shadow-2xl shadow-purple-500/20 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-slate-900/95 backdrop-blur-sm border-b border-purple-500/20 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
                Filter Options
              </h3>
              <button
                onClick={() => setFilterModalOpen(false)}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
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
                <input
                  type="date"
                  value={format(tempFilters.date, 'yyyy-MM-dd')}
                  onChange={(e) => setTempFilters(prev => ({ ...prev, date: new Date(e.target.value) }))}
                  max={format(new Date(), 'yyyy-MM-dd')}
                  className="w-full px-4 py-3 bg-slate-800/50 border border-purple-500/30 text-slate-100 rounded-lg focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all [color-scheme:dark]"
                  style={{ colorScheme: 'dark' }}
                />
              </div>

              {/* Trip Filter */}
              {availableTrips && availableTrips.length > 0 && (
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-300">
                    <span className="text-lg">🎯</span>
                    Select Trip
                  </label>
                  <select
                    value={tempFilters.trip}
                    onChange={(e) => setTempFilters(prev => ({ ...prev, trip: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-800/50 border border-purple-500/30 text-slate-100 rounded-lg focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all cursor-pointer"
                  >
                    <option value="ALL" className="bg-slate-900 text-slate-100">All trips ({availableTrips.length})</option>
                    {availableTrips.map((trip, index) => {
                      const tripId = typeof trip === 'string' ? trip : trip.trip_id
                      // Use boarding_start_time or departure_time directly instead of start_time to avoid timezone issues
                      const boardingTime = typeof trip === 'object'
                        ? (trip.boarding_start_time || trip.departure_time || '')
                        : ''
                      // Get end time from end_time or estimated_arrival_time
                      const endTime = typeof trip === 'object'
                        ? (trip.end_time || trip.estimated_arrival_time || '')
                        : ''

                      // Extract trip number from trip_id
                      const tripMatch = tripId.match(/_(\d+)$/)
                      const tripNumber = tripMatch ? parseInt(tripMatch[1]) + 1 : index + 1

                      // Create display name with both start and end times
                      let displayName = `Trip ${tripNumber}`
                      if (boardingTime && endTime) {
                        displayName = `Trip ${tripNumber} - ${boardingTime} → ${endTime}`
                      } else if (boardingTime) {
                        displayName = `Trip ${tripNumber} - ${boardingTime}`
                      }

                      return (
                        <option key={`${tripId}_${index}`} value={tripId} className="bg-slate-900 text-slate-100">
                          {displayName}
                        </option>
                      )
                    })}
                  </select>
                </div>
              )}

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
      <div className="grid gap-4 md:grid-cols-3">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-inner shadow-black/20"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{card.label}</p>
            <p className="mt-2 text-3xl font-semibold text-slate-100">{card.value}</p>
            <p className="mt-1 text-xs text-slate-500">{card.helper}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <LoadingSpinner size="xl" text="Loading passenger data..." />
        </div>
      ) : filteredPassengers.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-12 text-center">
          <div className="text-5xl mb-3">📭</div>
          <p className="text-lg text-slate-400">
            No passenger data found for the selected {selectedBus === 'ALL' ? 'filters' : `bus (${selectedBus})`}
          </p>
        </div>
      ) : (
        <>
          {/* Passenger Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60 shadow-inner shadow-black/20">
            <table className="min-w-full">
              <thead className="bg-slate-950/70 text-left text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  {[
                    'Bus ID',
                    'Route',
                    'Passenger ID',
                    'Entry time',
                    'Entry location',
                    'Exit time',
                    'Exit location',
                    'Duration (min)',
                    'Distance (km)',
                    'Price (Rs.)',
                    'Similarity'
                  ].map((label) => (
                    <th key={label} className="px-4 py-3 font-semibold">{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-sm text-slate-200">
                {filteredPassengers.map((passenger, index) => (
                  <tr key={passenger.id || index} className="hover:bg-slate-900/80">
                    <td className="px-4 py-3 font-semibold text-indigo-300">{passenger.bus_id || 'N/A'}</td>
                    <td className="px-4 py-3 text-slate-300">{passenger.route_name || 'N/A'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span>{passenger.id}</span>
                        {passenger.is_season_ticket && (
                          <span className="text-base" title="Season Ticket Holder">🎫</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{formatDateTime(passenger.entry_timestamp)}</td>
                    <td className="px-4 py-3">
                      <button
                        className="w-full text-left rounded-lg border border-transparent px-3 py-2 transition hover:border-indigo-400 hover:bg-indigo-500/10"
                        onClick={() => openInGoogleMaps(passenger.entryLocation)}
                        title="Open in Google Maps"
                      >
                        <div className="font-medium text-indigo-300">
                          {passenger.entryLocation?.location_name || locationNames[`entry-${index}`] || 'Locating…'}
                        </div>
                        <div className="text-xs text-slate-500">{formatLocation(passenger.entryLocation)}</div>
                      </button>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{formatDateTime(passenger.exit_timestamp)}</td>
                    <td className="px-4 py-3">
                      <button
                        className="w-full text-left rounded-lg border border-transparent px-3 py-2 transition hover:border-indigo-400 hover:bg-indigo-500/10"
                        onClick={() => openInGoogleMaps(passenger.exitLocation)}
                        title="Open in Google Maps"
                      >
                        <div className="font-medium text-indigo-300">
                          {passenger.exitLocation?.location_name || locationNames[`exit-${index}`] || 'Locating…'}
                        </div>
                        <div className="text-xs text-slate-500">{formatLocation(passenger.exitLocation)}</div>
                      </button>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{passenger.journey_duration_minutes?.toFixed(1) || 'N/A'}</td>
                    <td className="px-4 py-3 text-slate-300">
                      {passenger.distance_info?.distance_km?.toFixed(2) || 'N/A'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-emerald-300">Rs. {passenger.price?.toFixed(2) || '0.00'}</div>
                      {passenger.is_season_ticket && passenger.price === 0 && (
                        <div className="text-xs text-slate-500">Season ticket</div>
                      )}
                      {!passenger.is_season_ticket && getStageNumber(passenger) > 0 && (
                        <div className="text-xs text-slate-500">Stage {getStageNumber(passenger)}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${passenger.similarity_score > 0.9
                            ? 'bg-emerald-500/10 text-emerald-300'
                            : passenger.similarity_score > 0.8
                              ? 'bg-amber-500/10 text-amber-300'
                              : 'bg-rose-500/10 text-rose-300'
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
