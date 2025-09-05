import { UserCheck, UserX } from 'lucide-react'

/**
 * Calculate tournament progress and statistics
 */
export function calculateTournamentStats(tournament) {
  const totalPlayers = tournament.teams.reduce((sum, team) => sum + team.players.length, 0)
  const activePlayers = tournament.teams.reduce((sum, team) => 
    sum + team.players.filter(p => p.status === 'active').length, 0
  )
  const targetPlayers = tournament.settings.teams * tournament.settings.playersPerTeam
  const unallocatedPlayers = tournament.playerPool || []
  const hasUnallocatedPlayers = unallocatedPlayers.length > 0
  
  // Setup is complete when we have enough total players allocated
  // The schedule generator will validate that we have enough active players
  const isSetupComplete = totalPlayers >= targetPlayers && tournament.teams.length === tournament.settings.teams
  
  const progressPercentage = Math.min(100, (totalPlayers / targetPlayers) * 100)
  
  return {
    totalPlayers,
    activePlayers,
    targetPlayers,
    unallocatedPlayers,
    hasUnallocatedPlayers,
    isSetupComplete,
    progressPercentage
  }
}

/**
 * Get player status information including icon and styling
 */
export function getPlayerStatusInfo(player) {
  const status = player.status || 'active'
  switch (status) {
    case 'active':
      return { color: 'text-green-600', icon: UserCheck, label: 'Active' }
    case 'inactive':
      return { color: 'text-red-600', icon: UserX, label: 'Inactive' }
    default:
      return { color: 'text-green-600', icon: UserCheck, label: 'Active' }
  }
}

/**
 * Validate tournament setup before starting
 */
export function validateTournamentSetup(tournament) {
  const stats = calculateTournamentStats(tournament)
  const errors = []
  const warnings = []
  
  // Check if we have the required number of teams
  if (tournament.teams.length < tournament.settings.teams) {
    errors.push(`Need ${tournament.settings.teams - tournament.teams.length} more team(s)`)
  }
  
  // Check if we have enough total players
  if (stats.totalPlayers < stats.targetPlayers) {
    errors.push(`Need ${stats.targetPlayers - stats.totalPlayers} more player(s)`)
  }
  
  // Warn about inactive players
  if (stats.activePlayers < stats.targetPlayers && stats.totalPlayers >= stats.targetPlayers) {
    warnings.push(`Only ${stats.activePlayers} of ${stats.totalPlayers} players are active`)
  }
  
  // Warn about unallocated players
  if (stats.hasUnallocatedPlayers) {
    warnings.push(`${stats.unallocatedPlayers.length} player(s) remain unallocated`)
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Format player count display
 */
export function formatPlayerCount(current, total, activeCount) {
  let display = `${current} of ${total} players`
  
  if (activeCount !== undefined && activeCount !== current) {
    display += ` (${activeCount} active)`
  }
  
  return display
}

/**
 * Get status message for tournament setup
 */
export function getSetupStatusMessage(tournament) {
  const stats = calculateTournamentStats(tournament)
  const validation = validateTournamentSetup(tournament)
  
  if (!validation.isValid) {
    if (tournament.teams.length < tournament.settings.teams) {
      return {
        type: 'warning',
        message: `Add ${tournament.settings.teams - tournament.teams.length} more team(s)`
      }
    } else {
      return {
        type: 'warning',
        message: `Allocate ${stats.targetPlayers - stats.totalPlayers} more player(s) to start`
      }
    }
  }
  
  if (stats.activePlayers < stats.targetPlayers) {
    return {
      type: 'info',
      message: `Warning: Only ${stats.activePlayers} of ${stats.totalPlayers} players are active. Some players may need to be reactivated before starting.`
    }
  }
  
  if (stats.hasUnallocatedPlayers) {
    return {
      type: 'info',
      message: `${stats.unallocatedPlayers.length} player(s) available for allocation`
    }
  }
  
  return {
    type: 'success',
    message: 'Tournament setup complete and ready to start!'
  }
}
