import React from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

export default function PlayerSwapDialog({ open, onOpenChange, context, tournament, onSwap }) {
  const [selectedPlayer, setSelectedPlayer] = React.useState('')
  
  if (!context) return null
  
  const { game, playerNum, currentPlayer } = context
  const team = tournament.teams.find(t => t.id === currentPlayer.teamId)
  const availablePlayers = team?.players.filter(p => 
    p.id !== currentPlayer.playerId && p.status === 'active'
  ) || []
  
  const handleSwap = () => {
    if (selectedPlayer) {
      onSwap(selectedPlayer)
      setSelectedPlayer('')
    }
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Swap Player</DialogTitle>
          <DialogDescription>
            Replace {currentPlayer.playerName} with another player from {currentPlayer.teamName}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <RadioGroup value={selectedPlayer} onValueChange={setSelectedPlayer}>
            {availablePlayers.map(player => (
              <div key={player.id} className="flex items-center space-x-2">
                <RadioGroupItem value={player.id} id={player.id} />
                <Label htmlFor={player.id} className="flex-1 cursor-pointer">
                  {player.name}
                </Label>
              </div>
            ))}
          </RadioGroup>
          
          {availablePlayers.length === 0 && (
            <p className="text-center text-sm text-muted-foreground">
              No available players to swap with
            </p>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSwap} disabled={!selectedPlayer}>
            Swap Player
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
