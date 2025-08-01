// In production, use relative URLs so it works with any domain
// In development, use the Vite proxy
const API_BASE_URL = import.meta.env.DEV ? '/api' : '/api'

class TournamentAPI {
  constructor() {
    this.baseURL = API_BASE_URL
  }
  
  // Helper to get auth headers
  getHeaders(additionalHeaders = {}) {
    const deviceStore = window.deviceStore
    if (!deviceStore) return additionalHeaders
    
    return {
      'Content-Type': 'application/json',
      ...deviceStore.getAuthHeaders(),
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
  
  // Role management
  async requestRole(tournamentId, data) {
    return this.fetch(`/tournament/${tournamentId}/request-role`, {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }
  
  async grantRole(tournamentId, data) {
    return this.fetch(`/tournament/${tournamentId}/grant-role`, {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }
  
  async revokeRole(tournamentId, deviceId) {
    return this.fetch(`/tournament/${tournamentId}/revoke-role`, {
      method: 'POST',
      body: JSON.stringify({ deviceId })
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
  
  // SSE connection
  connectToEvents(tournamentId, handlers) {
    const eventSource = new EventSource(
      `${this.baseURL}/tournament/${tournamentId}/events`,
      { withCredentials: true }
    )
    
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
