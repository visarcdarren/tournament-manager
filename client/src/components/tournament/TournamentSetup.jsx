import React, { useState, useEffect } from 'react'
import { Settings, Save, AlertCircle, Timer, TimerOff, Users, Calendar, Eye, RotateCcw } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import api from '@/utils/api'
import useTournamentStore from '@/stores/tournamentStore'
import GameTypeManager from './GameTypeManager'
import ScheduleViewer from './ScheduleViewer'
import AdminSharingDialog from './AdminSharingDialog'

export default function TournamentSetup({ tournament, isAdmin, isOriginalAdmin, onNavigateToPlayers }) {
  const { toast } = useToast()
  const tournamentStore = useTournamentStore()
  const [settings, setSettings] = useState(() => {
    // Ensure we have the new structure
    const baseSettings = {
      ...tournament.settings,
      gameTypes: tournament.settings.gameTypes || [],
      timer: tournament.settings.timer || { enabled: false, duration: 30 }
    }
    
    // Migrate old equipment settings if needed
    if (!baseSettings.gameTypes.length && tournament.settings.equipment) {
      const gameTypes = []
      
      if (tournament.settings.equipment.shuffleboards > 0) {
        gameTypes.push({
          id: 'shuffleboard',
          name: 'Shuffleboard',
          playersPerTeam: 1,
          stations: Array(tournament.settings.equipment.shuffleboards)
            .fill(null)
            .map((_, i) => ({
              id: tournament.settings.equipment.shuffleboards === 1 ? 'shuffleboard' : `shuffleboard-${i + 1}`,
              name: tournament.settings.equipment.shuffleboards === 1 ? 'Shuffleboard' : `Shuffleboard ${i + 1}`
            }))
        })
      }
      
      if (tournament.settings.equipment.dartboards > 0) {
        gameTypes.push({
          id: 'darts',
          name: 'Darts',
          playersPerTeam: 1,
          stations: Array(tournament.settings.equipment.dartboards)
            .fill(null)
            .map((_, i) => ({
              id: tournament.settings.equipment.dartboards === 1 ? 'darts' : `darts-${i + 1}`,
              name: tournament.settings.equipment.dartboards === 1 ? 'Darts' : `Darts ${i + 1}`
            }))
        })
      }
      
      baseSettings.gameTypes = gameTypes
    }
    
    return baseSettings
  })
  
  const [isSaving, setIsSaving] = useState(false)
  const [validation, setValidation] = useState(null)
  const [showPreview, setShowPreview] = useState(false)
  const [previewData, setPreviewData] = useState(null)
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false)
  const [showResetDialog, setShowResetDialog] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  
  const handleSettingChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      [field]: parseInt(value) || value
    }))
  }
  
  const handleScoringChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      scoring: {
        ...prev.scoring,
        [field]: parseInt(value) || 0
      }
    }))
  }
  
  const handleTimerChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      timer: {
        ...prev.timer,
        [field]: field === 'duration' ? parseInt(value) || 30 : value
      }
    }))
  }
  
  const handleGameTypesChange = (gameTypes) => {
    setSettings(prev => ({
      ...prev,
      gameTypes
    }))
  }
  
  // Validate settings whenever they change
  useEffect(() => {
    const validateSettings = async () => {
      // Only validate if we have actual teams created
      if (!tournament.id || !tournament.teams || tournament.teams.length === 0) {
        setValidation(null)
        return
      }
      
      try {
        const response = await api.validateTournament(tournament.id)
        setValidation(response)
      } catch (error) {
        console.error('Validation error:', error)
        setValidation(null)
      }
    }
    
    validateSettings()
  }, [settings, tournament.teams, tournament.id])
  
  const saveSettings = async () => {
    try {
      setIsSaving(true)
      const updatedTournament = {
        ...tournament,
        settings
      }
      
      await api.updateTournament(tournament.id, updatedTournament)
      tournamentStore.setTournament(updatedTournament)
      
      toast({
        title: 'Success',
        description: 'Tournament settings saved'
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save settings',
        variant: 'destructive'
      })
    } finally {
      setIsSaving(false)
    }
  }
  
  const saveAndEditPlayers = async () => {
    try {
      setIsSaving(true)
      const updatedTournament = {
        ...tournament,
        settings
      }
      
      await api.updateTournament(tournament.id, updatedTournament)
      tournamentStore.setTournament(updatedTournament)
      
      toast({
        title: 'Success',
        description: 'Settings saved! Switching to players...'
      })
      
      // Navigate to players tab after successful save
      if (onNavigateToPlayers) {
        onNavigateToPlayers()
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save settings',
        variant: 'destructive'
      })
    } finally {
      setIsSaving(false)
    }
  }
  
  const previewSchedule = async () => {
    try {
      setIsGeneratingPreview(true)
      
      // Save current settings first
      const updatedTournament = {
        ...tournament,
        settings
      }
      await api.updateTournament(tournament.id, updatedTournament)
      tournamentStore.setTournament(updatedTournament)
      
      // Generate preview
      const result = await api.previewSchedule(tournament.id)
      
      // Create a mock tournament object for the ScheduleViewer
      setPreviewData({
        ...updatedTournament,
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
  
  const handleReset = async () => {
    try {
      setIsResetting(true)
      
      await api.resetTournament(tournament.id)
      
      toast({
        title: 'Tournament Reset',
        description: 'All results and progress have been cleared. Tournament returned to setup state.',
      })
      
      setShowResetDialog(false)
      
    } catch (error) {
      toast({
        title: 'Reset Failed',
        description: error.message || 'Unable to reset tournament',
        variant: 'destructive'
      })
    } finally {
      setIsResetting(false)
    }
  }
  
  const canEdit = isAdmin && tournament.currentState.status === 'setup'
  const hasValidationErrors = validation && !validation.valid
  
  // Reset should be available when admin and tournament has started or has results
  const canReset = isAdmin && tournament.schedule && tournament.schedule.length > 0 && (
    tournament.currentState.status !== 'setup' || 
    tournament.schedule.some(round => round.games.some(game => game.result !== null))
  )
  
  // Calculate summary stats
  const totalStations = settings.gameTypes.reduce((sum, gt) => sum + gt.stations.length, 0)
  const totalPlayers = settings.teams * settings.playersPerTeam
  
  // Calculate actual players per round based on game type requirements
  const calculatePlayersPerRound = () => {
    if (!settings.gameTypes || settings.gameTypes.length === 0) {
      return { playersPerRound: 0, restingPlayers: totalPlayers }
    }
    
    let totalPlayersInRound = 0
    settings.gameTypes.forEach(gameType => {
      const stationsForThisGame = gameType.stations?.length || 0
      const playersPerStation = (gameType.playersPerTeam || 1) * 2 // 2 teams per game
      totalPlayersInRound += stationsForThisGame * playersPerStation
    })
    
    const actualPlayersPerRound = Math.min(totalPlayers, totalPlayersInRound)
    const restingPlayers = Math.max(0, totalPlayers - actualPlayersPerRound)
    
    return { playersPerRound: actualPlayersPerRound, restingPlayers }
  }
  
  const { playersPerRound, restingPlayers } = calculatePlayersPerRound()
  
  // Smart Analysis Function
  const analyzeSettings = () => {
    const issues = []
    
    // Skip analysis if no game types are configured yet
    if (!settings.gameTypes || settings.gameTypes.length === 0) {
      return { issues }
    }
    
    // Calculate how many players can actually play per round (using proper game type math)
    let totalGamePositions = 0
    settings.gameTypes.forEach(gameType => {
      const stationsForThisGame = gameType.stations?.length || 0
      const playersPerStation = (gameType.playersPerTeam || 1) * 2 // 2 teams per game
      totalGamePositions += stationsForThisGame * playersPerStation
    })
    
    const playersWhoWillSitOut = Math.max(0, totalPlayers - totalGamePositions)
    
    // Issue 1: Game position vs player analysis (only show if significant)
    if (playersWhoWillSitOut > 0) {
      const percentageSittingOut = Math.round((playersWhoWillSitOut / totalPlayers) * 100)
      
      // Only show if more than a few players sitting out
      if (playersWhoWillSitOut > 2 || percentageSittingOut > 15) {
        issues.push({
          type: 'warning',
          title: `${playersWhoWillSitOut} player(s) will sit out each round`,
          description: `You have ${totalPlayers} total players but only ${totalGamePositions} game positions available (${percentageSittingOut}% sitting out).`
        })
      }
    } else if (totalGamePositions > totalPlayers) {
      // More positions than players - stations will be unused
      const unusedPositions = totalGamePositions - totalPlayers
      const utilizationPercentage = Math.round((totalPlayers / totalGamePositions) * 100)
      
      // Only show if significantly under-utilized
      if (utilizationPercentage < 80) {
        issues.push({
          type: 'info',
          title: `${unusedPositions} game position(s) will be unused each round`,
          description: `You have ${totalGamePositions} total game positions but only ${totalPlayers} players (${utilizationPercentage}% utilization). Consider reducing stations.`
        })
      }
    }
    
    // Issue 2: Tournament length
    const estimatedGameTime = settings.timer.enabled ? settings.timer.duration : 15
    const totalTournamentTime = settings.rounds * estimatedGameTime
    if (totalTournamentTime > 180) { // More than 3 hours
      issues.push({
        type: 'info',
        title: 'Long tournament duration',
        description: `Estimated ${Math.round(totalTournamentTime / 60)} hours total (${settings.rounds} rounds × ${estimatedGameTime} min).`
      })
    }
    
    // Issue 3: Very short rounds
    if (settings.timer.enabled && settings.timer.duration < 10) {
      issues.push({
        type: 'warning',
        title: 'Very short rounds',
        description: `${settings.timer.duration} minutes may not be enough time to complete games.`
      })
    }
    
    // Issue 4: Too many rounds
    if (settings.rounds > (settings.teams - 1) * 2) {
      issues.push({
        type: 'info',
        title: 'Many rounds scheduled',
        description: `${settings.rounds} rounds is quite long. Teams may play each other multiple times.`
      })
    }
    
    return { issues }
  }
  
  // Check if basic settings are valid
  const hasBasicSettings = settings.teams >= 2 && 
                          settings.teams <= 10 && 
                          settings.playersPerTeam >= 4 && 
                          settings.playersPerTeam <= 10 && 
                          settings.rounds >= 1
  
  // For initial setup, we don't need teams to be created yet
  const canSaveSettings = canEdit && hasBasicSettings
  
  // Can preview if teams exist and validation passes
  const canPreview = tournament.teams?.length >= 2 && 
                    validation?.valid && 
                    canEdit
  
  // Get analysis
  const { issues } = analyzeSettings()
  
  return (
    <div className="space-y-6">
      {/* Basic Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Configuration</CardTitle>
          <CardDescription>
            {canEdit 
              ? 'Configure your tournament settings. These cannot be changed once the tournament starts.'
              : 'Tournament settings (read-only)'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Team Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Team Settings</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="teams">Number of Teams</Label>
                <Input
                  id="teams"
                  type="number"
                  min="2"
                  max="10"
                  value={settings.teams}
                  onChange={(e) => handleSettingChange('teams', e.target.value)}
                  disabled={!canEdit}
                />
                <p className="mt-1 text-sm text-muted-foreground">2-10 teams</p>
              </div>
              <div>
                <Label htmlFor="playersPerTeam">Players per Team</Label>
                <Input
                  id="playersPerTeam"
                  type="number"
                  min="4"
                  max="10"
                  value={settings.playersPerTeam}
                  onChange={(e) => handleSettingChange('playersPerTeam', e.target.value)}
                  disabled={!canEdit}
                />
                <p className="mt-1 text-sm text-muted-foreground">4-10 players (any number allowed)</p>
              </div>
            </div>
          </div>
          
          {/* Round Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Rounds & Timing</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="rounds">Number of Rounds</Label>
                <Input
                  id="rounds"
                  type="number"
                  min="1"
                  max="20"
                  value={settings.rounds}
                  onChange={(e) => handleSettingChange('rounds', e.target.value)}
                  disabled={!canEdit}
                />
                <p className="mt-1 text-sm text-muted-foreground">
                  Total games: {settings.rounds * totalStations}
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="timer-enabled"
                    checked={settings.timer.enabled}
                    onCheckedChange={(checked) => handleTimerChange('enabled', checked)}
                    disabled={!canEdit}
                  />
                  <Label 
                    htmlFor="timer-enabled" 
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    {settings.timer.enabled ? <Timer className="h-4 w-4" /> : <TimerOff className="h-4 w-4" />}
                    Enable Round Timer
                  </Label>
                </div>
                
                {settings.timer.enabled && (
                  <div>
                    <Label htmlFor="timer-duration">Duration (minutes)</Label>
                    <Input
                      id="timer-duration"
                      type="number"
                      min="1"
                      max="120"
                      value={settings.timer.duration}
                      onChange={(e) => handleTimerChange('duration', e.target.value)}
                      disabled={!canEdit}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Scoring System */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Scoring System</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label htmlFor="win">Win Points</Label>
                <Input
                  id="win"
                  type="number"
                  min="0"
                  value={settings.scoring.win}
                  onChange={(e) => handleScoringChange('win', e.target.value)}
                  disabled={!canEdit}
                />
              </div>
              <div>
                <Label htmlFor="draw">Draw Points</Label>
                <Input
                  id="draw"
                  type="number"
                  min="0"
                  value={settings.scoring.draw}
                  onChange={(e) => handleScoringChange('draw', e.target.value)}
                  disabled={!canEdit}
                />
              </div>
              <div>
                <Label htmlFor="loss">Loss Points</Label>
                <Input
                  id="loss"
                  type="number"
                  min="0"
                  value={settings.scoring.loss}
                  onChange={(e) => handleScoringChange('loss', e.target.value)}
                  disabled={!canEdit}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Game Types */}
      {canEdit && (
        <Card>
          <CardHeader>
            <CardTitle>Game Types</CardTitle>
            <CardDescription>
              Define the different games that will be played in your tournament
            </CardDescription>
          </CardHeader>
          <CardContent>
            <GameTypeManager 
              gameTypes={settings.gameTypes}
              onChange={handleGameTypesChange}
              teams={tournament.teams}
            />
          </CardContent>
        </Card>
      )}

      {/* Admin Sharing */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Admin Access</CardTitle>
            <CardDescription>
              Share admin access with other users via secure password-protected links
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AdminSharingDialog 
              tournament={tournament} 
              isOriginalAdmin={isOriginalAdmin}
            />
          </CardContent>
        </Card>
      )}

      {/* Enhanced Summary & Validation */}
      <Card className={hasValidationErrors ? 'border-destructive' : ''}>
        <CardHeader>
          <CardTitle>Tournament Summary & Analysis</CardTitle>
          <CardDescription>
            Overview of your tournament configuration with smart recommendations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Summary Layout: 70% Basic Stats, 30% Setup Assistant */}
          <div className="flex gap-6">
            {/* Basic Stats - 70% width */}
            <div className="flex-[0.7] space-y-2">
              <h4 className="font-semibold text-base text-gray-800 mb-3">Basic Stats</h4>
              <div className="grid gap-2 text-sm">
                <div>Total Players: {totalPlayers}</div>
                <div>Total Stations: {totalStations}</div>
                <div>Games per Round: {totalStations}</div>
                <div>Players per Round: ~{playersPerRound} active, ~{restingPlayers} resting</div>
                <div>Total Games: {settings.rounds * totalStations}</div>
                {settings.timer.enabled && (
                  <div>Round Duration: {settings.timer.duration} minutes each</div>
                )}
              </div>
            </div>
            
            {/* Setup Assistant - 30% width, only show if there are issues */}
            {issues.length > 0 && (
              <div className="flex-[0.3] space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h4 className="font-semibold text-base flex items-center gap-2 text-gray-800">
                  <AlertCircle className="h-5 w-5" />
                  Setup Assistant
                </h4>
                <p className="text-sm text-gray-600 -mt-1">
                  Observations about your configuration:
                </p>
                
                {issues.map((issue, index) => (
                  <div key={index} className={`space-y-1 ${
                    issue.type === 'warning' ? 'text-amber-700' : 
                    issue.type === 'info' ? 'text-blue-700' : 'text-gray-700'
                  }`}>
                    <div className="font-medium text-sm">{issue.title}</div>
                    <div className="text-xs opacity-90">{issue.description}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {canEdit && (
            <div className="flex gap-2 flex-wrap">
              <Button 
                onClick={saveSettings} 
                disabled={isSaving || !canSaveSettings}
                variant="outline"
              >
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? 'Saving...' : 'Save Settings'}
              </Button>
              <Button 
                onClick={saveAndEditPlayers} 
                disabled={isSaving || !canSaveSettings}
              >
                <Users className="mr-2 h-4 w-4" />
                {isSaving ? 'Saving...' : 'Save and Add Players'}
              </Button>
              {canPreview && (
                <Button 
                  onClick={previewSchedule}
                  disabled={isGeneratingPreview}
                  variant="outline"
                >
                  <Eye className="mr-2 h-4 w-4" />
                  {isGeneratingPreview ? 'Generating...' : 'Preview Schedule'}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Reset Tournament Section - Only show if tournament has started or has results */}
      {canReset && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-700">Danger Zone</CardTitle>
            <CardDescription>
              Reset tournament progress and return to setup state. This will clear all game results but keep the schedule structure.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="destructive"
              onClick={() => setShowResetDialog(true)}
              disabled={isResetting}
              className="w-full sm:w-auto"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              {isResetting ? 'Resetting...' : 'Reset Tournament Progress'}
            </Button>
          </CardContent>
        </Card>
      )}
      
      {/* Schedule Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Schedule Preview
            </DialogTitle>
            <DialogDescription>
              This is how your tournament schedule will look. You can review all games before starting.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            {previewData && (
              <div className="h-full overflow-auto pr-2">
                <ScheduleViewer tournament={previewData} isAdmin={false} />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Reset Confirmation Dialog */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-700">Reset Tournament Progress</DialogTitle>
            <DialogDescription>
              Are you sure you want to reset this tournament? This will:
              <ul className="mt-2 space-y-1 text-sm">
                <li>• Clear all game results and scores</li>
                <li>• Reset tournament status to setup</li>
                <li>• Keep the schedule structure (you can regenerate if needed)</li>
                <li>• Reset round progress to the beginning</li>
              </ul>
              <strong className="block mt-3 text-red-600">This action cannot be undone.</strong>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowResetDialog(false)}
              disabled={isResetting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReset}
              disabled={isResetting}
            >
              {isResetting ? 'Resetting...' : 'Reset Tournament'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
