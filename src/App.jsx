import { Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect, useRef, useCallback } from 'react'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import './App.css'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState(null)
  const [isInitializing, setIsInitializing] = useState(true)
  const dashboardRef = useRef(null)

  // Restore authentication state from localStorage on mount
  useEffect(() => {
    const userData = localStorage.getItem('user')
    const token = localStorage.getItem('accessToken')
    if (userData && token) {
      setUser(JSON.parse(userData))
      setIsAuthenticated(true)
    }
    setIsInitializing(false)
  }, [])

  const handleLogin = () => {
    const userData = localStorage.getItem('user')
    if (userData) {
      setUser(JSON.parse(userData))
    }
    setIsAuthenticated(true)
  }

  const handleLogout = () => {
    setUser(null)
    setIsAuthenticated(false)
  }

  // Function to refresh categories from Dashboard
  const refreshCategories = useCallback(() => {
    if (dashboardRef.current) {
      dashboardRef.current.refreshCategories()
    }
  }, [])

  // Auto-refresh categories every hour to keep them in sync
  useEffect(() => {
    if (!isAuthenticated) return
    
    const interval = setInterval(() => {
      refreshCategories()
    }, 3600000) // Refresh every 1 hour (3600000 ms)

    return () => clearInterval(interval)
  }, [isAuthenticated, refreshCategories])

  // Show nothing while initializing to prevent flickering
  if (isInitializing) {
    return (
      <div className="app">
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          color: 'white',
          fontSize: '16px',
          fontWeight: '600'
        }}>
          Loading...
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <Routes>
        <Route path="/login" element={
          isAuthenticated ? <Navigate to="/dashboard" /> : <Login onLogin={handleLogin} />
        } />
        <Route path="/dashboard" element={
          isAuthenticated ? <Dashboard ref={dashboardRef} user={user} onLogout={handleLogout} /> : <Navigate to="/login" />
        } />
        <Route path="/" element={<Navigate to="/login" />} />
      </Routes>
    </div>
  )
}

export default App