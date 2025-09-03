import React, { useState, useEffect, useRef } from 'react'
import { Plus, Edit2, Trash2, Users, UserPlus, Check, X, Play, AlertCircle, Shuffle, Eye, ArrowLeft, Search } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import api from '@/utils/api'
import useTournamentStore from '@/stores/tournamentStore'
import { v4 as uuidv4 } from 'uuid'
import { generateRandomTeamName } from '@/utils/teamNameGenerator'
import ScheduleViewer from './ScheduleViewer'

// Searchable Combobox Component
function PlayerCombobox({ value, onSelect, unallocatedPlayers, placeholder = "Select or type player name..." }) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState(value || '')
  const inputRef = useRef(null)
  const dropdownRef = useRef(null)
  
  const filteredPlayers = unallocatedPlayers.filter(player =>
    player.name.toLowerCase().includes(searchTerm.toLowerCase())
  )
  
  const handleSelect = (player) => {
    setSearchTerm(player.name)
    setIsOpen(false)
    onSelect(player)
  }
  
  const handleInputChange = (e) => {
    setSearchTerm(e.target.value)
    setIsOpen(true)
  }
  
  const handleInputKeyDown = (e) => {
    if (e.key === 'ArrowDown' && filteredPlayers.length > 0) {
      e.preventDefault()
      setIsOpen(true)
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }
  
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) &&
          inputRef.current && !inputRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
  
  // Reset when value prop changes
  useEffect(() => {
    setSearchTerm(value || '')
  }, [value])
  
  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={searchTerm}
          onChange={handleInputChange}
          onKeyDown={handleInputKeyDown}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="pl-10"
        />
      </div>
      
      {isOpen && filteredPlayers.length > 0 && (
        <div 
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto"
        >
          {filteredPlayers.map(player => (
            <button
              key={player.id}
              onClick={() => handleSelect(player)}
              className="w-full text-left px-3 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
            >
              <div className="font-medium">{player.name}</div>
            </button>
          ))}
        </div>
      )}
      
      {isOpen && searchTerm && filteredPlayers.length === 0 && unallocatedPlayers.length > 0 && (
        <div 
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg p-3"
        >
          <div className="text-sm text-muted-foreground">No players match "{searchTerm}"</div>
        </div>
      )}
    </div>
  )
}

