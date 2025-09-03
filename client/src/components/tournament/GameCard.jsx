import React, { useState } from 'react'
import { Check, ArrowLeftRight, Users } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import api from '@/utils/api'
import useTournamentStore from '@/stores/tournamentStore'

export default function GameCard({ game, isScorer, isAdmin, onSwapPlayer, icon, onGameScored }) {
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
      
      // Notify parent component about the scoring
      if (onGameScored) {
        onGameScored()
      }
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
  
  // Always allow scoring if user has scorer permissions
  const canScore = isScorer
  
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
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm sm:text-base">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="flex-shrink-0">{icon}</span>
            <span className="truncate font-medium">{game.stationName || game.station}</span>
    
          </div>
          {game.result && <Check className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 flex-shrink-0" />}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Players/Teams Display */}
        <div className="space-y-3">
          {/* Team 1 */}
          <div className="rounded-lg border p-2 sm:p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {isMultiPlayer && <Users className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />}
                  <div className="font-medium text-sm sm:text-base truncate">{team1Display}</div>
                </div>
                <div className="text-xs sm:text-sm text-muted-foreground truncate">{team1Name}</div>
              </div>
              {isAdmin && !game.result && !isMultiPlayer && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onSwapPlayer(game, 1)}
                  className="flex-shrink-0 h-8 w-8 sm:h-9 sm:w-9 p-0"
                >
                  <ArrowLeftRight className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
              )}
            </div>
          </div>
          
          {/* VS Divider */}
          <div className="text-center text-xs sm:text-sm font-semibold text-muted-foreground">VS</div>
          
          {/* Team 2 */}
          <div className="rounded-lg border p-2 sm:p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {isMultiPlayer && <Users className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />}
                  <div className="font-medium text-sm sm:text-base truncate">{team2Display}</div>
                </div>
                <div className="text-xs sm:text-sm text-muted-foreground truncate">{team2Name}</div>
              </div>
              {isAdmin && !game.result && !isMultiPlayer && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onSwapPlayer(game, 2)}
                  className="flex-shrink-0 h-8 w-8 sm:h-9 sm:w-9 p-0"
                >
                  <ArrowLeftRight className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
        
        {/* Scoring Buttons */}
        {canScore && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Button
              variant={"outline"}
              size="sm"
              onClick={() => scoreGame('team1-win')}
              disabled={isScoring}
              className={`truncate ${
                (game.result === 'team1-win' || game.result === 'player1-win') 
                  ? 'bg-green-600 hover:bg-green-700 text-white border-green-600' 
                  : 'hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              <span className="truncate">{team1Name} Wins</span>
            </Button>
            <Button
              variant={"outline"}
              size="sm"
              onClick={() => scoreGame('draw')}
              disabled={isScoring}
              className={`${
                game.result === 'draw' 
                  ? 'bg-green-600 hover:bg-green-700 text-white border-green-600' 
                  : 'hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              Draw
            </Button>
            <Button
              variant={"outline"}
              size="sm"
              onClick={() => scoreGame('team2-win')}
              disabled={isScoring}
              className={`truncate ${
                (game.result === 'team2-win' || game.result === 'player2-win') 
                  ? 'bg-green-600 hover:bg-green-700 text-white border-green-600' 
                  : 'hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              <span className="truncate">{team2Name} Wins</span>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
