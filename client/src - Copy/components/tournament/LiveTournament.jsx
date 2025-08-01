import React, { useState, useEffect } from 'react'
import { Play, Clock, AlertCircle, RotateCcw, Shuffle, Target, Users, Trophy } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import api from '@/utils/api'
import useTournamentStore from '@/stores/tournamentStore'
import { generateSchedule } from '@/utils/tournament'
import GameCard from './GameCard'
import RoundTimer from './RoundTimer'
import PlayerSwapDialog from './PlayerSwapDialog'

export default function LiveTournament({ tournament, currentRound, isAdmin, isScorer }) {
  const { toast } = useToast()
  const tournamentStore = useTournamentStore()
  const [isGenerating, setIsGenerating] = useState(false)
  const [timerDuration, setTimerDuration] = useState(30)
  const [showSwapDialog, setShowSwapDialog] = useState(false)
  const [swapContext, setSwapContext] = useState(null)
  
  const round = tournament.schedule?.find(r => r.round === currentRound)
  const hasSchedule = tournament.schedule && tournament.schedule.length > 0
  const canGenerateSchedule = isAdmin && tournament.currentState.status === 'setup' && 
    tournament.teams.length >= 2 && 
    tournament.teams.every(team => team.players.length === tournament.settings.playersPerTeam)
  
  const generateAndSaveSchedule = async () => {
    try {
      setIsGenerating(true)
      const schedule = generateSchedule(tournament)
      
      const updatedTournament = {
        ...tournament,
        schedule,
        currentState: { ...tournament.currentState, status: 'active' }
      }
      
      await api.updateTournament(tournament.id, updatedTournament)
      tournamentStore.setTournament(updatedTournament)
      
      toast({
        title: 'Success',
        description: 'Tournament schedule generated successfully'
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate schedule',
        variant: 'destructive'
      })
    } finally {
      setIsGenerating(false)
    }
  }
  
  const startRoundTimer = async () => {
    try {
      await api.startTimer(tournament.id, currentRound, timerDuration)
      toast({
        title: 'Timer Started',
        description: `Round ${currentRound} timer started for ${timerDuration} minutes`
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to start timer',
        variant: 'destructive'
      })
    }
  }
  
  const handlePlayerSwap = (game, playerNum) => {
    const player = playerNum === 1 ? game.player1 : game.player2
    setSwapContext({ game, playerNum, currentPlayer: player })
    setShowSwapDialog(true)
  }
  
  const performPlayerSwap = async (newPlayerId) => {
    if (!swapContext) return
    
    const { game, playerNum } = swapContext
    const team = tournament.teams.find(t => 
      t.id === (playerNum === 1 ? game.player1.teamId : game.player2.teamId)
    )
    const newPlayer = team.players.find(p => p.id === newPlayerId)
    
    const updatedTournament = { ...tournament }
    const roundIndex = updatedTournament.schedule.findIndex(r => r.round === currentRound)
    const gameIndex = updatedTournament.schedule[roundIndex].games.findIndex(g => g.id === game.id)
    
    if (playerNum === 1) {
      updatedTournament.schedule[roundIndex].games[gameIndex].player1 = {
        ...game.player1,
        playerId: newPlayer.id,
        playerName: newPlayer.name
      }
    } else {
      updatedTournament.schedule[roundIndex].games[gameIndex].player2 = {
        ...game.player2,
        playerId: newPlayer.id,
        playerName: newPlayer.name
      }
    }
    
    try {
      await api.updateTournament(tournament.id, updatedTournament)
      tournamentStore.setTournament(updatedTournament)
      toast({
        title: 'Success',
        description: 'Player swapped successfully'
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to swap player',
        variant: 'destructive'
      })
    }
    
    setShowSwapDialog(false)
    setSwapContext(null)
  }
  
  // Get resting players with team info
  const getRestingPlayers = () => {
    if (!round) return []
    
    const restingInfo = []
    tournament.teams.forEach(team => {
      const teamRestingPlayers = team.players
        .filter(player => round.restingPlayers.includes(player.id))
        .map(player => ({ ...player, teamName: team.name, teamId: team.id }))
      restingInfo.push(...teamRestingPlayers)
    })
    
    return restingInfo
  }
  
  if (!hasSchedule && canGenerateSchedule) {
    return (
      <Card className="p-12 text-center">
        <Shuffle className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
        <h3 className="mb-2 text-lg font-semibold">Ready to Generate Schedule</h3>
        <p className="mb-4 text-muted-foreground">
          All teams and players are set up. Generate the tournament schedule to begin.
        </p>
        <Button onClick={generateAndSaveSchedule} disabled={isGenerating}>
          {isGenerating ? 'Generating...' : 'Generate Schedule & Start Tournament'}
        </Button>
      </Card>
    )
  }
  
  if (!hasSchedule) {
    return (
      <Card className="p-12 text-center">
        <AlertCircle className="mx-auto mb-4 h-12 w-12 text-destructive" />
        <h3 className="mb-2 text-lg font-semibold">Setup Incomplete</h3>
        <p className="text-muted-foreground">
          Please complete team setup before starting the tournament.
        </p>
      </Card>
    )
  }
  
  if (!round) {
    return (
      <Card className="p-12 text-center">
        <Trophy className="mx-auto mb-4 h-12 w-12 text-primary" />
        <h3 className="mb-2 text-lg font-semibold">Tournament Complete!</h3>
        <p className="text-muted-foreground">
          All rounds have been played. Check the leaderboard for final results.
        </p>
      </Card>
    )
  }
  
  const completedGames = round.games.filter(g => g.status === 'completed').length
  const totalGames = round.games.length
  const restingPlayers = getRestingPlayers()
  
  return (
    <div className="space-y-6">
      {/* Round Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Round {currentRound} of {tournament.settings.rounds}</CardTitle>
              <CardDescription>
                {completedGames} of {totalGames} games completed
              </CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <RoundTimer round={currentRound} tournamentId={tournament.id} />
              {isAdmin && round.timer?.status === 'not-started' && (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="1"
                    max="120"
                    value={timerDuration}
                    onChange={(e) => setTimerDuration(parseInt(e.target.value) || 30)}
                    className="w-20"
                  />
                  <span className="text-sm text-muted-foreground">min</span>
                  <Button onClick={startRoundTimer}>
                    <Clock className="mr-2 h-4 w-4" />
                    Start Timer
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>
      
      {/* Active Games */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Active Games</h3>
        <div className="grid gap-4 md:grid-cols-2">
          {/* Shuffleboard Games */}
          {round.games
            .filter(game => game.station.includes('shuffleboard'))
            .map(game => (
              <GameCard
                key={game.id}
                game={game}
                isScorer={isScorer}
                isAdmin={isAdmin}
                onSwapPlayer={handlePlayerSwap}
                icon={<Shuffle className="h-5 w-5" />}
              />
            ))}
          
          {/* Dartboard Games */}
          {round.games
            .filter(game => game.station.includes('dartboard'))
            .map(game => (
              <GameCard
                key={game.id}
                game={game}
                isScorer={isScorer}
                isAdmin={isAdmin}
                onSwapPlayer={handlePlayerSwap}
                icon={<Target className="h-5 w-5" />}
              />
            ))}
        </div>
      </div>
      
      {/* Rest Area */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Rest Area ({restingPlayers.length} players)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-4">
            {tournament.teams.map(team => {
              const teamResting = restingPlayers.filter(p => p.teamId === team.id)
              if (teamResting.length === 0) return null
              
              return (
                <div key={team.id} className="space-y-1">
                  <div className="font-semibold text-sm">{team.name}</div>
                  <div className="space-y-0.5">
                    {teamResting.map(player => (
                      <div key={player.id} className="text-sm text-muted-foreground">
                        {player.name}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
      
      {/* Player Swap Dialog */}
      <PlayerSwapDialog
        open={showSwapDialog}
        onOpenChange={setShowSwapDialog}
        context={swapContext}
        tournament={tournament}
        onSwap={performPlayerSwap}
      />
    </div>
  )
}
