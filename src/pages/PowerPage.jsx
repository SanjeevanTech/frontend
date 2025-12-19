import { useState, useEffect } from 'react'
import axios from '../utils/axios'
import { API } from '../config/api'
import LoadingSpinner from '../components/LoadingSpinner'
import DeleteConfirmModal from '../components/DeleteConfirmModal'
import { toast } from 'react-hot-toast'

function PowerPage() {
  const [busConfigs, setBusConfigs] = useState({})
  const [formValues, setFormValues] = useState({})
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [addBusModalOpen, setAddBusModalOpen] = useState(false)
  const [deleteConfirmModal, setDeleteConfirmModal] = useState({ open: false, busId: null, boardCount: 0 })
  const [newBusData, setNewBusData] = useState({
    bus_id: ''
  })
  const [savingBusId, setSavingBusId] = useState(null)
  const [deletingBusId, setDeletingBusId] = useState(null)
  const [addingBus, setAddingBus] = useState(false)

  // Helper function to check if form has unsaved changes
  const hasUnsavedChanges = (busId) => {
    const form = formValues[busId]
    const config = busConfigs[busId]
    if (!form || !config) return false

    return (
      form.bus_name !== (config.bus_name || busId) ||
      form.deep_sleep_enabled !== (config.deep_sleep_enabled !== false) ||
      form.maintenance_interval !== (config.maintenance_interval ?? 5) ||
      form.maintenance_duration !== (config.maintenance_duration ?? 3)
    )
  }

  useEffect(() => {
    loadBuses()
    // Increased to 30 seconds to reduce duplicate requests
    const interval = setInterval(loadBuses, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadBuses = async () => {
    try {
      const response = await axios.get(API.node.buses)
      const data = response.data
      setBusConfigs(data)

      // Only update formValues if they don't exist yet (preserve user input during auto-refresh)
      setFormValues(prev => {
        const newFormValues = {}
        Object.entries(data).forEach(([busId, config]) => {
          // If user already has form values for this bus, keep them (don't overwrite unsaved changes)
          if (prev[busId]) {
            newFormValues[busId] = prev[busId]
          } else {
            // New bus, initialize form values
            newFormValues[busId] = {
              bus_name: config.bus_name || busId,
              deep_sleep_enabled: config.deep_sleep_enabled !== false,
              maintenance_interval: config.maintenance_interval ?? 5,
              maintenance_duration: config.maintenance_duration ?? 3
            }
          }
        })
        return newFormValues
      })

      setLastUpdate(new Date())
    } catch (error) {
      console.error('Error loading buses:', error)
      toast.error('Unable to load bus configurations')
    } finally {
      setLoading(false)
    }
  }

  const handleFormChange = (busId, field, value) => {
    setFormValues(prev => ({
      ...prev,
      [busId]: {
        ...prev[busId],
        [field]: value
      }
    }))
  }

  const updateBusConfig = async (busId) => {
    const config = formValues[busId]
    if (!config) return

    setSavingBusId(busId)

    try {
      const response = await axios.post(API.node.powerConfig, {
        bus_id: busId,
        ...config
      })

      // Update local state instead of refetching all buses
      const configData = response.data.config || response.data
      setBusConfigs(prev => ({
        ...prev,
        [busId]: {
          ...prev[busId],
          bus_name: config.bus_name,
          deep_sleep_enabled: config.deep_sleep_enabled,
          maintenance_interval: config.maintenance_interval,
          maintenance_duration: config.maintenance_duration,
          last_updated: new Date().toISOString()
        }
      }))

      // Update form values to match saved config (so auto-refresh doesn't overwrite)
      setFormValues(prev => ({
        ...prev,
        [busId]: {
          ...config
        }
      }))

      const boards = busConfigs[busId]?.boards || []
      const onlineBoards = boards.filter(isBoardOnline).length
      toast.success(`Config applied. ${onlineBoards}/${boards.length} boards will sync within 30s.`)
    } catch (error) {
      console.error('Error updating config:', error)
      toast.error('Failed to update configuration')
    } finally {
      setSavingBusId(null)
    }
  }

  const openDeleteConfirm = (busId) => {
    const boardCount = busConfigs[busId]?.boards?.length || 0
    setDeleteConfirmModal({ open: true, busId, boardCount })
  }

  const deleteBus = async () => {
    const { busId } = deleteConfirmModal
    if (!busId) return

    setDeletingBusId(busId)

    try {
      await axios.delete(`${API.node.powerConfig}/${busId}`)

      // Update local state instead of refetching all buses
      setBusConfigs(prev => {
        const newConfigs = { ...prev }
        delete newConfigs[busId]
        return newConfigs
      })
      setFormValues(prev => {
        const newValues = { ...prev }
        delete newValues[busId]
        return newValues
      })

      toast.success(`Removed ${busId} configuration`)
      setDeleteConfirmModal({ open: false, busId: null, boardCount: 0 })
    } catch (error) {
      console.error('Error deleting bus:', error)
      toast.error('Failed to delete bus configuration')
    } finally {
      setDeletingBusId(null)
    }
  }

  const openAddBusModal = () => {
    setNewBusData({
      bus_id: ''
    })
    setAddBusModalOpen(true)
  }

  const handleNewBusChange = (field, value) => {
    setNewBusData(prev => ({ ...prev, [field]: value }))
  }

  const addNewBus = async () => {
    if (!newBusData.bus_id.trim()) {
      toast.error('Bus ID is required')
      return
    }

    if (busConfigs[newBusData.bus_id]) {
      toast.error('Bus ID already exists')
      return
    }

    setAddingBus(true)

    try {
      const newConfig = {
        bus_id: newBusData.bus_id.trim(),
        bus_name: newBusData.bus_id.trim(),
        deep_sleep_enabled: true,
        trip_start: '00:00',
        trip_end: '23:59',
        maintenance_interval: 5,
        maintenance_duration: 3
      }

      const response = await axios.post(API.node.powerConfig, newConfig)

      // Update local state instead of refetching all buses
      const busId = newBusData.bus_id.trim()
      const configData = response.data.config || response.data
      setBusConfigs(prev => ({
        ...prev,
        [busId]: {
          bus_id: busId,
          bus_name: newConfig.bus_name,
          deep_sleep_enabled: newConfig.deep_sleep_enabled,
          trip_start: newConfig.trip_start,
          trip_end: newConfig.trip_end,
          maintenance_interval: newConfig.maintenance_interval,
          maintenance_duration: newConfig.maintenance_duration,
          boards: [],
          last_updated: new Date().toISOString()
        }
      }))
      setFormValues(prev => ({
        ...prev,
        [busId]: {
          bus_name: newConfig.bus_name,
          deep_sleep_enabled: newConfig.deep_sleep_enabled,
          maintenance_interval: newConfig.maintenance_interval,
          maintenance_duration: newConfig.maintenance_duration
        }
      }))

      toast.success(`Added ${newBusData.bus_id}`)
      setAddBusModalOpen(false)
    } catch (error) {
      console.error('Error adding bus:', error)
      toast.error('Failed to add bus configuration')
    } finally {
      setAddingBus(false)
    }
  }

  const isBoardOnline = (board) => {
    if (!board?.last_seen) return false
    const lastSeen = new Date(board.last_seen)
    if (Number.isNaN(lastSeen.getTime())) return false
    // Calculate time difference - handle both future and past timestamps
    const diffMs = Date.now() - lastSeen.getTime()
    // If timestamp is in the future (clock skew), treat as just received
    // But still require a recent heartbeat (within 75 seconds)
    const secondsAgo = Math.abs(diffMs) / 1000
    // Board is online only if heartbeat was within last 75 seconds AND not too far in the future
    return diffMs >= -5000 && secondsAgo < 75
  }

  const renderBoard = (board) => {
    const online = isBoardOnline(board)
    const timeDiff = board?.last_seen ? formatRelative(board.last_seen) : 'Never'

    return (
      <div key={board.device_id} className="flex items-center justify-between gap-3 rounded-xl border border-purple-500/20 bg-slate-900/50 p-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-200 truncate">{board.device_id || 'Unknown device'}</p>
          <p className="text-xs text-slate-500 truncate">
            {board.location || 'Unknown'} · {board.ip_address || 'No IP'} · {timeDiff}
          </p>
        </div>
        <span className={`flex-shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${online ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-500 border border-slate-700'
          }`}
        >
          {online ? 'Online' : 'Offline'}
        </span>
      </div>
    )
  }

  const formatRelative = (timestamp) => {
    const lastSeen = new Date(timestamp)
    if (Number.isNaN(lastSeen.getTime())) return 'Invalid timestamp'

    const diffMs = Date.now() - lastSeen.getTime()
    // If timestamp is slightly in the future (within 5 seconds due to clock skew), show as just now
    if (diffMs < 0 && diffMs > -5000) return 'Just now'
    // If timestamp is more than 5 seconds in the future, show the actual time
    if (diffMs <= -5000) return `Clock skew: ${lastSeen.toLocaleTimeString()}`

    const diffSec = Math.floor(diffMs / 1000)
    if (diffSec < 60) return `${diffSec}s ago`

    const diffMin = Math.floor(diffSec / 60)
    if (diffMin < 60) return `${diffMin}m ago`

    const diffHour = Math.floor(diffMin / 60)
    if (diffHour < 24) return `${diffHour}h ago`

    const diffDay = Math.floor(diffHour / 24)
    return `${diffDay}d ago`
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner size="xl" text="Loading fleet power configurations..." />
      </div>
    )
  }

  const busEntries = Object.entries(busConfigs)

  return (
    <div className="space-y-8">
      <section className="backdrop-blur-xl bg-slate-900/50 border border-purple-500/20 rounded-2xl p-4 sm:p-6 shadow-lg shadow-purple-500/10">
        <div className="flex flex-col gap-4">
          <div className="text-left sm:text-center lg:text-left">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 flex items-center gap-2">
              <span>⚡</span>
              Fleet Power
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Deep sleep windows and maintenance schedules.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-xl border border-purple-500/10 bg-slate-950/40">
            <div className="text-xs text-slate-400 font-medium">Auto-refresh: 30s</div>
            <div className="text-xs text-purple-300 font-mono">Last updated: {lastUpdate ? lastUpdate.toLocaleTimeString() : '—'}</div>
          </div>
        </div>
      </section>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteConfirmModal.open}
        onClose={() => setDeleteConfirmModal({ open: false, busId: null, boardCount: 0 })}
        onConfirm={deleteBus}
        title="Confirm Deletion"
        itemName={`Delete ${deleteConfirmModal.busId}?`}
        warningMessage={deleteConfirmModal.boardCount > 0 ? `This bus has ${deleteConfirmModal.boardCount} connected board(s).` : null}
        noteMessage="Power configuration will be removed, but passenger data will remain intact."
        confirmButtonText="Delete Bus"
        isDeleting={deletingBusId !== null}
      />

      {/* Add Bus Modal */}
      {addBusModalOpen && (
        <div className="fixed inset-0 flex items-start justify-center p-4 pt-20 overflow-y-auto" style={{ zIndex: 9999 }}>
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setAddBusModalOpen(false)}
          />

          <div className="relative w-full max-w-md bg-slate-900 border border-purple-500/30 rounded-2xl shadow-2xl shadow-purple-500/20" style={{ zIndex: 10000 }}>
            <div className="sticky top-0 bg-slate-900/95 backdrop-blur-sm border-b border-purple-500/20 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <span className="text-2xl">🚌</span>
                Add New Bus
              </h3>
              <button
                onClick={() => setAddBusModalOpen(false)}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-300">
                  <span>🆔</span>
                  Bus ID
                  <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={newBusData.bus_id}
                  onChange={(e) => handleNewBusChange('bus_id', e.target.value.toUpperCase())}
                  placeholder="e.g., BUS_JC_003"
                  autoFocus
                  className="w-full px-4 py-3 bg-slate-800/50 border border-purple-500/30 text-slate-100 rounded-lg focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all placeholder:text-slate-500"
                />
                <p className="text-xs text-slate-400">Enter unique identifier for the bus</p>
              </div>

              <div className="rounded-xl bg-slate-800/30 border border-purple-500/20 p-4">
                <p className="text-xs font-semibold text-slate-400 mb-3">Default Configuration:</p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Bus Name:</span>
                    <span className="font-medium text-slate-300">{newBusData.bus_id || 'Same as Bus ID'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Deep Sleep:</span>
                    <span className="font-medium text-emerald-300">✓ Enabled</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Maintenance Interval:</span>
                    <span className="font-medium text-slate-300">5 minutes</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Maintenance Duration:</span>
                    <span className="font-medium text-slate-300">3 minutes</span>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-3">You can modify these settings after creating the bus</p>
              </div>
            </div>

            <div className="sticky bottom-0 bg-slate-900/95 backdrop-blur-sm border-t border-purple-500/20 px-6 py-4 flex gap-3">
              <button
                onClick={() => setAddBusModalOpen(false)}
                className="flex-1 px-4 py-3 bg-slate-800/50 border border-purple-500/30 text-slate-300 rounded-lg hover:bg-slate-700/50 transition-all font-medium"
              >
                Cancel
              </button>
              <button
                onClick={addNewBus}
                disabled={addingBus}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg shadow-lg shadow-purple-500/50 hover:shadow-xl transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {addingBus ? (
                  <>
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Adding...
                  </>
                ) : (
                  'Add Bus'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {busEntries.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-purple-500/30 bg-slate-800/30 p-10 text-center">
          <div className="text-6xl mb-4">🚌</div>
          <p className="text-lg font-medium text-slate-200">
            No buses configured yet
          </p>
          <p className="text-sm text-slate-400 mt-2">
            Add your first bus to start managing power settings
          </p>
          <button
            onClick={openAddBusModal}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-500/50 hover:shadow-xl transition-all"
          >
            <span className="text-lg">➕</span>
            Add New Bus
          </button>
        </section>
      ) : (
        <section className="space-y-6">
          <div className="flex justify-end">
            <button
              onClick={openAddBusModal}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-500/50 hover:shadow-xl transition-all"
            >
              <span className="text-lg">➕</span>
              Add New Bus
            </button>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {busEntries.map(([busId, config]) => {
              const form = formValues[busId] || {}
              const boards = config.boards || []

              return (
                <article
                  key={busId}
                  className="rounded-2xl border border-purple-500/20 bg-slate-800/30 backdrop-blur-sm p-6 shadow-lg shadow-purple-500/10 hover:shadow-xl hover:shadow-purple-500/20 transition-all"
                >
                  <header className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-semibold text-slate-100">{form.bus_name}</h2>
                      <p className="text-xs uppercase tracking-wide text-slate-500">{busId}</p>
                    </div>
                    <button
                      onClick={() => openDeleteConfirm(busId)}
                      className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-sm font-medium text-red-400 hover:bg-red-500/20 transition-all"
                      title="Delete bus configuration"
                    >
                      🗑
                    </button>
                  </header>

                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <label className="flex flex-col gap-2 text-sm font-medium text-slate-300">
                      Bus name
                      <input
                        type="text"
                        value={form.bus_name || ''}
                        onChange={(event) => handleFormChange(busId, 'bus_name', event.target.value)}
                        className="rounded-lg border border-purple-500/30 bg-slate-800/50 px-4 py-2 text-slate-100 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                      />
                    </label>
                    <label className="flex flex-col gap-2 text-sm font-medium text-slate-300">
                      Deep sleep enabled
                      <button
                        type="button"
                        onClick={() => handleFormChange(busId, 'deep_sleep_enabled', !form.deep_sleep_enabled)}
                        className={`rounded-lg border px-4 py-2 text-sm font-semibold transition-all ${form.deep_sleep_enabled
                          ? 'border-emerald-500/50 bg-emerald-500/20 text-emerald-300'
                          : 'border-slate-700 bg-slate-800/50 text-slate-400'
                          }`}
                      >
                        {form.deep_sleep_enabled ? '✓ Enabled' : '✗ Disabled'}
                      </button>
                    </label>
                    <label className="flex flex-col gap-2 text-sm font-medium text-slate-300">
                      Maintenance interval (min)
                      <input
                        type="number"
                        min="1"
                        max="60"
                        value={form.maintenance_interval ?? ''}
                        onChange={(event) => handleFormChange(busId, 'maintenance_interval', Number(event.target.value))}
                        className="rounded-lg border border-purple-500/30 bg-slate-800/50 px-4 py-2 text-slate-100 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                      />
                    </label>
                    <label className="flex flex-col gap-2 text-sm font-medium text-slate-300">
                      Maintenance duration (min)
                      <input
                        type="number"
                        min="1"
                        max="30"
                        value={form.maintenance_duration ?? ''}
                        onChange={(event) => handleFormChange(busId, 'maintenance_duration', Number(event.target.value))}
                        className="rounded-lg border border-purple-500/30 bg-slate-800/50 px-4 py-2 text-slate-100 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                      />
                    </label>
                  </div>

                  <button
                    onClick={() => updateBusConfig(busId)}
                    disabled={savingBusId === busId}
                    className={`mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed ${hasUnsavedChanges(busId)
                      ? 'bg-gradient-to-r from-orange-500 to-orange-600 shadow-orange-500/30 hover:shadow-orange-500/40 animate-pulse'
                      : 'bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-emerald-500/30 hover:shadow-emerald-500/40'
                      }`}
                  >
                    {savingBusId === busId ? (
                      <>
                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Saving...
                      </>
                    ) : (
                      <>{hasUnsavedChanges(busId) ? '⚠️ Save Changes' : '💾 Apply settings'} to {busId}</>
                    )}
                  </button>

                  <div className="mt-6 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-slate-300">Connected boards</h3>
                      <span className="rounded-full bg-purple-500/20 border border-purple-500/30 px-3 py-1 text-xs font-semibold text-purple-300">
                        {boards.length}
                      </span>
                    </div>
                    {boards.length === 0 ? (
                      <p className="rounded-xl border border-dashed border-purple-500/30 bg-slate-900/50 p-3 text-sm text-slate-400">
                        No boards have connected yet.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {boards.map(renderBoard)}
                      </div>
                    )}
                  </div>

                  <p className="mt-6 text-xs text-slate-500">
                    Last updated: {config.last_updated ? new Date(config.last_updated).toLocaleString() : 'Never'}
                  </p>
                </article>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}

export default PowerPage
