import { useState, useEffect } from 'react'
import axios from '../utils/axios'
import { API } from '../config/api'
import { toast } from 'react-hot-toast'
import LoadingSpinner from '../components/LoadingSpinner'
import DeleteConfirmModal from '../components/DeleteConfirmModal'

function RoutesPage() {
  const [routes, setRoutes] = useState([])
  const [waypointGroups, setWaypointGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingRoute, setEditingRoute] = useState(null)
  const [useWaypointGroups, setUseWaypointGroups] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteModal, setDeleteModal] = useState({ open: false, routeId: null, routeName: '' })
  const [formData, setFormData] = useState({
    route_name: '',
    description: '',
    estimated_duration_hours: 0
  })
  const [selectedBuses, setSelectedBuses] = useState([])
  const [availableBuses, setAvailableBuses] = useState([])
  const [busModalOpen, setBusModalOpen] = useState(false)
  const [busSearchQuery, setBusSearchQuery] = useState('')
  const [selectedGroups, setSelectedGroups] = useState([])
  const [stops, setStops] = useState([
    { stop_name: '', latitude: '', longitude: '', stop_order: 1, distance_from_start_km: 0 }
  ])

  useEffect(() => {
    fetchRoutes()
    fetchWaypointGroups()
    fetchAvailableBuses()
  }, [])

  const fetchAvailableBuses = async () => {
    try {
      const response = await axios.get(API.node.buses)
      const busIds = Object.keys(response.data || {})
      console.log('Available buses:', busIds)
      setAvailableBuses(busIds)
    } catch (error) {
      console.error('Error fetching buses:', error)
      toast.error('Failed to load buses')
      setAvailableBuses([])
    }
  }

  const fetchWaypointGroups = async () => {
    try {
      const response = await axios.get('/api/waypoint-groups?active_only=true')
      console.log('Waypoint groups response:', response.data)
      setWaypointGroups(response.data.groups || response.data || [])
    } catch (error) {
      console.error('Error fetching waypoint groups:', error)
      toast.error('Failed to load waypoint groups')
    }
  }

  const fetchRoutes = async () => {
    try {
      setLoading(true)
      const response = await axios.get('/api/bus-routes')
      setRoutes(response.data.routes || [])
    } catch (error) {
      console.error('Error fetching routes:', error)
      toast.error('Failed to fetch routes')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleStopChange = (index, field, value) => {
    const newStops = [...stops]
    newStops[index][field] = value
    setStops(newStops)
  }

  const addStop = () => {
    setStops([
      ...stops,
      { stop_name: '', latitude: '', longitude: '', stop_order: stops.length + 1, distance_from_start_km: 0 }
    ])
  }

  const removeStop = (index) => {
    if (stops.length <= 2) {
      toast.error('Route must have at least 2 stops')
      return
    }
    const newStops = stops.filter((_, i) => i !== index)
    newStops.forEach((stop, i) => {
      stop.stop_order = i + 1
    })
    setStops(newStops)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (useWaypointGroups) {
      if (selectedGroups.length === 0) {
        toast.error('Please select at least one waypoint group')
        return
      }
    } else {
      if (stops.length < 2) {
        toast.error('Route must have at least 2 stops')
        return
      }
      for (let stop of stops) {
        if (!stop.stop_name || !stop.latitude || !stop.longitude) {
          toast.error('All stops must have name, latitude, and longitude')
          return
        }
      }
    }

    setSaving(true)

    try {
      const payload = {
        ...formData,
        estimated_duration_hours: parseFloat(formData.estimated_duration_hours) || 0,
        assigned_buses: selectedBuses
      }

      if (useWaypointGroups) {
        payload.waypoint_groups = selectedGroups.map((groupId, index) => ({
          group_id: groupId,
          order: index + 1
        }))
      } else {
        payload.stops = stops.map(stop => ({
          ...stop,
          latitude: parseFloat(stop.latitude),
          longitude: parseFloat(stop.longitude),
          distance_from_start_km: parseFloat(stop.distance_from_start_km) || 0
        }))
      }

      if (editingRoute) {
        const response = await axios.put(`/api/bus-routes/${editingRoute.route_id}`, payload)
        toast.success('Route updated successfully!')

        // Update local state instead of refetching
        setRoutes(prev => prev.map(route =>
          route.route_id === editingRoute.route_id ? { ...route, ...response.data.route } : route
        ))
      } else {
        const response = await axios.post('/api/bus-routes', payload)
        toast.success('Route created successfully!')

        // Add to local state instead of refetching
        setRoutes(prev => [...prev, response.data.route])
      }

      resetForm()
      setShowAddForm(false)
    } catch (error) {
      console.error('Error saving route:', error)
      toast.error(error.response?.data?.message || 'Failed to save route')
    } finally {
      setSaving(false)
    }
  }

  const resetForm = () => {
    setFormData({
      route_name: '',
      description: '',
      estimated_duration_hours: 0
    })
    setSelectedBuses([])
    setStops([{ stop_name: '', latitude: '', longitude: '', stop_order: 1, distance_from_start_km: 0 }])
    setSelectedGroups([])
    setEditingRoute(null)
    setUseWaypointGroups(true)
  }

  const toggleBusSelection = (busId) => {
    if (selectedBuses.includes(busId)) {
      setSelectedBuses(selectedBuses.filter(id => id !== busId))
    } else {
      setSelectedBuses([...selectedBuses, busId])
    }
  }

  const filteredBuses = availableBuses.filter(bus =>
    bus.toLowerCase().includes(busSearchQuery.toLowerCase())
  )

  const toggleGroupSelection = (groupId) => {
    if (selectedGroups.includes(groupId)) {
      setSelectedGroups(selectedGroups.filter(id => id !== groupId))
    } else {
      setSelectedGroups([...selectedGroups, groupId])
    }
  }

  const editRoute = (route) => {
    setEditingRoute(route)
    setFormData({
      route_name: route.route_name,
      description: route.description || '',
      estimated_duration_hours: route.estimated_duration_hours || 0
    })
    setSelectedBuses(route.assigned_buses || [])

    if (route.waypoint_groups && route.waypoint_groups.length > 0) {
      setUseWaypointGroups(true)
      setSelectedGroups(route.waypoint_groups.map(wg => wg.group_id))
    } else {
      setUseWaypointGroups(false)
      setStops(route.stops || [])
    }

    setShowAddForm(true)
  }

  const openDeleteConfirm = (route_id, route_name) => {
    setDeleteModal({ open: true, routeId: route_id, routeName: route_name })
  }

  const handleDeleteConfirm = async () => {
    const { routeId } = deleteModal
    if (!routeId) return

    setDeleting(true)
    try {
      await axios.delete(`/api/bus-routes/${routeId}`)
      toast.success('Route deleted successfully!')

      // Update local state instead of refetching
      setRoutes(prev => prev.map(route =>
        route.route_id === routeId ? { ...route, is_active: false } : route
      ))
      setDeleteModal({ open: false, routeId: null, routeName: '' })
    } catch (error) {
      console.error('Error deleting route:', error)
      toast.error('Failed to delete route')
    } finally {
      setDeleting(false)
    }
  }

  const reactivateRoute = async (route_id) => {
    try {
      await axios.put(`/api/bus-routes/${route_id}`, { is_active: true })
      toast.success('Route reactivated successfully!')

      // Update local state instead of refetching
      setRoutes(prev => prev.map(route =>
        route.route_id === route_id ? { ...route, is_active: true } : route
      ))
    } catch (error) {
      console.error('Error reactivating route:', error)
      toast.error('Failed to reactivate route')
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner size="xl" text="Loading routes..." />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-2">
            <span>🗺️</span>
            Bus Route Management
          </h1>
          <p className="text-slate-400 mt-1">Routes ({routes.length})</p>
        </div>
        <button
          onClick={() => {
            resetForm()
            setShowAddForm(!showAddForm)
          }}
          className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg shadow-lg font-semibold transition-all"
        >
          {showAddForm ? '✕ Cancel' : '➕ Add New Route'}
        </button>
      </div>

      {/* Bus Selection Modal */}
      {busModalOpen && (
        <div className="fixed inset-0 flex items-start justify-center p-4 pt-20 overflow-y-auto" style={{ zIndex: 9999 }}>
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setBusModalOpen(false)}
          />

          <div className="relative w-full max-w-md bg-slate-900 border border-purple-500/30 rounded-2xl shadow-2xl shadow-purple-500/20" style={{ zIndex: 10000 }}>
            <div className="sticky top-0 bg-slate-900/95 backdrop-blur-sm border-b border-purple-500/20 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <span className="text-2xl">🚌</span>
                Select Buses
              </h3>
              <button
                onClick={() => setBusModalOpen(false)}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Search */}
              <div className="relative">
                <input
                  type="text"
                  value={busSearchQuery}
                  onChange={(e) => setBusSearchQuery(e.target.value)}
                  placeholder="Search buses..."
                  className="w-full px-4 py-3 pl-10 bg-slate-800/50 border border-purple-500/30 text-slate-100 rounded-lg focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                />
                <svg className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>

              {/* Bus List */}
              <div className="max-h-96 overflow-y-auto space-y-2">
                {filteredBuses.length === 0 ? (
                  <p className="text-center text-slate-400 py-8">No buses found</p>
                ) : (
                  filteredBuses.map(bus => (
                    <label
                      key={bus}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${selectedBuses.includes(bus)
                        ? 'bg-purple-500/20 border border-purple-500/50'
                        : 'bg-slate-800/30 border border-purple-500/20 hover:border-purple-500/40'
                        }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedBuses.includes(bus)}
                        onChange={() => toggleBusSelection(bus)}
                        className="w-5 h-5 rounded border-purple-500/30"
                      />
                      <span className="flex-1 text-slate-100 font-medium">{bus}</span>
                      {selectedBuses.includes(bus) && (
                        <span className="text-purple-400">✓</span>
                      )}
                    </label>
                  ))
                )}
              </div>

              {/* Selected Count */}
              <div className="pt-4 border-t border-purple-500/20">
                <p className="text-sm text-slate-400">
                  Selected: <span className="text-purple-400 font-semibold">{selectedBuses.length}</span> bus(es)
                </p>
              </div>
            </div>

            <div className="sticky bottom-0 bg-slate-900/95 backdrop-blur-sm border-t border-purple-500/20 px-6 py-4">
              <button
                onClick={() => setBusModalOpen(false)}
                className="w-full px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg shadow-lg shadow-purple-500/50 hover:shadow-xl transition-all font-semibold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="rounded-2xl border border-purple-500/20 bg-slate-800/30 backdrop-blur-sm p-6 shadow-lg">
          <h2 className="text-2xl font-bold text-slate-100 mb-6">
            {editingRoute ? '✏️ Edit Route' : '➕ Add New Route'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Route Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-200">Route Information</h3>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Route Name *</label>
                <input
                  type="text"
                  name="route_name"
                  value={formData.route_name}
                  onChange={handleInputChange}
                  placeholder="e.g., Jaffna-Colombo"
                  required
                  className="w-full px-4 py-3 bg-slate-800/50 border border-purple-500/30 text-slate-100 rounded-lg focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Route description..."
                  rows="2"
                  className="w-full px-4 py-3 bg-slate-800/50 border border-purple-500/30 text-slate-100 rounded-lg focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Duration (hours)</label>
                  <input
                    type="number"
                    name="estimated_duration_hours"
                    value={formData.estimated_duration_hours}
                    onChange={handleInputChange}
                    step="0.5"
                    min="0"
                    className="w-full px-4 py-3 bg-slate-800/50 border border-purple-500/30 text-slate-100 rounded-lg focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Assigned Buses</label>
                  <button
                    type="button"
                    onClick={() => setBusModalOpen(true)}
                    className="w-full px-4 py-3 bg-slate-800/50 border border-purple-500/30 text-slate-100 rounded-lg hover:border-purple-500 transition-all text-left flex items-center justify-between"
                  >
                    <span className={selectedBuses.length === 0 ? 'text-slate-500' : ''}>
                      {selectedBuses.length === 0 ? 'Select buses...' : `${selectedBuses.length} bus(es) selected`}
                    </span>
                    <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {selectedBuses.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {selectedBuses.map(bus => (
                        <span key={bus} className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded text-xs flex items-center gap-1">
                          {bus}
                          <button
                            type="button"
                            onClick={() => toggleBusSelection(bus)}
                            className="hover:text-red-400"
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Method Selector */}
            <div className="flex gap-4 p-4 bg-slate-900/50 rounded-lg border border-purple-500/20">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={useWaypointGroups}
                  onChange={() => setUseWaypointGroups(true)}
                  className="w-4 h-4"
                />
                <span className="text-slate-200">Use Waypoint Groups (Recommended)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={!useWaypointGroups}
                  onChange={() => setUseWaypointGroups(false)}
                  className="w-4 h-4"
                />
                <span className="text-slate-200">Manual Stops</span>
              </label>
            </div>

            {/* Waypoint Groups or Manual Stops */}
            {useWaypointGroups ? (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-200">Select Waypoint Groups</h3>
                <p className="text-sm text-slate-400">Select groups in order from start to end</p>

                {waypointGroups.length === 0 ? (
                  <div className="p-6 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-center">
                    <p className="text-yellow-300">⚠️ No waypoint groups available.</p>
                    <p className="text-sm text-slate-400 mt-2">Please create waypoint groups first.</p>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {waypointGroups.map(group => (
                      <div
                        key={group.group_id}
                        onClick={() => toggleGroupSelection(group.group_id)}
                        className={`p-4 rounded-lg border cursor-pointer transition-all ${selectedGroups.includes(group.group_id)
                          ? 'bg-emerald-500/20 border-emerald-500/50'
                          : 'bg-slate-900/50 border-purple-500/20 hover:border-purple-500/40'
                          }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={selectedGroups.includes(group.group_id)}
                              onChange={() => { }}
                              className="w-4 h-4"
                            />
                            <strong className="text-slate-100">{group.group_name}</strong>
                            <span className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded text-xs">
                              {group.waypoints?.length || 0} stops
                            </span>
                          </div>
                          {selectedGroups.includes(group.group_id) && (
                            <span className="px-3 py-1 bg-emerald-500/30 text-emerald-300 rounded-full text-sm font-semibold">
                              Order: {selectedGroups.indexOf(group.group_id) + 1}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2 text-sm text-slate-400">
                          {group.waypoints?.slice(0, 3).map((wp, idx) => (
                            <span key={idx}>{wp.name}</span>
                          ))}
                          {group.waypoints?.length > 3 && (
                            <span>+{group.waypoints.length - 3} more</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {selectedGroups.length > 0 && (
                  <div className="p-4 bg-slate-900/50 rounded-lg border border-purple-500/20">
                    <h4 className="text-sm font-semibold text-slate-300 mb-2">Selected Route Preview:</h4>
                    <div className="flex flex-wrap items-center gap-2">
                      {selectedGroups.map((groupId, idx) => {
                        const group = waypointGroups.find(g => g.group_id === groupId)
                        return (
                          <div key={groupId} className="flex items-center gap-2">
                            <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-lg text-sm font-medium">
                              {group?.group_name}
                            </span>
                            {idx < selectedGroups.length - 1 && (
                              <span className="text-slate-600">→</span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-200">Route Stops ({stops.length})</h3>
                  <button
                    type="button"
                    onClick={addStop}
                    className="px-4 py-2 bg-blue-500/20 text-blue-300 rounded-lg hover:bg-blue-500/30 transition-all text-sm font-medium"
                  >
                    ➕ Add Stop
                  </button>
                </div>

                <div className="space-y-3">
                  {stops.map((stop, index) => (
                    <div key={index} className="flex items-start gap-3 p-4 bg-slate-900/50 rounded-lg border border-purple-500/20">
                      <div className="flex-shrink-0 w-8 h-8 bg-purple-500/20 text-purple-300 rounded-full flex items-center justify-center font-bold">
                        {index + 1}
                      </div>
                      <div className="flex-1 grid grid-cols-2 gap-3">
                        <input
                          type="text"
                          placeholder="Stop Name *"
                          value={stop.stop_name}
                          onChange={(e) => handleStopChange(index, 'stop_name', e.target.value)}
                          required
                          className="col-span-2 px-3 py-2 bg-slate-800/50 border border-purple-500/30 text-slate-100 rounded-lg text-sm"
                        />
                        <input
                          type="number"
                          placeholder="Latitude *"
                          value={stop.latitude}
                          onChange={(e) => handleStopChange(index, 'latitude', e.target.value)}
                          step="0.000001"
                          required
                          className="px-3 py-2 bg-slate-800/50 border border-purple-500/30 text-slate-100 rounded-lg text-sm"
                        />
                        <input
                          type="number"
                          placeholder="Longitude *"
                          value={stop.longitude}
                          onChange={(e) => handleStopChange(index, 'longitude', e.target.value)}
                          step="0.000001"
                          required
                          className="px-3 py-2 bg-slate-800/50 border border-purple-500/30 text-slate-100 rounded-lg text-sm"
                        />
                        <input
                          type="number"
                          placeholder="Distance (km)"
                          value={stop.distance_from_start_km}
                          onChange={(e) => handleStopChange(index, 'distance_from_start_km', e.target.value)}
                          step="0.1"
                          min="0"
                          className="col-span-2 px-3 py-2 bg-slate-800/50 border border-purple-500/30 text-slate-100 rounded-lg text-sm"
                        />
                      </div>
                      {stops.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeStop(index)}
                          className="flex-shrink-0 p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-all"
                          title="Remove stop"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <p className="text-sm text-slate-400">
                  💡 Tip: Add stops in order from start to end. Distance is cumulative from the first stop.
                </p>
              </div>
            )}

            {/* Form Actions */}
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg shadow-lg shadow-purple-500/50 hover:shadow-xl transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {editingRoute ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  <>💾 {editingRoute ? 'Update Route' : 'Create Route'}</>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  resetForm()
                  setShowAddForm(false)
                }}
                className="px-6 py-3 bg-slate-800/50 border border-purple-500/30 text-slate-300 rounded-lg hover:bg-slate-700/50 transition-all font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Routes Grid */}
      {routes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-purple-500/30 bg-slate-800/30 p-12 text-center">
          <div className="text-6xl mb-4">🗺️</div>
          <p className="text-lg font-medium text-slate-200">No routes found</p>
          <p className="text-sm text-slate-400 mt-2">Add your first route to get started</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {routes.map((route) => (
            <div
              key={route.route_id}
              className={`rounded-2xl border p-6 shadow-lg hover:shadow-xl transition-all ${route.is_active
                ? 'border-purple-500/20 bg-slate-800/30'
                : 'border-slate-700/50 bg-slate-900/20 opacity-60'
                }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-xl font-bold text-slate-100 flex-1 pr-2 break-words">{route.route_name}</h3>
                <span
                  className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-semibold ${route.is_active
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-slate-700/50 text-slate-400 border border-slate-600'
                    }`}
                >
                  {route.is_active ? '✓ ACTIVE' : '⏸ INACTIVE'}
                </span>
              </div>

              {route.description && (
                <p className="text-sm text-slate-400 mb-4">{route.description}</p>
              )}

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Stops:</p>
                  <p className="text-lg font-bold text-slate-100">{route.stops?.length || 0}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Distance:</p>
                  <p className="text-lg font-bold text-slate-100">{route.total_distance_km || 0} km</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Duration:</p>
                  <p className="text-lg font-bold text-slate-100">{route.estimated_duration_hours || 0} hrs</p>
                </div>
              </div>

              {/* Waypoint Groups */}
              {route.waypoint_groups && route.waypoint_groups.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-semibold text-slate-400 mb-2">Waypoint Groups:</p>
                  <div className="flex flex-wrap items-center gap-2">
                    {route.waypoint_groups.map((wg, idx) => {
                      const group = waypointGroups.find(g => g.group_id === wg.group_id)
                      return (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-xs font-medium border border-emerald-500/30">
                            {group?.group_name || wg.group_id}
                          </span>
                          {idx < route.waypoint_groups.length - 1 && (
                            <span className="text-slate-600">→</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Stops */}
              {route.stops && route.stops.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-semibold text-slate-400 mb-2">All Stops ({route.stops.length}):</p>
                  <div className="flex flex-wrap items-center gap-2">
                    {route.stops.slice(0, 5).map((stop, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="text-xs text-blue-400">
                          {typeof stop === 'string' ? stop : stop.stop_name || stop.name || 'Stop'}
                        </span>
                        {idx < Math.min(4, route.stops.length - 1) && (
                          <span className="text-slate-600">→</span>
                        )}
                      </div>
                    ))}
                    {route.stops.length > 5 && (
                      <span className="text-xs text-slate-500">+{route.stops.length - 5} more</span>
                    )}
                  </div>
                </div>
              )}

              {/* Assigned Buses */}
              {route.assigned_buses && route.assigned_buses.length > 0 && (
                <div className="mb-4 text-sm text-slate-400">
                  <strong className="text-slate-300">Buses:</strong> {route.assigned_buses.join(', ')}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t border-purple-500/20">
                <button
                  onClick={() => editRoute(route)}
                  className="flex-1 px-4 py-2 bg-blue-500/20 text-blue-300 rounded-lg hover:bg-blue-500/30 transition-all font-medium text-sm border border-blue-500/30"
                >
                  ✏️ Edit
                </button>
                {route.is_active ? (
                  <button
                    onClick={() => openDeleteConfirm(route.route_id, route.route_name)}
                    className="flex-1 px-4 py-2 bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 transition-all font-medium text-sm border border-red-500/30"
                  >
                    🗑️ Delete
                  </button>
                ) : (
                  <button
                    onClick={() => reactivateRoute(route.route_id)}
                    className="flex-1 px-4 py-2 bg-emerald-500/20 text-emerald-300 rounded-lg hover:bg-emerald-500/30 transition-all font-medium text-sm border border-emerald-500/30"
                  >
                    ▶️ Reactivate
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, routeId: null, routeName: '' })}
        onConfirm={handleDeleteConfirm}
        title="Delete Route"
        itemName={`Delete "${deleteModal.routeName}"?`}
        warningMessage="This will mark the route as inactive."
        noteMessage="Bus schedules using this route will still function but may need to be updated."
        confirmButtonText="Delete"
        isDeleting={deleting}
      />
    </div>
  )
}

export default RoutesPage

