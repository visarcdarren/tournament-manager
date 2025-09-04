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
  connectionQuality: 'good', // good, fair, poor
  
  // Timer state
  timerStatus: {},
  
  // Time sync
  serverTimeOffset: 0, // Difference between server and client time
  lastHeartbeat: null,
  
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
  
  // Update timer status with server time sync
  updateTimerStatus: (round, status, serverTime) => set((state) => {
    const now = Date.now();
    let syncedStatus = { ...status };
    
    // If server time is provided, update our offset
    if (serverTime) {
      const newOffset = serverTime - now;
      // Only update offset if the change is significant (> 100ms)
      if (Math.abs(newOffset - state.serverTimeOffset) > 100) {
        state.serverTimeOffset = newOffset;
      }
    }
    
    // Apply time sync correction to timer calculations
    if (syncedStatus.expiresAt && state.serverTimeOffset) {
      // Adjust client calculations using server time offset
      const serverNow = now + state.serverTimeOffset;
      if (syncedStatus.status === 'running') {
        syncedStatus.remainingMs = Math.max(0, syncedStatus.expiresAt - serverNow);
      }
    }
    
    return {
      timerStatus: { ...state.timerStatus, [round]: syncedStatus },
      serverTimeOffset: state.serverTimeOffset
    };
  }),
  
  // Update connection quality based on heartbeat timing
  updateConnectionQuality: () => set((state) => {
    const now = Date.now();
    if (!state.lastHeartbeat) {
      return { connectionQuality: 'good', lastHeartbeat: now };
    }
    
    const timeSinceLastHeartbeat = now - state.lastHeartbeat;
    let quality = 'good';
    
    if (timeSinceLastHeartbeat > 15000) { // 15 seconds
      quality = 'poor';
    } else if (timeSinceLastHeartbeat > 10000) { // 10 seconds
      quality = 'fair';
    }
    
    return { connectionQuality: quality, lastHeartbeat: now };
  }),
  
  // Handle heartbeat from server
  handleHeartbeat: (serverTime) => set((state) => {
    const now = Date.now();
    const newOffset = serverTime - now;
    
    return {
      lastHeartbeat: now,
      serverTimeOffset: newOffset,
      connectionQuality: 'good'
    };
  }),
  
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
      connectionQuality: 'good',
      timerStatus: {},
      serverTimeOffset: 0,
      lastHeartbeat: null,
      pendingRequests: []
    })
  }
}))

export default useTournamentStore
