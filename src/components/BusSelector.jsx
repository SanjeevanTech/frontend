import React, { useState, useEffect } from 'react'
import axios from '../utils/axios'
import { API } from '../config/api'
import LoadingSpinner from './LoadingSpinner'

function BusSelector({ selectedBus, onBusChange, showAll = true, label = 'Filter by bus' }) {
  const [buses, setBuses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadBuses()
  }, [])

  const loadBuses = async () => {
    try {
      const response = await axios.get(API.node.buses)
      const busIds = Object.keys(response.data)
      setBuses(busIds)

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
    return (
      <div className="mb-6 flex items-center gap-3 p-4 rounded-lg bg-slate-800/30 border border-purple-500/20">
        <LoadingSpinner size="sm" />
        <span className="text-sm text-slate-300">Loading buses...</span>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm font-semibold text-slate-300">
        {label}
      </label>
      <div className="relative">
        <select
          value={selectedBus}
          onChange={(e) => onBusChange(e.target.value)}
          className="w-full appearance-none rounded-lg border border-purple-500/30 bg-slate-800/50 backdrop-blur-sm px-4 py-3 text-sm text-slate-100 shadow-lg shadow-purple-500/10 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all cursor-pointer hover:bg-slate-800/70"
        >
          {showAll && <option className="bg-slate-900 text-slate-100" value="ALL">🚌 All buses</option>}
          {buses.map(busId => (
            <option key={busId} value={busId} className="bg-slate-900 text-slate-100">
              🚌 {busId}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-purple-400">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </div>
      {buses.length === 0 && (
        <p className="text-xs text-red-400 flex items-center gap-2">
          <span>⚠️</span>
          No buses configured
        </p>
      )}
    </div>
  )
}

export default BusSelector
