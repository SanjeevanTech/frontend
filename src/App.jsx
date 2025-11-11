import React, { useState, useEffect } from 'react'
import axios from './utils/axios'
import { format, parseISO, startOfDay, endOfDay } from 'date-fns'
import './App.css'
import PassengerTable from './components/PassengerTable.jsx'
import DateFilter from './components/DateFilter.jsx'
import Stats from './components/Stats.jsx'
import FareAdmin from './components/FareAdmin.jsx'
import UnmatchedPassengers from './components/UnmatchedPassengers.jsx'
import TripManagement from './components/TripManagement.jsx'
import PowerManagement from './components/PowerManagement.jsx'
import ScheduleAdmin from './components/ScheduleAdmin.jsx'
import RouteManagement from './components/RouteManagement.jsx'
import WaypointGroupManagement from './components/WaypointGroupManagement.jsx'
import BusSelector from './components/BusSelector.jsx'
import SeasonTicketManagement from './components/SeasonTicketManagement.jsx'
import Pagination from './components/Pagination.jsx'

function App() {
  const [passengers, setPassengers] = useState([]);
  const [filteredPassengers, setFilteredPassengers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedBus, setSelectedBus] = useState(localStorage.getItem('selectedBusPassengers') || 'ALL');
  const [showAdmin, setShowAdmin] = useState(false);
  const [showUnmatched, setShowUnmatched] = useState(false);
  const [showTrips, setShowTrips] = useState(false);
  const [showPower, setShowPower] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [showRoutes, setShowRoutes] = useState(false);
  const [showWaypoints, setShowWaypoints] = useState(false);
  const [showSeasonTicket, setShowSeasonTicket] = useState(false);
  const [unmatchedCount, setUnmatchedCount] = useState(0);
  const [selectedTrip, setSelectedTrip] = useState('ALL');
  const [availableTrips, setAvailableTrips] = useState([]);
  const [stats, setStats] = useState({
    totalPassengers: 0,
    totalRevenue: 0,
    routeDistance: 0
  });
  
  // PAGINATION STATE
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPassengers, setTotalPassengers] = useState(0);
  const itemsPerPage = 50; // Show 50 passengers per page

  const handleBusChange = (busId) => {
    setSelectedBus(busId)
    localStorage.setItem('selectedBusPassengers', busId)
    setCurrentPage(0) // Reset to first page when filter changes
  }
  
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage)
    window.scrollTo({ top: 0, behavior: 'smooth' }) // Scroll to top on page change
  }

  // OPTIMIZED: Fetch on mount
  useEffect(() => {
    fetchPassengers();
    fetchUnmatchedCount();
  }, []);

  // OPTIMIZED: Refetch when filters or page changes (server-side filtering)
  useEffect(() => {
    fetchPassengers();
    fetchUnmatchedCount();
  }, [selectedDate, selectedTrip, selectedBus, currentPage]);

  // Fetch available trips separately (not from paginated data)
  useEffect(() => {
    fetchAvailableTrips();
  }, [selectedDate, selectedBus]);

  // OPTIMIZED: Use server-side filtering and pagination
  const fetchPassengers = async () => {
    try {
      setLoading(true);
      
      // Build query parameters for server-side filtering with pagination
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const params = new URLSearchParams({
        limit: itemsPerPage,
        skip: currentPage * itemsPerPage,
        date: dateStr
      });
      
      if (selectedBus !== 'ALL') params.append('bus_id', selectedBus);
      if (selectedTrip !== 'ALL') params.append('trip_id', selectedTrip);
      
      const response = await axios.get(`/api/passengers?${params}`);
      const passengers = response.data.passengers || [];
      const total = response.data.total || 0;
      
      console.log('📊 Pagination Debug:', {
        passengersReceived: passengers.length,
        totalFromServer: total,
        currentPage,
        itemsPerPage
      });
      
      // Server already filtered - use directly!
      setPassengers(passengers);
      setFilteredPassengers(passengers);
      setTotalPassengers(total);
      
      // Note: availableTrips is now fetched separately in fetchAvailableTrips()
      // This ensures we see ALL trips for the date, not just trips from current page
      
      // Calculate stats with server-filtered data
      calculateStats(passengers);
      
      setError(null);
    } catch (err) {
      setError('Failed to fetch passenger data');
      console.error('Error fetching passengers:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnmatchedCount = async () => {
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const response = await axios.get(`/api/unmatched?date=${dateStr}`);
      setUnmatchedCount(response.data.total || 0);
    } catch (err) {
      console.error('Error fetching unmatched count:', err);
    }
  };

  // Fetch ALL unique trips for the selected date (not paginated)
  const fetchAvailableTrips = async () => {
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const params = new URLSearchParams({ date: dateStr });
      
      if (selectedBus !== 'ALL') params.append('bus_id', selectedBus);
      
      const response = await axios.get(`/api/trips?${params}`);
      const trips = response.data.trips || [];
      
      setAvailableTrips(trips);
    } catch (err) {
      console.error('Error fetching available trips:', err);
      setAvailableTrips([]);
    }
  };

  // REMOVED: filterByDate() - No longer needed!
  // Server-side filtering is now handled in fetchPassengers()

  // OPTIMIZED: Simplified stats calculation (no client-side filtering)
  const calculateStats = async (data) => {
    // No filtering needed - server already filtered by bus_id and trip_id
    const totalPassengers = data.length;
    const totalRevenue = data.reduce((sum, p) => sum + (p.price || 0), 0);
    
    // Calculate route distance
    let routeDistance = 0;
    if (data.length > 0) {
      try {
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        const params = new URLSearchParams({ date: dateStr });
        
        if (selectedTrip !== 'ALL') params.append('trip_id', selectedTrip);
        if (selectedBus !== 'ALL') params.append('bus_id', selectedBus);
        
        const response = await axios.get(`/api/route-distance?${params}`);
        
        if (response.data.success) {
          routeDistance = response.data.distance_km;
        }
      } catch (error) {
        console.error('Error calculating route distance:', error);
      }
    }

    setStats({
      totalPassengers,
      totalRevenue: totalRevenue.toFixed(2),
      routeDistance: routeDistance.toFixed(2)
    });
  };

  const calculateHaversineDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  return (
    <div className="App">
      <header className="app-header">
        <h1>🚌 Bus Passenger Tracking System</h1>
        <p>Multi-Bus Fleet Management | NTC 2025 Fare System</p>
        <div className="header-buttons">
          <button 
            className={`nav-button ${!showAdmin && !showUnmatched && !showTrips && !showPower && !showSchedule && !showRoutes && !showWaypoints && !showSeasonTicket ? 'active' : ''}`}
            onClick={() => {
              setShowAdmin(false)
              setShowUnmatched(false)
              setShowTrips(false)
              setShowPower(false)
              setShowSchedule(false)
              setShowRoutes(false)
              setShowWaypoints(false)
              setShowSeasonTicket(false)
            }}
          >
            ✅ Passengers
          </button>
          <button 
            className={`nav-button ${showUnmatched ? 'active' : ''}`}
            onClick={() => {
              setShowAdmin(false)
              setShowUnmatched(true)
              setShowTrips(false)
              setShowPower(false)
              setShowSchedule(false)
              setShowRoutes(false)
              setShowWaypoints(false)
              setShowSeasonTicket(false)
            }}
          >
            ❌ Unmatched
            {unmatchedCount > 0 && (
              <span className="badge">{unmatchedCount}</span>
            )}
          </button>
          <button 
            className={`nav-button ${showTrips ? 'active' : ''}`}
            onClick={() => {
              setShowAdmin(false)
              setShowUnmatched(false)
              setShowTrips(true)
              setShowPower(false)
              setShowSchedule(false)
              setShowRoutes(false)
              setShowWaypoints(false)
              setShowSeasonTicket(false)
            }}
          >
            🚌 Trips
          </button>
          <button 
            className={`nav-button ${showRoutes ? 'active' : ''}`}
            onClick={() => {
              setShowAdmin(false)
              setShowUnmatched(false)
              setShowTrips(false)
              setShowPower(false)
              setShowSchedule(false)
              setShowRoutes(true)
              setShowWaypoints(false)
              setShowSeasonTicket(false)
            }}
          >
            🗺️ Routes
          </button>
          <button 
            className={`nav-button ${showSchedule ? 'active' : ''}`}
            onClick={() => {
              setShowAdmin(false)
              setShowUnmatched(false)
              setShowTrips(false)
              setShowPower(false)
              setShowSchedule(true)
              setShowRoutes(false)
              setShowWaypoints(false)
              setShowSeasonTicket(false)
            }}
          >
            📅 Schedule
          </button>
          <button 
            className={`nav-button ${showWaypoints ? 'active' : ''}`}
            onClick={() => {
              setShowAdmin(false)
              setShowUnmatched(false)
              setShowTrips(false)
              setShowPower(false)
              setShowSchedule(false)
              setShowRoutes(false)
              setShowWaypoints(true)
              setShowSeasonTicket(false)
            }}
          >
            📍 Waypoints
          </button>
          <button 
            className={`nav-button ${showSeasonTicket ? 'active' : ''}`}
            onClick={() => {
              setShowAdmin(false)
              setShowUnmatched(false)
              setShowTrips(false)
              setShowPower(false)
              setShowSchedule(false)
              setShowRoutes(false)
              setShowWaypoints(false)
              setShowSeasonTicket(true)
            }}
          >
            🎫 Season Tickets
          </button>
          <button 
            className={`nav-button ${showPower ? 'active' : ''}`}
            onClick={() => {
              setShowAdmin(false)
              setShowUnmatched(false)
              setShowTrips(false)
              setShowPower(true)
              setShowSchedule(false)
              setShowRoutes(false)
              setShowWaypoints(false)
              setShowSeasonTicket(false)
            }}
          >
            ⚡ Power
          </button>
          <button 
            className={`nav-button ${showAdmin ? 'active' : ''}`}
            onClick={() => {
              setShowAdmin(true)
              setShowUnmatched(false)
              setShowTrips(false)
              setShowPower(false)
              setShowSchedule(false)
              setShowRoutes(false)
              setShowWaypoints(false)
              setShowSeasonTicket(false)
            }}
          >
            ⚙️ Fares
          </button>
        </div>
      </header>

      <div className="container">
        {showAdmin ? (
          <FareAdmin />
        ) : showTrips ? (
          <TripManagement />
        ) : showRoutes ? (
          <RouteManagement />
        ) : showWaypoints ? (
          <WaypointGroupManagement />
        ) : showSchedule ? (
          <ScheduleAdmin />
        ) : showSeasonTicket ? (
          <SeasonTicketManagement />
        ) : showPower ? (
          <PowerManagement />
        ) : showUnmatched ? (
          <>
            <BusSelector 
              selectedBus={selectedBus}
              onBusChange={handleBusChange}
              showAll={true}
              label="Filter by Bus:"
            />
            <DateFilter 
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
              onRefresh={fetchPassengers}
              selectedTrip={selectedTrip}
              onTripChange={setSelectedTrip}
              availableTrips={availableTrips}
            />
            <UnmatchedPassengers 
              selectedDate={selectedDate} 
              selectedBus={selectedBus}
              selectedTrip={selectedTrip}
            />
          </>
        ) : (
          <>
            <BusSelector 
              selectedBus={selectedBus}
              onBusChange={handleBusChange}
              showAll={true}
              label="Filter by Bus:"
            />

            <DateFilter 
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
              onRefresh={fetchPassengers}
              selectedTrip={selectedTrip}
              onTripChange={setSelectedTrip}
              availableTrips={availableTrips}
            />

            <Stats stats={stats} />

            {loading ? (
              <div className="loading">Loading passenger data...</div>
            ) : error ? (
              <div className="error">{error}</div>
            ) : (
              <>
                <PassengerTable passengers={filteredPassengers} selectedBus={selectedBus} />
                
                {/* Pagination Component */}
                <div className="pagination-wrapper">
                  <Pagination
                    currentPage={currentPage}
                    totalItems={totalPassengers}
                    itemsPerPage={itemsPerPage}
                    onPageChange={handlePageChange}
                    loading={loading}
                  />
                  
                  {/* Debug info - remove after testing */}
                  {totalPassengers === 0 && (
                    <div style={{ textAlign: 'center', padding: '1rem', color: '#999' }}>
                      No pagination (0 total passengers)
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default App
