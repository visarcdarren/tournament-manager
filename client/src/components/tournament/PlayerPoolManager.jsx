import React, { useState } from 'react'
import { Plus, Edit2, Trash2, Users, UserPlus, Check, X, Shuffle, AlertCircle, User } from 'lucide-react'
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

export default function PlayerPoolManager({ tournament, isAdmin, onNavigateToTeams }) {
  const { toast } = useToast()
  const tournamentStore = useTournamentStore()
  const [showAddPlayer, setShowAddPlayer] = useState(false)
  const [newPlayerName, setNewPlayerName] = useState('')
  const [editingPlayer, setEditingPlayer] = useState(null)
  const [bulkPlayerNames, setBulkPlayerNames] = useState('')
  const [showBulkAdd, setShowBulkAdd] = useState(false)
  
  const canEdit = isAdmin && tournament.currentState.status === 'setup'
  
  // Get all players (both in teams and unallocated)
  const allocatedPlayers = tournament.teams.flatMap(team => 
    team.players.map(player => ({ ...player, teamId: team.id, teamName: team.name }))
  )
  
  const unallocatedPlayers = tournament.playerPool || []
  const allPlayers = [...allocatedPlayers, ...unallocatedPlayers]
  
  const totalPlayersNeeded = tournament.settings.teams * tournament.settings.playersPerTeam
  const totalPlayersAvailable = allPlayers.length
  
  const addSinglePlayer = async () => {
    if (!newPlayerName.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a player name',
        variant: 'destructive'
      })
      return
    }
    
    // Check for duplicate names
    if (allPlayers.some(p => p.name.toLowerCase() === newPlayerName.toLowerCase())) {
      toast({
        title: 'Error',
        description: 'A player with this name already exists',
        variant: 'destructive'
      })
      return
    }
    
    const newPlayer = {
      id: uuidv4(),
      name: newPlayerName.trim(),
      status: 'active'
    }
    
    const updatedTournament = {
      ...tournament,
      playerPool: [...unallocatedPlayers, newPlayer]
    }
    
    try {
      await api.updateTournament(tournament.id, updatedTournament)
      tournamentStore.setTournament(updatedTournament)
      setNewPlayerName('')
      setShowAddPlayer(false)
      
      toast({
        title: 'Success',
        description: 'Player added to pool'
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add player',
        variant: 'destructive'
      })
    }
  }
  
  const addBulkPlayers = async () => {
    if (!bulkPlayerNames.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter player names',
        variant: 'destructive'
      })
      return
    }
    
    // Split by lines and clean up names
    const names = bulkPlayerNames
      .split('\n')
      .map(name => name.trim())
      .filter(name => name.length > 0)
    
    // Check for duplicates within the input
    const duplicatesInInput = names.filter((name, index) => 
      names.findIndex(n => n.toLowerCase() === name.toLowerCase()) !== index
    )
    
    if (duplicatesInInput.length > 0) {
      toast({
        title: 'Error',
        description: `Duplicate names found: ${duplicatesInInput.join(', ')}`,
        variant: 'destructive'
      })
      return
    }
    
    // Check for duplicates with existing players
    const existingNames = allPlayers.map(p => p.name.toLowerCase())
    const duplicatesWithExisting = names.filter(name => 
      existingNames.includes(name.toLowerCase())
    )
    
    if (duplicatesWithExisting.length > 0) {
      toast({
        title: 'Error',
        description: `These players already exist: ${duplicatesWithExisting.join(', ')}`,
        variant: 'destructive'
      })
      return
    }
    
    // Create new players
    const newPlayers = names.map(name => ({
      id: uuidv4(),
      name,
      status: 'active'
    }))
    
    const updatedTournament = {
      ...tournament,
      playerPool: [...unallocatedPlayers, ...newPlayers]
    }
    
    try {
      await api.updateTournament(tournament.id, updatedTournament)
      tournamentStore.setTournament(updatedTournament)
      setBulkPlayerNames('')
      setShowBulkAdd(false)
      
      toast({
        title: 'Success',
        description: `Added ${newPlayers.length} players to pool`
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add players',
        variant: 'destructive'
      })
    }
  }
  
  const updatePlayerName = async (playerId, newName) => {
    if (!newName.trim()) return
    
    // Check for duplicates
    if (allPlayers.some(p => p.id !== playerId && p.name.toLowerCase() === newName.toLowerCase())) {
      toast({
        title: 'Error',
        description: 'A player with this name already exists',
        variant: 'destructive'
      })
      return
    }
    
    const updatedTournament = {
      ...tournament,
      playerPool: unallocatedPlayers.map(player =>
        player.id === playerId ? { ...player, name: newName.trim() } : player
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
  
  const deletePlayer = async (playerId) => {
    if (!confirm('Are you sure you want to delete this player?')) return
    
    const updatedTournament = {
      ...tournament,
      playerPool: unallocatedPlayers.filter(player => player.id !== playerId)
    }
    
    try {
      await api.updateTournament(tournament.id, updatedTournament)
      tournamentStore.setTournament(updatedTournament)
      
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
  
  const randomlyAllocateAllPlayers = async () => {
    if (unallocatedPlayers.length === 0) {
      toast({
        title: 'No Players',
        description: 'No unallocated players available',
        variant: 'destructive'
      })
      return
    }
    
    // Shuffle the unallocated players
    const shuffled = [...unallocatedPlayers].sort(() => Math.random() - 0.5)
    
    // Calculate how many players each team should get
    const playersPerTeam = tournament.settings.playersPerTeam
    const teams = [...tournament.teams]
    
    // Allocate players to teams in round-robin fashion
    let playerIndex = 0
    
    for (let round = 0; round < playersPerTeam; round++) {
      for (let teamIndex = 0; teamIndex < teams.length && playerIndex < shuffled.length; teamIndex++) {
        // Only add if team isn't already full
        if (teams[teamIndex].players.length < playersPerTeam) {
          teams[teamIndex].players.push(shuffled[playerIndex])
          playerIndex++
        }
      }
    }
    
    const updatedTournament = {
      ...tournament,
      teams,
      playerPool: shuffled.slice(playerIndex) // Any leftover players stay in pool
    }
    
    try {
      await api.updateTournament(tournament.id, updatedTournament)
      tournamentStore.setTournament(updatedTournament)
      
      toast({
        title: 'Success',
        description: `Randomly allocated ${playerIndex} players to teams`
      })
      
      // Navigate to teams tab to see results
      if (onNavigateToTeams) {
        onNavigateToTeams()
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to allocate players',
        variant: 'destructive'
      })
    }
  }
  
  const canAllocateRandomly = unallocatedPlayers.length > 0 && tournament.teams.length > 0
  
  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle>Player Pool</CardTitle>
          <CardDescription>
            Manage all players before allocating them to teams
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Stats */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="text-center p-3 border rounded-lg">
                <div className="text-2xl font-bold">{totalPlayersAvailable}</div>
                <div className="text-sm text-muted-foreground">Total Players</div>
              </div>
              <div className="text-center p-3 border rounded-lg">
                <div className="text-2xl font-bold">{allocatedPlayers.length}</div>
                <div className="text-sm text-muted-foreground">In Teams</div>
              </div>
              <div className="text-center p-3 border rounded-lg">
                <div className="text-2xl font-bold">{unallocatedPlayers.length}</div>
                <div className="text-sm text-muted-foreground">Unallocated</div>
              </div>
            </div>
            
            {/* Progress */}
            <div>
              <div className="mb-2 flex justify-between text-sm">
                <span>Progress</span>
                <span>{totalPlayersAvailable} / {totalPlayersNeeded} players</span>
              </div>
              <div className="h-2 w-full rounded-full bg-secondary">
                <div
                  className="h-2 rounded-full bg-primary transition-all"
                  style={{ width: `${Math.min(100, (totalPlayersAvailable / totalPlayersNeeded) * 100)}%` }}
                />
              </div>
            </div>
            
            {/* Action Buttons */}
            {canEdit && (
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => setShowAddPlayer(true)}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add Player
                </Button>
                <Button variant="outline" onClick={() => setShowBulkAdd(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Bulk Add Players
                </Button>
                {canAllocateRandomly && (
                  <Button variant="outline" onClick={randomlyAllocateAllPlayers}>
                    <Shuffle className="mr-2 h-4 w-4" />
                    Random Allocation
                  </Button>
                )}
                {totalPlayersAvailable >= totalPlayersNeeded && onNavigateToTeams && (
                  <Button 
                    onClick={onNavigateToTeams}
                    className="bg-green-600 text-white border-green-600 hover:bg-green-700"
                  >
                    <Users className="mr-2 h-4 w-4" />
                    Manage Teams
                  </Button>
                )}
              </div>
            )}
            
            {/* Status Messages */}
            {totalPlayersAvailable < totalPlayersNeeded && (
              <div className="flex items-center gap-2 text-sm text-amber-600">
                <AlertCircle className="h-4 w-4" />
                <span>
                  Need {totalPlayersNeeded - totalPlayersAvailable} more player(s) for {tournament.settings.teams} teams
                </span>
              </div>
            )}
            
            {totalPlayersAvailable > totalPlayersNeeded && (
              <div className="flex items-center gap-2 text-sm text-blue-600">
                <AlertCircle className="h-4 w-4" />
                <span>
                  {totalPlayersAvailable - totalPlayersNeeded} extra player(s) - consider adjusting team settings or removing players
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Player Lists */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Unallocated Players */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Unallocated Players ({unallocatedPlayers.length})
            </CardTitle>
            <CardDescription>
              Players waiting to be assigned to teams
            </CardDescription>
          </CardHeader>
          <CardContent>
            {unallocatedPlayers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="mx-auto h-12 w-12 mb-2 opacity-50" />
                <p>No unallocated players.</p>
                <p className="text-sm">Add players above to get started.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {unallocatedPlayers.map(player => (
                  <div key={player.id} className="flex items-center justify-between rounded-lg border p-3">
                    {editingPlayer === player.id ? (
                      <div className="flex items-center gap-2 flex-1">
                        <Input
                          value={player.name}
                          onChange={(e) => {
                            const updatedPool = unallocatedPlayers.map(p =>
                              p.id === player.id ? { ...p, name: e.target.value } : p
                            )
                            tournamentStore.setTournament({ 
                              ...tournament, 
                              playerPool: updatedPool 
                            })
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') updatePlayerName(player.id, player.name)
                            if (e.key === 'Escape') setEditingPlayer(null)
                          }}
                          className="h-8"
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-green-600 hover:text-white hover:bg-green-600 border-green-600"
                          onClick={() => updatePlayerName(player.id, player.name)}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-gray-600 hover:text-white hover:bg-gray-600 border-gray-600"
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
                              className="h-8 w-8 text-blue-600 hover:text-white hover:bg-blue-600 border-blue-600"
                              onClick={() => setEditingPlayer(player.id)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-red-600 hover:text-white hover:bg-red-600 border-red-600"
                              onClick={() => deletePlayer(player.id)}
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
            )}
          </CardContent>
        </Card>
        
        {/* Allocated Players */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Allocated Players ({allocatedPlayers.length})
            </CardTitle>
            <CardDescription>
              Players already assigned to teams
            </CardDescription>
          </CardHeader>
          <CardContent>
            {allocatedPlayers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="mx-auto h-12 w-12 mb-2 opacity-50" />
                <p>No players allocated yet.</p>
                <p className="text-sm">Use random allocation or manually assign in Teams tab.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {allocatedPlayers.map(player => (
                  <div key={player.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex-1">
                      <div className="font-medium">{player.name}</div>
                      <div className="text-sm text-muted-foreground">{player.teamName}</div>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {player.teamName}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Add Single Player Dialog */}
      <Dialog open={showAddPlayer} onOpenChange={(open) => {
        setShowAddPlayer(open)
        if (!open) setNewPlayerName('')
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Player</DialogTitle>
            <DialogDescription>
              Add a new player to the tournament pool
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="player-name">Player Name</Label>
              <Input
                id="player-name"
                value={newPlayerName}
                onChange={(e) => setNewPlayerName(e.target.value)}
                placeholder="Enter player name"
                onKeyDown={(e) => e.key === 'Enter' && addSinglePlayer()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddPlayer(false)}>
              Cancel
            </Button>
            <Button onClick={addSinglePlayer}>
              Add Player
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Bulk Add Players Dialog */}
      <Dialog open={showBulkAdd} onOpenChange={(open) => {
        setShowBulkAdd(open)
        if (!open) setBulkPlayerNames('')
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Bulk Add Players</DialogTitle>
            <DialogDescription>
              Enter player names, one per line
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="bulk-players">Player Names</Label>
              <textarea
                id="bulk-players"
                value={bulkPlayerNames}
                onChange={(e) => setBulkPlayerNames(e.target.value)}
                placeholder="John Smith&#10;Jane Doe&#10;Mike Johnson&#10;Sarah Wilson"
                className="min-h-32 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                rows={6}
              />
              <p className="text-xs text-muted-foreground">
                Tip: You can copy/paste from Excel or other applications
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkAdd(false)}>
              Cancel
            </Button>
            <Button onClick={addBulkPlayers}>
              Add All Players
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
