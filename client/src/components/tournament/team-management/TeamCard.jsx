import React, { useState } from 'react'
import { Edit2, Trash2, Users, Shuffle, UserX, UserCheck, ArrowLeft, Check, X } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { getPlayerStatusInfo } from '@/utils/tournament/teamManagementUtils'

export function TeamCard({ 
  team, 
  tournament,
  canEdit,
  hasUnallocatedPlayers,
  onEditTeam,
  onDeleteTeam,
  onRandomAllocate,
  onManagePlayers,
  onTogglePlayerStatus,
  onRemovePlayer
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedName, setEditedName] = useState(team.name)
  
  const handleSaveEdit = () => {
    onEditTeam(team.id, editedName)
    setIsEditing(false)
  }
  
  const handleCancelEdit = () => {
    setEditedName(team.name)
    setIsEditing(false)
  }
  
  const activeCount = team.players.filter(p => p.status === 'active').length
  const hasInactivePlayers = activeCount !== team.players.length
  
  return (
    <Card className="relative">
      <CardHeader>
        <div className="flex items-center justify-between">
          {isEditing ? (
            <div className="flex items-center gap-2">
              <Input
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
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
              <CardTitle className="text-lg">{team.name}</CardTitle>
              {canEdit && (
                <div className="flex gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-blue-600 hover:text-white hover:bg-blue-600 border-blue-600 flex items-center justify-center"
                    onClick={() => setIsEditing(true)}
                  >
                    <Edit2 className="h-4 w-4" style={{ flexShrink: 0 }} />
                  </Button>
                  {hasUnallocatedPlayers && team.players.length < tournament.settings.playersPerTeam && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-green-600 hover:text-white hover:bg-green-600 border-green-600 flex items-center justify-center"
                      onClick={() => onRandomAllocate(team)}
                      title="Randomly add players from pool"
                    >
                      <Shuffle className="h-4 w-4" style={{ flexShrink: 0 }} />
                    </Button>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-red-600 hover:text-white hover:bg-red-600 border-red-600 flex items-center justify-center"
                    onClick={() => onDeleteTeam(team.id)}
                  >
                    <Trash2 className="h-4 w-4" style={{ flexShrink: 0 }} />
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
        <CardDescription>
          {team.players.length} of {tournament.settings.playersPerTeam} players
          {hasInactivePlayers && (
            <span className="block text-green-600 text-xs mt-1">
              {activeCount} active
            </span>
          )}
          {team.players.length < tournament.settings.playersPerTeam && hasUnallocatedPlayers && (
            <span className="block text-blue-600 text-xs mt-1">
              {tournament.playerPool?.length || 0} available in pool
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {/* Players in team */}
          {team.players.map(player => {
            const statusInfo = getPlayerStatusInfo(player)
            const StatusIcon = statusInfo.icon
            return (
              <div key={player.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <StatusIcon className={`h-4 w-4 ${statusInfo.color}`} />
                  <span className={player.status === 'inactive' ? 'line-through text-muted-foreground' : ''}>
                    {player.name}
                  </span>
                  {player.status === 'inactive' && (
                    <Badge variant="outline" className="text-xs text-red-600 border-red-200">
                      Out
                    </Badge>
                  )}
                </div>
                {canEdit && (
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className={[
                        'h-6 w-6 flex items-center justify-center',
                        player.status === 'active'
                          ? 'text-red-600 hover:text-white hover:bg-red-600 border-red-600'
                          : 'text-green-600 hover:text-white hover:bg-green-600 border-green-600'
                      ].join(' ')}
                      onClick={() => onTogglePlayerStatus(team.id, player.id)}
                      title={player.status === 'active' ? 'Mark as dropped out' : 'Mark as active'}
                    >
                      {player.status === 'active' ? (
                        <UserX className="h-3 w-3" style={{ flexShrink: 0 }} />
                      ) : (
                        <UserCheck className="h-3 w-3" style={{ flexShrink: 0 }} />
                      )}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 text-orange-600 hover:text-white hover:bg-orange-600 border-orange-600 flex items-center justify-center"
                      onClick={() => onRemovePlayer(team.id, player.id, true)}
                      title="Remove from team (move to pool)"
                    >
                      <ArrowLeft className="h-3 w-3" style={{ flexShrink: 0 }} />
                    </Button>
                  </div>
                )}
              </div>
            )
          })}
          
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
              onClick={() => onManagePlayers(team)}
              className="w-full"
            >
              <Users className="mr-2 h-4 w-4" />
              Manage Players
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