export default function TeamManagement({ tournament, isAdmin }) {
  const { toast } = useToast()
  const tournamentStore = useTournamentStore()
  
  // Safety check: ensure tournament data is loaded
  if (!tournament || !tournament.teams || !tournament.settings) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-muted-foreground">Loading tournament data...</p>
        </div>
      </div>
    )
  }
  const [showAddTeam, setShowAddTeam] = useState(false)
  const [showAddPlayer, setShowAddPlayer] = useState(false)
  const [selectedTeam, setSelectedTeam] = useState(null)
  const [editingTeam, setEditingTeam] = useState(null)
  const [editingPlayer, setEditingPlayer] = useState(null)
  const [newTeamName, setNewTeamName] = useState('')
  const [newPlayerName, setNewPlayerName] = useState('')
  const [selectedPlayerFromPool, setSelectedPlayerFromPool] = useState(null)
  const [isStarting, setIsStarting] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [previewData, setPreviewData] = useState(null)
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false)
  
  const canEdit = isAdmin && tournament.currentState.status === 'setup'
  const totalPlayers = tournament.teams.reduce((sum, team) => sum + team.players.length, 0)
  const targetPlayers = tournament.settings.teams * tournament.settings.playersPerTeam
  const isSetupComplete = totalPlayers === targetPlayers && tournament.teams.length === tournament.settings.teams
  
  const unallocatedPlayers = tournament.playerPool || []
  const hasUnallocatedPlayers = unallocatedPlayers.length > 0
  
  // Generate a new team name suggestion
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
      
      setNewTeamName(suggestedName)
    } catch (error) {
      console.error('Error generating team name:', error)
      // Fallback to a simple name
      setNewTeamName('Team ' + (tournament.teams.length + 1))
    }
  }
  
  // Auto-generate a team name when the add team dialog opens
  useEffect(() => {
    if (showAddTeam && !newTeamName) {
      generateNewTeamName()
    }
  }, [showAddTeam])
  
  const addTeam = async () => {
    if (!newTeamName.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a team name',
        variant: 'destructive'
      })
      return
    }
    
    const newTeam = {
      id: uuidv4(),
      name: newTeamName,
      players: []
    }
    
    const updatedTournament = {
      ...tournament,
      teams: [...tournament.teams, newTeam]
    }
    
    try {
      await api.updateTournament(tournament.id, updatedTournament)
      tournamentStore.setTournament(updatedTournament)
      setShowAddTeam(false)
      setNewTeamName('')
      toast({
        title: 'Success',
        description: 'Team added successfully'
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add team',
        variant: 'destructive'
      })
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
      setEditingTeam(null)
      toast({
        title: 'Success',
        description: 'Team name updated'
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update team name',
        variant: 'destructive'
      })
    }
  }
  
  const deleteTeam = async (teamId) => {
    if (!confirm('Are you sure you want to delete this team?')) return
    
    // Find the team to get its players
    const teamToDelete = tournament.teams.find(t => t.id === teamId)
    
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
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete team',
        variant: 'destructive'
      })
    }
  }
  
  const addPlayerToTeam = async (addFromPool = false) => {
    let newPlayer
    
    if (addFromPool && selectedPlayerFromPool) {
      // Adding from pool
      newPlayer = selectedPlayerFromPool
    } else if (!addFromPool && newPlayerName.trim()) {
      // Adding new player directly
      newPlayer = {
        id: uuidv4(),
        name: newPlayerName.trim(),
        status: 'active'
      }
    } else {
      toast({
        title: 'Error',
        description: addFromPool ? 'Please select a player' : 'Please enter a player name',
        variant: 'destructive'
      })
      return
    }
    
    // Check for duplicate in this team
    if (selectedTeam && selectedTeam.players.some(p => p.name.toLowerCase() === newPlayer.name.toLowerCase())) {
      toast({
        title: 'Error',
        description: 'This player is already on this team',
        variant: 'destructive'
      })
      return
    }
    
    if (!selectedTeam) {
      toast({
        title: 'Error',
        description: 'No team selected',
        variant: 'destructive'
      })
      return
    }

    const updatedTournament = {
      ...tournament,
      teams: tournament.teams.map(team =>
        team.id === selectedTeam.id
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
      setNewPlayerName('')
      setSelectedPlayerFromPool(null)
      
      // Update selected team
      setSelectedTeam({
        ...selectedTeam,
        players: [...selectedTeam.players, newPlayer]
      })
      
      toast({
        title: 'Success',
        description: `${newPlayer.name} added to ${selectedTeam.name}`
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add player',
        variant: 'destructive'
      })
    }
  }
  
  const removePlayerFromTeam = async (teamId, playerId, moveToPool = false) => {
    const team = tournament.teams.find(t => t.id === teamId)
    const player = team.players.find(p => p.id === playerId)
    
    if (!confirm(`Are you sure you want to remove ${player.name}${moveToPool ? ' (they will be moved back to the pool)' : ''}?`)) return
    
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
      
      // Update selected team if viewing
      if (selectedTeam?.id === teamId) {
        setSelectedTeam({
          ...selectedTeam,
          players: selectedTeam.players.filter(p => p.id !== playerId)
        })
      }
      
      toast({
        title: 'Success',
        description: moveToPool ? `${player.name} moved back to player pool` : `${player.name} removed`
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to remove player',
        variant: 'destructive'
      })
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
      setEditingPlayer(null)
      toast({
        title: 'Success',
        description: 'Player name updated'
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update player name',
        variant: 'destructive'
      })
    }
  }
  
  const randomlyAllocateToTeam = async (team) => {
    if (unallocatedPlayers.length === 0) {
      toast({
        title: 'No Players',
        description: 'No unallocated players available',
        variant: 'destructive'
      })
      return
    }
    
    const availableSlots = tournament.settings.playersPerTeam - team.players.length
    if (availableSlots <= 0) {
      toast({
        title: 'Team Full',
        description: 'This team is already full',
        variant: 'destructive'
      })
      return
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
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to allocate players',
        variant: 'destructive'
      })
    }
  }
  
  const startTournament = async () => {
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
        return
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
      
      toast({
        title: 'Tournament Started!',
        description: `Generated ${response.schedule.length} rounds with ${response.schedule.reduce((sum, r) => sum + r.games.length, 0)} total games`
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to start tournament',
        variant: 'destructive'
      })
    } finally {
      setIsStarting(false)
    }
  }
  
  const previewSchedule = async () => {
    try {
      setIsGeneratingPreview(true)
      
      const result = await api.previewSchedule(tournament.id)
      
      // Create a mock tournament object for the ScheduleViewer
      setPreviewData({
        ...tournament,
        schedule: result.schedule,
        validation: result.validation
      })
      
      setShowPreview(true)
      
    } catch (error) {
      toast({
        title: 'Preview Failed',
        description: error.message || 'Unable to generate schedule preview',
        variant: 'destructive'
      })
    } finally {
      setIsGeneratingPreview(false)
    }
  }
  
  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle>Team Management</CardTitle>
          <CardDescription>
            {totalPlayers} of {targetPlayers} players allocated across {tournament.teams.length} teams
            {hasUnallocatedPlayers && (
              <span className="block mt-1 text-blue-600">
                {unallocatedPlayers.length} player(s) available in pool
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="mb-2 flex justify-between text-sm">
              <span>Progress</span>
              <span>{Math.round((totalPlayers / targetPlayers) * 100)}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-secondary">
              <div
                className="h-2 rounded-full bg-primary transition-all"
                style={{ width: `${Math.min(100, (totalPlayers / targetPlayers) * 100)}%` }}
              />
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {canEdit && tournament.teams.length < tournament.settings.teams && (
              <Button onClick={() => setShowAddTeam(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Team
              </Button>
            )}
            
            {canEdit && hasUnallocatedPlayers && (
              <Button 
                variant="outline"
                onClick={() => {
                  // Simple random allocation to fill all teams
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
                  
                  api.updateTournament(tournament.id, updatedTournament)
                    .then(() => {
                      tournamentStore.setTournament(updatedTournament)
                      toast({
                        title: 'Success',
                        description: `Allocated ${playerIndex} players to teams`
                      })
                    })
                    .catch(() => {
                      toast({
                        title: 'Error',
                        description: 'Failed to allocate players',
                        variant: 'destructive'
                      })
                    })
                }}
              >
                <Shuffle className="mr-2 h-4 w-4" />
                Auto-Fill Teams
              </Button>
            )}
            
            {canEdit && (
              <>
                <Button 
                  onClick={previewSchedule}
                  disabled={!isSetupComplete || isGeneratingPreview}
                  variant="outline"
                  className={isSetupComplete ? "" : "opacity-50"}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  {isGeneratingPreview ? 'Generating...' : 'Preview Schedule'}
                </Button>
                <Button 
                  onClick={startTournament}
                  disabled={!isSetupComplete || isStarting}
                  variant={isSetupComplete ? "default" : "outline"}
                  className={isSetupComplete ? "bg-green-600 hover:bg-green-700" : "opacity-50"}
                >
                  <Play className="mr-2 h-4 w-4" />
                  {isStarting ? 'Starting...' : 'Start Tournament'}
                </Button>
              </>
            )}
          </div>
          
          {canEdit && !isSetupComplete && (
            <div className="mt-4 flex items-center gap-2 text-sm text-amber-600">
              <AlertCircle className="h-4 w-4" />
              <span>
                {tournament.teams.length < tournament.settings.teams
                  ? `Add ${tournament.settings.teams - tournament.teams.length} more team(s)`
                  : `Allocate ${targetPlayers - totalPlayers} more player(s) to start`
                }
              </span>
            </div>
          )}
          
          {hasUnallocatedPlayers && (
            <div className="mt-4 flex items-center gap-2 text-sm text-blue-600">
              <AlertCircle className="h-4 w-4" />
              <span>
                {unallocatedPlayers.length} player(s) available for allocation
              </span>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Teams Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {tournament.teams.map((team) => (
          <Card key={team.id} className="relative">
            <CardHeader>
              <div className="flex items-center justify-between">
                {editingTeam === team.id ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={team.name}
                      onChange={(e) => {
                        const updatedTeams = tournament.teams.map(t =>
                          t.id === team.id ? { ...t, name: e.target.value } : t
                        )
                        tournamentStore.setTournament({ ...tournament, teams: updatedTeams })
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') updateTeamName(team.id, team.name)
                        if (e.key === 'Escape') setEditingTeam(null)
                      }}
                      className="h-8"
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-100"
                      onClick={() => updateTeamName(team.id, team.name)}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-gray-600 hover:text-gray-700 hover:bg-gray-100"
                      onClick={() => setEditingTeam(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <CardTitle className="text-lg">{team.name}</CardTitle>
                    {canEdit && (
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-100"
                          onClick={() => setEditingTeam(team.id)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        {hasUnallocatedPlayers && team.players.length < tournament.settings.playersPerTeam && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-100"
                            onClick={() => randomlyAllocateToTeam(team)}
                            title="Randomly add players from pool"
                          >
                            <Shuffle className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-100"
                          onClick={() => deleteTeam(team.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
              <CardDescription>
                {team.players.length} of {tournament.settings.playersPerTeam} players
                {team.players.length < tournament.settings.playersPerTeam && hasUnallocatedPlayers && (
                  <span className="block text-blue-600 text-xs mt-1">
                    {unallocatedPlayers.length} available in pool
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {/* Players in team */}
                {team.players.map(player => (
                  <div key={player.id} className="flex items-center justify-between text-sm">
                    <span>{player.name}</span>
                    {canEdit && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 text-orange-600 hover:text-orange-700 hover:bg-orange-100"
                        onClick={() => removePlayerFromTeam(team.id, player.id, true)}
                        title="Remove from team (move to pool)"
                      >
                        <ArrowLeft className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
                
                {team.players.length === 0 && (
                  <div className="text-center py-2 text-muted-foreground text-sm">
                    No players assigned
                  </div>
                )}
                
                {/* Manage button */}
                <div className="pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedTeam(team)
                      setSelectedPlayerFromPool(null)
                      setNewPlayerName('')
                      setShowAddPlayer(true)
                    }}
                    className="w-full"
                  >
                    <Users className="mr-2 h-4 w-4" />
                    Manage Players
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Add Team Dialog */}
      <Dialog open={showAddTeam} onOpenChange={(open) => {
        setShowAddTeam(open)
        if (!open) setNewTeamName('')
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Team</DialogTitle>
            <DialogDescription>
              Enter a name for the new team
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="team-name">Team Name</Label>
              <div className="flex gap-2">
                <Input
                  id="team-name"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  placeholder="Red Dragons"
                  onKeyDown={(e) => e.key === 'Enter' && addTeam()}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={generateNewTeamName}
                  title="Generate random team name"
                >
                  <Shuffle className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" onClick={addTeam}>
              Add Team
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Manage Team Players Dialog */}
      <Dialog open={showAddPlayer} onOpenChange={setShowAddPlayer}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedTeam?.name} - Player Management</DialogTitle>
            <DialogDescription>
              Add players to this team from the player pool or create new players
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Add Player Options */}
            {canEdit && selectedTeam && selectedTeam.players.length < tournament.settings.playersPerTeam && (
              <div className="space-y-4">
                {/* Add from pool */}
                {hasUnallocatedPlayers && (
                  <div className="space-y-2">
                    <Label>Add from Player Pool</Label>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <PlayerCombobox
                          value={selectedPlayerFromPool?.name || ''}
                          onSelect={setSelectedPlayerFromPool}
                          unallocatedPlayers={unallocatedPlayers}
                          placeholder="Search and select player..."
                        />
                      </div>
                      <Button 
                        onClick={() => addPlayerToTeam(true)}
                        disabled={!selectedPlayerFromPool}
                      >
                        <UserPlus className="mr-2 h-4 w-4" />
                        Add
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {unallocatedPlayers.length} player(s) available in pool
                    </p>
                  </div>
                )}
                
                {/* Add new player */}
                <div className="space-y-2">
                  <Label>Or Create New Player</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newPlayerName}
                      onChange={(e) => setNewPlayerName(e.target.value)}
                      placeholder="Enter new player name"
                      onKeyDown={(e) => e.key === 'Enter' && addPlayerToTeam(false)}
                    />
                    <Button 
                      onClick={() => addPlayerToTeam(false)}
                      disabled={!newPlayerName.trim()}
                    >
                      <UserPlus className="mr-2 h-4 w-4" />
                      Create
                    </Button>
                  </div>
                </div>
              </div>
            )}
            
            {selectedTeam && selectedTeam.players.length >= tournament.settings.playersPerTeam && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <Check className="h-4 w-4" />
                <span>Team is full!</span>
              </div>
            )}
            
            {/* Current Players List */}
            <div className="space-y-2">
              <Label>Current Players ({selectedTeam?.players.length || 0}/{tournament.settings.playersPerTeam})</Label>
              
              {!selectedTeam || selectedTeam.players.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  <Users className="mx-auto h-8 w-8 mb-2 opacity-50" />
                  <p className="text-sm">No players in this team yet</p>
                  {hasUnallocatedPlayers && (
                    <p className="text-xs">Select from player pool above or create new players</p>
                  )}
                </div>
              ) : selectedTeam ? (
                <div className="space-y-2">
                  {selectedTeam.players.map((player) => (
                    <div key={player.id} className="flex items-center justify-between rounded-lg border p-3">
                      {editingPlayer === player.id ? (
                        <div className="flex items-center gap-2 flex-1">
                          <Input
                            value={player.name}
                            onChange={(e) => {
                              const updatedTeam = {
                                ...selectedTeam,
                                players: selectedTeam.players.map(p =>
                                  p.id === player.id ? { ...p, name: e.target.value } : p
                                )
                              }
                              setSelectedTeam(updatedTeam)
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') updatePlayerName(selectedTeam.id, player.id, player.name)
                              if (e.key === 'Escape') setEditingPlayer(null)
                            }}
                            className="h-8"
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-100"
                            onClick={() => updatePlayerName(selectedTeam.id, player.id, player.name)}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-gray-600 hover:text-gray-700 hover:bg-gray-100"
                            onClick={() => setEditingPlayer(null)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <span className="flex-1">{player.name}</span>
                          {canEdit && (
                            <div className="flex gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-100"
                                onClick={() => setEditingPlayer(player.id)}
                                title="Edit name"
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-orange-600 hover:text-orange-700 hover:bg-orange-100"
                                onClick={() => removePlayerFromTeam(selectedTeam.id, player.id, true)}
                                title="Move back to pool"
                              >
                                <ArrowLeft className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-100"
                                onClick={() => removePlayerFromTeam(selectedTeam.id, player.id, false)}
                                title="Delete player"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Schedule Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Schedule Preview
            </DialogTitle>
            <DialogDescription>
              This is how your tournament schedule will look. You can review all games before starting.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            {previewData && (
              <div className="h-full overflow-auto pr-2">
                <ScheduleViewer tournament={previewData} />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
