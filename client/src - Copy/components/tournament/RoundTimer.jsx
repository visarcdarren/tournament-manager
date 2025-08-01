import React, { useState, useEffect } from 'react'
import { Clock } from 'lucide-react'
import { formatTime, playSound } from '@/utils/tournament'
import useTournamentStore from '@/stores/tournamentStore'
import CountdownOverlay from './CountdownOverlay'

export default function RoundTimer({ round, tournamentId }) {
  const { timerStatus } = useTournamentStore()
  const [timeLeft, setTimeLeft] = useState(null)
  const [showCountdown, setShowCountdown] = useState(false)
  const status = timerStatus[round] || { status: 'not-started' }
  
  useEffect(() => {
    if (status.status === 'countdown') {
      setShowCountdown(true)
    } else if (status.status === 'running' && status.expiresAt) {
      // Update timer every second
      const interval = setInterval(() => {
        const remaining = status.expiresAt - Date.now()
        if (remaining <= 0) {
          setTimeLeft(0)
          playSound('timer-end')
          clearInterval(interval)
        } else {
          setTimeLeft(remaining)
        }
      }, 1000)
      
      return () => clearInterval(interval)
    }
  }, [status])
  
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
        </div>
        {showCountdown && (
          <CountdownOverlay onComplete={() => setShowCountdown(false)} />
        )}
      </>
    )
  }
  
  const isWarning = timeLeft && timeLeft < 5 * 60 * 1000 // 5 minutes
  const isExpired = timeLeft === 0
  
  return (
    <div className={`flex items-center gap-2 ${isWarning ? 'timer-warning' : ''} ${isExpired ? 'timer-expired' : ''}`}>
      <Clock className="h-4 w-4" />
      {isExpired ? (
        <span className="font-bold">TIME'S UP!</span>
      ) : (
        <span className="font-mono text-lg">{formatTime(timeLeft || 0)}</span>
      )}
    </div>
  )
}
