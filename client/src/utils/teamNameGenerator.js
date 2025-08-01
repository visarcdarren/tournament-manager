// Team name generation utility
import api from './api'

// Cache for team names data
let teamNamesCache = null

/**
 * Generate a cryptographically secure random number between 0 and 1
 * Falls back to Math.random() if crypto is not available
 */
const secureRandom = () => {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    const array = new Uint32Array(1)
    window.crypto.getRandomValues(array)
    return array[0] / (0xffffffff + 1)
  }
  return Math.random()
}

/**
 * Get a random element from an array with secure randomness
 */
const getRandomElement = (array) => {
  if (!array || array.length === 0) return null
  const index = Math.floor(secureRandom() * array.length)
  return array[index]
}

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
        prefixOnly: ['Mighty', 'Super', 'Wild', 'Epic', 'Mega', 'Ultra'],
        suffixOnly: ['Lions', 'Eagles', 'Tigers', 'Bears', 'Wolves', 'Hawks'], 
        flexible: ['Thunder', 'Storm', 'Lightning', 'Fire', 'Ice', 'Shadow']
      },
      avoidCombinations: []
    }
  }
}

/**
 * Clear the cached team names data (useful for testing)
 */
export const clearTeamNamesCache = () => {
  teamNamesCache = null
  console.log('Team names cache cleared')
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
  
  // Debug: Log word counts to verify we're getting the full dataset
  console.log('Word counts:', {
    prefixOnly: prefixOnly.length,
    suffixOnly: suffixOnly.length, 
    flexible: flexible.length,
    avoidCombinations: avoidCombinations.length,
    totalPossibleCombinations: (
      (prefixOnly.length * suffixOnly.length) + 
      (prefixOnly.length * flexible.length) + 
      (flexible.length * suffixOnly.length)
    )
  })
  
  // Ensure arrays exist and aren't empty
  if (!prefixOnly?.length || !suffixOnly?.length || !flexible?.length) {
    console.error('Missing word arrays!')
    return 'Random Team'
  }
  
  let attempts = 0
  const maxAttempts = 50 // Reduced since we have better randomness
  
  while (attempts < maxAttempts) {
    let firstWord, secondWord, combinationType
    
    // Use secure random for combination type selection
    // Weight the selection to favor the combination with most options
    const weights = [
      prefixOnly.length * suffixOnly.length,  // Type 0 weight
      prefixOnly.length * flexible.length,    // Type 1 weight  
      flexible.length * suffixOnly.length     // Type 2 weight
    ]
    
    const totalWeight = weights.reduce((sum, w) => sum + w, 0)
    let randomWeight = secureRandom() * totalWeight
    
    combinationType = 0
    for (let i = 0; i < weights.length; i++) {
      if (randomWeight < weights[i]) {
        combinationType = i
        break
      }
      randomWeight -= weights[i]
    }
    
    // Generate words using secure random
    switch (combinationType) {
      case 0: // prefixOnly + suffixOnly
        firstWord = getRandomElement(prefixOnly)
        secondWord = getRandomElement(suffixOnly)
        break
        
      case 1: // prefixOnly + flexible
        firstWord = getRandomElement(prefixOnly)
        secondWord = getRandomElement(flexible)
        break
        
      case 2: // flexible + suffixOnly
        firstWord = getRandomElement(flexible)
        secondWord = getRandomElement(suffixOnly)
        break
    }
    
    // Check if this combination should be avoided
    const isAvoidedCombination = avoidCombinations.some(
      ([first, second]) => first === firstWord && second === secondWord
    )
    
    if (!isAvoidedCombination) {
      console.log(`Generated: "${firstWord} ${secondWord}" (type ${combinationType}, attempt ${attempts + 1})`)
      return `${firstWord} ${secondWord}`
    }
    
    console.log(`Avoided combination: "${firstWord} ${secondWord}" (attempt ${attempts + 1})`)
    attempts++
  }
  
  // Fallback if we somehow can't generate a valid name
  console.warn('Max attempts reached, using fallback name')
  return `${getRandomElement(prefixOnly)} ${getRandomElement(suffixOnly)}`
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
