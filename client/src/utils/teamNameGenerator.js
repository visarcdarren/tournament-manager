// Team name generation utility
import api from './api'

// Cache for team names data
let teamNamesCache = null

/**
 * Load team names data from API (with caching)
 */
const loadTeamNamesData = async () => {
  if (teamNamesCache) {
    return teamNamesCache
  }
  
  try {
    const response = await fetch('/api/team-names')
    if (!response.ok) {
      throw new Error('Failed to fetch team names data')
    }
    teamNamesCache = await response.json()
    return teamNamesCache
  } catch (error) {
    console.error('Error loading team names:', error)
    // Fallback data in case of error
    return {
      teamNameWords: {
        prefixOnly: ['Mighty', 'Super', 'Wild'],
        suffixOnly: ['Lions', 'Eagles', 'Tigers'], 
        flexible: ['Thunder', 'Storm', 'Lightning']
      },
      avoidCombinations: []
    }
  }
}

/**
 * Generates a random team name by combining words according to the rules:
 * - prefixOnly + suffixOnly
 * - prefixOnly + flexible  
 * - flexible + suffixOnly
 * 
 * Avoids combinations listed in avoidCombinations
 */
export const generateRandomTeamName = async () => {
  const teamNamesData = await loadTeamNamesData()
  const { prefixOnly, suffixOnly, flexible } = teamNamesData.teamNameWords
  const avoidCombinations = teamNamesData.avoidCombinations
  
  let attempts = 0
  const maxAttempts = 100 // Prevent infinite loops
  
  while (attempts < maxAttempts) {
    let firstWord, secondWord
    
    // Randomly choose one of the three valid combination types
    const combinationType = Math.floor(Math.random() * 3)
    
    switch (combinationType) {
      case 0: // prefixOnly + suffixOnly
        firstWord = prefixOnly[Math.floor(Math.random() * prefixOnly.length)]
        secondWord = suffixOnly[Math.floor(Math.random() * suffixOnly.length)]
        break
        
      case 1: // prefixOnly + flexible
        firstWord = prefixOnly[Math.floor(Math.random() * prefixOnly.length)]
        secondWord = flexible[Math.floor(Math.random() * flexible.length)]
        break
        
      case 2: // flexible + suffixOnly
        firstWord = flexible[Math.floor(Math.random() * flexible.length)]
        secondWord = suffixOnly[Math.floor(Math.random() * suffixOnly.length)]
        break
    }
    
    // Check if this combination should be avoided
    const isAvoidedCombination = avoidCombinations.some(
      ([first, second]) => first === firstWord && second === secondWord
    )
    
    if (!isAvoidedCombination) {
      return `${firstWord} ${secondWord}`
    }
    
    attempts++
  }
  
  // Fallback if we somehow can't generate a valid name
  return `${prefixOnly[0]} ${suffixOnly[0]}`
}

/**
 * Generates multiple unique team names
 * @param {number} count - Number of names to generate
 * @param {string[]} existingNames - Array of existing team names to avoid duplicates
 * @returns {string[]} Array of unique team names
 */
export const generateMultipleTeamNames = async (count, existingNames = []) => {
  const names = new Set(existingNames.map(name => name.toLowerCase()))
  const result = []
  
  let attempts = 0
  const maxAttempts = count * 10 // Allow more attempts for multiple names
  
  while (result.length < count && attempts < maxAttempts) {
    const name = await generateRandomTeamName()
    const nameLower = name.toLowerCase()
    
    if (!names.has(nameLower)) {
      names.add(nameLower)
      result.push(name)
    }
    
    attempts++
  }
  
  return result
}

/**
 * Check if a team name uses words from our word lists
 * @param {string} teamName - The team name to check
 * @returns {boolean} True if the name appears to use our word lists
 */
export const isGeneratedTeamName = async (teamName) => {
  const teamNamesData = await loadTeamNamesData()
  const { prefixOnly, suffixOnly, flexible } = teamNamesData.teamNameWords
  const allWords = [...prefixOnly, ...suffixOnly, ...flexible]
  
  const words = teamName.split(' ')
  if (words.length !== 2) return false
  
  return allWords.includes(words[0]) && allWords.includes(words[1])
}
