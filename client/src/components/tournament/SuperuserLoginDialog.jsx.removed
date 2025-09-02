import React, { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { KeyRound } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import useDeviceStore from '@/stores/deviceStore'

export default function SuperuserLoginDialog({ open, onOpenChange, tournamentId, onSuccess, isGlobalMode = false }) {
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async () => {
    if (!password.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a password',
        variant: 'destructive'
      })
      return
    }
    
    try {
      setIsSubmitting(true)
      
      if (isGlobalMode) {
        // For global mode, just verify the password without tournament-specific login
        const response = await fetch('/api/superuser-verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Device-ID': localStorage.getItem('deviceId'),
            'X-Device-Name': localStorage.getItem('deviceName') || 'Superuser Device'
          },
          body: JSON.stringify({ password })
        })
        
        const data = await response.json()
        
        if (!response.ok) {
          toast({
            title: 'Login Failed',
            description: data.error || 'Invalid password',
            variant: 'destructive'
          })
          return
        }
        
        // Success - pass password back for global use
        onSuccess && onSuccess(password)
        onOpenChange(false)
        setPassword('')
      } else {
        // Original tournament-specific login
        const response = await fetch(`/api/tournament/${tournamentId}/superuser-login`, {
        method: 'POST',
        headers: {
        'Content-Type': 'application/json',
        'X-Device-ID': useDeviceStore.getState().deviceId,
        'X-Device-Name': useDeviceStore.getState().deviceName || 'Superuser Device'
        },
        body: JSON.stringify({ password })
        })
        
        const data = await response.json()
        
        if (!response.ok) {
          toast({
            title: 'Login Failed',
            description: data.error || 'Invalid password',
            variant: 'destructive'
          })
          return
        }
        
        // Success!
        toast({
          title: 'Success',
          description: 'Admin access granted'
        })
        onSuccess && onSuccess()
        onOpenChange(false)
        setPassword('')
      }
      
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Network error. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setIsSubmitting(false)
    }
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            Superuser Login
          </DialogTitle>
          <DialogDescription>
            {isGlobalMode 
              ? 'Enter the superuser password to gain admin access to all tournaments.'
              : 'Enter the superuser password to gain admin access to this tournament.'
            }
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="password">Superuser Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              autoComplete="current-password"
              disabled={isSubmitting}
            />
            <p className="text-sm text-muted-foreground">
              The superuser password is configured on the server.
            </p>
          </div>
        </div>
        
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={isSubmitting || !password.trim()}
          >
            {isSubmitting ? 'Logging in...' : 'Login as Admin'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
