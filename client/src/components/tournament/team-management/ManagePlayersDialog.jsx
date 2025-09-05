import React, { useState, useEffect } from 'react'
import { Users, UserPlus, Edit2, Trash2, ArrowLeft, Check, X, UserX, UserCheck } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { PlayerCombobox } from './PlayerCombobox'
import { getPlayerStatusInfo } from '@/utils/tournament/teamManagementUtils'

export function ManagePlayersDialog({
  isOpen,
  onClose,
  team,
  tournament,
  canEdit,
  unallocatedPlayers,
  hasUnallocatedPlayers,
  onAddPlayerFromPool,
  onCreateNewPlayer,
  onTogglePlayerStatus,
  onUpdatePlayerName,
  onRemovePlayer,
  onUpdateAllPlayersStatus
}) {
  const [selectedPlayerFromPool, setSelectedPlayerFromPool] = useState(null)
  const [newPlayerName, setNewPlayerName] = useState('')
  const [editingPlayer, setEditingPlayer] = useState(null)
  const [editedPlayerName, setEditedPlayerName] = useState('')
  
  // Reset state when dialog opens/closes or team changes
  useEffect(() => {
    if (isOpen && team) {
      setSelectedPlayerFromPool(null)
      setNewPlayerName('')
      setEditingPlayer(null)
      setEditedPlayerName('')
    }
  }, [isOpen, team?.id])
  
  if (!team) return null
  
  const handleAddFromPool = async () => {
    if (!selectedPlayerFromPool) return
    
    const result = await onAddPlayerFromPool(team.id, selectedPlayerFromPool)
    if (result?.success) {
      setSelectedPlayerFromPool(null)
    }
  }
  
  const handleCreatePlayer = async () => {
    if (!newPlayerName.trim()) return
    
    const result = await onCreateNewPlayer(team.id, newPlayerName.trim())
    if (result?.success) {
      setNewPlayerName('')
    }
  }
  
  const handleStartEdit = (player) => {
    setEditingPlayer(player.id)
    setEditedPlayerName(player.name)
  }
  
  const handleSaveEdit = async () => {
    if (!editingPlayer || !editedPlayerName.trim()) return
    
    const success = await onUpdatePlayerName(team.id, editingPlayer, editedPlayerName.trim())
    if (success) {
      setEditingPlayer(null)
      setEditedPlayerName('')
    }
  }
  
  const handleCancelEdit = () => {
    setEditingPlayer(null)
    setEditedPlayerName('')
  }
  
  const activeCount = team.players.filter(p => p.status === 'active').length
  const hasInactivePlayers = activeCount !== team.players.length
  const isTeamFull = team.players.length >= tournament.settings.playersPerTeam
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{team.name} - Player Management</DialogTitle>
          <DialogDescription>
            Add players to this team from the player pool or create new players
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {/* Add Player Options */}
          {canEdit && !isTeamFull && (
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
                      onClick={handleAddFromPool}
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
                    onKeyDown={(e) => e.key === 'Enter' && handleCreatePlayer()}
                  />
                  <Button 
                    onClick={handleCreatePlayer}
                    disabled={!newPlayerName.trim()}
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    Create
                  </Button>
                </div>
              </div>
            </div>
          )}
          
          {isTeamFull && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <Check className="h-4 w-4" />
              <span>Team is full!</span>
            </div>
          )}
          
          {/* Current Players List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>
                Current Players ({team.players.length}/{tournament.settings.playersPerTeam})
                {hasInactivePlayers && (
                  <span className="text-green-600 font-normal ml-2">
                    ({activeCount} active)
                  </span>
                )}
              </Label>
              
              {/* Bulk status management */}
              {canEdit && team.players.length > 0 && (
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-7 px-2 text-green-600 hover:text-white hover:bg-green-600"
                    onClick={() => onUpdateAllPlayersStatus(team.id, 'active')}
                    title="Mark all players as active"
                  >
                    All Active
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-7 px-2 text-red-600 hover:text-white hover:bg-red-600"
                    onClick={() => onUpdateAllPlayersStatus(team.id, 'inactive')}
                    title="Mark all players as dropped out"
                  >
                    All Out
                  </Button>
                </div>
              )}
            </div>
            
            {team.players.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                <Users className="mx-auto h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">No players in this team yet</p>
                {hasUnallocatedPlayers && (
                  <p className="text-xs">Select from player pool above or create new players</p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {team.players.map((player) => {
                  const statusInfo = getPlayerStatusInfo(player)
                  const StatusIcon = statusInfo.icon
                  const isEditing = editingPlayer === player.id
                  
                  return (
                    <div key={player.id} className="flex items-center justify-between rounded-lg border p-3">
                      {isEditing ? (
                        <div className="flex items-center gap-2 flex-1">
                          <Input
                            value={editedPlayerName}
                            onChange={(e) => setEditedPlayerName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit()
                              if (e.key === 'Escape') handleCancelEdit()
                            }}
                            className="h-8"
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-green-600 hover:text-white hover:bg-green-600 border-green-600 flex items-center justify-center"
                            onClick={handleSaveEdit}
                          >
                            <Check className="h-4 w-4" style={{ flexShrink: 0 }} />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-gray-600 hover:text-white hover:bg-gray-600 border-gray-600 flex items-center justify-center"
                            onClick={handleCancelEdit}
                          >
                            <X className="h-4 w-4" style={{ flexShrink: 0 }} />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2 flex-1">
                            <StatusIcon className={`h-4 w-4 ${statusInfo.color}`} />
                            <span className={player.status === 'inactive' ? 'line-through text-muted-foreground' : ''}>
                              {player.name}
                            </span>
                            {player.status === 'inactive' && (
                              <Badge variant="outline" className="text-xs text-red-600 border-red-200">
                                Dropped Out
                              </Badge>
                            )}
                          </div>
                          {canEdit && (
                            <div className="flex gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className={[
                                  'h-8 w-8 flex items-center justify-center',
                                  player.status === 'active'
                                    ? 'text-red-600 hover:text-white hover:bg-red-600 border-red-600'
                                    : 'text-green-600 hover:text-white hover:bg-green-600 border-green-600'
                                ].join(' ')}
                                onClick={() => onTogglePlayerStatus(team.id, player.id)}
                                title={player.status === 'active' ? 'Mark as dropped out' : 'Mark as active'}
                              >
                                {player.status === 'active' ? (
                                  <UserX className="h-4 w-4" style={{ flexShrink: 0 }} />
                                ) : (
                                  <UserCheck className="h-4 w-4" style={{ flexShrink: 0 }} />
                                )}
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-blue-600 hover:text-white hover:bg-blue-600 border-blue-600 flex items-center justify-center"
                                onClick={() => handleStartEdit(player)}
                                title="Edit name"
                              >
                                <Edit2 className="h-4 w-4" style={{ flexShrink: 0 }} />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-orange-600 hover:text-white hover:bg-orange-600 border-orange-600 flex items-center justify-center"
                                onClick={() => onRemovePlayer(team.id, player.id, true)}
                                title="Move back to pool"
                              >
                                <ArrowLeft className="h-4 w-4" style={{ flexShrink: 0 }} />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-red-600 hover:text-white hover:bg-red-600 border-red-600 flex items-center justify-center"
                                onClick={() => onRemovePlayer(team.id, player.id, false)}
                                title="Delete player"
                              >
                                <Trash2 className="h-4 w-4" style={{ flexShrink: 0 }} />
                              </Button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
