import React, { useState, useEffect } from 'react'
import { playSound } from '@/utils/tournament'

export default function CountdownOverlay({ onComplete }) {
  const [count, setCount] = useState(5)
  
  useEffect(() => {
    if (count > 0) {
      playSound('countdown')
    }
    
    const timer = setTimeout(() => {
      if (count > 1) {
        setCount(count - 1)
      } else if (count === 1) {
        setCount('GO!')
        setTimeout(() => {
          onComplete()
        }, 1000)
      }
    }, 1000)
    
    return () => clearTimeout(timer)
  }, [count, onComplete])
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="countdown-number text-9xl font-bold text-white">
        {count}
      </div>
    </div>
  )
}
