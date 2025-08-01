import React, { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'
import api from '@/utils/api'
import useDeviceStore from '@/stores/deviceStore'

export default function RoleRequestDialog({ open, onOpenChange, tournamentId }) {
  const { toast } = useToast()
  const deviceStore = useDeviceStore()
  const [deviceName, setDeviceName] = useState(deviceStore.deviceName || '')
  const [selectedStations, setSelectedStations] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const stations = [
    { id: 'shuffleboard-1', name: 'Shuffleboard 1' },
    { id: 'shuffleboard-2', name: 'Shuffleboard 2' },
    { id: 'dartboard-1', name: 'Dartboard 1' },
    { id: 'dartboard-2', name: 'Dartboard 2' }
  ]
  
  const handleSubmit = async () => {
    if (!deviceName.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a device name',
        variant: 'destructive'
      })
      return
    }
    
    try {
      setIsSubmitting(true)
      
      // Update device name in store
      deviceStore.setDeviceName(deviceName)
      
      await api.requestRole(tournamentId, {
        requestedRole: 'SCORER',
        stations: selectedStations.length > 0 ? selectedStations : null,
        deviceName
      })
      
      toast({
        title: 'Request Sent',
        description: 'Your scorer access request has been sent to the admin'
      })
      
      onOpenChange(false)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send request',
        variant: 'destructive'
      })
    } finally {
      setIsSubmitting(false)
    }
  }
  
  const toggleStation = (stationId) => {
    setSelectedStations(prev =>
      prev.includes(stationId)
        ? prev.filter(id => id !== stationId)
        : [...prev, stationId]
    )
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request Scorer Access</DialogTitle>
          <DialogDescription>
            Request permission to score games in this tournament
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="device-name">Device Name</Label>
            <Input
              id="device-name"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              placeholder="e.g., Dartboard Tablet"
              description="Give your device a recognizable name"
            />
            <p className="text-sm text-muted-foreground">
              This helps the admin identify your device
            </p>
          </div>
          
          <div className="space-y-2">
            <Label>Station Assignment (Optional)</Label>
            <p className="text-sm text-muted-foreground">
              Select specific stations you want to score, or leave empty to score any game
            </p>
            <div className="space-y-2">
              {stations.map(station => (
                <div key={station.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={station.id}
                    checked={selectedStations.includes(station.id)}
                    onCheckedChange={() => toggleStation(station.id)}
                  />
                  <Label
                    htmlFor={station.id}
                    className="cursor-pointer font-normal"
                  >
                    {station.name}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Sending...' : 'Send Request'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
