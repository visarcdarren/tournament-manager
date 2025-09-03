import React from 'react'
import { useState, useEffect } from 'react'
import { Toaster } from '@/components/ui/toaster'
import TournamentList from '@/components/tournament/TournamentList'
import TournamentView from '@/components/tournament/TournamentView'
import useDeviceStore from '@/stores/deviceStore'
import PWAInstallPrompt from '@/components/common/PWAInstallPrompt'

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
      <div className="min-h-screen bg-background text-foreground p-4 sm:p-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-lg sm:text-xl font-bold text-destructive mb-4">
            Application Error
          </h1>
          <pre className="bg-card p-4 rounded-lg overflow-auto text-xs sm:text-sm">
            {error}
          </pre>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
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
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 mx-auto border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p>Initializing...</p>
        </div>
      </div>
    )
  }
  
  return (
    <>
      <div className="min-h-screen bg-background text-foreground">
        {currentView === 'list' ? (
          <TournamentList />
        ) : (
          <TournamentView tournamentId={tournamentId} />
        )}
      </div>
      <PWAInstallPrompt />
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
