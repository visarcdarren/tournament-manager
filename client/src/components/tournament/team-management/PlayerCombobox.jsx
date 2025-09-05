import React, { useState, useEffect, useRef } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'

export function PlayerCombobox({ value, onSelect, unallocatedPlayers, placeholder = "Select or type player name..." }) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState(value || '')
  const inputRef = useRef(null)
  const dropdownRef = useRef(null)
  
  const filteredPlayers = unallocatedPlayers.filter(player =>
    player.name.toLowerCase().includes(searchTerm.toLowerCase())
  )
  
  const handleSelect = (player) => {
    setSearchTerm(player.name)
    setIsOpen(false)
    onSelect(player)
  }
  
  const handleInputChange = (e) => {
    setSearchTerm(e.target.value)
    setIsOpen(true)
  }
  
  const handleInputKeyDown = (e) => {
    if (e.key === 'ArrowDown' && filteredPlayers.length > 0) {
      e.preventDefault()
      setIsOpen(true)
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }
  
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) &&
          inputRef.current && !inputRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
  
  // Reset when value prop changes
  useEffect(() => {
    setSearchTerm(value || '')
  }, [value])
  
  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={searchTerm}
          onChange={handleInputChange}
          onKeyDown={handleInputKeyDown}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="pl-10"
        />
      </div>
      
      {isOpen && filteredPlayers.length > 0 && (
        <div 
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-48 overflow-y-auto"
        >
          {filteredPlayers.map(player => (
            <button
              key={player.id}
              onClick={() => handleSelect(player)}
              className="w-full text-left px-3 py-2 text-card-foreground hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none transition-colors"
            >
              <div className="font-medium">{player.name}</div>
            </button>
          ))}
        </div>
      )}
      
      {isOpen && searchTerm && filteredPlayers.length === 0 && unallocatedPlayers.length > 0 && (
        <div 
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-card border border-border rounded-md shadow-lg p-3"
        >
          <div className="text-sm text-muted-foreground">No players match "{searchTerm}"</div>
        </div>
      )}
    </div>
  )
}
