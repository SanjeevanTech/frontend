import { useState, useEffect } from 'react'
import axios from '../utils/axios'
import { format } from 'date-fns'
import BusSelector from '../components/BusSelector'
import LoadingSpinner from '../components/LoadingSpinner'
import { toast } from 'react-hot-toast'

const statusStyles = {
  active: {
    badge: 'bg-emerald-100 text-emerald-700',
    card: 'border-emerald-200',
    icon: '🚌'
  },
  upcoming: {
    badge: 'bg-sky-100 text-sky-700',
    card: 'border-sky-200',
    icon: '⏰'
  },
  completed: {
    badge: 'bg-slate-200 text-slate-700',
    card: 'border-slate-200',
    icon: '✅'
  },
  default: {
    badge: 'bg-slate-200 text-slate-600',
    card: 'border-slate-200',
    icon: '❓'
  }
}

function TripsPage() {
  const [selectedBus, setSelectedBus] = useState(localStorage.getItem('selectedBusTripMgmt') || 'ALL')
  const [scheduledTrips, setScheduledTrips] = useState([])
  const [recentTrips, setRecentTrips] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterModalOpen, setFilterModalOpen] = useState(false)
  const [tempBus, setTempBus] = useState('ALL')

  useEffect(() => {
    fetchScheduledTrips()
    fetchRecentTrips()
    
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

  const openFilterModal = () => {
    setTempBus(selectedBus)
    setFilterModalOpen(true)
  }

  const applyFilters = () => {
    setSelectedBus(tempBus)
    localStorage.setItem('selectedBusTripMgmt', tempBus)
    setFilterModalOpen(false)
  }

  const resetFilters = () => {
    setTempBus('ALL')
  }

  const fetchScheduledTrips = async () => {
    try {
      const busParam = selectedBus !== 'ALL' ? `?bus_id=${selectedBus}` : ''
      const response = await axios.get(`/api/scheduled-trips${busParam}`)
      setScheduledTrips(response.data.trips || [])
    } catch (error) {
      console.error('Error fetching scheduled trips:', error)
      toast.error('Unable to load today\'s schedule')
    } finally {
      setLoading(false)
    }
  }

  const fetchRecentTrips = async () => {
    try {
      const response = await axios.get('/api/trips/analyze')
      const passengerTrips = response.data.passengerTrips || []

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
      
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      
      let filteredTrips = allTrips.filter(trip => {
        try {
          if (!trip.start_time) return false
          const startTime = new Date(trip.start_time)
          return startTime >= sevenDaysAgo
        } catch (error) {
          console.error('Error parsing trip date:', error, trip)
          return false
        }
      })
      
      if (selectedBus !== 'ALL') {
        filteredTrips = filteredTrips.filter(trip => trip.bus_id === selectedBus)
      }
      
      filteredTrips.sort((a, b) => new Date(b.start_time) - new Date(a.start_time))
      
      setRecentTrips(filteredTrips)
    } catch (error) {
      console.error('Error fetching trips:', error)
      toast.error('Unable to load recent trips')
    }
  }

  const formatDateTime = (dateString) => {
    try {
      if (typeof dateString === 'string' && dateString.includes(' ')) {
        dateString = dateString.replace(' ', 'T')
      }
      return format(new Date(dateString), 'MMM dd, yyyy • HH:mm')
    } catch {
      return 'N/A'
    }
  }

  const formatDuration = (start, end) => {
    if (!start || !end) return '-'

    const diffMs = new Date(end) - new Date(start)
    if (Number.isNaN(diffMs) || diffMs <= 0) return '-'

    const minutes = Math.round(diffMs / 60000)
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return hours ? `${hours}h ${mins}m` : `${mins}m`
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner size="xl" text="Loading trip information..." />
      </div>
    )
  }

  const totalPassengers = recentTrips.reduce((sum, trip) => sum + (trip.total_passengers || 0), 0)
  const latestTrip = recentTrips[0]

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg shadow-black/30">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-3xl font-semibold text-slate-100">
              <span>🚌</span>
              Trip Session Management
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Live overview of today's operations and completed journeys during the last seven days.
            </p>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-300">
            Auto-refreshing every 30 seconds
          </div>
        </div>
      </section>

      <section className="space-y-6 rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg shadow-black/30">
        {/* Mobile Filter Button */}
        <div className="flex items-center justify-between gap-4 lg:hidden">
          <button
            onClick={openFilterModal}
            className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg shadow-lg shadow-purple-500/50 hover:shadow-xl transition-all font-medium"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <span>Filter by Bus</span>
            {selectedBus !== 'ALL' && (
              <span className="bg-white/20 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                1
              </span>
            )}
          </button>
        </div>

        {/* Desktop Inline Filter */}
        <div className="hidden lg:flex items-center gap-4">
          <div className="flex-1">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-300 mb-2">
              <span className="text-lg">🚌</span>
              Filter by Bus
            </label>
            <BusSelector 
              selectedBus={selectedBus}
              onBusChange={handleBusChange}
              showAll={true}
              label=""
            />
          </div>
        </div>

        {/* Filter Modal */}
        {filterModalOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setFilterModalOpen(false)}
            />
            
            <div className="relative w-full sm:max-w-lg bg-slate-900 border border-purple-500/30 rounded-t-3xl sm:rounded-2xl shadow-2xl shadow-purple-500/20 max-h-[90vh] overflow-y-auto">
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

              <div className="p-6 space-y-6">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-300">
                    <span className="text-lg">🚌</span>
                    Select Bus
                  </label>
                  <BusSelector 
                    selectedBus={tempBus}
                    onBusChange={setTempBus}
                    showAll={true}
                    label=""
                  />
                </div>

                <div className="rounded-xl bg-slate-800/30 border border-purple-500/20 p-4">
                  <p className="text-xs text-slate-400 mb-2">Current Selection:</p>
                  <div className="space-y-1 text-sm">
                    <p className="text-slate-300">
                      <span className="text-slate-500">Bus:</span> <span className="font-medium text-purple-400">{tempBus}</span>
                    </p>
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
                  Apply Filter
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-inner shadow-black/20">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Trips (7 days)</p>
            <p className="mt-3 text-3xl font-semibold text-slate-100">{recentTrips.length}</p>
            <p className="mt-2 text-xs text-slate-500">Completed journeys captured from passenger data.</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-inner shadow-black/20">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Passengers moved</p>
            <p className="mt-3 text-3xl font-semibold text-slate-100">{totalPassengers}</p>
            <p className="mt-2 text-xs text-slate-500">Includes only journeys with both entry and exit.</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-inner shadow-black/20">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Latest trip</p>
            <p className="mt-3 text-xl font-semibold text-slate-100">
              {latestTrip ? format(new Date(latestTrip.start_time), 'MMM dd') : '—'}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              {latestTrip ? latestTrip.route_name : 'Awaiting new journey data.'}
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg shadow-black/30">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <h3 className="flex items-center gap-2 text-2xl font-semibold text-slate-100">
            <span>📅</span>
            Today's schedule ({format(new Date(), 'EEEE, MMM dd')})
          </h3>
          <span className="text-sm text-slate-400">
            {scheduledTrips.length} trip{scheduledTrips.length === 1 ? '' : 's'} planned today
          </span>
        </div>

        {scheduledTrips.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {scheduledTrips.map((trip, index) => {
              const status = trip.status || 'default'
              const style = statusStyles[status] || statusStyles.default

              return (
                <article
                  key={`${trip.trip_name}-${index}`}
                  className={`rounded-2xl border ${style.card} bg-slate-900 p-5 shadow-inner shadow-black/20 transition-shadow hover:shadow-lg`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">Trip #{index + 1}</p>
                      <h4 className="mt-1 text-lg font-semibold text-slate-100">{trip.trip_name}</h4>
                      <p className="mt-1 text-sm text-slate-400">{trip.route_name}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${style.badge}`}>
                      {style.icon} {trip.status || 'scheduled'}
                    </span>
                  </div>

                  <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
                    <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                      <dt className="text-xs uppercase text-slate-500">Boarding</dt>
                      <dd className="mt-1 font-medium text-slate-100">
                        {trip.boarding_start_time || trip.departure_time}
                      </dd>
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                      <dt className="text-xs uppercase text-slate-500">Departure</dt>
                      <dd className="mt-1 font-medium text-slate-100">{trip.departure_time}</dd>
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 col-span-2">
                      <dt className="text-xs uppercase text-slate-500">Arrival</dt>
                      <dd className="mt-1 font-medium text-slate-100">{trip.estimated_arrival_time}</dd>
                    </div>
                  </dl>
                </article>
              )
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/80 p-10 text-center">
            <p className="text-lg font-medium text-slate-200">No scheduled trips for today</p>
            <p className="mt-2 text-sm text-slate-500">
              Configure trips under Schedule Admin to populate today's plan.
            </p>
          </div>
        )}
      </section>

      <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg shadow-black/30">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-2xl font-semibold text-slate-100">Recent trips (last 7 days)</h3>
            <p className="text-sm text-slate-400">
              Derived directly from passenger journeys – unmatched trips are excluded automatically.
            </p>
          </div>

          <div className="flex items-center gap-3 text-sm">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-3 py-1 text-emerald-300">
              ✓ Completed
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-500/15 px-3 py-1 text-slate-300">
              ○ No data
            </span>
          </div>
        </div>

        {recentTrips.length ? (
          <div className="overflow-hidden rounded-2xl border border-slate-800">
            <div className="max-h-[520px] overflow-auto">
              <table className="min-w-full divide-y divide-slate-800 text-sm">
                <thead className="sticky top-0 bg-slate-950/80 text-left text-xs uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-5 py-3">Bus</th>
                    <th className="px-5 py-3">Route</th>
                    <th className="px-5 py-3">Trip ID</th>
                    <th className="px-5 py-3">Start</th>
                    <th className="px-5 py-3">End</th>
                    <th className="px-5 py-3">Duration</th>
                    <th className="px-5 py-3 text-right">Passengers</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 bg-slate-900/60 text-slate-200">
                  {recentTrips.map((trip, index) => (
                    <tr key={`${trip.trip_id}-${index}`} className="transition-colors hover:bg-slate-900/80">
                      <td className="px-5 py-4 font-semibold text-slate-100">{trip.bus_id}</td>
                      <td className="px-5 py-4 text-slate-300">{trip.route_name}</td>
                      <td className="px-5 py-4 text-xs font-mono text-slate-500">{trip.trip_id}</td>
                      <td className="px-5 py-4 text-slate-300">{formatDateTime(trip.start_time)}</td>
                      <td className="px-5 py-4 text-slate-300">
                        {trip.end_time ? formatDateTime(trip.end_time) : '—'}
                      </td>
                      <td className="px-5 py-4 text-slate-300">
                        {formatDuration(trip.start_time, trip.end_time)}
                      </td>
                      <td className="px-5 py-4 text-right font-semibold text-slate-100">
                        {trip.total_passengers || 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/80 p-10">
            <div className="mx-auto max-w-xl space-y-4 text-center">
              <p className="text-2xl">📭</p>
              <p className="text-lg font-medium text-slate-200">No trips recorded in the last seven days</p>
              <div className="space-y-2 text-sm text-slate-400">
                <p className="font-medium text-slate-200">Run through these checks:</p>
                <p>• Ensure the Python analytics service is online</p>
                <p>• Confirm passengers have both entry and exit events</p>
                <p>• Review browser console for trip analysis details</p>
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-slate-100 shadow-xl">
        <h4 className="text-lg font-semibold">How trip sessions are built</h4>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
            <p className="text-sm font-semibold text-indigo-200">Active session</p>
            <p className="mt-2 text-sm text-slate-300">
              Starting a trip attaches all subsequent entries and exits until it is closed. Ideal for
              per-journey analytics.
            </p>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
            <p className="text-sm font-semibold text-indigo-200">Automatic grouping</p>
            <p className="mt-2 text-sm text-slate-300">
              Passenger logs are analysed to infer completed journeys, ensuring legacy data is kept useful.
            </p>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
            <p className="text-sm font-semibold text-indigo-200">Unmatched passengers</p>
            <p className="mt-2 text-sm text-slate-300">
              Journeys without exit scans surface under the Unmatched tab for quick reconciliation.
            </p>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
            <p className="text-sm font-semibold text-indigo-200">Forecasting-ready</p>
            <p className="mt-2 text-sm text-slate-300">
              Clean trip sessions feed future forecasting dashboards and OTP metrics without extra
              transformation.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}

export default TripsPage
