import React, { useState, useEffect, useRef } from 'react'
import axios from '../utils/axios'
import { API } from '../config/api'
import LoadingSpinner from './LoadingSpinner'

function BusSelector({ selectedBus, onBusChange, showAll = true, label = 'Filter by bus', validateSelection = false }) {
  const [buses, setBuses] = useState([])
  const [loading, setLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    loadBuses()

    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const loadBuses = async () => {
    try {
      const response = await axios.get(API.node.buses)
      const busIds = Object.keys(response.data)
      setBuses(busIds)

      if (validateSelection && busIds.length > 0 && selectedBus && selectedBus !== 'ALL' && !busIds.includes(selectedBus)) {
        console.warn(`Selected bus ${selectedBus} no longer exists. Auto-selecting first available.`)
        onBusChange(busIds[0])
      }
      else if (!selectedBus && busIds.length > 0 && !showAll) {
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

  const selectedBusDisplay = selectedBus === 'ALL' ? 'All buses' : selectedBus

  return (
    <div className="space-y-2">
      {label && (
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-300">
          {label}
        </label>
      )}
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full h-12 flex items-center justify-between px-4 rounded-lg border border-purple-500/30 bg-slate-800/50 backdrop-blur-sm text-sm text-slate-100 shadow-lg shadow-purple-500/10 focus:border-purple-500 focus:outline-none transition-all hover:bg-slate-800/70"
        >
          <span className="flex items-center gap-2 truncate">
            <span className="text-lg">🚌</span>
            {selectedBusDisplay}
          </span>
          <span className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
            <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </span>
        </button>

        {isOpen && (
          <div className="absolute z-50 w-full mt-2 rounded-xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-150 origin-top">
            <div className="max-h-60 overflow-y-auto custom-scrollbar">
              {showAll && (
                <button
                  type="button"
                  onClick={() => {
                    onBusChange('ALL')
                    setIsOpen(false)
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-purple-500/10 ${selectedBus === 'ALL' ? 'bg-purple-500/20 text-purple-300' : 'text-slate-300'}`}
                >
                  <span className="text-lg">🚌</span>
                  All buses
                </button>
              )}
              {buses.map(busId => (
                <button
                  key={busId}
                  type="button"
                  onClick={() => {
                    onBusChange(busId)
                    setIsOpen(false)
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-purple-500/10 ${selectedBus === busId ? 'bg-purple-500/20 text-purple-300' : 'text-slate-300'}`}
                >
                  <span className="text-lg">🚌</span>
                  {busId}
                </button>
              ))}
            </div>
          </div>
        )}
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
