# Team Name Generator Implementation

## Overview
The team name generator automatically suggests humorous team names when users create new teams in the tournament manager. Names are constructed using combinations of prefix, suffix, and flexible words according to predefined rules.

## Implementation Details

### Files Modified/Created

1. **`server/settings/team-names.json`** - Contains the word lists and rules
2. **`client/src/utils/teamNameGenerator.js`** - Utility functions for name generation
3. **`client/src/components/tournament/TeamManagement.jsx`** - Updated to use name generation
4. **`server/server.js`** - Added API endpoint `/api/team-names`

### How It Works

#### Word Categories
- **prefixOnly**: Words that can only be used as the first word (e.g., "Dancing", "Flying", "Mighty")
- **suffixOnly**: Words that can only be used as the second word (e.g., "Llamas", "Penguins", "Dragons")
- **flexible**: Words that can be used in either position (e.g., "Thunder", "Lightning", "Phoenix")

#### Valid Combinations
1. `prefixOnly + suffixOnly` → "Dancing Llamas"
2. `prefixOnly + flexible` → "Mighty Thunder"  
3. `flexible + suffixOnly` → "Phoenix Penguins"

#### Avoided Combinations
The system prevents redundant combinations like:
- "Electric Lightning"
- "Thunder Lightning" 
- "Fire Dragon"
- "Ninja Shadow"

### User Experience

1. **Automatic Suggestion**: When the "Add Team" dialog opens, a random team name is automatically generated and populated in the input field
2. **Manual Generation**: Users can click the shuffle (🔀) icon to generate a new suggestion
3. **Editable**: Users can edit the suggested name before submitting
4. **Duplicate Prevention**: The system attempts to avoid suggesting names that already exist in the tournament

### API Endpoint

**GET `/api/team-names`**
- Returns the complete team-names.json data
- Used by the client-side utility to generate names
- Includes caching on the client side for performance

### Error Handling

- If the API is unavailable, falls back to basic word lists
- If name generation fails, falls back to "Team 1", "Team 2", etc.
- Duplicate checking with retry logic

## Testing

To test the implementation:

1. Start the development server
2. Create a new tournament
3. Try adding a team - you should see an automatically generated name
4. Click the shuffle button to generate new suggestions
5. Verify that avoided combinations don't appear

## Future Enhancements

- Add more word categories (e.g., colors, locations)
- Allow custom word lists per tournament
- Add name history to avoid recent repeats
- Support for different languages/themes
