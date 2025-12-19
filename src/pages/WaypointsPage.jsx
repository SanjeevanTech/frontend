import { useState, useEffect } from 'react'
import axios from '../utils/axios'
import { toast } from 'react-hot-toast'
import { API } from '../config/api'
import LoadingSpinner from '../components/LoadingSpinner'
import DeleteConfirmModal from '../components/DeleteConfirmModal'

const API_BASE = API.node.busRoutes.replace('/bus-routes', '')

function WaypointsPage() {
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingGroup, setEditingGroup] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteModal, setDeleteModal] = useState({ open: false, groupId: null, groupName: '' })

  const [formData, setFormData] = useState({
    group_name: ''
  })

  const [waypoints, setWaypoints] = useState([
    { name: '', latitude: '', longitude: '', order: 1 }
  ])

  useEffect(() => {
    fetchGroups()
  }, [])

  const fetchGroups = async () => {
    try {
      setLoading(true)
      const response = await axios.get(`${API_BASE}/waypoint-groups`)
      setGroups(response.data.groups || [])
    } catch (error) {
      console.error('Error fetching waypoint groups:', error)
      toast.error('Failed to fetch waypoint groups')
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

  const handleWaypointChange = (index, field, value) => {
    const newWaypoints = [...waypoints]
    newWaypoints[index][field] = value
    setWaypoints(newWaypoints)
  }

  const addWaypoint = () => {
    setWaypoints([
      ...waypoints,
      { name: '', latitude: '', longitude: '', order: waypoints.length + 1 }
    ])
  }

  const removeWaypoint = (index) => {
    if (waypoints.length <= 2) {
      toast.error('Waypoint group must have at least 2 waypoints')
      return
    }
    const newWaypoints = waypoints.filter((_, i) => i !== index)
    newWaypoints.forEach((wp, i) => {
      wp.order = i + 1
    })
    setWaypoints(newWaypoints)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (waypoints.length < 2) {
      toast.error('Waypoint group must have at least 2 waypoints')
      return
    }

    for (let wp of waypoints) {
      if (!wp.name || !wp.latitude || !wp.longitude) {
        toast.error('All waypoints must have name, latitude, and longitude')
        return
      }
    }

    setSaving(true)

    try {
      const payload = {
        ...formData,
        waypoints: waypoints.map(wp => ({
          ...wp,
          latitude: parseFloat(wp.latitude),
          longitude: parseFloat(wp.longitude)
        }))
      }

      if (editingGroup) {
        const response = await axios.put(`${API_BASE}/waypoint-groups/${editingGroup.group_id}`, payload)
        toast.success('Waypoint group updated successfully!')

        // Update local state instead of refetching
        setGroups(prev => prev.map(group =>
          group.group_id === editingGroup.group_id ? { ...group, ...response.data.group } : group
        ))
      } else {
        const response = await axios.post(`${API_BASE}/waypoint-groups`, payload)
        toast.success('Waypoint group created successfully!')

        // Add to local state instead of refetching
        setGroups(prev => [...prev, response.data.group])
      }

      resetForm()
      setShowAddForm(false)
    } catch (error) {
      console.error('Error saving waypoint group:', error)
      toast.error(error.response?.data?.message || 'Failed to save waypoint group')
    } finally {
      setSaving(false)
    }
  }

  const resetForm = () => {
    setFormData({
      group_name: ''
    })
    setWaypoints([
      { name: '', latitude: '', longitude: '', order: 1 }
    ])
    setEditingGroup(null)
  }

  const editGroup = (group) => {
    setEditingGroup(group)
    setFormData({
      group_name: group.group_name
    })
    setWaypoints(group.waypoints || [])
    setShowAddForm(true)
    setTimeout(() => {
      document.querySelector('.form-container')?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }

  const openDeleteConfirm = (group_id) => {
    const group = groups.find(g => g.group_id === group_id)
    const groupName = group?.group_name || 'this waypoint group'
    setDeleteModal({ open: true, groupId: group_id, groupName })
  }

  const handleDeleteConfirm = async () => {
    const { groupId } = deleteModal
    if (!groupId) return

    setDeleting(true)
    try {
      await axios.delete(`${API_BASE}/waypoint-groups/${groupId}`)
      toast.success('Waypoint group deleted successfully!')

      // Update local state instead of refetching
      setGroups(prev => prev.map(group =>
        group.group_id === groupId ? { ...group, is_active: false } : group
      ))
      setDeleteModal({ open: false, groupId: null, groupName: '' })
    } catch (error) {
      console.error('Error deleting waypoint group:', error)
      toast.error('Failed to delete waypoint group')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <LoadingSpinner size="xl" text="Loading waypoint groups..." />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <header className="text-left sm:text-center px-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 flex items-center justify-center sm:justify-center gap-2">
          <span>📍</span>
          Waypoint Groups
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1 sm:mt-2">Reusable waypoint sequences for routes</p>
        <button
          onClick={() => {
            resetForm()
            setShowAddForm(!showAddForm)
          }}
          className="w-full sm:w-auto mt-6 px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-xl shadow-lg shadow-purple-500/50 hover:shadow-xl transition-all"
        >
          {showAddForm ? '✕ Cancel' : '➕ Add Group'}
        </button>
      </header>

      {showAddForm && (
        <div className="form-container rounded-2xl border border-purple-500/30 bg-slate-900/80 p-6 shadow-lg shadow-purple-500/10">
          <h2 className="text-2xl font-bold text-slate-100 mb-6">
            {editingGroup ? '✏️ Edit Waypoint Group' : '➕ Add New Waypoint Group'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="rounded-xl border border-purple-500/20 bg-slate-800/30 p-4">
              <h3 className="font-bold text-slate-200 mb-4">Group Information</h3>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Group Name *</label>
                <input
                  type="text"
                  name="group_name"
                  value={formData.group_name}
                  onChange={handleInputChange}
                  placeholder="e.g., Jaffna North, Central Colombo"
                  required
                  className="w-full px-4 py-3 bg-slate-800/50 border border-purple-500/30 text-slate-100 rounded-lg focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all placeholder:text-slate-500"
                />
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-200">Waypoints ({waypoints.length})</h3>
                <button
                  type="button"
                  onClick={addWaypoint}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-sm font-semibold rounded-lg shadow-lg shadow-emerald-500/30 hover:shadow-xl transition-all whitespace-nowrap"
                >
                  ➕ Add
                </button>
              </div>

              <div className="space-y-3">
                {waypoints.map((wp, index) => (
                  <div key={index} className="flex items-start gap-2 p-3 bg-slate-800/50 rounded-lg border border-purple-500/20">
                    <div className="flex-shrink-0 w-8 h-8 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-full flex items-center justify-center font-bold text-sm">
                      {index + 1}
                    </div>

                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2">
                      <input
                        type="text"
                        placeholder="Waypoint Name *"
                        value={wp.name}
                        onChange={(e) => handleWaypointChange(index, 'name', e.target.value)}
                        required
                        className="px-3 py-2 bg-slate-800/50 border border-purple-500/30 text-slate-100 rounded-lg text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all placeholder:text-slate-500"
                      />

                      <input
                        type="number"
                        placeholder="Latitude *"
                        value={wp.latitude}
                        onChange={(e) => handleWaypointChange(index, 'latitude', e.target.value)}
                        step="0.000001"
                        required
                        className="px-3 py-2 bg-slate-800/50 border border-purple-500/30 text-slate-100 rounded-lg text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all placeholder:text-slate-500"
                      />

                      <input
                        type="number"
                        placeholder="Longitude *"
                        value={wp.longitude}
                        onChange={(e) => handleWaypointChange(index, 'longitude', e.target.value)}
                        step="0.000001"
                        required
                        className="px-3 py-2 bg-slate-800/50 border border-purple-500/30 text-slate-100 rounded-lg text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all placeholder:text-slate-500"
                      />
                    </div>

                    {waypoints.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeWaypoint(index)}
                        className="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg shadow-lg shadow-red-500/30 hover:shadow-xl transition-all flex items-center justify-center"
                        title="Remove waypoint"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-lg border border-blue-500/30 bg-blue-500/10 p-3">
                <p className="text-sm text-blue-300 flex items-center gap-2">
                  <span>💡</span>
                  Tip: Add waypoints in order. These can be reused in multiple bus routes.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 px-6 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-lg shadow-lg shadow-purple-500/50 hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {editingGroup ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  <>💾 {editingGroup ? 'Update' : 'Create'}</>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  resetForm()
                  setShowAddForm(false)
                }}
                className="px-6 py-4 bg-slate-800/50 border border-purple-500/30 text-slate-300 font-medium rounded-lg hover:bg-slate-700/50 transition-all"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 shadow-lg shadow-black/20 p-6">
        <h2 className="text-2xl font-bold text-slate-100 mb-6">
          Waypoint Groups ({groups.length})
        </h2>

        {groups.length === 0 ? (
          <div className="text-center py-12 rounded-xl border border-dashed border-purple-500/30 bg-slate-800/30">
            <div className="text-5xl mb-3">📍</div>
            <p className="text-slate-400">No waypoint groups found. Create your first group!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groups.map(group => (
              <div
                key={group.group_id}
                className={`rounded-xl border p-4 transition-all hover:shadow-lg hover:shadow-purple-500/10 ${!group.is_active
                  ? 'opacity-50 border-slate-700 bg-slate-800/30'
                  : 'border-purple-500/30 bg-slate-800/50'
                  }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-bold text-slate-100 text-lg break-words flex-1 min-w-0">
                    {group.group_name}
                  </h3>
                  <span className="flex-shrink-0 ml-2 px-3 py-1 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-full text-xs font-semibold whitespace-nowrap">
                    📍 {group.waypoints?.length || 0}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 mb-5 min-h-[40px]">
                  {group.waypoints?.map((wp, idx) => (
                    <div key={idx} className="flex items-center">
                      <span className="px-2 py-0.5 bg-slate-900/40 text-[11px] text-slate-300 rounded border border-slate-700/50">
                        {wp.name}
                      </span>
                      {idx < group.waypoints.length - 1 && (
                        <span className="mx-0.5 text-purple-500/50 text-xs">→</span>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => editGroup(group)}
                    className="flex-1 px-3 py-2 text-sm bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-lg font-medium hover:bg-blue-500/30 transition-all"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => openDeleteConfirm(group.group_id)}
                    className="flex-1 px-3 py-2 text-sm bg-red-500/20 text-red-300 border border-red-500/30 rounded-lg font-medium hover:bg-red-500/30 transition-all"
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, groupId: null, groupName: '' })}
        onConfirm={handleDeleteConfirm}
        title="Delete Waypoint Group"
        itemName={`Delete "${deleteModal.groupName}"?`}
        warningMessage="This will mark the waypoint group as inactive."
        noteMessage="Routes using this waypoint group will not be affected."
        confirmButtonText="Delete"
        isDeleting={deleting}
      />
    </div>
  )
}

export default WaypointsPage

