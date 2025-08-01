import React, { useState } from 'react'
import { Check, RotateCcw } from 'lucide-react'
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
        {/* Player 1 */}
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold">{game.player1.playerName}</div>
            <div className="text-sm text-muted-foreground">{game.player1.teamName}</div>
          </div>
          {isAdmin && !isCompleted && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSwapPlayer(game, 1)}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          )}
        </div>
        
        <div className="text-center text-sm font-semibold text-muted-foreground">VS</div>
        
        {/* Player 2 */}
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold">{game.player2.playerName}</div>
            <div className="text-sm text-muted-foreground">{game.player2.teamName}</div>
          </div>
          {isAdmin && !isCompleted && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSwapPlayer(game, 2)}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          )}
        </div>
        
        {/* Scoring Buttons */}
        {canScore && (
          <div className="grid grid-cols-3 gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => scoreGame('player1-win')}
              disabled={isScoring}
            >
              {game.player1.playerName.split(' ')[0]} Wins
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
            >
              {game.player2.playerName.split(' ')[0]} Wins
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
