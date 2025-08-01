import React, { useState, useEffect } from 'react'
import { Play, Clock, AlertCircle, RotateCcw, Gamepad2, Users, Trophy, Timer, TimerOff } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import api from '@/utils/api'
import useTournamentStore from '@/stores/tournamentStore'
import GameCard from './GameCard'
import RoundTimer from './RoundTimer'
import PlayerSwapDialog from './PlayerSwapDialog'

export default function LiveTournament({ tournament, currentRound, isAdmin, isScorer }) {
  const { toast } = useToast()
  const tournamentStore = useTournamentStore()
  const [timerDuration, setTimerDuration] = useState(tournament.settings.timer?.duration || 30)
  const [showSwapDialog, setShowSwapDialog] = useState(false)
  const [swapContext, setSwapContext] = useState(null)
  
  const round = tournament.schedule?.find(r => r.round === currentRound)
  const hasSchedule = tournament.schedule && tournament.schedule.length > 0
  const timerEnabled = tournament.settings.timer?.enabled
  
  if (!hasSchedule) {
    return (
      <Card className="p-12 text-center">
        <AlertCircle className="mx-auto mb-4 h-12 w-12 text-destructive" />
        <h3 className="mb-2 text-lg font-semibold">No Schedule Generated</h3>
        <p className="text-muted-foreground">
          Please generate a schedule from the Teams tab.
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
    // Only allow swapping for 1v1 games
    if (game.team1Players || game.team2Players) {
      toast({
        title: 'Cannot Swap',
        description: 'Player swapping is only available for 1v1 games',
        variant: 'destructive'
      })
      return
    }
    
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
  
  // Get resting players
  const getRestingPlayers = () => {
    if (!round) return []
    
    const playingPlayerIds = new Set()
    
    // Collect all playing player IDs
    round.games.forEach(game => {
      if (game.team1Players) {
        game.team1Players.forEach(p => playingPlayerIds.add(p.playerId))
      } else if (game.player1) {
        playingPlayerIds.add(game.player1.playerId)
      }
      
      if (game.team2Players) {
        game.team2Players.forEach(p => playingPlayerIds.add(p.playerId))
      } else if (game.player2) {
        playingPlayerIds.add(game.player2.playerId)
      }
    })
    
    // Find resting players
    const restingPlayers = []
    tournament.teams.forEach(team => {
      const teamRestingPlayers = team.players
        .filter(player => player.status === 'active' && !playingPlayerIds.has(player.id))
        .map(player => ({ ...player, teamName: team.name, teamId: team.id }))
      restingPlayers.push(...teamRestingPlayers)
    })
    
    return restingPlayers
  }
  
  // Get game icon based on game type
  const getGameIcon = (game) => {
    const gameType = game.gameType || game.station
    if (gameType.includes('shuffle')) return <Gamepad2 className="h-5 w-5" />
    if (gameType.includes('dart')) return <Gamepad2 className="h-5 w-5" />
    return <Gamepad2 className="h-5 w-5" />
  }
  
  const completedGames = round.games.filter(g => g.status === 'completed').length
  const totalGames = round.games.length
  const restingPlayers = getRestingPlayers()
  
  // Group games by station/game type
  const gamesByStation = round.games.reduce((acc, game) => {
    const key = game.stationName || game.station
    if (!acc[key]) acc[key] = []
    acc[key].push(game)
    return acc
  }, {})
  
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
              {timerEnabled ? (
                <>
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
                        <Timer className="mr-2 h-4 w-4" />
                        Start Timer
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <TimerOff className="h-4 w-4" />
                  <span className="text-sm">Timer disabled</span>
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
          {Object.entries(gamesByStation).map(([station, games]) => (
            games.map(game => (
              <GameCard
                key={game.id}
                game={game}
                isScorer={isScorer}
                isAdmin={isAdmin}
                onSwapPlayer={handlePlayerSwap}
                icon={getGameIcon(game)}
              />
            ))
          ))}
        </div>
      </div>
      
      {/* Rest Area */}
      {restingPlayers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Rest Area ({restingPlayers.length} players)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
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
      )}
      
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
