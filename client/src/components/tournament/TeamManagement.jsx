import React, { useState } from 'react'
import { TournamentSummary } from './team-management/TournamentSummary'
import { TeamCard } from './team-management/TeamCard'
import { AddTeamDialog } from './team-management/AddTeamDialog'
import { ManagePlayersDialog } from './team-management/ManagePlayersDialog'
import { useTeamManagement } from '@/hooks/tournament/useTeamManagement'
import { usePlayerManagement } from '@/hooks/tournament/usePlayerManagement'
import { useSchedulePreview } from '@/hooks/tournament/useSchedulePreview'
import { calculateTournamentStats } from '@/utils/tournament/teamManagementUtils'
import SchedulePreviewModal from './SchedulePreviewModal'

export default function TeamManagement({ tournament, isAdmin, onNavigateToLive }) {
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

  // State for dialogs
  const [showAddTeam, setShowAddTeam] = useState(false)
  const [showManagePlayer, setShowManagePlayer] = useState(false)
  const [selectedTeam, setSelectedTeam] = useState(null)
  const [newTeamName, setNewTeamName] = useState('')
  
  // Permissions and calculations
  const canEdit = isAdmin && tournament.currentState.status === 'setup'
  const stats = calculateTournamentStats(tournament)
  
  // Custom hooks
  const teamManagement = useTeamManagement(tournament)
  const playerManagement = usePlayerManagement(tournament)
  const schedulePreview = useSchedulePreview(tournament)
  
  // Team management handlers
  const handleAddTeam = () => {
    setShowAddTeam(true)
  }
  
  const handleTeamAdded = async (teamName) => {
    const success = await teamManagement.addTeam(teamName)
    if (success) {
      setShowAddTeam(false)
      setNewTeamName('')
    }
    return success
  }
  
  const handleEditTeam = async (teamId, newName) => {
    return await teamManagement.updateTeamName(teamId, newName)
  }
  
  const handleDeleteTeam = async (teamId) => {
    return await teamManagement.deleteTeam(teamId)
  }
  
  const handleRandomAllocate = async (team) => {
    return await teamManagement.randomlyAllocateToTeam(team)
  }
  
  const handleAutoFillTeams = async () => {
    return await teamManagement.autoFillAllTeams()
  }
  
  // Player management handlers
  const handleManagePlayers = (team) => {
    setSelectedTeam(team)
    setShowManagePlayer(true)
  }
  
  const handleAddPlayerFromPool = async (teamId, playerData) => {
    const result = await playerManagement.addPlayerToTeam(teamId, playerData, true)
    if (result?.success) {
      setSelectedTeam(result.updatedTeam)
    }
    return result
  }
  
  const handleCreateNewPlayer = async (teamId, playerName) => {
    const result = await playerManagement.addPlayerToTeam(teamId, playerName, false)
    if (result?.success) {
      setSelectedTeam(result.updatedTeam)
    }
    return result
  }
  
  const handleTogglePlayerStatus = async (teamId, playerId) => {
    const result = await playerManagement.togglePlayerStatus(teamId, playerId)
    if (result?.success) {
      setSelectedTeam(result.updatedTeam)
    }
    return result
  }
  
  const handleUpdatePlayerName = async (teamId, playerId, newName) => {
    return await playerManagement.updatePlayerName(teamId, playerId, newName)
  }
  
  const handleRemovePlayer = async (teamId, playerId, moveToPool) => {
    const result = await playerManagement.removePlayerFromTeam(teamId, playerId, moveToPool)
    if (result?.success) {
      setSelectedTeam(result.updatedTeam)
    }
    return result
  }
  
  const handleUpdateAllPlayersStatus = async (teamId, status) => {
    const result = await playerManagement.updateAllPlayersStatus(teamId, status)
    if (result?.success) {
      setSelectedTeam(result.updatedTeam)
    }
    return result
  }
  
  // Schedule handlers
  const handlePreviewSchedule = () => {
    schedulePreview.previewSchedule()
  }
  
  const handleStartTournament = () => {
    teamManagement.startTournament(onNavigateToLive)
  }
  
  // Close dialogs
  const handleCloseAddTeam = () => {
    setShowAddTeam(false)
    setNewTeamName('')
  }
  
  const handleCloseManagePlayer = () => {
    setShowManagePlayer(false)
    setSelectedTeam(null)
  }
  
  return (
    <div className="space-y-6">
      {/* Tournament Summary */}
      <TournamentSummary
        tournament={tournament}
        canEdit={canEdit}
        onAddTeam={handleAddTeam}
        onAutoFillTeams={handleAutoFillTeams}
        onPreviewSchedule={handlePreviewSchedule}
        onStartTournament={handleStartTournament}
        isGeneratingPreview={schedulePreview.isGeneratingPreview}
        isStarting={teamManagement.isStarting}
      />
      
      {/* Teams Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {tournament.teams.map((team) => (
          <TeamCard
            key={team.id}
            team={team}
            tournament={tournament}
            canEdit={canEdit}
            hasUnallocatedPlayers={stats.hasUnallocatedPlayers}
            onEditTeam={handleEditTeam}
            onDeleteTeam={handleDeleteTeam}
            onRandomAllocate={handleRandomAllocate}
            onManagePlayers={handleManagePlayers}
            onTogglePlayerStatus={handleTogglePlayerStatus}
            onRemovePlayer={handleRemovePlayer}
          />
        ))}
      </div>
      
      {/* Add Team Dialog */}
      <AddTeamDialog
        isOpen={showAddTeam}
        onClose={handleCloseAddTeam}
        onAddTeam={handleTeamAdded}
        onGenerateTeamName={teamManagement.generateNewTeamName}
        initialTeamName={newTeamName}
      />
      
      {/* Manage Players Dialog */}
      <ManagePlayersDialog
        isOpen={showManagePlayer}
        onClose={handleCloseManagePlayer}
        team={selectedTeam}
        tournament={tournament}
        canEdit={canEdit}
        unallocatedPlayers={stats.unallocatedPlayers}
        hasUnallocatedPlayers={stats.hasUnallocatedPlayers}
        onAddPlayerFromPool={handleAddPlayerFromPool}
        onCreateNewPlayer={handleCreateNewPlayer}
        onTogglePlayerStatus={handleTogglePlayerStatus}
        onUpdatePlayerName={handleUpdatePlayerName}
        onRemovePlayer={handleRemovePlayer}
        onUpdateAllPlayersStatus={handleUpdateAllPlayersStatus}
      />
      
      {/* Schedule Preview Modal */}
      <SchedulePreviewModal 
        isOpen={schedulePreview.showPreview} 
        onClose={schedulePreview.closePreview} 
        previewData={schedulePreview.previewData}
        isExisting={schedulePreview.isExistingSchedule}
        onRegenerate={schedulePreview.handleRegenerateSchedule}
        isRegenerating={schedulePreview.isRegeneratingSchedule}
        isAdmin={false}
      />
    </div>
  )
}
