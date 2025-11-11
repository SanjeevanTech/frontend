import React, { useState, useEffect } from 'react'
import axios from '../utils/axios'
import './BusSelector.css'
import { API } from '../config/api'

function BusSelector({ selectedBus, onBusChange, showAll = true, label = 'Select Bus:' }) {
  const [buses, setBuses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadBuses()
  }, [])

  const loadBuses = async () => {
    try {
      const response = await axios.get(API.python.buses)
      const busIds = Object.keys(response.data)
      setBuses(busIds)
      
      // If no bus selected and buses available, select first one
      if (!selectedBus && busIds.length > 0 && !showAll) {
        onBusChange(busIds[0])
      }
    } catch (error) {
      console.error('Error loading buses:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="bus-selector loading">Loading buses...</div>
  }

  return (
    <div className="bus-selector">
      <label>{label}</label>
      <select 
        value={selectedBus} 
        onChange={(e) => onBusChange(e.target.value)}
        className="bus-select"
      >
        {showAll && <option value="ALL">🚌 All Buses</option>}
        {buses.map(busId => (
          <option key={busId} value={busId}>
            🚌 {busId}
          </option>
        ))}
      </select>
      {buses.length === 0 && (
        <span className="no-buses">No buses configured</span>
      )}
    </div>
  )
}

export default BusSelector
