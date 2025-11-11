import React, { useState, useEffect } from 'react'
import axios from 'axios'
import './FareAdmin.css'

function FareAdmin() {
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

  const fetchStages = async () => {
    try {
      setLoading(true)
      const response = await axios.get('/api/fare/stages')
      setStages(response.data.stages || [])
    } catch (error) {
      console.error('Error fetching stages:', error)
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
      
      alert('Fare updated successfully!')
      setEditingStage(null)
      fetchStages()
    } catch (error) {
      alert('Failed to update fare: ' + error.message)
    }
  }

  const handleCancel = () => {
    setEditingStage(null)
    setNewFare('')
  }

  // Filter stages based on search
  const filteredStages = searchStage
    ? stages.filter(s => s.stage_number === parseInt(searchStage))
    : stages

  // Pagination logic
  const totalPages = Math.ceil(filteredStages.length / itemsPerPage)
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentStages = filteredStages.slice(indexOfFirstItem, indexOfLastItem)

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  return (
    <div className="fare-admin">
      <div className="admin-header">
        <h2>🎫 Fare Stage Management</h2>
        <p>NTC July 2025 Normal Fare Structure</p>
      </div>

      <div className="admin-controls">
        <div className="search-box">
          <label>Search Stage:</label>
          <input
            type="number"
            placeholder="Enter stage number..."
            value={searchStage}
            onChange={(e) => {
              setSearchStage(e.target.value)
              setCurrentPage(1)
            }}
          />
          <button onClick={() => {
            setSearchStage('')
            setCurrentPage(1)
          }}>Show All</button>
        </div>
        
        <button className="btn-refresh" onClick={fetchStages}>
          🔄 Refresh
        </button>
      </div>

      {loading ? (
        <div className="loading">Loading fare stages...</div>
      ) : (
        <>
          <div className="stages-table-container">
            <table className="stages-table">
              <thead>
                <tr>
                  <th>Stage No.</th>
                  <th>Distance Range (km)</th>
                  <th>Fare (Rs.)</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentStages.map((stage) => (
                  <tr key={stage.stage_number}>
                    <td className="stage-number">{stage.stage_number}</td>
                    <td className="distance-range">
                      {((stage.stage_number - 1) * 3.5).toFixed(1)} - {(stage.stage_number * 3.5).toFixed(1)} km
                    </td>
                    <td className="fare-cell">
                      {editingStage === stage.stage_number ? (
                        <input
                          type="number"
                          step="0.01"
                          value={newFare}
                          onChange={(e) => setNewFare(e.target.value)}
                          className="fare-input"
                        />
                      ) : (
                        <span className="fare-value">Rs. {stage.fare.toFixed(2)}</span>
                      )}
                    </td>
                    <td className="actions-cell">
                      {editingStage === stage.stage_number ? (
                        <>
                          <button className="btn-save" onClick={() => handleSave(stage.stage_number)}>
                            ✓ Save
                          </button>
                          <button className="btn-cancel" onClick={handleCancel}>
                            ✗ Cancel
                          </button>
                        </>
                      ) : (
                        <button className="btn-edit" onClick={() => handleEdit(stage)}>
                          ✏️ Edit
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!searchStage && filteredStages.length > itemsPerPage && (
            <div className="pagination">
              <button 
                className="pagination-btn" 
                onClick={handlePrevPage}
                disabled={currentPage === 1}
              >
                ← Previous
              </button>
              
              <div className="pagination-info">
                <span className="page-numbers">
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
                        className={`page-number ${currentPage === pageNum ? 'active' : ''}`}
                        onClick={() => handlePageChange(pageNum)}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                </span>
                <span className="page-info">
                  Page {currentPage} of {totalPages}
                </span>
              </div>
              
              <button 
                className="pagination-btn" 
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}

      <div className="admin-info">
        <p>💡 <strong>Note:</strong> Each stage represents approximately 3.5 km of travel distance.</p>
        <p>📊 Total stages loaded: {stages.length}</p>
        <p>📄 Showing: {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredStages.length)} of {filteredStages.length}</p>
        <p>🔄 Changes take effect immediately for new fare calculations.</p>
      </div>
    </div>
  )
}

export default FareAdmin
