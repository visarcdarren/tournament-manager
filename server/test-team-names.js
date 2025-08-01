// Quick test for team name generation
// This file can be used to test the team name generation logic

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load team names data
const teamNamesPath = join(__dirname, 'settings', 'team-names.json');
const teamNamesData = JSON.parse(readFileSync(teamNamesPath, 'utf8'));

function generateRandomTeamName() {
  const { prefixOnly, suffixOnly, flexible } = teamNamesData.teamNameWords;
  const avoidCombinations = teamNamesData.avoidCombinations;
  
  let attempts = 0;
  const maxAttempts = 100;
  
  while (attempts < maxAttempts) {
    let firstWord, secondWord;
    
    // Randomly choose one of the three valid combination types
    const combinationType = Math.floor(Math.random() * 3);
    
    switch (combinationType) {
      case 0: // prefixOnly + suffixOnly
        firstWord = prefixOnly[Math.floor(Math.random() * prefixOnly.length)];
        secondWord = suffixOnly[Math.floor(Math.random() * suffixOnly.length)];
        break;
        
      case 1: // prefixOnly + flexible
        firstWord = prefixOnly[Math.floor(Math.random() * prefixOnly.length)];
        secondWord = flexible[Math.floor(Math.random() * flexible.length)];
        break;
        
      case 2: // flexible + suffixOnly
        firstWord = flexible[Math.floor(Math.random() * flexible.length)];
        secondWord = suffixOnly[Math.floor(Math.random() * suffixOnly.length)];
        break;
    }
    
    // Check if this combination should be avoided
    const isAvoidedCombination = avoidCombinations.some(
      ([first, second]) => first === firstWord && second === secondWord
    );
    
    if (!isAvoidedCombination) {
      return `${firstWord} ${secondWord}`;
    }
    
    attempts++;
  }
  
  // Fallback if we somehow can't generate a valid name
  return `${prefixOnly[0]} ${suffixOnly[0]}`;
}

// Test the function
console.log('Testing team name generation:');
for (let i = 0; i < 10; i++) {
  console.log(`${i + 1}. ${generateRandomTeamName()}`);
}

export { generateRandomTeamName };
