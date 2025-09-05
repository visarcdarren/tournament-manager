import { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { useToast } from '@/hooks/use-toast'
import api from '@/utils/api'
import useTournamentStore from '@/stores/tournamentStore'

export function usePlayerManagement(tournament) {
  const { toast } = useToast()
  const tournamentStore = useTournamentStore()
  
  const addPlayerToTeam = async (teamId, playerData, addFromPool = false) => {
    let newPlayer
    
    if (addFromPool && playerData) {
      // Adding from pool
      newPlayer = playerData
    } else if (!addFromPool && playerData?.trim()) {
      // Adding new player directly
      newPlayer = {
        id: uuidv4(),
        name: playerData.trim(),
        status: 'active'
      }
    } else {
      toast({
        title: 'Error',
        description: addFromPool ? 'Please select a player' : 'Please enter a player name',
        variant: 'destructive'
      })
      return false
    }
    
    // Find the team
    const team = tournament.teams.find(t => t.id === teamId)
    if (!team) {
      toast({
        title: 'Error',
        description: 'Team not found',
        variant: 'destructive'
      })
      return false
    }
    
    // Check for duplicate in this team
    if (team.players.some(p => p.name.toLowerCase() === newPlayer.name.toLowerCase())) {
      toast({
        title: 'Error',
        description: 'This player is already on this team',
        variant: 'destructive'
      })
      return false
    }
    
    const unallocatedPlayers = tournament.playerPool || []
    const updatedTournament = {
      ...tournament,
      teams: tournament.teams.map(team =>
        team.id === teamId
          ? { ...team, players: [...team.players, newPlayer] }
          : team
      ),
      // Remove from pool if adding from pool
      playerPool: addFromPool 
        ? unallocatedPlayers.filter(p => p.id !== newPlayer.id)
        : unallocatedPlayers
    }
    
    try {
      await api.updateTournament(tournament.id, updatedTournament)
      tournamentStore.setTournament(updatedTournament)
      
      toast({
        title: 'Success',
        description: `${newPlayer.name} added to ${team.name}`
      })
      return { success: true, updatedTeam: updatedTournament.teams.find(t => t.id === teamId) }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add player',
        variant: 'destructive'
      })
      return false
    }
  }
  
  const removePlayerFromTeam = async (teamId, playerId, moveToPool = false) => {
    const team = tournament.teams.find(t => t.id === teamId)
    const player = team.players.find(p => p.id === playerId)
    
    if (!confirm(`Are you sure you want to remove ${player.name}${moveToPool ? ' (they will be moved back to the pool)' : ''}?`)) return false
    
    const unallocatedPlayers = tournament.playerPool || []
    const updatedTournament = {
      ...tournament,
      teams: tournament.teams.map(team =>
        team.id === teamId
          ? {
              ...team,
              players: team.players.filter(player => player.id !== playerId)
            }
          : team
      ),
      // Add to pool if requested
      playerPool: moveToPool ? [...unallocatedPlayers, player] : unallocatedPlayers
    }
    
    try {
      await api.updateTournament(tournament.id, updatedTournament)
      tournamentStore.setTournament(updatedTournament)
      
      toast({
        title: 'Success',
        description: moveToPool ? `${player.name} moved back to player pool` : `${player.name} removed`
      })
      return { success: true, updatedTeam: updatedTournament.teams.find(t => t.id === teamId) }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to remove player',
        variant: 'destructive'
      })
      return false
    }
  }
  
  const updatePlayerName = async (teamId, playerId, newName) => {
    const updatedTournament = {
      ...tournament,
      teams: tournament.teams.map(team =>
        team.id === teamId
          ? {
              ...team,
              players: team.players.map(player =>
                player.id === playerId ? { ...player, name: newName } : player
              )
            }
          : team
      )
    }
    
    try {
      await api.updateTournament(tournament.id, updatedTournament)
      tournamentStore.setTournament(updatedTournament)
      toast({
        title: 'Success',
        description: 'Player name updated'
      })
      return true
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update player name',
        variant: 'destructive'
      })
      return false
    }
  }
  
  const togglePlayerStatus = async (teamId, playerId) => {
    const team = tournament.teams.find(t => t.id === teamId)
    const player = team.players.find(p => p.id === playerId)
    const newStatus = player.status === 'active' ? 'inactive' : 'active'
    
    const updatedTournament = {
      ...tournament,
      teams: tournament.teams.map(team =>
        team.id === teamId
          ? {
              ...team,
              players: team.players.map(player =>
                player.id === playerId ? { ...player, status: newStatus } : player
              )
            }
          : team
      )
    }
    
    try {
      await api.updateTournament(tournament.id, updatedTournament)
      tournamentStore.setTournament(updatedTournament)
      
      toast({
        title: 'Success',
        description: `${player.name} marked as ${newStatus}${newStatus === 'inactive' ? ' (will not play)' : ''}`
      })
      return { success: true, updatedTeam: updatedTournament.teams.find(t => t.id === teamId) }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update player status',
        variant: 'destructive'
      })
      return false
    }
  }
  
  const updateAllPlayersStatus = async (teamId, status) => {
    const team = tournament.teams.find(t => t.id === teamId)
    if (!team) return false
    
    const actionText = status === 'active' ? 'active' : 'dropped out'
    const confirmText = status === 'inactive' ? `Mark all ${team.players.length} players as dropped out?` : null
    
    if (confirmText && !confirm(confirmText)) return false
    
    const updatedTournament = {
      ...tournament,
      teams: tournament.teams.map(team =>
        team.id === teamId
          ? {
              ...team,
              players: team.players.map(player => ({ ...player, status }))
            }
          : team
      )
    }
    
    try {
      await api.updateTournament(tournament.id, updatedTournament)
      tournamentStore.setTournament(updatedTournament)
      
      toast({
        title: 'Success',
        description: `All ${team.players.length} players marked as ${actionText}`
      })
      return { success: true, updatedTeam: updatedTournament.teams.find(t => t.id === teamId) }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update player status',
        variant: 'destructive'
      })
      return false
    }
  }
  
  return {
    addPlayerToTeam,
    removePlayerFromTeam,
    updatePlayerName,
    togglePlayerStatus,
    updateAllPlayersStatus
  }
}
