import React, { useState, useEffect } from 'react'
import { Shuffle } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function AddTeamDialog({ 
  isOpen, 
  onClose, 
  onAddTeam, 
  onGenerateTeamName,
  initialTeamName = ''
}) {
  const [teamName, setTeamName] = useState(initialTeamName)
  
  // Auto-generate a team name when the dialog opens
  useEffect(() => {
    if (isOpen && !teamName) {
      onGenerateTeamName().then(setTeamName)
    }
  }, [isOpen, teamName, onGenerateTeamName])
  
  // Update team name when initial value changes
  useEffect(() => {
    setTeamName(initialTeamName)
  }, [initialTeamName])
  
  const handleSubmit = async () => {
    const success = await onAddTeam(teamName)
    if (success) {
      setTeamName('')
      onClose()
    }
  }
  
  const handleGenerateNew = async () => {
    const newName = await onGenerateTeamName()
    setTeamName(newName)
  }
  
  const handleClose = () => {
    setTeamName('')
    onClose()
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Team</DialogTitle>
          <DialogDescription>
            Enter a name for the new team
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="team-name">Team Name</Label>
            <div className="flex gap-2">
              <Input
                id="team-name"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="Red Dragons"
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleGenerateNew}
                title="Generate random team name"
              >
                <Shuffle className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" onClick={handleSubmit}>
            Add Team
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
