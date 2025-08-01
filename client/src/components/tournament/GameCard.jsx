import React, { useState } from 'react'
import { Check, ArrowLeftRight } from 'lucide-react'
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
  
  return (
    <Card className={isCompleted ? 'opacity-75' : ''}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            {icon}
            <span className="capitalize">{game.station.replace('-', ' ')}</span>
          </div>
          {isCompleted && <Check className="h-5 w-5 text-green-600" />}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Players Container - Centered */}
        <div className="flex items-center justify-between gap-4">
          {/* Player 1 */}
          <div className="flex-1 text-right">
            <div className="font-semibold">{game.player1.playerName}</div>
            <div className="text-sm text-muted-foreground">{game.player1.teamName}</div>
            {isAdmin && !isCompleted && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onSwapPlayer(game, 1)}
                className="mt-1"
              >
                <ArrowLeftRight className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          {/* VS in the middle */}
          <div className="text-center text-sm font-semibold text-muted-foreground px-4">VS</div>
          
          {/* Player 2 */}
          <div className="flex-1 text-left">
            <div className="font-semibold">{game.player2.playerName}</div>
            <div className="text-sm text-muted-foreground">{game.player2.teamName}</div>
            {isAdmin && !isCompleted && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onSwapPlayer(game, 2)}
                className="mt-1"
              >
                <ArrowLeftRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        
        {/* Scoring Buttons */}
        {canScore && (
          <div className="grid grid-cols-3 gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => scoreGame('player1-win')}
              disabled={isScoring}
              className="text-xs"
            >
              {game.player1.playerName} Wins
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
              onClick={() => scoreGame('player2-win')}
              disabled={isScoring}
              className="text-xs"
            >
              {game.player2.playerName} Wins
            </Button>
          </div>
        )}
        
        {/* Result Display */}
        {isCompleted && (
          <div className="rounded-lg bg-muted p-2 text-center text-sm font-semibold">
            {game.result === 'player1-win' && `${game.player1.playerName} Won`}
            {game.result === 'player2-win' && `${game.player2.playerName} Won`}
            {game.result === 'draw' && 'Draw'}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
