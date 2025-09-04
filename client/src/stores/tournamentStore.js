import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'

const useTournamentStore = create((set, get) => ({
  // Current tournament data
  tournament: null,
  isLoading: false,
  error: null,
  userRole: 'VIEWER',
  
  // SSE connection
  eventSource: null,
  isConnected: false,
  
  // Timer state
  timerStatus: {},
  
  // Pending requests
  pendingRequests: [],
  
  // Set tournament data
  setTournament: (tournament) => set((state) => {
    // Initialize timer status from server data
    const timerStatus = {}
    if (tournament?.schedule) {
      tournament.schedule.forEach(round => {
        if (round.timer) {
          // Use server timer state as source of truth
          timerStatus[round.round] = { ...round.timer }
        } else {
          timerStatus[round.round] = { status: 'not-started' }
        }
      })
    }
    return { tournament, timerStatus }
  }),
  
  // Set user role
  setUserRole: (role) => set({ userRole: role }),
  
  // Update specific tournament fields
  updateTournament: (updates) => set((state) => ({
    tournament: state.tournament ? { ...state.tournament, ...updates } : null
  })),
  
  // Update game result
  updateGameResult: (roundNum, gameId, result) => set((state) => {
    if (!state.tournament) return state
    
    const newTournament = { ...state.tournament }
    const round = newTournament.schedule.find(r => r.round === roundNum)
    if (round) {
      const game = round.games.find(g => g.id === gameId)
      if (game) {
        game.result = result
        game.status = 'completed'
      }
    }
    
    return { tournament: newTournament }
  }),
  
  // Update timer status
  updateTimerStatus: (round, status) => set((state) => ({
    timerStatus: { ...state.timerStatus, [round]: status }
  })),
  
  // Set pending requests
  setPendingRequests: (requests) => set({ pendingRequests: requests }),
  
  // Loading states
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  
  // SSE connection management
  setEventSource: (eventSource) => set({ eventSource }),
  setConnected: (isConnected) => set({ isConnected }),
  
  // Clean up
  reset: () => {
    const { eventSource } = get()
    if (eventSource) {
      eventSource.close()
    }
    set({
      tournament: null,
      isLoading: false,
      error: null,
      userRole: 'VIEWER',
      eventSource: null,
      isConnected: false,
      timerStatus: {},
      pendingRequests: []
    })
  }
}))

export default useTournamentStore
