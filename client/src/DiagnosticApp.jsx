import React, { useState, useEffect } from 'react'

function DiagnosticApp() {
  const [checks, setChecks] = useState({
    react: '✓ React is working',
    state: '✓ State management works',
    api: '? Checking API...',
    store: '? Checking device store...',
    css: '? Checking CSS...'
  })
  
  useEffect(() => {
    // Check API
    fetch('/api/tournaments')
      .then(res => {
        setChecks(prev => ({
          ...prev,
          api: res.ok ? '✓ API is reachable' : `✗ API error: ${res.status}`
        }))
      })
      .catch(err => {
        setChecks(prev => ({
          ...prev,
          api: `✗ API error: ${err.message}`
        }))
      })
    
    // Check device store
    try {
      const store = window.deviceStore
      if (store) {
        setChecks(prev => ({
          ...prev,
          store: '✓ Device store available'
        }))
      } else {
        setChecks(prev => ({
          ...prev,
          store: '✗ Device store not initialized'
        }))
      }
    } catch (e) {
      setChecks(prev => ({
        ...prev,
        store: `✗ Store error: ${e.message}`
      }))
    }
    
    // Check CSS
    const computed = window.getComputedStyle(document.body)
    const bgColor = computed.backgroundColor
    if (bgColor === 'rgb(15, 23, 42)') {
      setChecks(prev => ({
        ...prev,
        css: '✓ Tailwind CSS loaded correctly'
      }))
    } else {
      setChecks(prev => ({
        ...prev,
        css: `✗ CSS issue - background color is ${bgColor}`
      }))
    }
  }, [])
  
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0f172a',
      color: '#f8fafc',
      padding: '2rem',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '2rem' }}>
          Tournament Manager Diagnostics
        </h1>
        
        <div style={{
          backgroundColor: '#1e293b',
          padding: '1.5rem',
          borderRadius: '0.5rem',
          marginBottom: '2rem'
        }}>
          <h2 style={{ marginBottom: '1rem' }}>System Checks:</h2>
          {Object.entries(checks).map(([key, value]) => (
            <div key={key} style={{ marginBottom: '0.5rem' }}>
              {value}
            </div>
          ))}
        </div>
        
        <div style={{
          backgroundColor: '#1e293b',
          padding: '1.5rem',
          borderRadius: '0.5rem'
        }}>
          <h2 style={{ marginBottom: '1rem' }}>Browser Info:</h2>
          <div>URL: {window.location.href}</div>
          <div>User Agent: {navigator.userAgent}</div>
        </div>
        
        <button
          onClick={() => window.location.href = '/'}
          style={{
            marginTop: '2rem',
            padding: '0.5rem 1rem',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '0.25rem',
            cursor: 'pointer'
          }}
        >
          Go to Tournament List
        </button>
      </div>
    </div>
  )
}

export default DiagnosticApp
