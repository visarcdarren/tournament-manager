import { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { useToast } from '@/hooks/use-toast'
import api from '@/utils/api'
import useTournamentStore from '@/stores/tournamentStore'
import { generateRandomTeamName } from '@/utils/teamNameGenerator'

export function useTeamManagement(tournament) {
  const { toast } = useToast()
  const tournamentStore = useTournamentStore()
  const [isStarting, setIsStarting] = useState(false)
  
  const addTeam = async (teamName) => {
    if (!teamName.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a team name',
        variant: 'destructive'
      })
      return false
    }
    
    const newTeam = {
      id: uuidv4(),
      name: teamName,
      players: []
    }
    
    const updatedTournament = {
      ...tournament,
      teams: [...tournament.teams, newTeam]
    }
    
    try {
      await api.updateTournament(tournament.id, updatedTournament)
      tournamentStore.setTournament(updatedTournament)
      toast({
        title: 'Success',
        description: 'Team added successfully'
      })
      return true
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add team',
        variant: 'destructive'
      })
      return false
    }
  }
  
  const updateTeamName = async (teamId, newName) => {
    const updatedTournament = {
      ...tournament,
      teams: tournament.teams.map(team =>
        team.id === teamId ? { ...team, name: newName } : team
      )
    }
    
    try {
      await api.updateTournament(tournament.id, updatedTournament)
      tournamentStore.setTournament(updatedTournament)
      toast({
        title: 'Success',
        description: 'Team name updated'
      })
      return true
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update team name',
        variant: 'destructive'
      })
      return false
    }
  }
  
  const deleteTeam = async (teamId) => {
    if (!confirm('Are you sure you want to delete this team?')) return false
    
    // Find the team to get its players
    const teamToDelete = tournament.teams.find(t => t.id === teamId)
    const unallocatedPlayers = tournament.playerPool || []
    
    const updatedTournament = {
      ...tournament,
      teams: tournament.teams.filter(team => team.id !== teamId),
      // Move team's players back to the pool
      playerPool: [...unallocatedPlayers, ...teamToDelete.players]
    }
    
    try {
      await api.updateTournament(tournament.id, updatedTournament)
      tournamentStore.setTournament(updatedTournament)
      toast({
        title: 'Success',
        description: `Team deleted. ${teamToDelete.players.length} players moved back to pool.`
      })
      return true
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete team',
        variant: 'destructive'
      })
      return false
    }
  }
  
  const generateNewTeamName = async () => {
    try {
      const existingNames = tournament.teams.map(team => team.name)
      let suggestedName = await generateRandomTeamName()
      
      // If by chance we get a duplicate, try a few more times
      let attempts = 0
      while (existingNames.includes(suggestedName) && attempts < 5) {
        suggestedName = await generateRandomTeamName()
        attempts++
      }
      
      return suggestedName
    } catch (error) {
      console.error('Error generating team name:', error)
      // Fallback to a simple name
      return 'Team ' + (tournament.teams.length + 1)
    }
  }
  
  const randomlyAllocateToTeam = async (team) => {
    const unallocatedPlayers = tournament.playerPool || []
    
    if (unallocatedPlayers.length === 0) {
      toast({
        title: 'No Players',
        description: 'No unallocated players available',
        variant: 'destructive'
      })
      return false
    }
    
    const availableSlots = tournament.settings.playersPerTeam - team.players.length
    if (availableSlots <= 0) {
      toast({
        title: 'Team Full',
        description: 'This team is already full',
        variant: 'destructive'
      })
      return false
    }
    
    // Randomly select players to fill the team
    const shuffled = [...unallocatedPlayers].sort(() => Math.random() - 0.5)
    const playersToAdd = shuffled.slice(0, Math.min(availableSlots, unallocatedPlayers.length))
    
    const updatedTournament = {
      ...tournament,
      teams: tournament.teams.map(t =>
        t.id === team.id
          ? { ...t, players: [...t.players, ...playersToAdd] }
          : t
      ),
      playerPool: unallocatedPlayers.filter(p => !playersToAdd.some(added => added.id === p.id))
    }
    
    try {
      await api.updateTournament(tournament.id, updatedTournament)
      tournamentStore.setTournament(updatedTournament)
      
      toast({
        title: 'Success',
        description: `Randomly added ${playersToAdd.length} player(s) to ${team.name}`
      })
      return true
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to allocate players',
        variant: 'destructive'
      })
      return false
    }
  }
  
  const autoFillAllTeams = async () => {
    const unallocatedPlayers = tournament.playerPool || []
    const shuffled = [...unallocatedPlayers].sort(() => Math.random() - 0.5)
    let playerIndex = 0
    
    const updatedTeams = tournament.teams.map(team => {
      const availableSlots = tournament.settings.playersPerTeam - team.players.length
      const playersToAdd = shuffled.slice(playerIndex, playerIndex + availableSlots)
      playerIndex += playersToAdd.length
      return {
        ...team,
        players: [...team.players, ...playersToAdd]
      }
    })
    
    const updatedTournament = {
      ...tournament,
      teams: updatedTeams,
      playerPool: shuffled.slice(playerIndex)
    }
    
    try {
      await api.updateTournament(tournament.id, updatedTournament)
      tournamentStore.setTournament(updatedTournament)
      toast({
        title: 'Success',
        description: `Allocated ${playerIndex} players to teams`
      })
      return true
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to allocate players',
        variant: 'destructive'
      })
      return false
    }
  }
  
  const startTournament = async (onNavigateToLive) => {
    setIsStarting(true)
    
    try {
      // Validate tournament setup first
      const validation = await api.validateTournament(tournament.id)
      
      if (!validation.valid) {
        toast({
          title: 'Cannot Start Tournament',
          description: validation.errors.join(', '),
          variant: 'destructive'
        })
        setIsStarting(false)
        return false
      }
      
      // Show warnings if any
      if (validation.warnings && validation.warnings.length > 0) {
        validation.warnings.forEach(warning => {
          toast({
            title: 'Warning',
            description: warning
          })
        })
      }
      
      // Generate schedule using the API
      const response = await api.generateSchedule(tournament.id)
      
      // Update the tournament store with the new data BEFORE navigating
      const updatedTournament = response.tournament || {
        ...tournament,
        currentState: {
          ...tournament.currentState,
          status: 'active',
          currentRound: tournament.currentState?.currentRound || 1
        },
        schedule: response.schedule || tournament.schedule
      }
      
      // Update the store immediately
      tournamentStore.setTournament(updatedTournament)
      
      // Now navigate to live tab
      if (onNavigateToLive) {
        onNavigateToLive()
      }
      
      toast({
        title: 'Tournament Started!',
        description: `Generated ${response.schedule.length} rounds with ${response.schedule.reduce((sum, r) => sum + r.games.length, 0)} total games`
      })
      return true
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to start tournament',
        variant: 'destructive'
      })
      return false
    } finally {
      setIsStarting(false)
    }
  }
  
  return {
    addTeam,
    updateTeamName,
    deleteTeam,
    generateNewTeamName,
    randomlyAllocateToTeam,
    autoFillAllTeams,
    startTournament,
    isStarting
  }
}
