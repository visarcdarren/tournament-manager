import { v4 as uuidv4 } from 'uuid'

// Fisher-Yates shuffle algorithm
export function shuffle(array) {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

// Generate round-robin schedule for 1v1 games
export function generateSchedule(tournament) {
  const { teams, settings } = tournament
  const { shuffleboards, dartboards, rounds } = settings
  
  const totalStations = shuffleboards + dartboards
  const gamesPerRound = totalStations
  const playersPerRound = gamesPerRound * 2
  
  // Get all active players with team info
  const allPlayers = []
  teams.forEach(team => {
    team.players.forEach(player => {
      if (player.status === 'active') {
        allPlayers.push({
          ...player,
          teamId: team.id,
          teamName: team.name
        })
      }
    })
  })
  
  if (allPlayers.length < playersPerRound) {
    throw new Error(`Not enough active players. Need at least ${playersPerRound}, have ${allPlayers.length}`)
  }
  
  const schedule = []
  const playerGameCount = new Map()
  const playerMatchups = new Map()
  const playerLastActivity = new Map()
  
  // Initialize tracking
  allPlayers.forEach(player => {
    playerGameCount.set(player.id, 0)
    playerMatchups.set(player.id, new Set())
    playerLastActivity.set(player.id, null)
  })
  
  // Generate stations array
  const stations = []
  for (let i = 1; i <= shuffleboards; i++) {
    stations.push({ type: 'shuffleboard', id: `shuffleboard-${i}` })
  }
  for (let i = 1; i <= dartboards; i++) {
    stations.push({ type: 'dartboard', id: `dartboard-${i}` })
  }
  
  // Generate schedule for each round
  for (let round = 1; round <= rounds; round++) {
    const roundGames = []
    const usedPlayers = new Set()
    
    // Sort players by game count (ascending) to ensure fair distribution
    const availablePlayers = allPlayers
      .filter(p => !usedPlayers.has(p.id))
      .sort((a, b) => {
        const countDiff = playerGameCount.get(a.id) - playerGameCount.get(b.id)
        if (countDiff !== 0) return countDiff
        
        // If same game count, prefer players who haven't played recently
        const aLast = playerLastActivity.get(a.id) || 0
        const bLast = playerLastActivity.get(b.id) || 0
        return aLast - bLast
      })
    
    // Assign games to stations
    for (const station of stations) {
      if (availablePlayers.length < 2) break
      
      // Find best pairing
      let bestPair = null
      let bestScore = -Infinity
      
      for (let i = 0; i < Math.min(availablePlayers.length, 10); i++) {
        for (let j = i + 1; j < Math.min(availablePlayers.length, 10); j++) {
          const p1 = availablePlayers[i]
          const p2 = availablePlayers[j]
          
          // Skip same team matchups
          if (p1.teamId === p2.teamId) continue
          
          // Calculate pairing score
          let score = 0
          
          // Prefer players who haven't played each other
          if (!playerMatchups.get(p1.id).has(p2.id)) score += 100
          
          // Prefer activity variety
          if (playerLastActivity.get(p1.id) !== station.type) score += 10
          if (playerLastActivity.get(p2.id) !== station.type) score += 10
          
          // Prefer lower game counts
          score -= (playerGameCount.get(p1.id) + playerGameCount.get(p2.id))
          
          if (score > bestScore) {
            bestScore = score
            bestPair = [p1, p2]
          }
        }
      }
      
      if (bestPair) {
        const [player1, player2] = bestPair
        
        // Create game
        const game = {
          id: uuidv4(),
          station: station.id,
          player1: {
            teamId: player1.teamId,
            teamName: player1.teamName,
            playerId: player1.id,
            playerName: player1.name
          },
          player2: {
            teamId: player2.teamId,
            teamName: player2.teamName,
            playerId: player2.id,
            playerName: player2.name
          },
          status: 'pending',
          result: null
        }
        
        roundGames.push(game)
        
        // Update tracking
        usedPlayers.add(player1.id)
        usedPlayers.add(player2.id)
        playerGameCount.set(player1.id, playerGameCount.get(player1.id) + 1)
        playerGameCount.set(player2.id, playerGameCount.get(player2.id) + 1)
        playerMatchups.get(player1.id).add(player2.id)
        playerMatchups.get(player2.id).add(player1.id)
        playerLastActivity.set(player1.id, station.type)
        playerLastActivity.set(player2.id, station.type)
        
        // Remove used players from available list
        const p1Index = availablePlayers.indexOf(player1)
        const p2Index = availablePlayers.indexOf(player2)
        if (p1Index > -1) availablePlayers.splice(p1Index, 1)
        if (p2Index > p1Index) availablePlayers.splice(p2Index - 1, 1)
        else if (p2Index > -1) availablePlayers.splice(p2Index, 1)
      }
    }
    
    // Remaining players are resting
    const restingPlayers = allPlayers
      .filter(p => !usedPlayers.has(p.id))
      .map(p => p.id)
    
    schedule.push({
      round,
      games: roundGames,
      restingPlayers,
      timer: {
        duration: 30,
        status: 'not-started'
      }
    })
  }
  
  return schedule
}

// Calculate team scores from game results
export function calculateScores(tournament) {
  const { teams, schedule, settings } = tournament
  const { scoring } = settings
  
  const teamScores = new Map()
  teams.forEach(team => {
    teamScores.set(team.id, {
      teamId: team.id,
      teamName: team.name,
      points: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      gamesPlayed: 0
    })
  })
  
  // Process all games
  schedule.forEach(round => {
    round.games.forEach(game => {
      if (game.result) { // Only check for result, not status
        // Handle both team-based and individual player games
        const team1Id = game.team1Players ? game.team1Players[0].teamId : game.player1.teamId
        const team2Id = game.team2Players ? game.team2Players[0].teamId : game.player2.teamId
        
        const team1Score = teamScores.get(team1Id)
        const team2Score = teamScores.get(team2Id)
        
        if (team1Score && team2Score) {
          team1Score.gamesPlayed++
          team2Score.gamesPlayed++
          
          if (game.result === 'team1-win' || game.result === 'player1-win') {
            team1Score.wins++
            team1Score.points += scoring.win
            team2Score.losses++
            team2Score.points += scoring.loss
          } else if (game.result === 'team2-win' || game.result === 'player2-win') {
            team2Score.wins++
            team2Score.points += scoring.win
            team1Score.losses++
            team1Score.points += scoring.loss
          } else if (game.result === 'draw') {
            team1Score.draws++
            team1Score.points += scoring.draw
            team2Score.draws++
            team2Score.points += scoring.draw
          }
        }
      }
    })
  })
  
  // Convert to array and sort
  return Array.from(teamScores.values()).sort((a, b) => {
    // Sort by points first
    if (b.points !== a.points) return b.points - a.points
    // Then by wins
    if (b.wins !== a.wins) return b.wins - a.wins
    // Then by games played (fewer is better)
    return a.gamesPlayed - b.gamesPlayed
  })
}

// Check if tournament is complete
export function isTournamentComplete(tournament) {
  if (!tournament?.schedule) return false
  
  // Tournament is complete if currentState says so
  if (tournament.currentState?.status === 'completed') return true
  
  // If schedule is empty or has no games, tournament is NOT complete
  if (tournament.schedule.length === 0) return false
  
  // Check if there are any games at all
  const totalGames = tournament.schedule.reduce((sum, round) => sum + (round.games?.length || 0), 0)
  if (totalGames === 0) return false
  
  // Tournament is complete only if ALL games have results
  return tournament.schedule.every(round =>
    round.games && round.games.length > 0 && round.games.every(game => game.result)
  )
}

// Get current round
export function getCurrentRound(tournament) {
  if (!tournament?.schedule) return 1
  
  // Use currentState if available
  if (tournament.currentState?.currentRound) {
    return tournament.currentState.currentRound
  }
  
  // Fallback: find first round with incomplete games
  for (const round of tournament.schedule) {
    const hasIncompleteGames = round.games.some(game => !game.result)
    if (hasIncompleteGames) return round.round
  }
  
  return tournament.schedule.length
}

// Format time
export function formatTime(ms) {
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

// Play sound effect
export function playSound(type) {
  const audio = new Audio()
  
  switch (type) {
    case 'countdown':
      // Simple beep sound using oscillator
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      oscillator.frequency.value = 800
      oscillator.type = 'sine'
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1)
      
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.1)
      break
      
    case 'timer-end':
      // Longer, lower tone for timer end
      const endContext = new (window.AudioContext || window.webkitAudioContext)()
      const endOscillator = endContext.createOscillator()
      const endGainNode = endContext.createGain()
      
      endOscillator.connect(endGainNode)
      endGainNode.connect(endContext.destination)
      
      endOscillator.frequency.value = 400
      endOscillator.type = 'sine'
      endGainNode.gain.setValueAtTime(0.5, endContext.currentTime)
      endGainNode.gain.exponentialRampToValueAtTime(0.01, endContext.currentTime + 0.5)
      
      endOscillator.start(endContext.currentTime)
      endOscillator.stop(endContext.currentTime + 0.5)
      break
  }
}
