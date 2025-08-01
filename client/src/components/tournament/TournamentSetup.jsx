import React, { useState } from 'react'
import { Settings, Save, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import api from '@/utils/api'
import useTournamentStore from '@/stores/tournamentStore'

export default function TournamentSetup({ tournament, isAdmin }) {
  const { toast } = useToast()
  const tournamentStore = useTournamentStore()
  const [settings, setSettings] = useState(tournament.settings)
  const [isSaving, setIsSaving] = useState(false)
  
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
  
  const canEdit = isAdmin && tournament.currentState.status === 'setup'
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Tournament Configuration</CardTitle>
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
          
          {/* Equipment Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Equipment</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="shuffleboards">Shuffleboards</Label>
                <Input
                  id="shuffleboards"
                  type="number"
                  min="1"
                  max="4"
                  value={settings.shuffleboards}
                  onChange={(e) => handleSettingChange('shuffleboards', e.target.value)}
                  disabled={!canEdit}
                />
                <p className="mt-1 text-sm text-muted-foreground">1-4 shuffleboards</p>
              </div>
              <div>
                <Label htmlFor="dartboards">Dartboards</Label>
                <Input
                  id="dartboards"
                  type="number"
                  min="1"
                  max="4"
                  value={settings.dartboards}
                  onChange={(e) => handleSettingChange('dartboards', e.target.value)}
                  disabled={!canEdit}
                />
                <p className="mt-1 text-sm text-muted-foreground">1-4 dartboards</p>
              </div>
            </div>
          </div>
          
          {/* Round Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Rounds</h3>
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
                Total games: {settings.rounds * (settings.shuffleboards + settings.dartboards)}
              </p>
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
          
          {/* Summary */}
          <div className="rounded-lg bg-muted p-4">
            <h4 className="mb-2 font-semibold">Tournament Summary</h4>
            <div className="grid gap-2 text-sm">
              <div>Total Players: {settings.teams * settings.playersPerTeam}</div>
              <div>Games per Round: {settings.shuffleboards + settings.dartboards}</div>
              <div>Players per Round: {(settings.shuffleboards + settings.dartboards) * 2} active, {settings.teams * settings.playersPerTeam - (settings.shuffleboards + settings.dartboards) * 2} resting</div>
              <div>Total Games: {settings.rounds * (settings.shuffleboards + settings.dartboards)}</div>
            </div>
            
            {settings.playersPerTeam % 2 !== 0 && (
              <div className="mt-2 flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                Players per team must be an even number
              </div>
            )}
          </div>
          
          {canEdit && (
            <Button onClick={saveSettings} disabled={isSaving || settings.playersPerTeam % 2 !== 0}>
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save Settings'}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
