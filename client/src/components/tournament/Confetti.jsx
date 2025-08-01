import React, { useEffect, useState } from 'react'

export default function Confetti() {
  const [particles, setParticles] = useState([])
  
  useEffect(() => {
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']
    const newParticles = []
    
    for (let i = 0; i < 100; i++) {
      newParticles.push({
        id: i,
        x: Math.random() * window.innerWidth,
        y: -20,
        color: colors[Math.floor(Math.random() * colors.length)],
        delay: Math.random() * 2,
        duration: 3 + Math.random() * 2
      })
    }
    
    setParticles(newParticles)
  }, [])
  
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {particles.map(particle => (
        <div
          key={particle.id}
          className="confetti absolute"
          style={{
            left: particle.x,
            top: particle.y,
            backgroundColor: particle.color,
            animationDelay: `${particle.delay}s`,
            animationDuration: `${particle.duration}s`
          }}
        />
      ))}
    </div>
  )
}
