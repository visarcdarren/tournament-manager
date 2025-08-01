import React, { useEffect } from 'react'
import { Trophy, Medal, Award, PartyPopper, Download, Plus } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { useNavigate } from '@/App'
import { calculateScores } from '@/utils/tournament'
import api from '@/utils/api'
import Confetti from './Confetti'

export default function CompletionScreen({ tournament }) {
  const navigate = useNavigate()
  const { toast } = useToast()
  const scores = calculateScores(tournament)
  const winner = scores[0]
  const podium = scores.slice(0, 3)
  
  useEffect(() => {
    // Play celebration sound
    const audioContext = new (window.AudioContext || window.webkitAudioContext)()
    const notes = [523.25, 659.25, 783.99, 1046.50] // C, E, G, C (major chord)
    
    notes.forEach((freq, index) => {
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      oscillator.frequency.value = freq
      oscillator.type = 'sine'
      
      const startTime = audioContext.currentTime + index * 0.1
      gainNode.gain.setValueAtTime(0, startTime)
      gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.05)
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.5)
      
      oscillator.start(startTime)
      oscillator.stop(startTime + 0.5)
    })
  }, [])
  
  const exportResults = async () => {
    try {
      await api.exportTournament(tournament.id)
      toast({
        title: 'Success',
        description: 'Tournament results exported'
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to export results',
        variant: 'destructive'
      })
    }
  }
  
  const createNewTournament = async () => {
    try {
      const newTournament = await api.createTournament({
        name: `${tournament.name} - Next Round`,
        settings: tournament.settings,
        teams: tournament.teams.map(team => ({
          ...team,
          players: team.players.map(p => ({ ...p, id: undefined }))
        })),
        schedule: [],
        currentState: { round: 1, status: 'setup' }
      })
      
      navigate(`/tournament/${newTournament.id}`)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create new tournament',
        variant: 'destructive'
      })
    }
  }
  
  return (
    <div className="relative min-h-[80vh]">
      <Confetti />
      
      <div className="space-y-8 text-center">
        {/* Winner Announcement */}
        <div className="space-y-4">
          <h1 className="text-5xl font-bold">🎉 Tournament Complete! 🎉</h1>
          <div className="text-3xl">
            <span className="text-muted-foreground">Winner:</span>{' '}
            <span className="font-bold text-primary">{winner.teamName}</span>
          </div>
        </div>
        
        {/* Podium */}
        <div className="mx-auto max-w-2xl">
          <div className="grid grid-cols-3 items-end gap-4">
            {/* 2nd Place */}
            {podium[1] && (
              <div className="space-y-2">
                <Card className="position-2 border-0">
                  <CardContent className="p-6">
                    <Medal className="mx-auto mb-2 h-12 w-12" />
                    <h3 className="mb-1 text-lg font-bold">{podium[1].teamName}</h3>
                    <p className="text-2xl font-bold">{podium[1].points}</p>
                    <p className="text-sm">points</p>
                  </CardContent>
                </Card>
                <div className="h-20 rounded bg-gray-300"></div>
              </div>
            )}
            
            {/* 1st Place */}
            <div className="space-y-2">
              <Card className="position-1 scale-110 border-0">
                <CardContent className="p-6">
                  <Trophy className="mx-auto mb-2 h-16 w-16" />
                  <h3 className="mb-1 text-xl font-bold">{winner.teamName}</h3>
                  <p className="text-3xl font-bold">{winner.points}</p>
                  <p className="text-sm">points</p>
                </CardContent>
              </Card>
              <div className="h-32 rounded bg-yellow-500"></div>
            </div>
            
            {/* 3rd Place */}
            {podium[2] && (
              <div className="space-y-2">
                <Card className="position-3 border-0">
                  <CardContent className="p-6">
                    <Award className="mx-auto mb-2 h-12 w-12" />
                    <h3 className="mb-1 text-lg font-bold">{podium[2].teamName}</h3>
                    <p className="text-2xl font-bold">{podium[2].points}</p>
                    <p className="text-sm">points</p>
                  </CardContent>
                </Card>
                <div className="h-16 rounded bg-orange-600"></div>
              </div>
            )}
          </div>
        </div>
        
        {/* Full Results */}
        <Card className="mx-auto max-w-2xl">
          <CardHeader>
            <CardTitle>Final Standings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {scores.map((team, index) => (
                <div
                  key={team.teamId}
                  className="flex items-center justify-between rounded-lg bg-muted/50 p-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-8 text-center font-semibold">{index + 1}</span>
                    <div className="text-left">
                      <div className="font-semibold">{team.teamName}</div>
                      <div className="text-sm text-muted-foreground">
                        {team.wins}W - {team.draws}D - {team.losses}L
                      </div>
                    </div>
                  </div>
                  <div className="text-xl font-bold">{team.points} pts</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        
        {/* Actions */}
        <div className="flex justify-center gap-4">
          <Button variant="outline" onClick={exportResults}>
            <Download className="mr-2 h-4 w-4" />
            Export Results
          </Button>
          <Button onClick={createNewTournament}>
            <Plus className="mr-2 h-4 w-4" />
            New Tournament
          </Button>
        </div>
      </div>
    </div>
  )
}
