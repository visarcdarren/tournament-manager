# Tournament Manager - User Guide

## 🚀 Running the Application

### Using Docker (Recommended)

1. **Build and start the application:**
   ```bash
   docker-compose up -d
   ```

2. **Access the application:**
   - Open your browser to http://localhost:3001
   - The application is now running!

3. **Stop the application:**
   ```bash
   docker-compose down
   ```

### Running Locally (Development)

1. **Start the backend server:**
   ```bash
   cd server
   npm install
   npm start
   ```

2. **In a new terminal, start the frontend:**
   ```bash
   cd client
   npm install
   npm run dev
   ```

3. **Access at:** http://localhost:5173

## 🎮 How to Use the Tournament Manager

### Step 1: Create a Tournament

1. Click "New Tournament" on the home screen
2. Enter a tournament name (e.g., "Summer League 2024")
3. Click "Create Tournament"

### Step 2: Configure Settings

In the **Setup** tab:

**Basic Configuration:**
- **Teams**: Set number of teams (2-10)
- **Players per Team**: Must be even number (4-10)
- **Rounds**: How many rounds to play
- **Timer**: Enable/disable and set duration (optional)
- **Scoring**: Points for Win/Draw/Loss

**Game Types (NEW!):**
1. Click "Add Game Type"
2. Enter game name (e.g., "Pool", "Cornhole", "Shuffleboard")
3. Set players per team:
   - 1 = 1v1 games
   - 2 = 2v2 games
   - 3 = 3v3 games, etc.
4. Set number of stations
5. For team games, choose:
   - **Fixed Partners**: Same teammates all tournament
   - **Rotating Partners**: Different teammates each round

Example configuration:
- 4 teams × 8 players = 32 total players
- Game types:
  - Shuffleboard: 1v1, 2 stations
  - Pool: 2v2, 1 station, fixed partners
  - Darts: 1v1, 2 stations
- Total: 5 games per round (10 players active, 22 resting)

### Step 3: Add Teams and Players

In the **Teams** tab:
1. Click "Add Team" and enter team name
2. Click "Manage" on each team to add players
3. Add all players (must match your settings)

**Important**: Ensure you have enough players per team for all game types!

### Step 4: Generate Schedule & Start

Once all teams and players are added:
1. The system validates your setup
2. Shows any errors or warnings
3. Click "Start Tournament" to generate schedule
4. View the complete schedule in the **Schedule** tab

### Step 5: View Schedule

The **Schedule** tab offers three views:

**By Round:**
- See all games in each round
- Know when to start/end rounds

**By Station:**
- View what's happening at each game location
- Perfect for posting at each station

**By Player:**
- Individual schedules showing when/where to play
- Players can find their own games
- Shows rest rounds too

**Print any view** for posting at your venue!

### Step 6: Run the Tournament

During each round:

**For Tournament Admin:**
- Start the round timer (if enabled)
- View all active games
- Monitor progress
- Handle any issues

**For Scorers:**
- Request scorer access (if not admin)
- Find games at your station
- Click winning team/player or "Draw"
- Scores update in real-time

**For Players:**
- Check the Schedule tab for your games
- View live leaderboard
- See who's playing where
- Know when you're resting

### Step 7: Complete Tournament

When all rounds are finished:
- Automatic winner announcement with confetti! 🎉
- Final standings and statistics
- Export results for records

## 🔐 Superuser Access

If you lose admin access:

1. Go to the tournament list page
2. Look at the bottom right footer
3. Click "Superuser Login"
4. Enter the superuser password

**Finding your password:**
- First run creates `server/data/superuser-config.json`
- Password is shown in server console on first run
- Change it for security!

## 🏗️ System Architecture

### Overview

The Tournament Manager uses a modern web architecture with real-time updates:

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  Admin Device   │     │ Scorer Devices  │     │ Viewer Devices  │
│  (Full Control) │     │ (Score Games)   │     │  (Read Only)    │
│                 │     │                 │     │                 │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         └───────────────────────┴───────────────────────┘
                                 │
                                 │ HTTP + SSE
                                 │
                        ┌────────▼────────┐
                        │                 │
                        │   Web Server    │
                        │  (Node.js/Express)│
                        │                 │
                        └────────┬────────┘
                                 │
                                 │ JSON Files
                                 │
                        ┌────────▼────────┐
                        │                 │
                        │  File System    │
                        │ (Docker Volume) │
                        │                 │
                        └─────────────────┘
