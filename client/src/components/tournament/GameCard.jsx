import React, { useState } from 'react'
import { Check, ArrowLeftRight, Users } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import api from '@/utils/api'
import useTournamentStore from '@/stores/tournamentStore'

export default function GameCard({ game, isScorer, isAdmin, onSwapPlayer, icon }) {
  const { toast } = useToast()
  const tournamentStore = useTournamentStore()
  const [isScoring, setIsScoring] = useState(false)
  
  const scoreGame = async (result) => {
    try {
      setIsScoring(true)
      await api.scoreGame(tournamentStore.tournament.id, game.id, result)
      
      toast({
        title: 'Success',
        description: 'Game result recorded'
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to record game result',
        variant: 'destructive'
      })
    } finally {
      setIsScoring(false)
    }
  }
  
  const isCompleted = game.status === 'completed'
  const canScore = isScorer && !isCompleted
  
  // Check if this is a multi-player game
  const isMultiPlayer = game.team1Players && game.team2Players
  
  // Get display names for teams
  const getTeamDisplay = (players) => {
    if (!players || players.length === 0) return ''
    if (players.length === 1) return players[0].playerName
    return players.map(p => p.playerName).join(' & ')
  }
  
  const getTeamName = (players) => {
    if (!players || players.length === 0) return ''
    // All players should be from the same team
    return players[0].teamName
  }
  
  const team1Display = isMultiPlayer 
    ? getTeamDisplay(game.team1Players)
    : game.player1?.playerName || ''
    
  const team2Display = isMultiPlayer
    ? getTeamDisplay(game.team2Players)
    : game.player2?.playerName || ''
    
  const team1Name = isMultiPlayer
    ? getTeamName(game.team1Players)
    : game.player1?.teamName || ''
    
  const team2Name = isMultiPlayer
    ? getTeamName(game.team2Players)
    : game.player2?.teamName || ''
  
  return (
    <Card className={isCompleted ? 'opacity-75' : ''}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            {icon}
            <span>{game.stationName || game.station}</span>
            {game.gameTypeName && (
              <span className="text-xs text-muted-foreground">({game.gameTypeName})</span>
            )}
          </div>
          {isCompleted && <Check className="h-5 w-5 text-green-600" />}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Players/Teams Display */}
        <div className="space-y-3">
          {/* Team 1 */}
          <div className="rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  {isMultiPlayer && <Users className="h-4 w-4 text-muted-foreground" />}
                  <div className="font-semibold">{team1Display}</div>
                </div>
                <div className="text-sm text-muted-foreground">{team1Name}</div>
              </div>
              {isAdmin && !isCompleted && !isMultiPlayer && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onSwapPlayer(game, 1)}
                >
                  <ArrowLeftRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
          
          {/* VS Divider */}
          <div className="text-center text-sm font-semibold text-muted-foreground">VS</div>
          
          {/* Team 2 */}
          <div className="rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  {isMultiPlayer && <Users className="h-4 w-4 text-muted-foreground" />}
                  <div className="font-semibold">{team2Display}</div>
                </div>
                <div className="text-sm text-muted-foreground">{team2Name}</div>
              </div>
              {isAdmin && !isCompleted && !isMultiPlayer && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onSwapPlayer(game, 2)}
                >
                  <ArrowLeftRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
        
        {/* Scoring Buttons */}
        {canScore && (
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => scoreGame('team1-win')}
              disabled={isScoring}
            >
              {team1Name} Wins
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => scoreGame('draw')}
              disabled={isScoring}
            >
              Draw
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => scoreGame('team2-win')}
              disabled={isScoring}
            >
              {team2Name} Wins
            </Button>
          </div>
        )}
        
        {/* Result Display */}
        {isCompleted && (
          <div className="rounded-lg bg-muted p-3 text-center">
            <div className="text-sm font-semibold">
              {game.result === 'team1-win' && `${team1Name} Won`}
              {game.result === 'team2-win' && `${team2Name} Won`}
              {game.result === 'player1-win' && `${team1Display} Won`}
              {game.result === 'player2-win' && `${team2Display} Won`}
              {game.result === 'draw' && 'Draw'}
            </div>
            {isMultiPlayer && (
              <div className="mt-1 text-xs text-muted-foreground">
                {game.result === 'team1-win' && team1Display}
                {game.result === 'team2-win' && team2Display}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
