import React, { useState, useEffect, useRef } from 'react'
import { playSound } from '@/utils/tournament'

export default function CountdownOverlay({ onComplete }) {
  const [count, setCount] = useState(5)
  const onCompleteRef = useRef(onComplete)
  
  // Update ref when onComplete changes
  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])
  
  useEffect(() => {
    // Play sound only for numbers, not GO!
    if (typeof count === 'number' && count > 0) {
      playSound('countdown')
    }
    
    if (count === 'GO!') {
      // GO! is showing, complete after a short delay
      const timer = setTimeout(() => {
        onCompleteRef.current()
      }, 500)
      return () => clearTimeout(timer)
    }
    
    if (count > 0) {
      // Count down or show GO!
      const timer = setTimeout(() => {
        if (count > 1) {
          setCount(count - 1)
        } else {
          setCount('GO!')
        }
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [count]) // Only depend on count, not onComplete
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="countdown-number text-9xl font-bold text-white">
        {count}
      </div>
    </div>
  )
}
