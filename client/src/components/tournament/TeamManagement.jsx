import React, { useState } from 'react'
import { Plus, Edit2, Trash2, Users, UserPlus, Check, X } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import api from '@/utils/api'
import useTournamentStore from '@/stores/tournamentStore'
import { v4 as uuidv4 } from 'uuid'

export default function TeamManagement({ tournament, isAdmin }) {
  const { toast } = useToast()
  const tournamentStore = useTournamentStore()
  const [showAddTeam, setShowAddTeam] = useState(false)
  const [showAddPlayer, setShowAddPlayer] = useState(false)
  const [selectedTeam, setSelectedTeam] = useState(null)
  const [editingTeam, setEditingTeam] = useState(null)
  const [editingPlayer, setEditingPlayer] = useState(null)
  const [newTeamName, setNewTeamName] = useState('')
  const [newPlayerName, setNewPlayerName] = useState('')
  
  const canEdit = isAdmin && tournament.currentState.status === 'setup'
  const totalPlayers = tournament.teams.reduce((sum, team) => sum + team.players.length, 0)
  const targetPlayers = tournament.settings.teams * tournament.settings.playersPerTeam
  
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
    
    const updatedTournament = {
      ...tournament,
      teams: tournament.teams.filter(team => team.id !== teamId)
    }
    
    try {
      await api.updateTournament(tournament.id, updatedTournament)
      tournamentStore.setTournament(updatedTournament)
      toast({
        title: 'Success',
        description: 'Team deleted'
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete team',
        variant: 'destructive'
      })
    }
  }
  
  const addPlayer = async () => {
    if (!newPlayerName.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a player name',
        variant: 'destructive'
      })
      return
    }
    
    const newPlayer = {
      id: uuidv4(),
      name: newPlayerName,
      status: 'active'
    }
    
    const updatedTournament = {
      ...tournament,
      teams: tournament.teams.map(team =>
        team.id === selectedTeam.id
          ? { ...team, players: [...team.players, newPlayer] }
          : team
      )
    }
    
    try {
      await api.updateTournament(tournament.id, updatedTournament)
      tournamentStore.setTournament(updatedTournament)
      setNewPlayerName('')
      
      // Update selected team
      setSelectedTeam({
        ...selectedTeam,
        players: [...selectedTeam.players, newPlayer]
      })
      
      toast({
        title: 'Success',
        description: 'Player added successfully'
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add player',
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
  
  const deletePlayer = async (teamId, playerId) => {
    if (!confirm('Are you sure you want to delete this player?')) return
    
    const updatedTournament = {
      ...tournament,
      teams: tournament.teams.map(team =>
        team.id === teamId
          ? {
              ...team,
              players: team.players.filter(player => player.id !== playerId)
            }
          : team
      )
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
        description: 'Player deleted'
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete player',
        variant: 'destructive'
      })
    }
  }
  
  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle>Team Overview</CardTitle>
          <CardDescription>
            {totalPlayers} of {targetPlayers} players added across {tournament.teams.length} teams
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
          
          {canEdit && tournament.teams.length < tournament.settings.teams && (
            <Button onClick={() => setShowAddTeam(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Team
            </Button>
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
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {team.players.length === 0 && 'No players added yet'}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedTeam(team)
                    setShowAddPlayer(true)
                  }}
                >
                  <Users className="mr-2 h-4 w-4" />
                  Manage
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Add Team Dialog */}
      <Dialog open={showAddTeam} onOpenChange={setShowAddTeam}>
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
              <Input
                id="team-name"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                placeholder="Red Dragons"
                onKeyDown={(e) => e.key === 'Enter' && addTeam()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" onClick={addTeam}>
              Add Team
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Manage Players Dialog */}
      <Dialog open={showAddPlayer} onOpenChange={setShowAddPlayer}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedTeam?.name} - Players</DialogTitle>
            <DialogDescription>
              Add and manage players for this team
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Add Player */}
            {canEdit && selectedTeam?.players.length < tournament.settings.playersPerTeam && (
              <div className="flex gap-2">
                <Input
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  placeholder="Player name"
                  onKeyDown={(e) => e.key === 'Enter' && addPlayer()}
                />
                <Button onClick={addPlayer}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add Player
                </Button>
              </div>
            )}
            
            {/* Players List */}
            <div className="space-y-2">
              {selectedTeam?.players.map((player) => (
                <div key={player.id} className="flex items-center justify-between rounded-lg border p-3">
                  {editingPlayer === player.id ? (
                    <div className="flex items-center gap-2">
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
                      <span>{player.name}</span>
                      {canEdit && (
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-100"
                            onClick={() => setEditingPlayer(player.id)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-100"
                            onClick={() => deletePlayer(selectedTeam.id, player.id)}
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
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
