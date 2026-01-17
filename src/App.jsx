import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { checkAuth } from './utils/auth'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import NotFoundPage from './pages/NotFoundPage'
import ProtectedRoute from './components/ProtectedRoute'
import LoadingSpinner from './components/LoadingSpinner'

function App() {
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    const verifyAuth = async () => {
      const authData = await checkAuth()
      if (authData?.success) {
        setUser(authData.user)
      }
      setAuthLoading(false)
    }
    verifyAuth()
  }, [])

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <LoadingSpinner size="xl" text="Checking authentication..." />
      </div>
    )
  }

  return (
    <Router>
      <Toaster position="top-right" toastOptions={{
        duration: 3000,
        style: {
          background: '#1e293b',
          color: '#fff',
          border: '1px solid rgba(139, 92, 246, 0.3)',
        },
        success: {
          duration: 3000,
          iconTheme: {
            primary: '#10b981',
            secondary: '#fff',
          },
        },
        error: {
          duration: 4000,
          iconTheme: {
            primary: '#ef4444',
            secondary: '#fff',
          },
        },
      }} />

      <Routes>
        {/* Login Route - Redirect to dashboard if already logged in */}
        <Route
          path="/login"
          element={
            user ? (
              <Navigate to="/" replace />
            ) : (
              <LoginPage onLoginSuccess={setUser} />
            )
          }
        />

        {/* Protected Dashboard Route */}
        <Route
          path="/*"
          element={
            <ProtectedRoute user={user}>
              <DashboardPage user={user} setUser={setUser} />
            </ProtectedRoute>
          }
        />

        {/* 404 Not Found - Catch all other routes */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Router>
  )
}

export default App
