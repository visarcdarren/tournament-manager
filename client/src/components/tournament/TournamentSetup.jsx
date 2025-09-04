import React, { useState, useEffect } from 'react'
import { Settings, Save, AlertCircle, Timer, TimerOff, Users, Calendar, Eye, RotateCcw, Trash2, Download } from 'lucide-react'
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
import SchedulePreviewModal from './SchedulePreviewModal'

export default function TournamentSetup({ tournament, isAdmin, isOriginalAdmin, onNavigateToPlayers, onExportTournament, onDeleteTournament }) {
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
  
  // State for tournament name editing
  const [tournamentName, setTournamentName] = useState(tournament.name)
  const [isEditingName, setIsEditingName] = useState(false)
  
  const [isSaving, setIsSaving] = useState(false)
  const [validation, setValidation] = useState(null)
  const [showPreview, setShowPreview] = useState(false)
  const [previewData, setPreviewData] = useState(null)
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false)
  const [isExistingSchedule, setIsExistingSchedule] = useState(false)
  const [isRegeneratingSchedule, setIsRegeneratingSchedule] = useState(false)
  const [showResetDialog, setShowResetDialog] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  
  const handleSettingChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      [field]: value === '' ? '' : (parseInt(value) || value)
    }))
  }
  
  const handleScoringChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      scoring: {
        ...prev.scoring,
        [field]: value === '' ? '' : (parseInt(value) || 0)
      }
    }))
  }
  
  const handleTimerChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      timer: {
        ...prev.timer,
        [field]: field === 'duration' ? (value === '' ? '' : parseInt(value) || 30) : value
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
      
      // Clean up settings before saving, converting empty strings to appropriate defaults
      const cleanedSettings = {
        ...settings,
        teams: settings.teams === '' ? 2 : parseInt(settings.teams) || 2,
        playersPerTeam: settings.playersPerTeam === '' ? 1 : parseInt(settings.playersPerTeam) || 1,
        rounds: settings.rounds === '' ? 1 : parseInt(settings.rounds) || 1,
        timer: {
          ...settings.timer,
          duration: settings.timer.duration === '' ? 30 : parseInt(settings.timer.duration) || 30
        },
        scoring: {
          win: settings.scoring.win === '' ? 3 : parseInt(settings.scoring.win) || 0,
          draw: settings.scoring.draw === '' ? 1 : parseInt(settings.scoring.draw) || 0,
          loss: settings.scoring.loss === '' ? 0 : parseInt(settings.scoring.loss) || 0
        }
      }
      
      const updatedTournament = {
        ...tournament,
        name: tournamentName,
        settings: cleanedSettings
      }
      
      await api.updateTournament(tournament.id, updatedTournament)
      tournamentStore.setTournament(updatedTournament)
      
      // Update local state with cleaned values
      setSettings(cleanedSettings)
      
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
      
      // Clean up settings before saving, converting empty strings to appropriate defaults
      const cleanedSettings = {
        ...settings,
        teams: settings.teams === '' ? 2 : parseInt(settings.teams) || 2,
        playersPerTeam: settings.playersPerTeam === '' ? 1 : parseInt(settings.playersPerTeam) || 1,
        rounds: settings.rounds === '' ? 1 : parseInt(settings.rounds) || 1,
        timer: {
          ...settings.timer,
          duration: settings.timer.duration === '' ? 30 : parseInt(settings.timer.duration) || 30
        },
        scoring: {
          win: settings.scoring.win === '' ? 3 : parseInt(settings.scoring.win) || 0,
          draw: settings.scoring.draw === '' ? 1 : parseInt(settings.scoring.draw) || 0,
          loss: settings.scoring.loss === '' ? 0 : parseInt(settings.scoring.loss) || 0
        }
      }
      
      const updatedTournament = {
        ...tournament,
        name: tournamentName,
        settings: cleanedSettings
      }
      
      await api.updateTournament(tournament.id, updatedTournament)
      tournamentStore.setTournament(updatedTournament)
      
      // Update local state with cleaned values
      setSettings(cleanedSettings)
      
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
  
  const previewSchedule = async (forceRegenerate = false) => {
    try {
      if (forceRegenerate) {
        setIsRegeneratingSchedule(true)
      } else {
        setIsGeneratingPreview(true)
      }
      
      // Save current settings first
      const updatedTournament = {
        ...tournament,
        name: tournamentName,
        settings
      }
      await api.updateTournament(tournament.id, updatedTournament)
      tournamentStore.setTournament(updatedTournament)
      
      // Generate/retrieve preview
      const result = await api.previewSchedule(tournament.id, forceRegenerate)
      
      // Create a mock tournament object for the ScheduleViewer
      setPreviewData({
        ...updatedTournament,
        schedule: result.schedule,
        validation: result.validation
      })
      
      setIsExistingSchedule(result.isExisting)
      setShowPreview(true)
      
      if (!result.isExisting) {
        toast({
          title: 'Schedule Generated',
          description: 'Your tournament schedule has been created and saved.'
        })
      }
      
    } catch (error) {
      toast({
        title: 'Preview Failed',
        description: error.message || 'Unable to generate schedule preview',
        variant: 'destructive'
      })
    } finally {
      setIsGeneratingPreview(false)
      setIsRegeneratingSchedule(false)
    }
  }
  
  const handleRegenerateSchedule = () => {
    previewSchedule(true)
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
    const estimatedGameTime = settings.timer.enabled ? settings.timer.duration : 20 // Use 20 min estimate for non-timed games
    const totalGameTime = settings.rounds * estimatedGameTime
    const changeoverTime = settings.rounds * 3 // 3 min per round changeover
    const totalTournamentTime = totalGameTime + changeoverTime
    
    if (totalTournamentTime > 240) { // More than 4 hours
      const hours = Math.floor(totalTournamentTime / 60)
      const minutes = totalTournamentTime % 60
      const timeDisplay = hours > 0 ? `${hours}h ${minutes}m` : `${minutes} min`
      issues.push({
        type: 'info',
        title: 'Long tournament duration',
        description: `Estimated ${timeDisplay} total (${settings.rounds} rounds, including changeover time). Consider breaks for longer tournaments.`
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
  
  // Check if basic settings are valid with detailed validation
  const validateBasicSettings = () => {
    const errors = []
    
    const teams = settings.teams === '' ? 0 : parseInt(settings.teams) || 0
    const playersPerTeam = settings.playersPerTeam === '' ? 0 : parseInt(settings.playersPerTeam) || 0
    const rounds = settings.rounds === '' ? 0 : parseInt(settings.rounds) || 0
    
    if (!teams || teams < 2) {
      errors.push('At least 2 teams required')
    } else if (teams > 10) {
      errors.push('Maximum 10 teams allowed')
    }
    
    if (!playersPerTeam || playersPerTeam < 1) {
      errors.push('At least 1 player per team required')
    }
    
    if (!rounds || rounds < 1) {
      errors.push('At least 1 round required')
    } else if (rounds > 20) {
      errors.push('Maximum 20 rounds allowed')
    }
    
    if (!settings.gameTypes || settings.gameTypes.length === 0) {
      errors.push('At least one game type must be configured')
    } else {
      // Check if any game type has no stations
      const gameTypesWithoutStations = settings.gameTypes.filter(gt => !gt.stations || gt.stations.length === 0)
      if (gameTypesWithoutStations.length > 0) {
        errors.push(`Game type "${gameTypesWithoutStations[0].name}" needs at least one station`)
      }
    }
    
    if (!tournamentName || !tournamentName.trim()) {
      errors.push('Tournament name is required')
    }
    
    return errors
  }
  
  const validationErrors = validateBasicSettings()
  const hasBasicSettings = validationErrors.length === 0
  
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
      {/* Tournament Name */}
      <Card>
        <CardHeader>
          <CardTitle>Tournament Name</CardTitle>
          <CardDescription>
            {canEdit ? 'Give your tournament a memorable name' : 'Tournament name (read-only)'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {canEdit ? (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  value={tournamentName}
                  onChange={(e) => setTournamentName(e.target.value)}
                  placeholder="Enter tournament name"
                  maxLength={100}
                  className={`flex-1 ${tournamentName.trim() ? 'border-green-500' : 'border-red-500'}`}
                />
                <Button
                  onClick={async () => {
                    if (tournamentName.trim() && tournamentName !== tournament.name) {
                      try {
                        setIsSaving(true)
                        const updatedTournament = {
                          ...tournament,
                          name: tournamentName.trim()
                        }
                        await api.updateTournament(tournament.id, updatedTournament)
                        tournamentStore.setTournament(updatedTournament)
                        toast({
                          title: 'Success',
                          description: 'Tournament name updated'
                        })
                      } catch (error) {
                        toast({
                          title: 'Error',
                          description: 'Failed to update tournament name',
                          variant: 'destructive'
                        })
                      } finally {
                        setIsSaving(false)
                      }
                    }
                  }}
                  disabled={!tournamentName.trim() || tournamentName === tournament.name || isSaving}
                  variant="outline"
                >
                  {isSaving ? 'Saving...' : 'Update'}
                </Button>
              </div>
              {!tournamentName.trim() && (
                <p className="text-sm text-red-600">
                  Tournament name is required
                </p>
              )}
            </div>
          ) : (
            <div className="p-3 bg-muted rounded-md font-medium">
              {tournament.name}
            </div>
          )}
        </CardContent>
      </Card>
      
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
                  className={!canEdit ? '' : (settings.teams >= 2 && settings.teams <= 10) ? 'border-green-500' : 'border-red-500'}
                />
                <p className="mt-1 text-sm text-muted-foreground">2-10 teams</p>
                {canEdit && (settings.teams < 2 || settings.teams > 10) && (
                  <p className="text-sm text-red-600 mt-1">
                    {settings.teams < 2 ? 'Minimum 2 teams required' : 'Maximum 10 teams allowed'}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="playersPerTeam">Players per Team</Label>
                <Input
                  id="playersPerTeam"
                  type="number"
                  min="1"
                  value={settings.playersPerTeam}
                  onChange={(e) => handleSettingChange('playersPerTeam', e.target.value)}
                  disabled={!canEdit}
                  className={!canEdit ? '' : (settings.playersPerTeam >= 1) ? 'border-green-500' : 'border-red-500'}
                />
                <p className="mt-1 text-sm text-muted-foreground">Minimum 1 player per team</p>
                {canEdit && settings.playersPerTeam < 1 && (
                  <p className="text-sm text-red-600 mt-1">
                    At least 1 player per team required
                  </p>
                )}
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
                  className={!canEdit ? '' : (settings.rounds >= 1 && settings.rounds <= 20) ? 'border-green-500' : 'border-red-500'}
                />
                <p className="mt-1 text-sm text-muted-foreground">
                  Total games: {settings.rounds * totalStations}
                </p>
                {canEdit && (settings.rounds < 1 || settings.rounds > 20) && (
                  <p className="text-sm text-red-600 mt-1">
                    {settings.rounds < 1 ? 'At least 1 round required' : 'Maximum 20 rounds allowed'}
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label>Round Timer</Label>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleTimerChange('enabled', !settings.timer.enabled)}
                  disabled={!canEdit}
                  className={`w-full sm:w-auto flex items-center justify-center gap-2 h-12 sm:h-10 text-base sm:text-sm ${
                    settings.timer.enabled 
                      ? 'bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-200' 
                      : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {settings.timer.enabled ? (
                    <>
                      <Timer className="h-5 w-5 sm:h-4 sm:w-4" style={{ flexShrink: 0 }} />
                      Round Timer Enabled
                    </>
                  ) : (
                    <>
                      <TimerOff className="h-5 w-5 sm:h-4 sm:w-4" style={{ flexShrink: 0 }} />
                      Enable Round Timer
                    </>
                  )}
                </Button>
                
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

      {/* Setup Status Card - Show validation issues */}
      {canEdit && validationErrors.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-amber-800 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Setup Incomplete
            </CardTitle>
            <CardDescription className="text-amber-700">
              Please fix the following issues to continue:
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {validationErrors.map((error, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-amber-800">
                  <span className="text-amber-600 font-bold mt-0.5">•</span>
                  <span>{error}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 text-sm text-amber-700">
              Complete these requirements to enable the "Save and Add Players" button.
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Success Status Card */}
      {canEdit && validationErrors.length === 0 && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-800 flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Setup Complete!
            </CardTitle>
            <CardDescription className="text-green-700">
              Your tournament configuration is valid and ready for the next step.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-green-700">
              You can now save these settings and proceed to add players to your teams.
            </div>
          </CardContent>
        </Card>
      )}

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


      {/* Data Backup */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Data Backup</CardTitle>
            <CardDescription>
              Export tournament data for backup or analysis purposes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Download a complete backup of your tournament including all settings, teams, 
                players, schedule, and results in JSON format.
              </p>
              <Button variant="outline" onClick={onExportTournament}>
                <Download className="mr-2 h-4 w-4" />
                Export Tournament Data
              </Button>
            </div>
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
                {settings.timer.enabled ? (
                  <>
                    <div className="border-t pt-2 mt-2">
                      <div className="font-medium text-gray-800 mb-1">Tournament Duration</div>
                      <div>Game Time: {settings.rounds} rounds × {settings.timer.duration} min = {settings.rounds * settings.timer.duration} minutes</div>
                      <div className="text-blue-700">Estimated Total: {(() => {
                        const gameTimeMinutes = settings.rounds * settings.timer.duration
                        const changeoverMinutes = Math.max(1, Math.round(settings.rounds * 3)) // 3 min per round changeover
                        const totalMinutes = gameTimeMinutes + changeoverMinutes
                        const hours = Math.floor(totalMinutes / 60)
                        const minutes = totalMinutes % 60
                        return hours > 0 ? `${hours}h ${minutes}m` : `${minutes} min`
                      })()} <span className="text-xs text-gray-600">(allowing 3 min per changeover)</span></div>
                    </div>
                  </>
                ) : (
                  <div>No timer set - games run at player pace</div>
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
            <div className="space-y-3">
              <div className="flex gap-2 flex-wrap">
                <Button 
                  onClick={saveSettings} 
                  disabled={isSaving || !canSaveSettings}
                  variant="outline"
                  title={!canSaveSettings ? 'Fix validation errors above to enable' : ''}
                >
                  <Save className="mr-2 h-4 w-4" />
                  {isSaving ? 'Saving...' : 'Save Settings'}
                </Button>
                <Button 
                  onClick={saveAndEditPlayers} 
                  disabled={isSaving || !canSaveSettings}
                  title={!canSaveSettings ? 'Fix validation errors above to enable' : ''}
                  className={canSaveSettings ? '' : 'opacity-50'}
                >
                  <Users className="mr-2 h-4 w-4" />
                  {isSaving ? 'Saving...' : 'Save and Add Players'}
                </Button>
                {canPreview && (
                  <Button 
                    onClick={() => previewSchedule()}
                    disabled={isGeneratingPreview}
                    variant="outline"
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    {isGeneratingPreview ? 'Generating...' : 'Preview Schedule'}
                  </Button>
                )}
              </div>
              
              {!canSaveSettings && (
                <div className="text-sm text-muted-foreground">
                  💡 Complete the setup requirements above to continue
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Danger Zone */}
      {isAdmin && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-700">Danger Zone</CardTitle>
            <CardDescription>
              Destructive actions that cannot be undone
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Reset Tournament - Only show if tournament has started or has results */}
            {canReset && (
              <div className="space-y-3">
                <div>
                  <h4 className="font-semibold text-base text-red-700 mb-2">Reset Tournament Progress</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Reset tournament progress and return to setup state. This will clear all game results but keep the schedule structure.
                  </p>
                  <Button 
                    variant="destructive"
                    onClick={() => setShowResetDialog(true)}
                    disabled={isResetting}
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    {isResetting ? 'Resetting...' : 'Reset Tournament Progress'}
                  </Button>
                </div>
                {/* Divider */}
                <div className="border-t border-red-200" />
              </div>
            )}
            
            {/* Delete Tournament */}
            <div className="space-y-3">
              <div>
                <h4 className="font-semibold text-base text-red-700 mb-2">Delete Tournament</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Permanently delete this tournament and all associated data. This action cannot be undone.
                </p>
                <Button 
                  variant="destructive"
                  onClick={onDeleteTournament}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Tournament
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Schedule Preview Modal */}
      <SchedulePreviewModal 
        isOpen={showPreview} 
        onClose={setShowPreview} 
        previewData={previewData}
        isExisting={isExistingSchedule}
        onRegenerate={handleRegenerateSchedule}
        isRegenerating={isRegeneratingSchedule}
        isAdmin={false}
      />
      
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
