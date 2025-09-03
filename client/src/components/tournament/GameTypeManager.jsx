import React, { useState } from 'react'
import { Plus, Minus, Trash2, Users, Gamepad2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useToast } from '@/hooks/use-toast'

export default function GameTypeManager({ gameTypes = [], onChange, teams = [] }) {
  const { toast } = useToast()
  const [newGameType, setNewGameType] = useState({
    name: '',
    playersPerTeam: 1,
    stationCount: 1,
    partnerMode: 'rotating'
  })

  const addGameType = () => {
    if (!newGameType.name.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a game type name',
        variant: 'destructive'
      })
      return
    }

    const id = newGameType.name.toLowerCase().replace(/\s+/g, '-')
    
    // Check if ID already exists
    if (gameTypes.some(gt => gt.id === id)) {
      toast({
        title: 'Error',
        description: 'A game type with this name already exists',
        variant: 'destructive'
      })
      return
    }

    // Generate stations
    const stations = []
    for (let i = 1; i <= newGameType.stationCount; i++) {
      const stationId = newGameType.stationCount === 1 ? id : `${id}-${i}`
      const stationName = newGameType.stationCount === 1 ? newGameType.name : `${newGameType.name} ${i}`
      stations.push({
        id: stationId,
        name: stationName
      })
    }

    const gameType = {
      id,
      name: newGameType.name,
      playersPerTeam: newGameType.playersPerTeam,
      partnerMode: newGameType.playersPerTeam > 1 ? newGameType.partnerMode : undefined,
      stations
    }

    onChange([...gameTypes, gameType])
    
    // Reset form
    setNewGameType({
      name: '',
      playersPerTeam: 1,
      stationCount: 1,
      partnerMode: 'rotating'
    })

    toast({
      title: 'Success',
      description: `Added ${gameType.name} with ${stations.length} station(s)`
    })
  }

  const removeGameType = (id) => {
    onChange(gameTypes.filter(gt => gt.id !== id))
  }

  const updateStationCount = (gameTypeId, delta) => {
    onChange(gameTypes.map(gt => {
      if (gt.id !== gameTypeId) return gt
      
      const newCount = Math.max(1, gt.stations.length + delta)
      const stations = []
      
      for (let i = 1; i <= newCount; i++) {
        const stationId = newCount === 1 ? gt.id : `${gt.id}-${i}`
        const stationName = newCount === 1 ? gt.name : `${gt.name} ${i}`
        stations.push({
          id: stationId,
          name: stationName
        })
      }
      
      return { ...gt, stations }
    }))
  }

  const updatePartnerMode = (gameTypeId, mode) => {
    onChange(gameTypes.map(gt => 
      gt.id === gameTypeId ? { ...gt, partnerMode: mode } : gt
    ))
  }

  // Calculate validation info
  const getRequiredPlayers = () => {
    if (gameTypes.length === 0 || teams.length === 0) return null
    
    const requirements = gameTypes.map(gt => ({
      name: gt.name,
      playersPerTeam: gt.playersPerTeam,
      stations: gt.stations.length,
      minPlayersNeeded: gt.playersPerTeam // Minimum to play this game type
    }))
    
    const maxRequirement = Math.max(...requirements.map(r => r.playersPerTeam))
    
    return {
      requirements,
      maxRequirement,
      currentTeamSize: teams[0]?.players?.filter(p => p.status === 'active').length || 0
    }
  }

  const playerInfo = getRequiredPlayers()

  return (
    <div className="space-y-6">
      {/* Add Game Type Form */}
      <Card>
        <CardHeader>
          <CardTitle>Add Game Type</CardTitle>
          <CardDescription>
            Define the games that will be played in this tournament
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="game-name">Game Name</Label>
              <Input
                id="game-name"
                placeholder="e.g., Pool, Darts"
                value={newGameType.name}
                onChange={(e) => setNewGameType({ ...newGameType, name: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="players-per-team">Players per Team</Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setNewGameType({ 
                    ...newGameType, 
                    playersPerTeam: Math.max(1, newGameType.playersPerTeam - 1) 
                  })}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <div className="w-16 text-center font-semibold">
                  {newGameType.playersPerTeam}v{newGameType.playersPerTeam}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setNewGameType({ 
                    ...newGameType, 
                    playersPerTeam: newGameType.playersPerTeam + 1 
                  })}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="station-count">Number of Stations</Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setNewGameType({ 
                    ...newGameType, 
                    stationCount: Math.max(1, newGameType.stationCount - 1) 
                  })}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <div className="w-16 text-center font-semibold">
                  {newGameType.stationCount}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setNewGameType({ 
                    ...newGameType, 
                    stationCount: newGameType.stationCount + 1 
                  })}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {newGameType.playersPerTeam > 1 && (
              <div className="space-y-2">
                <Label>Partner Mode</Label>
                <RadioGroup
                  value={newGameType.partnerMode}
                  onValueChange={(value) => setNewGameType({ ...newGameType, partnerMode: value })}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="fixed" id="fixed" />
                    <Label htmlFor="fixed" className="font-normal">
                      Fixed Partners
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="rotating" id="rotating" />
                    <Label htmlFor="rotating" className="font-normal">
                      Rotating Partners
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            )}
          </div>

          <Button onClick={addGameType} className="w-full">
            <Plus className="mr-2 h-4 w-4" />
            Add Game Type
          </Button>
        </CardContent>
      </Card>

      {/* Player Requirements Info */}
      {playerInfo && playerInfo.requirements.length > 0 && (
        <Card className={playerInfo.currentTeamSize < playerInfo.maxRequirement ? 'border-destructive' : ''}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Player Requirements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-2">
              Each team needs at least <span className="font-semibold">{playerInfo.maxRequirement}</span> active players
              to play all game types. Currently: <span className="font-semibold">{playerInfo.currentTeamSize}</span> players per team.
            </p>
            {playerInfo.currentTeamSize < playerInfo.maxRequirement && (
              <p className="text-sm text-destructive">
                ⚠️ Add more players or reduce player requirements for some games.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Existing Game Types */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Configured Game Types</h3>
        
        {gameTypes.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8 text-muted-foreground">
              <Gamepad2 className="mx-auto h-12 w-12 mb-2 opacity-50" />
              <p>No game types configured yet.</p>
              <p className="text-sm">Add your first game type above.</p>
            </CardContent>
          </Card>
        ) : (
          gameTypes.map(gameType => (
            <Card key={gameType.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    {gameType.name} ({gameType.playersPerTeam}v{gameType.playersPerTeam})
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeGameType(gameType.id)}
                    className="h-8 w-8 text-red-600 hover:text-white hover:bg-red-600 border border-red-600 rounded-md flex items-center justify-center"
                  >
                    <Trash2 className="h-4 w-4" style={{ flexShrink: 0 }} />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Stations: {gameType.stations.length}</span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 flex items-center justify-center"
                      onClick={() => updateStationCount(gameType.id, -1)}
                      disabled={gameType.stations.length <= 1}
                    >
                      <Minus className="h-3 w-3" style={{ flexShrink: 0 }} />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 flex items-center justify-center"
                      onClick={() => updateStationCount(gameType.id, 1)}
                    >
                      <Plus className="h-3 w-3" style={{ flexShrink: 0 }} />
                    </Button>
                  </div>
                </div>

                {gameType.playersPerTeam > 1 && (
                  <div className="space-y-2">
                    <Label className="text-sm">Partner Mode</Label>
                    <RadioGroup
                      value={gameType.partnerMode || 'rotating'}
                      onValueChange={(value) => updatePartnerMode(gameType.id, value)}
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="fixed" id={`${gameType.id}-fixed`} />
                        <Label htmlFor={`${gameType.id}-fixed`} className="text-sm font-normal">
                          Fixed Partners (same pairs each round)
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="rotating" id={`${gameType.id}-rotating`} />
                        <Label htmlFor={`${gameType.id}-rotating`} className="text-sm font-normal">
                          Rotating Partners (new pairs each round)
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                )}

                <div className="text-sm text-muted-foreground">
                  Stations: {gameType.stations.map(s => s.name).join(', ')}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
