import { useState, useEffect, lazy, Suspense, useMemo } from 'react'
import { toast } from 'react-hot-toast'
import { logout } from '../utils/auth'
import { useNavigate, useLocation, Routes, Route, Navigate } from 'react-router-dom'
import axios from '../utils/axios'
import { format } from 'date-fns'
import LoadingSpinner from '../components/LoadingSpinner'
import {
  Users,
  AlertTriangle,
  Bus,
  Map,
  Calendar,
  MapPin,
  Ticket,
  ShieldCheck,
  Zap,
  CircleDollarSign,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  User
} from 'lucide-react'

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
const ContractorsPage = lazy(() => import('./ContractorsPage'))

function DashboardPage({ user, setUser }) {
  const navigate = useNavigate()
  const location = useLocation()

  // Extract active view from path (e.g., /unmatched -> unmatched)
  const activeView = useMemo(() => {
    const path = location.pathname.split('/')[1] || 'passengers';
    if (path === 'fares') return 'admin';
    return path;
  }, [location.pathname]);

  const [unmatchedCount, setUnmatchedCount] = useState(0)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
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

  const handleNavClick = (id) => {
    const path = id === 'admin' ? '/fares' : (id === 'passengers' ? '/' : `/${id}`);
    navigate(path);
    setMobileMenuOpen(false);
  }

  const navItems = useMemo(() => [
    { id: 'passengers', label: 'Passengers', icon: Users, badge: 0 },
    { id: 'unmatched', label: 'Unmatched', icon: AlertTriangle, badge: unmatchedCount, color: 'text-amber-400' },
    { id: 'trips', label: 'Trips', icon: Bus, badge: 0 },
    { id: 'routes', label: 'Routes', icon: Map, badge: 0 },
    { id: 'schedule', label: 'Schedule', icon: Calendar, badge: 0 },
    { id: 'waypoints', label: 'Waypoints', icon: MapPin, badge: 0 },
    { id: 'seasonTicket', label: 'Season Tickets', icon: Ticket, badge: 0 },
    { id: 'contractors', label: 'Contractors', icon: ShieldCheck, badge: 0 },
    { id: 'power', label: 'Power', icon: Zap, badge: 0 },
    { id: 'admin', label: 'Fares', icon: CircleDollarSign, badge: 0 },
  ], [unmatchedCount])

  return (
    <div className="flex min-h-screen bg-[#0f172a] text-slate-200 font-sans selection:bg-purple-500/30">
      {/* Sidebar - Desktop */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 hidden lg:flex flex-col border-r border-slate-800 bg-slate-900/50 backdrop-blur-xl transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'w-20' : 'w-72'
          }`}
      >
        <div className="flex items-center h-20 px-6 border-b border-slate-800/50">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
              <Bus size={24} />
            </div>
            {!isSidebarCollapsed && (
              <div className="flex flex-col transition-opacity duration-300">
                <span className="text-lg font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent leading-none">
                  BusTrack
                </span>
                <span className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mt-1">
                  Fleet Engine
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 px-3 py-6 space-y-1 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`group flex items-center w-full px-3 py-3 rounded-xl transition-all duration-200 relative ${activeView === item.id
                ? 'bg-purple-500/10 text-purple-400 shadow-sm'
                : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                }`}
            >
              <item.icon
                size={22}
                className={`flex-shrink-0 transition-transform duration-200 group-hover:scale-110 ${activeView === item.id ? 'text-purple-400' : item.color || 'text-slate-400'
                  }`}
              />
              {!isSidebarCollapsed && (
                <span className="ml-3 font-medium text-sm whitespace-nowrap overflow-hidden transition-all duration-300">
                  {item.label}
                </span>
              )}

              {isSidebarCollapsed && (
                <div className="absolute left-full ml-4 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-[60]">
                  {item.label}
                </div>
              )}

              {item.badge > 0 && (
                <span className={`absolute ${isSidebarCollapsed ? 'top-2 right-2' : 'right-3'} flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm shadow-red-500/20 animate-pulse`}>
                  {item.badge}
                </span>
              )}

              {activeView === item.id && (
                <div className="absolute left-0 w-1 h-6 bg-purple-500 rounded-r-full" />
              )}
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-slate-800/50">
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="flex items-center justify-center w-full h-10 rounded-lg hover:bg-slate-800/50 text-slate-500 hover:text-slate-300 transition-colors"
          >
            {isSidebarCollapsed ? <ChevronRight size={20} /> : <div className="flex items-center gap-2"><ChevronLeft size={20} /> <span className="text-sm font-medium">Collapse</span></div>}
          </button>
        </div>
      </aside>

      <div className={`flex-1 flex flex-col min-h-screen max-w-full overflow-x-hidden transition-all duration-300 ${isSidebarCollapsed ? 'lg:ml-20' : 'lg:ml-72'}`}>
        <header className="sticky top-0 z-40 h-20 bg-slate-900/50 backdrop-blur-md border-b border-slate-800 px-4 sm:px-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 -ml-2 text-slate-400 hover:text-white"
            >
              <Menu size={24} />
            </button>
            <h2 className="text-lg font-semibold text-slate-100 hidden sm:block">
              {navItems.find(i => i.id === activeView)?.label || 'Dashboard'}
            </h2>
          </div>

          <div className="flex items-center gap-4 sm:gap-6">
            <div className="hidden sm:flex flex-col items-end mr-2">
              <span className="text-sm font-medium text-slate-200">{user.email}</span>
              <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">{user.role}</span>
            </div>

            <div className="relative group">
              <button className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white hover:border-slate-500 transition-all">
                <User size={20} />
              </button>
              <div className="absolute right-0 top-full mt-2 w-48 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all py-2 z-50">
                <div className="px-4 py-2 border-b border-slate-800 sm:hidden">
                  <p className="text-sm font-medium text-slate-200 truncate">{user.email}</p>
                  <p className="text-xs text-slate-500 capitalize">{user.role}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-2 text-red-400 hover:bg-red-500/10 transition-colors text-sm"
                >
                  <LogOut size={16} />
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-2 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <Suspense fallback={
              <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <LoadingSpinner size="lg" />
                <p className="text-slate-500 animate-pulse text-sm font-medium">Initializing modules...</p>
              </div>
            }>
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <Routes>
                  <Route path="/" element={<PassengersPage />} />
                  <Route path="/passengers" element={<Navigate to="/" replace />} />
                  <Route path="/unmatched" element={<UnmatchedPage />} />
                  <Route path="/trips" element={<TripsPage />} />
                  <Route path="/routes" element={<RoutesPage />} />
                  <Route path="/schedule" element={<SchedulePage />} />
                  <Route path="/waypoints" element={<WaypointsPage />} />
                  <Route path="/seasonTicket" element={<SeasonTicketsPage />} />
                  <Route path="/contractors" element={<ContractorsPage />} />
                  <Route path="/power" element={<PowerPage />} />
                  <Route path="/fares" element={<FaresPage />} />
                </Routes>
              </div>
            </Suspense>
          </div>
        </main>
      </div>

      {/* Mobile Sidebar */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[100] lg:hidden">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity" onClick={() => setMobileMenuOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-80 bg-slate-900 border-r border-slate-800 flex flex-col shadow-2xl animate-in slide-in-from-left duration-300">
            <div className="flex items-center justify-between h-20 px-6 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white">
                  <Bus size={24} />
                </div>
                <span className="text-lg font-bold text-white">BusTrack</span>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="p-2 text-slate-400 hover:text-white">
                <X size={24} />
              </button>
            </div>
            <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`flex items-center w-full px-4 py-3 rounded-xl transition-all ${activeView === item.id ? 'bg-purple-500/10 text-purple-400' : 'text-slate-400 hover:bg-slate-800'}`}
                >
                  <item.icon size={20} className="mr-4" />
                  <span className="font-medium">{item.label}</span>
                  {item.badge > 0 && <span className="ml-auto bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">{item.badge}</span>}
                </button>
              ))}
            </nav>
            <div className="p-6 border-t border-slate-800">
              <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-500 text-white font-semibold rounded-xl hover:bg-red-600 transition-all shadow-lg shadow-red-500/20">
                <LogOut size={20} />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #475569; }
      `}</style>
    </div>
  )
}

export default DashboardPage
