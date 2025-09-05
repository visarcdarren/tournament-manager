import React from 'react'
import { Plus, Shuffle, Eye, Play, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  calculateTournamentStats, 
  getSetupStatusMessage 
} from '@/utils/tournament/teamManagementUtils'

export function TournamentSummary({
  tournament,
  canEdit,
  onAddTeam,
  onAutoFillTeams,
  onPreviewSchedule,
  onStartTournament,
  isGeneratingPreview,
  isStarting
}) {
  const stats = calculateTournamentStats(tournament)
  const statusMessage = getSetupStatusMessage(tournament)
  
  const getStatusColor = (type) => {
    switch (type) {
      case 'warning': return 'text-amber-600'
      case 'info': return 'text-blue-600'
      case 'success': return 'text-green-600'
      default: return 'text-muted-foreground'
    }
  }
  
  const getStatusIcon = (type) => {
    return type === 'success' ? null : AlertCircle
  }
  
  const StatusIcon = getStatusIcon(statusMessage.type)
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Team Management</CardTitle>
        <CardDescription>
          {stats.totalPlayers} of {stats.targetPlayers} players allocated across {tournament.teams.length} teams
          {stats.activePlayers !== stats.totalPlayers && (
            <span className="block mt-1 text-green-600">
              {stats.activePlayers} active players ready to play
            </span>
          )}
          {stats.hasUnallocatedPlayers && (
            <span className="block mt-1 text-blue-600">
              {stats.unallocatedPlayers.length} player(s) available in pool
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="mb-2 flex justify-between text-sm">
            <span>Progress</span>
            <span>{Math.round(stats.progressPercentage)}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-secondary">
            <div
              className="h-2 rounded-full bg-primary transition-all"
              style={{ width: `${stats.progressPercentage}%` }}
            />
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {canEdit && tournament.teams.length < tournament.settings.teams && (
            <Button onClick={onAddTeam}>
              <Plus className="mr-2 h-4 w-4" />
              Add Team
            </Button>
          )}
          
          {canEdit && stats.hasUnallocatedPlayers && (
            <Button 
              variant="outline"
              onClick={onAutoFillTeams}
            >
              <Shuffle className="mr-2 h-4 w-4" />
              Auto-Fill Teams
            </Button>
          )}
          
          {canEdit && (
            <>
              <Button 
                onClick={onPreviewSchedule}
                disabled={!stats.isSetupComplete || isGeneratingPreview}
                variant="outline"
                className={stats.isSetupComplete ? "" : "opacity-50"}
              >
                <Eye className="mr-2 h-4 w-4" />
                {isGeneratingPreview ? 'Generating...' : 'Preview Schedule'}
              </Button>
              <Button 
                onClick={onStartTournament}
                disabled={!stats.isSetupComplete || isStarting}
                variant={stats.isSetupComplete ? "default" : "outline"}
                className={stats.isSetupComplete ? "bg-green-600 text-white border-green-600 hover:bg-green-700" : "opacity-50"}
              >
                <Play className="mr-2 h-4 w-4" />
                {isStarting ? 'Starting...' : 'Start Tournament'}
              </Button>
            </>
          )}
        </div>
        
        {/* Status Messages */}
        {statusMessage.type !== 'success' && (
          <div className={`mt-4 flex items-center gap-2 text-sm ${getStatusColor(statusMessage.type)}`}>
            {StatusIcon && <StatusIcon className="h-4 w-4" />}
            <span>{statusMessage.message}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
