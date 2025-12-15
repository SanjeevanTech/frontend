import { useState, useEffect, lazy, Suspense } from 'react'
import { toast } from 'react-hot-toast'
import { logout } from '../utils/auth'
import { useNavigate } from 'react-router-dom'
import axios from '../utils/axios'
import { format } from 'date-fns'
import LoadingSpinner from '../components/LoadingSpinner'

// Lazy load page components for better performance
const PassengersPage = lazy(() => import('./PassengersPage'))
const UnmatchedPage = lazy(() => import('./UnmatchedPage'))
const FaresPage = lazy(() => import('./FaresPage'))
const TripsPage = lazy(() => import('./TripsPage'))
const PowerPage = lazy(() => import('./PowerPage'))
const SchedulePage = lazy(() => import('./SchedulePage'))
const RoutesPage = lazy(() => import('./RoutesPage'))
const WaypointsPage = lazy(() => import('./WaypointsPage'))
const SeasonTicketsPage = lazy(() => import('./SeasonTicketsPage'))

function DashboardPage({ user, setUser }) {
  const navigate = useNavigate()
  const [activeView, setActiveView] = useState('passengers')
  const [unmatchedCount, setUnmatchedCount] = useState(0)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    if (!user) return

    const fetchUnmatchedCount = async () => {
      try {
        const dateStr = format(new Date(), 'yyyy-MM-dd')
        const response = await axios.get(`/api/unmatched?date=${dateStr}`)
        setUnmatchedCount(response.data.total || 0)
      } catch (err) {
        console.error('Error fetching unmatched count:', err)
      }
    }

    fetchUnmatchedCount()
    const interval = setInterval(fetchUnmatchedCount, 60000)
    return () => clearInterval(interval)
  }, [user])

  const handleLogout = async () => {
    const success = await logout()
    if (success) {
      setUser(null)
      toast.success('Logged out successfully')
      navigate('/login')
    } else {
      toast.error('Logout failed')
    }
  }

  const handleNavClick = (viewId) => {
    setActiveView(viewId)
    setMobileMenuOpen(false)
  }

  const navItems = [
    { id: 'passengers', label: 'Passengers', icon: '👥', badge: 0 },
    { id: 'unmatched', label: 'Unmatched', icon: '⚠️', badge: unmatchedCount },
    { id: 'trips', label: 'Trips', icon: '🚌', badge: 0 },
    { id: 'routes', label: 'Routes', icon: '🗺️', badge: 0 },
    { id: 'schedule', label: 'Schedule', icon: '📅', badge: 0 },
    { id: 'waypoints', label: 'Waypoints', icon: '📍', badge: 0 },
    { id: 'seasonTicket', label: 'Season Tickets', icon: '🎫', badge: 0 },
    { id: 'power', label: 'Power', icon: '⚡', badge: 0 },
    { id: 'admin', label: 'Fares', icon: '💰', badge: 0 },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-slate-900/80 border-b border-purple-500/20 shadow-lg shadow-purple-500/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-2xl shadow-lg shadow-purple-500/50">
                🚌
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
                  Bus Tracking System
                </h1>
                <p className="text-xs text-slate-400">Fleet Management Dashboard</p>
              </div>
            </div>

            {/* Desktop User Menu */}
            <div className="hidden lg:flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-slate-200">{user.email}</p>
                <p className="text-xs text-slate-400 capitalize">{user.role}</p>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white text-sm font-medium rounded-lg transition-all shadow-lg shadow-red-500/30"
              >
                Logout
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg bg-slate-800/50 text-slate-300 hover:bg-slate-700/50 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex gap-2 pt-2 pb-4 overflow-x-auto">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`relative px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 whitespace-nowrap ${activeView === item.id
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/50'
                    : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700/50 hover:text-white'
                  }`}
              >
                <span className="mr-2">{item.icon}</span>
                {item.label}
                {item.badge > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-purple-500/20 bg-slate-900/95 backdrop-blur-xl">
            <nav className="max-w-7xl mx-auto px-4 py-4 space-y-2">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-lg font-medium text-sm transition-all ${activeView === item.id
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                      : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700/50'
                    }`}
                >
                  <span className="flex items-center gap-3">
                    <span className="text-xl">{item.icon}</span>
                    {item.label}
                  </span>
                  {item.badge > 0 && (
                    <span className="bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                      {item.badge}
                    </span>
                  )}
                </button>
              ))}
              <div className="pt-4 border-t border-slate-700">
                <div className="px-4 py-2 text-sm text-slate-400">
                  <p className="font-medium text-slate-200">{user.email}</p>
                  <p className="text-xs capitalize">{user.role}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full mt-2 px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white font-medium rounded-lg transition-all"
                >
                  Logout
                </button>
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="backdrop-blur-xl bg-slate-900/50 border border-purple-500/20 rounded-2xl shadow-2xl shadow-purple-500/10 p-4 sm:p-6 lg:p-8 min-h-[600px]">
          <Suspense fallback={<LoadingSpinner size="lg" text="Loading page..." />}>
            {activeView === 'passengers' && <PassengersPage />}
            {activeView === 'unmatched' && <UnmatchedPage />}
            {activeView === 'trips' && <TripsPage />}
            {activeView === 'routes' && <RoutesPage />}
            {activeView === 'schedule' && <SchedulePage />}
            {activeView === 'waypoints' && <WaypointsPage />}
            {activeView === 'seasonTicket' && <SeasonTicketsPage />}
            {activeView === 'power' && <PowerPage />}
            {activeView === 'admin' && <FaresPage />}
          </Suspense>
        </div>
      </main>
    </div>
  )
}

export default DashboardPage
