import React, { useState, useEffect } from 'react'
import { Play, Clock, AlertCircle, RotateCcw, Gamepad2, Users, Trophy, Timer, TimerOff } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import api from '@/utils/api'
import useTournamentStore from '@/stores/tournamentStore'
import GameCard from './GameCard'
import RoundTimer from './RoundTimer'
import PlayerSwapDialog from './PlayerSwapDialog'

import { getCurrentRound, isTournamentComplete } from '@/utils/tournament'

export default function LiveTournament({ tournament, isAdmin, isScorer }) {
  const { toast } = useToast()
  const tournamentStore = useTournamentStore()
  const [timerDuration, setTimerDuration] = useState(tournament.settings.timer?.duration || 30)
  const [showSwapDialog, setShowSwapDialog] = useState(false)
  const [swapContext, setSwapContext] = useState(null)
  const [showRoundCompleteDialog, setShowRoundCompleteDialog] = useState(false)
  const [userDeclinedCompletion, setUserDeclinedCompletion] = useState(false)
  const [isCompletingRound, setIsCompletingRound] = useState(false) // Add loading state
  const [lastCompleteRoundCall, setLastCompleteRoundCall] = useState(0) // Debounce protection
  
  // Calculate current round reactively
  const currentRound = getCurrentRound(tournament)
  
  // Close round complete dialog when current round changes (admin confirmed advancement)
  useEffect(() => {
    if (showRoundCompleteDialog) {
      // If tournament completed or round advanced, close the dialog
      setShowRoundCompleteDialog(false)
      setUserDeclinedCompletion(false)
      setIsCompletingRound(false) // Reset loading state when dialog closes
      setLastCompleteRoundCall(0) // Reset debounce timer
    }
  }, [currentRound, tournament.currentState?.status])
  
  const round = tournament.schedule?.find(r => r.round === currentRound)
  const hasSchedule = tournament.schedule && tournament.schedule.length > 0
  const timerEnabled = tournament.settings.timer?.enabled
  
  // Check if all games in current round have results
  const areAllGamesScored = () => {
    if (!round) return false
    return round.games.every(game => game.result)
  }
  
  // Handle game scoring completion
  const handleGameScored = () => {
    // Check if all games are now scored
    if (areAllGamesScored()) {
      // Always reset declined flag and show dialog when all games are complete
      setUserDeclinedCompletion(false)
      setShowRoundCompleteDialog(true)
    }
  }
  
  // Complete the round and move to next
  const completeRound = async (e) => {
    // Prevent event bubbling and double-clicks
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    
    const now = Date.now()
    
    // Debounce protection - prevent calls within 2 seconds
    if (now - lastCompleteRoundCall < 2000) {
      return
    }
    
    // Prevent double submission
    if (isCompletingRound) {
      return
    }
    
    setLastCompleteRoundCall(now)
    setIsCompletingRound(true)
    
    try {
      // Use the new advance round API
      const nextRound = currentRound < tournament.settings.rounds ? currentRound + 1 : currentRound + 1; // +1 to trigger completion
      
      await api.advanceRound(tournament.id, currentRound, nextRound)
      
      toast({
        title: 'Round Complete!',
        description: currentRound < tournament.settings.rounds 
          ? `Moving to Round ${nextRound}` 
          : 'Tournament Complete!'
      })
      
      // Don't manually close dialog - useEffect will handle it when currentRound changes
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to complete round',
        variant: 'destructive'
      })
    } finally {
      // Reset loading state after a delay to prevent immediate re-clicking
      setTimeout(() => {
        setIsCompletingRound(false)
      }, 1000)
    }
  }
  
  // Handle declining round completion
  const declineRoundCompletion = () => {
    setUserDeclinedCompletion(true)
    setShowRoundCompleteDialog(false)
    toast({
      title: 'Continue Scoring',
      description: 'You can continue to adjust game results. Click any score to be asked again.'
    })
  }
  
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
  
  const completedGames = round.games.filter(g => g.result).length
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
    <div className="space-y-4 sm:space-y-6">
      {/* Round Header */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg sm:text-xl">Round {currentRound} of {tournament.settings.rounds}</CardTitle>
              <CardDescription>
                {completedGames} of {totalGames} games completed
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
              {timerEnabled && (
                <>
                  <RoundTimer round={currentRound} tournamentId={tournament.id} isAdmin={isAdmin} />
                  {isAdmin && (!tournamentStore.timerStatus[currentRound] || tournamentStore.timerStatus[currentRound].status === 'not-started') && (
                    <div className="flex flex-col sm:flex-row items-center gap-2">
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="1"
                          max="120"
                          value={timerDuration}
                          onChange={(e) => setTimerDuration(parseInt(e.target.value) || 30)}
                          className="w-16 sm:w-20"
                        />
                        <span className="text-sm text-muted-foreground flex-shrink-0">min</span>
                      </div>
                      <Button onClick={startRoundTimer} size="sm" className="w-full sm:w-auto">
                        <Timer className="mr-2 h-4 w-4" />
                        <span className="hidden sm:inline">Start Timer</span>
                        <span className="sm:hidden">Start</span>
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>
      
      {/* Active Games */}
      <div className="space-y-4">
        <h3 className="text-base sm:text-lg font-semibold">Active Games</h3>
        <div className="grid gap-3 sm:gap-4 grid-cols-1 lg:grid-cols-2">
          {Object.entries(gamesByStation).map(([station, games]) => (
            games.map(game => (
              <GameCard
                key={game.id}
                game={game}
                isScorer={isScorer}
                isAdmin={isAdmin}
                onSwapPlayer={handlePlayerSwap}
                onGameScored={handleGameScored}
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
            <div className="grid gap-2 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
      
      {/* Round Complete Confirmation Dialog */}
      <Dialog open={showRoundCompleteDialog} onOpenChange={(open) => {
        // Prevent closing dialog while operation is in progress
        if (!open && isCompletingRound) {
          return
        }
        setShowRoundCompleteDialog(open)
      }}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md mx-auto" onKeyDown={(e) => {
          // Prevent Enter key from triggering button clicks while processing
          if (e.key === 'Enter' && isCompletingRound) {
            e.preventDefault()
            e.stopPropagation()
          }
        }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Trophy className="h-5 w-5 text-primary flex-shrink-0" />
              <span>Complete Round {currentRound}?</span>
            </DialogTitle>
            <DialogDescription className="text-sm">
              All games in this round have been scored. Would you like to complete this round and move to the next?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-3">
            <div className="rounded-lg bg-muted p-3">
              <div className="text-sm font-semibold mb-2">Round {currentRound} Summary:</div>
              <div className="text-xs sm:text-sm text-muted-foreground space-y-1">
                <div>• {totalGames} games completed</div>
                <div>• {restingPlayers.length} players resting</div>
                {currentRound < tournament.settings.rounds ? (
                  <div>• Next: Round {currentRound + 1} of {tournament.settings.rounds}</div>
                ) : (
                  <div>• This is the final round - tournament will complete!</div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter className="flex flex-col gap-3 sm:flex-row sm:gap-2">
            <Button 
              variant="outline" 
              onClick={declineRoundCompletion}
              className="w-full order-2 sm:order-1 text-sm"
              size="default"
              disabled={isCompletingRound}
            >
              No, Continue Scoring
            </Button>
            <Button 
              onClick={completeRound}
              className="w-full order-1 sm:order-2 text-sm"
              size="default"
              disabled={isCompletingRound}
            >
              {isCompletingRound ? (
                <>
                  <div className="mr-2 h-3 w-3 animate-spin rounded-full border-2 border-background border-t-transparent"></div>
                  Processing...
                </>
              ) : (
                currentRound < tournament.settings.rounds ? 'Complete Round' : 'Finish Tournament'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
