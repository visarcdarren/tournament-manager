// In production, use relative URLs so it works with any domain
// In development, use the Vite proxy
const API_BASE_URL = import.meta.env.DEV ? '/api' : '/api'

// Import the device store to get device ID reliably
import useDeviceStore from '../stores/deviceStore'

class TournamentAPI {
  constructor() {
    this.baseURL = API_BASE_URL
  }
  
  // Helper to get auth headers
  getHeaders(additionalHeaders = {}) {
    // Always use the current device store state
    const deviceStore = useDeviceStore.getState()
    
    if (!deviceStore || !deviceStore.deviceId) {
      console.error('Device store not properly initialized!')
      return { 'Content-Type': 'application/json', ...additionalHeaders }
    }
    
    return {
      'Content-Type': 'application/json',
      'X-Device-ID': deviceStore.deviceId,
      'X-Device-Name': deviceStore.deviceName || 'Unknown Device',
      ...additionalHeaders
    }
  }
  
  // Generic fetch wrapper
  async fetch(url, options = {}) {
    const response = await fetch(`${this.baseURL}${url}`, {
      ...options,
      headers: this.getHeaders(options.headers)
    })
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Network error' }))
      throw new Error(error.error || `HTTP ${response.status}`)
    }
    
    return response.json()
  }
  
  // Tournament CRUD
  async getTournaments() {
    return this.fetch('/tournaments')
  }
  
  async getTournament(id) {
    return this.fetch(`/tournament/${id}`)
  }
  
  async createTournament(data) {
    return this.fetch('/tournaments', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }
  
  async updateTournament(id, data) {
    return this.fetch(`/tournament/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    })
  }
  
  async validateTournament(id) {
    return this.fetch(`/tournament/${id}/validate`, {
      method: 'POST'
    })
  }
  
  async generateSchedule(id) {
    return this.fetch(`/tournament/${id}/generate-schedule`, {
      method: 'POST'
    })
  }
  
  async previewSchedule(id) {
    return this.fetch(`/tournament/${id}/preview-schedule`, {
      method: 'POST'
    })
  }
  
  // Removed: Role management (no longer needed)
  // The system is now simplified to creator-only control
  
  // Public/Private toggle
  async toggleTournamentPublic(tournamentId) {
    return this.fetch(`/tournament/${tournamentId}/toggle-public`, {
      method: 'POST'
    })
  }
  
  // Game scoring
  async scoreGame(tournamentId, gameId, result) {
    return this.fetch(`/tournament/${tournamentId}/score`, {
      method: 'POST',
      body: JSON.stringify({ gameId, result })
    })
  }
  
  // Timer control
  async startTimer(tournamentId, round, duration) {
    return this.fetch(`/tournament/${tournamentId}/round/${round}/timer/start`, {
      method: 'POST',
      body: JSON.stringify({ duration })
    })
  }
  
  async getTimerStatus(tournamentId, round) {
    return this.fetch(`/tournament/${tournamentId}/round/${round}/timer`)
  }
  
  // Audit log
  async getAuditLog(tournamentId) {
    return this.fetch(`/tournament/${tournamentId}/audit`)
  }
  
  // Export/Import
  async exportTournament(tournamentId) {
    const response = await fetch(`${this.baseURL}/tournament/${tournamentId}/export`, {
      headers: this.getHeaders()
    })
    
    if (!response.ok) {
      throw new Error(`Export failed: HTTP ${response.status}`)
    }
    
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `tournament-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }
  
  async importTournament(data) {
    return this.fetch('/tournament/import', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }
  
  async deleteTournament(id) {
    return this.fetch(`/tournament/${id}`, {
      method: 'DELETE'
    })
  }
  
  // SSE connection
  connectToEvents(tournamentId, handlers) {
    const deviceStore = useDeviceStore.getState()
    const deviceId = deviceStore.deviceId
    
    if (!deviceId) {
      console.error('No device ID available for SSE connection')
      return null
    }
    
    // Build the full URL - for SSE we need the full path including the host in production
    const baseUrl = window.location.origin
    const sseUrl = `${baseUrl}${this.baseURL}/tournament/${tournamentId}/events?deviceId=${deviceId}`
    
    console.log('Connecting to SSE:', sseUrl, 'with device ID:', deviceId)
    
    const eventSource = new EventSource(sseUrl)
    
    eventSource.onopen = () => {
      console.log('SSE connection opened')
    }
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        
        if (handlers[data.type]) {
          handlers[data.type](data.data)
        }
      } catch (e) {
        console.error('Failed to parse SSE message:', e)
      }
    }
    
    eventSource.onerror = (error) => {
      console.error('SSE connection error:', error)
      if (handlers.error) {
        handlers.error(error)
      }
    }
    
    return eventSource
  }
}

export default new TournamentAPI()
