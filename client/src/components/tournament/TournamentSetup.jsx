import React, { useState, useEffect } from 'react'
import { Settings, Save, AlertCircle, Timer, TimerOff, Users, Calendar, Eye } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import api from '@/utils/api'
import useTournamentStore from '@/stores/tournamentStore'
import GameTypeManager from './GameTypeManager'
import ScheduleViewer from './ScheduleViewer'

export default function TournamentSetup({ tournament, isAdmin, onNavigateToTeams }) {
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
  
  const saveAndEditTeams = async () => {
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
        description: 'Settings saved! Switching to teams...'
      })
      
      // Navigate to teams tab after successful save
      if (onNavigateToTeams) {
        onNavigateToTeams()
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
  
  const canEdit = isAdmin && tournament.currentState.status === 'setup'
  const hasValidationErrors = validation && !validation.valid
  
  // Calculate summary stats
  const totalStations = settings.gameTypes.reduce((sum, gt) => sum + gt.stations.length, 0)
  const totalPlayers = settings.teams * settings.playersPerTeam
  const playersPerRound = Math.min(totalPlayers, totalStations * 2) // Assuming minimum 1v1
  const restingPlayers = Math.max(0, totalPlayers - playersPerRound)
  
  // Check if basic settings are valid
  const hasBasicSettings = settings.teams >= 2 && 
                          settings.teams <= 10 && 
                          settings.playersPerTeam >= 4 && 
                          settings.playersPerTeam <= 10 && 
                          settings.playersPerTeam % 2 === 0 &&
                          settings.rounds >= 1
  
  // For initial setup, we don't need teams to be created yet
  const canSaveSettings = canEdit && hasBasicSettings
  
  // Can preview if teams exist and validation passes
  const canPreview = tournament.teams?.length >= 2 && 
                    validation?.valid && 
                    canEdit
  
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
                  step="2"
                  value={settings.playersPerTeam}
                  onChange={(e) => handleSettingChange('playersPerTeam', e.target.value)}
                  disabled={!canEdit}
                />
                <p className="mt-1 text-sm text-muted-foreground">4-10 players (must be even)</p>
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

      {/* Summary & Validation */}
      <Card className={hasValidationErrors ? 'border-destructive' : ''}>
        <CardHeader>
          <CardTitle>Tournament Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 text-sm">
            <div>Total Players: {totalPlayers}</div>
            <div>Total Stations: {totalStations}</div>
            <div>Games per Round: {totalStations}</div>
            <div>Players per Round: ~{playersPerRound} active, ~{restingPlayers} resting</div>
            <div>Total Games: {settings.rounds * totalStations}</div>
            {settings.timer.enabled && (
              <div>Round Duration: {settings.timer.duration} minutes</div>
            )}
          </div>
          
          {/* Validation Messages */}
          {validation && (
            <div className="space-y-2">
              {validation.errors && validation.errors.length > 0 && (
                <div className="space-y-1">
                  {validation.errors.map((error, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-destructive">
                      <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>{error}</span>
                    </div>
                  ))}
                </div>
              )}
              
              {validation.warnings && validation.warnings.length > 0 && (
                <div className="space-y-1">
                  {validation.warnings.map((warning, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-amber-600">
                      <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>{warning}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {settings.playersPerTeam % 2 !== 0 && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              Players per team must be an even number
            </div>
          )}
          
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
                onClick={saveAndEditTeams} 
                disabled={isSaving || !canSaveSettings}
              >
                <Users className="mr-2 h-4 w-4" />
                {isSaving ? 'Saving...' : 'Save and Edit Teams'}
              </Button>
              {canPreview && (
                <Button 
                  onClick={previewSchedule}
                  disabled={isGeneratingPreview}
                  variant="outline"
                  className="border-blue-200 text-blue-700 hover:bg-blue-50"
                >
                  <Eye className="mr-2 h-4 w-4" />
                  {isGeneratingPreview ? 'Generating...' : 'Preview Schedule'}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      
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
                <ScheduleViewer tournament={previewData} />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
