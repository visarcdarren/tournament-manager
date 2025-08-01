import React from 'react'
import { useState, useEffect } from 'react'
import { Toaster } from '@/components/ui/toaster'
import TournamentList from '@/components/tournament/TournamentList'
import TournamentView from '@/components/tournament/TournamentView'
import useDeviceStore from '@/stores/deviceStore'

function App() {
  const [currentView, setCurrentView] = useState('list')
  const [tournamentId, setTournamentId] = useState(null)
  const deviceStore = useDeviceStore()
  
  // Initialize device
  useEffect(() => {
    deviceStore.initializeDevice()
    window.deviceStore = deviceStore
  }, [])
  
  // Simple routing based on URL
  useEffect(() => {
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
  }, [])
  
  // Navigation function
  const navigate = (path) => {
    window.history.pushState({}, '', path)
    if (path.startsWith('/tournament/')) {
      const id = path.split('/')[2]
      setTournamentId(id)
      setCurrentView('tournament')
    } else {
      setCurrentView('list')
    }
  }
  
  // Provide navigation context
  window.navigate = navigate
  
  return (
    <>
      {currentView === 'list' ? (
        <TournamentList />
      ) : (
        <TournamentView tournamentId={tournamentId} />
      )}
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