```

### What's New in Version 2

**Dynamic Game Types:**
- Configure any game (not just shuffleboard/darts)
- Support for team games (2v2, 3v3, etc.)
- Fixed or rotating partnerships
- Automatic station naming

**Enhanced Scheduling:**
- Handles multi-player games
- Prevents scheduling conflicts
- Fair partner rotation
- Activity variety tracking

**Schedule Viewer:**
- Three different views
- Print-friendly format
- Individual player schedules
- Rest period tracking

**Optional Features:**
- Timers can be disabled
- Flexible game configurations
- Superuser emergency access

### Data Storage

**JSON File Structure:**
```
server/data/
├── tournament-uuid.json       # Tournament data
├── tournament-uuid-audit.json # Action history
├── superuser-config.json      # Superuser password
└── ...
```

**Tournament Data Format (v2):**
```json
{
  "version": 2,
  "settings": {
    "gameTypes": [
      {
        "id": "pool",
        "name": "Pool",
        "playersPerTeam": 2,
        "partnerMode": "fixed",
        "stations": [...]
      }
    ],
    "timer": {
      "enabled": true,
      "duration": 30
    }
  }
}
```

### Smart Scheduling Algorithm

**Multi-Player Game Support:**
- Tracks player partnerships
- Ensures no conflicts (can't be in two places)
- Balances game participation
- Handles fixed vs rotating partners

**Partner Assignment:**
- Fixed: Deterministic pairing at start
- Rotating: New partners each round

**Validation:**
- Checks team sizes match game requirements
- Ensures enough stations for players
- Provides clear error messages

## 🛠️ Troubleshooting

### Common Issues

**"Cannot generate schedule"**
- Check validation errors in red
- Ensure teams have enough players for all game types
- Verify at least one station per game type

**"Lost admin access"**
- Use superuser login from tournament list
- Check footer for "Superuser Login" link
- Password in `server/data/superuser-config.json`

**"Player swapping not working"**
- Only available for 1v1 games
- Not supported for team games (2v2, etc.)

### Data Management

**Backup tournament data:**
```bash
# Docker
docker run --rm -v tournament-manager_tournament-data:/data -v $(pwd):/backup alpine tar -czf /backup/tournament-backup.tar.gz -C /data .

# Local
cp -r server/data server/data-backup
```

**Restore tournament data:**
```bash
# Docker
docker run --rm -v tournament-manager_tournament-data:/data -v $(pwd):/backup alpine tar -xzf /backup/tournament-backup.tar.gz -C /data

# Local
cp -r server/data-backup/* server/data/
```

## 📱 Mobile & PWA Features

The app can be installed on phones/tablets:
1. Open in mobile browser
2. Look for "Add to Home Screen" option
3. Install and use like a native app
4. Works offline once cached

## 🎯 Best Practices

1. **Tournament Setup:**
   - Plan game types based on available equipment
   - Consider player stamina (mix active/less active games)
   - Use fixed partners for serious competition
   - Use rotating partners for social events

2. **During the Tournament:**
   - Print schedules for each station
   - Have backup scorer devices ready
   - Use timer feature to maintain pace
   - Monitor the Devices tab for issues

3. **Game Type Tips:**
   - Start with fewer game types to test
   - Ensure clear station labeling
   - Brief scorers on their stations
   - Post game rules at each station

4. **For Large Tournaments:**
   - Consider shorter rounds (15-20 min)
   - Use more stations to reduce rest time
   - Enable timer for better pacing
   - Have dedicated scorers per station

## 🏆 Tournament Formats

**Round Robin Classic:**
- Everyone plays equal games
- Mix of different game types
- Fair rest distribution

**Team Championship:**
- Use fixed partners for consistency
- Track team totals in leaderboard
- Consider team-based scoring

**Social Mixer:**
- Use rotating partners
- Emphasize variety over competition
- Shorter rounds, more games

**Skills Challenge:**
- Different game types test different skills
- Use individual scoring
- Consider handicaps for balance

## Credits

© 2025 Visarc Ltd  
Built by AI under the supervision of humans
