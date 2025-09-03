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
  
  // Handle case where there are no scores yet
  if (!scores || scores.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">No games completed yet</h2>
          <p className="text-muted-foreground">Complete some games to see the final results.</p>
        </div>
      </div>
    )
  }
  
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
        <div className="mx-auto max-w-4xl">
          {/* Desktop Podium - Hidden on mobile */}
          <div className="hidden md:block">
            <div className="grid grid-cols-3 items-end gap-4">
              {/* 2nd Place */}
              {podium[1] && (
                <div className="space-y-2">
                  <Card className="bg-gradient-to-b from-slate-400 to-slate-500 border-slate-300 shadow-lg">
                    <CardContent className="p-6">
                      <Medal className="mx-auto mb-2 h-12 w-12 text-slate-100" />
                      <h3 className="mb-1 text-lg font-bold text-white">{podium[1].teamName}</h3>
                      <p className="text-2xl font-bold text-slate-100">{podium[1].points}</p>
                      <p className="text-sm text-slate-200">points</p>
                    </CardContent>
                  </Card>
                  <div className="h-20 rounded bg-gradient-to-b from-slate-300 to-slate-400 shadow-md flex items-center justify-center">
                    <span className="font-bold text-slate-800 text-lg">2nd</span>
                  </div>
                </div>
              )}
              
              {/* 1st Place */}
              <div className="space-y-2">
                <Card className="bg-gradient-to-b from-yellow-100 to-yellow-200 border-yellow-300 shadow-xl scale-110">
                  <CardContent className="p-6">
                    <Trophy className="mx-auto mb-2 h-16 w-16 text-yellow-600" />
                    <h3 className="mb-1 text-xl font-bold text-yellow-800">{winner.teamName}</h3>
                    <p className="text-3xl font-bold text-yellow-700">{winner.points}</p>
                    <p className="text-sm text-yellow-600">points</p>
                  </CardContent>
                </Card>
                <div className="h-32 rounded bg-gradient-to-b from-yellow-400 to-yellow-500 shadow-lg flex items-center justify-center">
                  <span className="font-bold text-yellow-800 text-xl">1st</span>
                </div>
              </div>
              
              {/* 3rd Place */}
              {podium[2] && (
                <div className="space-y-2">
                  <Card className="bg-gradient-to-b from-amber-600 to-amber-700 border-amber-500 shadow-lg">
                    <CardContent className="p-6">
                      <Award className="mx-auto mb-2 h-12 w-12 text-amber-100" />
                      <h3 className="mb-1 text-lg font-bold text-white">{podium[2].teamName}</h3>
                      <p className="text-2xl font-bold text-amber-100">{podium[2].points}</p>
                      <p className="text-sm text-amber-200">points</p>
                    </CardContent>
                  </Card>
                  <div className="h-16 rounded bg-gradient-to-b from-amber-400 to-amber-500 shadow-md flex items-center justify-center">
                    <span className="font-bold text-amber-800 text-lg">3rd</span>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Mobile Podium - Stacked rows, visible only on mobile */}
          <div className="md:hidden space-y-4">
            {/* 1st Place - Gold */}
            <Card className="bg-gradient-to-r from-yellow-100 to-yellow-200 border-yellow-300 shadow-xl">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="flex-shrink-0">
                  <Trophy className="h-12 w-12 text-yellow-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="bg-yellow-500 text-yellow-900 font-bold text-sm px-2 py-1 rounded">1st</span>
                    <h3 className="text-xl font-bold text-yellow-800">{winner.teamName}</h3>
                  </div>
                  <p className="text-2xl font-bold text-yellow-700">{winner.points} points</p>
                  <p className="text-sm text-yellow-600">{winner.wins}W - {winner.draws}D - {winner.losses}L</p>
                </div>
              </CardContent>
            </Card>
            
            {/* 2nd Place - Silver */}
            {podium[1] && (
              <Card className="bg-gradient-to-r from-slate-100 to-slate-200 border-slate-300 shadow-lg">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="flex-shrink-0">
                    <Medal className="h-12 w-12 text-slate-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="bg-slate-400 text-slate-800 font-bold text-sm px-2 py-1 rounded">2nd</span>
                      <h3 className="text-xl font-bold text-slate-800">{podium[1].teamName}</h3>
                    </div>
                    <p className="text-2xl font-bold text-slate-700">{podium[1].points} points</p>
                    <p className="text-sm text-slate-600">{podium[1].wins}W - {podium[1].draws}D - {podium[1].losses}L</p>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* 3rd Place - Bronze */}
            {podium[2] && (
              <Card className="bg-gradient-to-r from-orange-100 to-orange-200 border-orange-300 shadow-lg">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="flex-shrink-0">
                    <Award className="h-12 w-12 text-orange-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="bg-orange-400 text-orange-800 font-bold text-sm px-2 py-1 rounded">3rd</span>
                      <h3 className="text-xl font-bold text-orange-800">{podium[2].teamName}</h3>
                    </div>
                    <p className="text-2xl font-bold text-orange-700">{podium[2].points} points</p>
                    <p className="text-sm text-orange-600">{podium[2].wins}W - {podium[2].draws}D - {podium[2].losses}L</p>
                  </div>
                </CardContent>
              </Card>
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
