import React, { useState, useEffect } from 'react'
import axios from '../utils/axios'
import { format, parseISO } from 'date-fns'
import Pagination from './Pagination'
import './UnmatchedPassengers.css'

function UnmatchedPassengers({ selectedDate, selectedBus = 'ALL', selectedTrip = 'ALL' }) {
  const [unmatched, setUnmatched] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState('ALL')
  const [currentPage, setCurrentPage] = useState(0)
  const [totalUnmatched, setTotalUnmatched] = useState(0)
  const itemsPerPage = 50

  useEffect(() => {
    fetchUnmatched()
  }, [selectedDate, filterType, selectedBus, selectedTrip, currentPage])
  
  useEffect(() => {
    // Reset to first page when filters change
    setCurrentPage(0)
  }, [selectedDate, filterType, selectedBus, selectedTrip])

  const fetchUnmatched = async () => {
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
      if (selectedTrip !== 'ALL') params.append('trip_id', selectedTrip)
      
      const response = await axios.get(`/api/unmatched?${params}`)
      setUnmatched(response.data.unmatched || [])
      setTotalUnmatched(response.data.total || 0)
    } catch (error) {
      console.error('Error fetching unmatched:', error)
    } finally {
      setLoading(false)
    }
  }
  
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

  const getTypeColor = (type) => {
    return type === 'ENTRY' ? '#3498db' : '#e74c3c'
  }

  if (loading) {
    return <div className="loading">Loading unmatched passengers...</div>
  }

  return (
    <div className="unmatched-container">
      <div className="unmatched-header">
        <h3>❌ Unmatched Passengers</h3>
        <p>Entries without exits or exits without entries</p>
      </div>

      <div className="filter-controls">
        <label>Filter by Type:</label>
        <div className="filter-buttons">
          <button 
            className={filterType === 'ALL' ? 'active' : ''}
            onClick={() => setFilterType('ALL')}
          >
            All ({unmatched.length})
          </button>
          <button 
            className={filterType === 'ENTRY' ? 'active' : ''}
            onClick={() => setFilterType('ENTRY')}
          >
            Entries Only
          </button>
          <button 
            className={filterType === 'EXIT' ? 'active' : ''}
            onClick={() => setFilterType('EXIT')}
          >
            Exits Only
          </button>
        </div>
      </div>

      {unmatched.length === 0 ? (
        <div className="no-unmatched">
          <p>✅ No unmatched passengers for this date!</p>
          <p className="sub-text">All entries have matching exits</p>
        </div>
      ) : (
        <div className="unmatched-table-container">
          <table className="unmatched-table">
            <thead>
              <tr>
                <th>Bus ID</th>
                <th>Type</th>
                <th>Face ID</th>
                <th>Time</th>
                <th>Location</th>
                <th>Device</th>
                <th>Best Match</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              {unmatched.map((item, index) => (
                <tr key={index}>
                  <td><strong>{item.bus_id || 'N/A'}</strong></td>
                  <td>
                    <span 
                      className="type-badge" 
                      style={{ backgroundColor: getTypeColor(item.type) }}
                    >
                      {item.type}
                    </span>
                  </td>
                  <td className="face-id">{item.face_id}</td>
                  <td>{formatDateTime(item.timestamp)}</td>
                  <td className="location-cell">
                    {formatLocation(item.location)}
                  </td>
                  <td className="device-cell">{item.location?.device_id || 'N/A'}</td>
                  <td className="similarity-cell">
                    {item.best_similarity_found !== undefined && item.best_similarity_found !== null
                      ? `${(item.best_similarity_found * 100).toFixed(1)}%`
                      : 'N/A'}
                  </td>
                  <td className="reason-cell">{item.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination
        currentPage={currentPage}
        totalItems={totalUnmatched}
        itemsPerPage={itemsPerPage}
        onPageChange={handlePageChange}
        loading={loading}
      />
      
      <div className="unmatched-info">
        <p>📊 Total unmatched: {totalUnmatched}</p>
        <p>💡 These passengers either boarded without exiting or exited without boarding records.</p>
      </div>
    </div>
  )
}

export default UnmatchedPassengers
