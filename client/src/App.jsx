import React from 'react'
import { useState, useEffect } from 'react'
import { Toaster } from '@/components/ui/toaster'
import TournamentList from '@/components/tournament/TournamentList'
import TournamentView from '@/components/tournament/TournamentView'
import useDeviceStore from '@/stores/deviceStore'

function App() {
  const [currentView, setCurrentView] = useState('list')
  const [tournamentId, setTournamentId] = useState(null)
  const [error, setError] = useState(null)
  const [isInitialized, setIsInitialized] = useState(false)
  
  // Initialize device store
  useEffect(() => {
    try {
      useDeviceStore.getState().initializeDevice()
      window.deviceStore = useDeviceStore.getState()
      setIsInitialized(true)
      console.log('Device initialized with permanent ID:', useDeviceStore.getState().deviceId)
    } catch (e) {
      console.error('Failed to initialize device store:', e)
      setError(e.message)
    }
  }, [])
  
  // Simple routing based on URL
  useEffect(() => {
    try {
      const path = window.location.pathname
      if (path.startsWith('/tournament/')) {
        const id = path.split('/')[2]
        setTournamentId(id)
        setCurrentView('tournament')
      } else {
        setCurrentView('list')
      }
      
      // Handle browser navigation
      const handlePopState = () => {
        const path = window.location.pathname
        if (path.startsWith('/tournament/')) {
          const id = path.split('/')[2]
          setTournamentId(id)
          setCurrentView('tournament')
        } else {
          setCurrentView('list')
        }
      }
      
      window.addEventListener('popstate', handlePopState)
      return () => window.removeEventListener('popstate', handlePopState)
    } catch (e) {
      console.error('Routing error:', e)
      setError(e.message)
    }
  }, [])
  
  // Navigation function
  const navigate = (path) => {
    try {
      window.history.pushState({}, '', path)
      if (path.startsWith('/tournament/')) {
        const id = path.split('/')[2]
        setTournamentId(id)
        setCurrentView('tournament')
      } else {
        setCurrentView('list')
      }
    } catch (e) {
      console.error('Navigation error:', e)
      setError(e.message)
    }
  }
  
  // Provide navigation context
  window.navigate = navigate
  
  // Error display
  if (error) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#0f172a', color: '#f8fafc', padding: '2rem' }}>
        <div style={{ maxWidth: '42rem', margin: '0 auto' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ef4444', marginBottom: '1rem' }}>
            Application Error
          </h1>
          <pre style={{ backgroundColor: '#1e293b', padding: '1rem', borderRadius: '0.5rem', overflow: 'auto' }}>
            {error}
          </pre>
          <button 
            onClick={() => window.location.reload()} 
            style={{
              marginTop: '1rem',
              padding: '0.5rem 1rem',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '0.25rem',
              cursor: 'pointer'
            }}
          >
            Reload Page
          </button>
        </div>
      </div>
    )
  }
  
  // Wait for initialization
  if (!isInitialized) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#0f172a', color: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            marginBottom: '1rem',
            height: '2rem',
            width: '2rem',
            border: '4px solid #3b82f6',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto'
          }}></div>
          <p>Initializing...</p>
        </div>
      </div>
    )
  }
  
  return (
    <>
      <div className="min-h-screen" style={{ backgroundColor: '#0f172a', color: '#f8fafc' }}>
        {currentView === 'list' ? (
          <TournamentList />
        ) : (
          <TournamentView tournamentId={tournamentId} />
        )}
      </div>
      <Toaster />
    </>
  )
}

// Simple navigation hook
export const useNavigate = () => {
  return (path) => {
    if (window.navigate) {
      window.navigate(path)
    } else {
      window.location.href = path
    }
  }
}

export default App
