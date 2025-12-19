import { useState, useEffect } from 'react'
import axios from '../utils/axios'
import { toast } from 'react-hot-toast'
import LoadingSpinner from '../components/LoadingSpinner'

function FaresPage() {
  const [stages, setStages] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingStage, setEditingStage] = useState(null)
  const [newFare, setNewFare] = useState('')
  const [searchStage, setSearchStage] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)

  useEffect(() => {
    fetchStages()
  }, [])

  const fetchStages = async (showToast = false) => {
    try {
      setLoading(true)
      const response = await axios.get('/api/fare/stages')
      setStages(response.data.stages || [])
      if (showToast) {
        toast.success('Fare stages refreshed successfully')
      }
    } catch (error) {
      console.error('Error fetching stages:', error)
      toast.error('Failed to load fare stages')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (stage) => {
    setEditingStage(stage.stage_number)
    setNewFare(stage.fare)
  }

  const handleSave = async (stageNumber) => {
    try {
      await axios.put(`/api/fare/stages/${stageNumber}`, {
        fare: parseFloat(newFare),
        updated_by: 'admin'
      })

      toast.success('Fare updated successfully!')

      // Update local state instead of refetching
      setStages(prev => prev.map(stage =>
        stage.stage_number === stageNumber ? { ...stage, fare: parseFloat(newFare) } : stage
      ))

      setEditingStage(null)
    } catch (error) {
      toast.error('Failed to update fare: ' + error.message)
    }
  }

  const handleCancel = () => {
    setEditingStage(null)
    setNewFare('')
  }

  const filteredStages = searchStage
    ? stages.filter(s => s.stage_number === parseInt(searchStage))
    : stages

  const totalPages = Math.ceil(filteredStages.length / itemsPerPage)
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentStages = filteredStages.slice(indexOfFirstItem, indexOfLastItem)

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <LoadingSpinner size="xl" text="Loading fare stages..." />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-full overflow-hidden">
      <header className="text-center">
        <h2 className="text-3xl font-bold text-slate-100 flex items-center justify-center gap-2">
          <span>💰</span>
          Fare Stage Management
        </h2>
        <p className="text-slate-400 mt-2">NTC July 2025 Normal Fare Structure</p>
      </header>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="number"
            placeholder="Search stage number..."
            value={searchStage}
            onChange={(e) => {
              setSearchStage(e.target.value)
              setCurrentPage(1)
            }}
            className="flex-1 px-4 py-3 bg-slate-800/50 border border-purple-500/30 text-slate-100 rounded-xl focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all placeholder:text-slate-500"
          />
          <div className="flex gap-2">
            <button
              onClick={() => {
                setSearchStage('')
                setCurrentPage(1)
              }}
              className="flex-1 sm:flex-none px-4 py-3 bg-slate-800/50 border border-purple-500/30 text-slate-300 font-medium rounded-xl hover:bg-slate-700/50 transition-all whitespace-nowrap"
            >
              Show All
            </button>
            <button
              onClick={fetchStages}
              className="flex-1 sm:flex-none px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl shadow-lg shadow-purple-500/50 hover:shadow-xl transition-all whitespace-nowrap"
            >
              🔄 Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="block md:hidden space-y-3">
        {currentStages.map((stage) => (
          <div key={stage.stage_number} className="rounded-xl border border-purple-500/30 bg-slate-800/50 p-4 shadow-lg shadow-black/20">
            <div className="flex items-center justify-between mb-3">
              <span className="px-3 py-1 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-full text-sm font-bold">
                Stage #{stage.stage_number}
              </span>
              {editingStage !== stage.stage_number && (
                <button
                  onClick={() => handleEdit(stage)}
                  className="px-3 py-1.5 text-sm bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-lg hover:bg-blue-500/30 transition-all"
                >
                  ✏️ Edit
                </button>
              )}
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Distance:</span>
                <span className="font-medium text-slate-200">
                  {((stage.stage_number - 1) * 3.5).toFixed(1)} - {(stage.stage_number * 3.5).toFixed(1)} km
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-400">Fare:</span>
                {editingStage === stage.stage_number ? (
                  <input
                    type="number"
                    step="0.01"
                    value={newFare}
                    onChange={(e) => setNewFare(e.target.value)}
                    className="w-24 px-3 py-2 bg-slate-800/50 border border-purple-500/30 text-slate-100 rounded-lg text-right focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  />
                ) : (
                  <span className="font-bold text-emerald-300">Rs. {stage.fare.toFixed(2)}</span>
                )}
              </div>
            </div>

            {editingStage === stage.stage_number && (
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => handleSave(stage.stage_number)}
                  className="flex-1 px-3 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg shadow-lg shadow-emerald-500/30 hover:shadow-xl transition-all text-sm font-semibold"
                >
                  ✓ Save
                </button>
                <button
                  onClick={handleCancel}
                  className="flex-1 px-3 py-2 bg-slate-700/50 border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-600/50 transition-all text-sm font-medium"
                >
                  ✗ Cancel
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-800 shadow-lg shadow-black/20">
        <table className="min-w-full">
          <thead className="bg-slate-950/70 text-left text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-6 py-4 font-semibold">Stage No.</th>
              <th className="px-6 py-4 font-semibold">Distance Range (km)</th>
              <th className="px-6 py-4 font-semibold">Fare (Rs.)</th>
              <th className="px-6 py-4 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 bg-slate-900/60 text-sm text-slate-200">
            {currentStages.map((stage) => (
              <tr key={stage.stage_number} className="hover:bg-slate-900/80 transition-colors">
                <td className="px-6 py-4 font-bold text-purple-300">{stage.stage_number}</td>
                <td className="px-6 py-4 text-slate-300">
                  {((stage.stage_number - 1) * 3.5).toFixed(1)} - {(stage.stage_number * 3.5).toFixed(1)} km
                </td>
                <td className="px-6 py-4">
                  {editingStage === stage.stage_number ? (
                    <input
                      type="number"
                      step="0.01"
                      value={newFare}
                      onChange={(e) => setNewFare(e.target.value)}
                      className="w-32 px-3 py-2 bg-slate-800/50 border border-purple-500/30 text-slate-100 rounded-lg focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    />
                  ) : (
                    <span className="font-bold text-emerald-300">Rs. {stage.fare.toFixed(2)}</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  {editingStage === stage.stage_number ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSave(stage.stage_number)}
                        className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg shadow-lg shadow-emerald-500/30 hover:shadow-xl transition-all font-semibold"
                      >
                        ✓ Save
                      </button>
                      <button
                        onClick={handleCancel}
                        className="px-4 py-2 bg-slate-700/50 border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-600/50 transition-all font-medium"
                      >
                        ✗ Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleEdit(stage)}
                      className="px-4 py-2 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-lg hover:bg-blue-500/30 transition-all font-medium"
                    >
                      ✏️ Edit
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!searchStage && filteredStages.length > itemsPerPage && (
        <div className="rounded-2xl border border-purple-500/30 bg-slate-900/80 p-4 shadow-lg shadow-purple-500/10">
          <div className="flex flex-col gap-4">
            <div className="text-center">
              <p className="text-sm font-semibold text-slate-300">
                Page <span className="text-purple-300 text-lg">{currentPage}</span> of <span className="text-pink-300 text-lg">{totalPages}</span>
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Showing {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredStages.length)} of {filteredStages.length} stages
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="w-full sm:w-auto px-6 py-3 bg-slate-800/50 border border-purple-500/30 text-purple-300 font-bold rounded-lg hover:bg-slate-700/50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                ← Previous
              </button>

              <div className="flex flex-wrap items-center justify-center gap-2">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum
                  if (totalPages <= 5) {
                    pageNum = i + 1
                  } else if (currentPage <= 3) {
                    pageNum = i + 1
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i
                  } else {
                    pageNum = currentPage - 2 + i
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`min-w-[44px] px-4 py-3 rounded-lg transition-all font-bold ${currentPage === pageNum
                          ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white scale-110 shadow-lg shadow-purple-500/50'
                          : 'bg-slate-800/50 border border-purple-500/30 text-slate-300 hover:bg-slate-700/50'
                        }`}
                    >
                      {pageNum}
                    </button>
                  )
                })}
              </div>

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="w-full sm:w-auto px-6 py-3 bg-slate-800/50 border border-pink-500/30 text-pink-300 font-bold rounded-lg hover:bg-slate-700/50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-purple-500/20 bg-slate-800/30 p-6 space-y-2 text-sm">
        <p className="text-slate-300">💡 <strong className="text-slate-100">Note:</strong> Each stage represents approximately 3.5 km of travel distance.</p>
        <p className="text-slate-300">📊 Total stages loaded: <strong className="text-purple-300">{stages.length}</strong></p>
        <p className="text-slate-300">📄 Showing: <strong className="text-purple-300">{indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredStages.length)}</strong> of <strong className="text-purple-300">{filteredStages.length}</strong></p>
        <p className="text-slate-300">🔄 Changes take effect immediately for new fare calculations.</p>
      </div>
    </div>
  )
}

export default FaresPage
