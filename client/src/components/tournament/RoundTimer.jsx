import React, { useState, useEffect } from 'react'
import { Clock, Play, Pause, RotateCcw } from 'lucide-react'
import { formatTime, playSound } from '@/utils/tournament'
import useTournamentStore from '@/stores/tournamentStore'
import CountdownOverlay from './CountdownOverlay'
import { Button } from '@/components/ui/button'
import api from '@/utils/api'
import { useToast } from '@/hooks/use-toast'

export default function RoundTimer({ round, tournamentId, isAdmin }) {
  const { toast } = useToast()
  const { timerStatus } = useTournamentStore()
  const [timeLeft, setTimeLeft] = useState(null)
  const [showCountdown, setShowCountdown] = useState(false)
  const [hasPlayedExpiredSound, setHasPlayedExpiredSound] = useState(false)
  const status = timerStatus[round] || { status: 'not-started' }
  
  useEffect(() => {
    if (status.status === 'countdown') {
      setShowCountdown(true)
      setHasPlayedExpiredSound(false) // Reset sound flag for new timer
    } else if (status.status === 'running' && status.expiresAt) {
      // Calculate initial time and start countdown
      const calculateTimeLeft = () => {
        const remaining = Math.max(0, status.expiresAt - Date.now())
        return remaining
      }
      
      setTimeLeft(calculateTimeLeft())
      
      // Update timer at higher frequency (200ms) for smoother display
      const interval = setInterval(() => {
        const remaining = calculateTimeLeft()
        setTimeLeft(remaining)
        
        // Play sound when timer expires (only once)
        if (remaining === 0 && !hasPlayedExpiredSound) {
          playSound('timer-end')
          setHasPlayedExpiredSound(true)
        }
      }, 200) // 200ms for smoother updates
      
      return () => clearInterval(interval)
    } else if (status.status === 'expired') {
      setTimeLeft(0)
      // Play sound when we receive expired status (only once)
      if (!hasPlayedExpiredSound) {
        playSound('timer-end')
        setHasPlayedExpiredSound(true)
      }
    } else if (status.status === 'paused' && status.remainingMs !== undefined) {
      // For paused timers, show the remaining time from when it was paused
      setTimeLeft(status.remainingMs)
    }
  }, [status, hasPlayedExpiredSound])
  
  const handlePauseTimer = async () => {
    try {
      await api.pauseTimer(tournamentId, round)
      toast({
        title: 'Timer Paused',
        description: `Round ${round} timer paused`
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to pause timer',
        variant: 'destructive'
      })
    }
  }
  
  const handleResumeTimer = async () => {
    try {
      await api.resumeTimer(tournamentId, round)
      toast({
        title: 'Timer Resumed',
        description: `Round ${round} timer resumed`
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to resume timer',
        variant: 'destructive'
      })
    }
  }
  
  const handleResetTimer = async () => {
    try {
      await api.resetTimer(tournamentId, round)
      toast({
        title: 'Timer Reset',
        description: `Round ${round} timer reset`
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to reset timer',
        variant: 'destructive'
      })
    }
  }
  
  if (status.status === 'not-started') {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Clock className="h-4 w-4" />
        <span>Timer not started</span>
      </div>
    )
  }
  
  if (status.status === 'countdown' || showCountdown) {
    return (
      <>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          <span>Get ready...</span>
          {isAdmin && status.status === 'countdown' && (
            <Button 
              onClick={handlePauseTimer} 
              size="sm" 
              variant="outline"
              className="h-6 px-2"
            >
              <Pause className="h-3 w-3" />
            </Button>
          )}
        </div>
        {showCountdown && (
          <CountdownOverlay onComplete={() => setShowCountdown(false)} />
        )}
      </>
    )
  }
  
  const isWarning = timeLeft && timeLeft < 5 * 60 * 1000 // 5 minutes
  const isExpired = timeLeft === 0 || status.status === 'expired'
  const isPaused = status.status === 'paused'
  
  return (
    <div className={`flex items-center gap-2 ${isWarning ? 'timer-warning' : ''} ${isExpired ? 'timer-expired' : ''} ${isPaused ? 'timer-paused' : ''}`}>
      <Clock className="h-4 w-4" />
      {isExpired ? (
        <span className="font-bold">TIME'S UP!</span>
      ) : (
        <>
          <span className="font-mono text-lg">{formatTime(timeLeft || 0)}</span>
          {isPaused && <span className="text-sm text-muted-foreground">(Paused)</span>}
        </>
      )}
      
      {/* Admin Controls */}
      {isAdmin && !isExpired && (
        <div className="flex items-center gap-1">
          {status.status === 'running' && (
            <Button 
              onClick={handlePauseTimer} 
              size="sm" 
              variant="outline"
              className="h-6 px-2"
            >
              <Pause className="h-3 w-3" />
            </Button>
          )}
          
          {isPaused && (
            <Button 
              onClick={handleResumeTimer} 
              size="sm" 
              variant="outline"
              className="h-6 px-2"
            >
              <Play className="h-3 w-3" />
            </Button>
          )}
          
          {(status.status === 'running' || isPaused) && (
            <Button 
              onClick={handleResetTimer} 
              size="sm" 
              variant="outline"
              className="h-6 px-2"
            >
              <RotateCcw className="h-3 w-3" />
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
