import { useState, useEffect } from 'react'
import axios from '../utils/axios'
import BusSelector from '../components/BusSelector'
import LoadingSpinner from '../components/LoadingSpinner'
import DeleteConfirmModal from '../components/DeleteConfirmModal'
import { API } from '../config/api'
import { toast } from 'react-hot-toast'

function SchedulePage() {
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
  const [deleteModal, setDeleteModal] = useState({ open: false, tripIndex: null, tripName: '' })
  const [deleting, setDeleting] = useState(false)

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
      toast.error('Failed to fetch routes')
    }
  }

  const handleBusChange = (busId) => {
    setSelectedBus(busId)
    localStorage.setItem('selectedBus', busId)
  }

  const fetchSchedule = async (busId) => {
    try {
      setLoading(true)
      const response = await axios.get(API.node.busSchedule(busId))
      if (response.data.schedule) {
        setSchedule(response.data.schedule)
      } else {
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
      toast.error('Failed to fetch schedule')
    } finally {
      setLoading(false)
    }
  }

  const handleAddTrip = () => {
    if (!newTrip.departure_time || !newTrip.estimated_arrival_time) {
      toast.error('Please fill in departure time and arrival time')
      return
    }
    if (!newTrip.route_id) {
      toast.error('Please select a route from the dropdown')
      return
    }

    const selectedRoute = routes.find(r => r.route_id === newTrip.route_id)
    const routeName = selectedRoute ? selectedRoute.route_name : newTrip.route
    const tripName = `${routeName} - ${newTrip.departure_time}`

    const tripData = {
      ...newTrip,
      trip_name: tripName
    }

    let updatedSchedule
    if (editingIndex !== null) {
      const updatedTrips = [...schedule.trips]
      updatedTrips[editingIndex] = tripData
      updatedSchedule = {
        ...schedule,
        trips: updatedTrips
      }
    } else {
      updatedSchedule = {
        ...schedule,
        trips: [...(schedule.trips || []), tripData]
      }
    }

    setSchedule(updatedSchedule)
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

    // Try to find route_id if missing - match by route name
    let routeId = trip.route_id || ''
    if (!routeId && trip.route) {
      const matchedRoute = routes.find(r => r.route_name === trip.route)
      if (matchedRoute) {
        routeId = matchedRoute.route_id
      }
    }

    setEditingIndex(index)
    setNewTrip({
      direction: trip.direction || '',
      boarding_start_time: trip.boarding_start_time || '',
      departure_time: trip.departure_time || '',
      estimated_arrival_time: trip.estimated_arrival_time || '',
      route_id: routeId,
      route: trip.route || '',
      active: trip.active !== false
    })
    setTimeout(() => {
      document.querySelector('.add-trip-section')?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
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

  const openRemoveConfirm = (index) => {
    const tripName = schedule.trips[index]?.trip_name || `Trip ${index + 1}`
    setDeleteModal({ open: true, tripIndex: index, tripName })
  }

  const handleRemoveTrip = async () => {
    const { tripIndex } = deleteModal
    if (tripIndex === null) return

    const updatedSchedule = {
      ...schedule,
      trips: schedule.trips.filter((_, i) => i !== tripIndex)
    }

    try {
      setDeleting(true)

      // Use PUT for update since schedule already exists
      if (updatedSchedule._id) {
        await axios.put(`${API.node.saveBusSchedule}/${updatedSchedule.bus_id}`, updatedSchedule)
      } else {
        await axios.post(API.node.saveBusSchedule, updatedSchedule)
      }

      await axios.put(API.node.syncPowerConfig, { bus_id: updatedSchedule.bus_id })
      setSchedule(updatedSchedule)

      if (editingIndex === tripIndex) {
        handleCancelEdit()
      }
      toast.success('Trip removed and saved!')
      setDeleteModal({ open: false, tripIndex: null, tripName: '' })
    } catch (error) {
      console.error('Error removing trip:', error)
      toast.error('Failed to remove trip: ' + (error.response?.data?.error || error.message))
    } finally {
      setDeleting(false)
    }
  }

  const handleSaveSchedule = async () => {
    try {
      setSaving(true)

      // Use PUT if schedule exists (has _id), POST if creating new
      let response
      if (schedule._id) {
        response = await axios.put(`${API.node.saveBusSchedule}/${schedule.bus_id}`, schedule)
      } else {
        response = await axios.post(API.node.saveBusSchedule, schedule)
      }

      const syncResult = await axios.put(API.node.syncPowerConfig, { bus_id: schedule.bus_id })

      toast.success(`Schedule saved and synced!\n\nESP32 will wake at ${syncResult.data.trip_start} and sleep at ${syncResult.data.trip_end}`)

      // Update local state instead of refetching
      if (response.data.schedule) {
        setSchedule(response.data.schedule)
      }
    } catch (error) {
      console.error('Error saving schedule:', error)
      toast.error('Failed to save schedule: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner size="xl" text="Loading schedule..." />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <header className="text-center">
        <h2 className="text-3xl font-bold text-slate-100 flex items-center justify-center gap-2">
          <span>📅</span>
          Bus Schedule Management
        </h2>
        <p className="text-slate-400 mt-2">Configure multiple trips per day for each bus</p>
      </header>

      <BusSelector
        selectedBus={selectedBus}
        onBusChange={handleBusChange}
        showAll={false}
        label="Managing Schedule for:"
      />

      <div className="rounded-2xl border border-purple-500/30 bg-slate-900/80 p-6 shadow-lg shadow-purple-500/10">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Bus ID</label>
            <input
              type="text"
              value={schedule.bus_id}
              disabled
              className="w-full px-4 py-3 bg-slate-800/30 border border-slate-700 text-slate-400 rounded-lg cursor-not-allowed"
            />
            <p className="text-xs text-slate-500 mt-1">ℹ️ Bus ID is set by the selector above. Cannot be changed here.</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 shadow-lg shadow-black/20 p-6">
        <h3 className="text-2xl font-bold text-slate-100 mb-6">
          🚌 Scheduled Trips ({schedule.trips?.length || 0})
        </h3>

        {schedule.trips && schedule.trips.length > 0 ? (
          <div className="space-y-3">
            {schedule.trips.map((trip, index) => (
              <div key={index} className="rounded-xl border border-purple-500/30 bg-slate-800/50 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-full text-sm font-bold">
                      #{index + 1}
                    </span>
                    <span className="text-lg font-semibold text-slate-100">{trip.trip_name}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="px-3 py-1.5 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-lg text-sm font-medium hover:bg-blue-500/30 transition-all"
                      onClick={() => handleEditTrip(index)}
                      disabled={editingIndex === index}
                    >
                      ✏️ Edit
                    </button>
                    <button
                      className="px-3 py-1.5 bg-red-500/20 text-red-300 border border-red-500/30 rounded-lg text-sm font-medium hover:bg-red-500/30 transition-all"
                      onClick={() => openRemoveConfirm(index)}
                    >
                      🗑️ Remove
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div>
                    <span className="text-slate-400">Route:</span>
                    <p className="font-medium text-slate-200">{trip.route || '-'}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Boarding:</span>
                    <p className="font-medium text-slate-200">{trip.boarding_start_time || trip.departure_time}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Departure:</span>
                    <p className="font-medium text-slate-200">{trip.departure_time}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Arrival:</span>
                    <p className="font-medium text-slate-200">{trip.estimated_arrival_time}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 rounded-xl border border-dashed border-purple-500/30 bg-slate-800/30">
            <div className="text-5xl mb-3">🚌</div>
            <p className="text-slate-400">No trips configured. Add your first trip below.</p>
          </div>
        )}
      </div>

      <div className="add-trip-section rounded-2xl border border-purple-500/30 bg-slate-900/80 p-6 shadow-lg shadow-purple-500/10">
        <h3 className="text-2xl font-bold text-slate-100 mb-4">
          {editingIndex !== null ? '✏️ Edit Trip' : '➕ Add New Trip'}
        </h3>

        {editingIndex !== null && (
          <div className="flex items-center justify-between mb-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
            <span className="text-blue-300 font-medium">Editing Trip #{editingIndex + 1}</span>
            <button
              className="px-3 py-1.5 bg-red-500/20 text-red-300 border border-red-500/30 rounded-lg text-sm font-medium hover:bg-red-500/30 transition-all"
              onClick={handleCancelEdit}
            >
              ❌ Cancel Edit
            </button>
          </div>
        )}

        <div className="mb-6 p-4 rounded-lg bg-purple-500/10 border border-purple-500/30">
          <p className="text-sm font-semibold text-purple-300 mb-2">ℹ️ Trip Name Auto-Generated</p>
          <p className="text-sm text-slate-300">Trip name will be automatically created from: <strong>Route Name + Departure Time</strong></p>
          <p className="text-sm text-slate-400 mt-1">Example: "Jaffna - Vavuniya Express - 07:00"</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Route *</label>
            <select
              value={newTrip.route_id}
              onChange={(e) => handleRouteChange(e.target.value)}
              className="w-full px-4 py-3 bg-slate-800/50 border border-purple-500/30 text-slate-100 rounded-lg focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all cursor-pointer"
            >
              <option value="" className="bg-slate-900 text-slate-100">
                {editingIndex !== null && !newTrip.route_id && newTrip.route
                  ? `${newTrip.route} (Please reselect)`
                  : 'Select Route'}
              </option>
              {/* Show current route if editing and it's not in the active list */}
              {editingIndex !== null && newTrip.route_id && !routes.find(r => r.route_id === newTrip.route_id && r.is_active !== false) && (
                <option value={newTrip.route_id} className="bg-slate-900 text-orange-400">
                  {newTrip.route} (Current - Inactive/Deleted)
                </option>
              )}
              {routes.filter(r => r.is_active !== false).map(route => {
                const stops = route.stops || []
                const origin = stops.length > 0 ? stops[0].stop_name : 'Start'
                const destination = stops.length > 0 ? stops[stops.length - 1].stop_name : 'End'
                return (
                  <option key={route.route_id} value={route.route_id} className="bg-slate-900 text-slate-100">
                    {route.route_name} ({origin} → {destination})
                  </option>
                )
              })}
            </select>
            {routes.length === 0 && (
              <p className="text-xs text-red-400 mt-1">⚠️ No routes available. Create routes first in Routes tab.</p>
            )}
            {editingIndex !== null && !newTrip.route_id && newTrip.route && (
              <p className="text-xs text-orange-400 mt-1">⚠️ This trip has route "{newTrip.route}" but no route_id. Please reselect the route to fix.</p>
            )}
            {editingIndex !== null && newTrip.route_id && !routes.find(r => r.route_id === newTrip.route_id) && (
              <p className="text-xs text-orange-400 mt-1">⚠️ Current route is inactive or deleted. Please select a new route.</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Boarding Start Time</label>
              <input
                type="time"
                value={newTrip.boarding_start_time}
                onChange={(e) => setNewTrip({ ...newTrip, boarding_start_time: e.target.value })}
                className="w-full px-4 py-3 bg-slate-800/50 border border-purple-500/30 text-slate-100 rounded-lg focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all [color-scheme:dark]"
                style={{ colorScheme: 'dark' }}
              />
              <p className="text-xs text-slate-500 mt-1">Optional - defaults to departure time</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Departure Time *</label>
              <input
                type="time"
                value={newTrip.departure_time}
                onChange={(e) => setNewTrip({ ...newTrip, departure_time: e.target.value })}
                className="w-full px-4 py-3 bg-slate-800/50 border border-purple-500/30 text-slate-100 rounded-lg focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all [color-scheme:dark]"
                style={{ colorScheme: 'dark' }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Arrival Time *</label>
              <input
                type="time"
                value={newTrip.estimated_arrival_time}
                onChange={(e) => setNewTrip({ ...newTrip, estimated_arrival_time: e.target.value })}
                className="w-full px-4 py-3 bg-slate-800/50 border border-purple-500/30 text-slate-100 rounded-lg focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all [color-scheme:dark]"
                style={{ colorScheme: 'dark' }}
              />
            </div>
          </div>

          <button
            className="w-full px-6 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-lg shadow-lg shadow-purple-500/50 hover:shadow-xl transition-all"
            onClick={handleAddTrip}
          >
            {editingIndex !== null ? '💾 Update Trip' : '➕ Add Trip to Schedule'}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6">
        <button
          className="w-full px-6 py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold rounded-lg shadow-lg shadow-emerald-500/30 hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleSaveSchedule}
          disabled={saving}
        >
          {saving ? '💾 Saving...' : '💾 Save Schedule & Sync ESP32'}
        </button>
        <p className="text-sm text-emerald-300 text-center mt-3">
          ℹ️ Saving will update the schedule and automatically sync ESP32 power config
        </p>
      </div>

      <div className="rounded-xl border border-purple-500/20 bg-slate-800/30 p-6 space-y-4">
        <div>
          <h4 className="text-lg font-bold text-slate-100 mb-2">💡 How it works:</h4>
          <ul className="space-y-2 text-sm text-slate-300">
            <li><strong className="text-purple-300">Auto Trip Names:</strong> Generated from route name + departure time</li>
            <li><strong className="text-purple-300">Multiple Trips:</strong> Add as many trips as needed per day</li>
            <li><strong className="text-purple-300">Same Route, Different Times:</strong> Same bus can run same route multiple times</li>
            <li><strong className="text-purple-300">ESP32 Power:</strong> Automatically calculated from first to last trip</li>
            <li><strong className="text-purple-300">Auto Sync:</strong> ESP32 boards sync every 30 seconds</li>
          </ul>
        </div>

        <div>
          <h4 className="text-lg font-bold text-slate-100 mb-2">📋 Example Schedule:</h4>
          <ul className="space-y-1 text-sm text-slate-300">
            <li>07:00 - Jaffna → Vavuniya (Trip: "Jaffna - Vavuniya Express - 07:00")</li>
            <li>15:00 - Vavuniya → Jaffna (Trip: "Vavuniya - Jaffna Express - 15:00")</li>
            <li>21:00 - Jaffna → Vavuniya (Trip: "Jaffna - Vavuniya Express - 21:00")</li>
          </ul>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, tripIndex: null, tripName: '' })}
        onConfirm={handleRemoveTrip}
        title="Remove Trip"
        itemName={`Remove ${deleteModal.tripName}?`}
        warningMessage="This will save immediately."
        noteMessage="The trip will be removed from the schedule and ESP32 power config will be synced."
        confirmButtonText="Remove"
        isDeleting={deleting}
      />
    </div>
  )
}

export default SchedulePage
