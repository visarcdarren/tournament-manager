# Tournament Manager - System Overview

## What is Tournament Manager?

Tournament Manager is a flexible web-based system for running multi-game tournaments at parties and competitive events. It handles the complex logistics of scheduling games across multiple stations, supporting everything from 1v1 matches to team games like 2v2 or 5v5, while ensuring fair play distribution and real-time score tracking across multiple devices.

## Key Problems It Solves

### 1. **Dynamic Game Configuration**
**Problem:** Different events need different games - pool, darts, shuffleboard, etc.

**Solution:** Flexible game type system where you can:
- Add any game type with custom player counts
- Configure 1v1, 2v2, 3v3, or any team size
- Set up multiple stations per game
- Mix different game types in one tournament

### 2. **Complex Scheduling**
**Problem:** With multiple game types and team sizes, creating fair matchups is extremely complex.

**Solution:** Intelligent scheduling algorithm that:
- Handles multi-player games without conflicts
- Manages fixed or rotating partnerships
- Ensures fair game distribution
- Provides variety in activities
- Shows individual player schedules

### 3. **Multi-Device Coordination**
**Problem:** Tournament director can't be everywhere at once to record scores.

**Solution:** Role-based system where:
- Admin has full control from one device
- Scorers at each station enter results
- Players can view their personal schedules
- All devices sync in real-time
- Emergency superuser access if admin device is lost

### 4. **No Internet/Database Required**
**Problem:** Venue may have poor internet, and setting up databases is complex.

**Solution:** 
- Runs on local network or single computer
- Stores data in simple JSON files
- Can work completely offline once loaded
- Easy backup with file copies

## Core Concepts

### **Flexible Game Structure**
- **1v1 Games**: Traditional head-to-head matches
- **Team Games**: 2v2, 3v3, up to any size
- **Fixed Partners**: Same teammates throughout
- **Rotating Partners**: Different teammates each round
- Players compete for their teams in all formats

### **Game Type Examples**
- **Shuffleboard**: 1v1 strategy game
- **Pool**: 2v2 team game with fixed partners
- **Darts**: 1v1 precision game
- **Volleyball**: 5v5 team sport
- Configure any game your venue supports!

### **Tournament Flow**
```
Setup Phase → Schedule Generation → Active Rounds → Completion
    │                │                    │              │
    │                │                    │              └── Winner celebration
    │                │                    │                  Export results
    │                │                    │
    │                │                    └── Round 1 → Round 2 → ... → Round N
    │                │                            │         │               │
    │                │                            │         │               └── Games + Rest
    │                │                            │         └── Games + Rest
    │                │                            └── Games + Rest
    │                │
    │                └── Validates setup
    │                    Assigns partnerships
    │                    Creates fair matchups
    │
    └── Configure teams & players
        Define game types
        Set stations & rules
```

### **Schedule Views**
- **By Round**: Overview of each round's games
- **By Station**: What's happening at each location
- **By Player**: Personal schedules for participants

## Technical Design Decisions

### **Why Version 2?**
- **Dynamic Games**: Not limited to pre-defined types
- **Team Support**: Handles any player configuration
- **Better UX**: Schedule viewer, validation feedback
- **Recovery Options**: Superuser access, better error handling

### **Architecture Choices**

**Frontend (React + Vite):**
- Fast development and hot reload
- Component reusability for different game types
- Responsive design for all devices
- PWA support for offline use

**Backend (Node.js + Express):**
- Simple REST API
- Server-Sent Events for real-time updates
- File-based storage for simplicity
- Stateless design for reliability

**No Database:**
- Zero configuration required
- Human-readable data format
- Easy backup/restore
- Sufficient for tournament scale

## System Components

### **Frontend Application**

**Key Components:**
- `GameTypeManager.jsx` - Configure custom games
- `ScheduleViewer.jsx` - View schedules in multiple formats
- `GameCard.jsx` - Universal game scoring interface
- `LiveTournament.jsx` - Real-time round management
- `SuperuserLoginDialog.jsx` - Emergency access

**Component Hierarchy:**
```
App
├── TournamentList
│   ├── Create Tournament
│   └── Superuser Login (Footer)
└── TournamentView
    ├── Setup Tab
    │   ├── Basic Settings
    │   ├── Game Type Manager (NEW)
    │   └── Timer Settings (NEW)
    ├── Teams Tab
    ├── Schedule Tab (NEW)
    │   ├── By Round View
    │   ├── By Station View
    │   └── By Player View
    ├── Live Tab
    │   ├── Active Games
    │   └── Rest Area
    ├── Leaderboard Tab
    └── Devices Tab (Admin)
```

### **Backend Server**

**Core Modules:**
- `server.js` - Main application server
- `scheduleGenerator.js` - Complex scheduling algorithm
- Authentication middleware
- SSE broadcast system

**Key Endpoints:**
```javascript
// Tournament Management
POST   /api/tournaments                  // Create with game types
GET    /api/tournament/:id              // Get with version migration
PUT    /api/tournament/:id              // Update settings

// Schedule Operations
POST   /api/tournament/:id/validate     // Check setup validity
POST   /api/tournament/:id/generate-schedule  // Create schedule

// Game Scoring
POST   /api/tournament/:id/score        // Works for any game type

// Emergency Access
POST   /api/tournament/:id/superuser-login   // Password-based admin access

// Real-time Updates
GET    /api/tournament/:id/events       // SSE connection
```

### **Data Storage (v2)**

**Tournament Structure:**
```json
{
  "version": 2,
  "id": "uuid",
  "name": "Summer Party 2024",
  "settings": {
    "teams": 4,
    "playersPerTeam": 8,
    "rounds": 6,
    "gameTypes": [
      {
        "id": "pool",
        "name": "Pool",
        "playersPerTeam": 2,
        "partnerMode": "fixed",
        "stations": [
          { "id": "pool", "name": "Pool" }
        ]
      },
      {
        "id": "darts",
        "name": "Darts",
        "playersPerTeam": 1,
        "stations": [
          { "id": "darts-1", "name": "Darts 1" },
          { "id": "darts-2", "name": "Darts 2" }
        ]
      }
    ],
    "timer": {
      "enabled": false,
      "duration": 30
    },
    "scoring": { "win": 3, "draw": 1, "loss": 0 }
  },
  "teams": [...],
  "schedule": [
    {
      "round": 1,
      "games": [
        {
          "id": "uuid",
          "station": "pool",
          "stationName": "Pool",
          "gameType": "pool",
          "gameTypeName": "Pool",
          "team1Players": [
            { "teamId": "...", "playerId": "...", "playerName": "John" },
            { "teamId": "...", "playerId": "...", "playerName": "Sarah" }
          ],
          "team2Players": [
            { "teamId": "...", "playerId": "...", "playerName": "Mike" },
            { "teamId": "...", "playerId": "...", "playerName": "Lisa" }
          ],
          "status": "pending",
          "result": null
        }
      ]
    }
  ]
}
```

### **Scheduling Algorithm**

**Multi-Player Game Support:**
```javascript
// Partnership Generation
function generatePartnerships(team, gameType, round) {
  if (gameType.partnerMode === 'fixed') {
    // Deterministic pairing - same partners always
    return createFixedPairs(team.players, gameType.playersPerTeam)
  } else {
    // Rotating - different partners each round
    return createRotatingPairs(team.players, gameType.playersPerTeam, round)
  }
}

// Conflict Prevention
class PlayerTracker {
  isAvailable(playerId)      // Not already playing
  assign(playerId, gameId)    // Mark as playing
  recordGame(players, type)   // Track history
  hasPlayedAgainst(p1, p2)   // Avoid repeats
}
```

**Validation System:**
- Pre-flight checks before schedule generation
- Clear error messages for setup issues
- Warnings for sub-optimal configurations
- Real-time feedback during setup

### **Real-Time Updates**

**SSE Message Types:**
```javascript
// Game scored
{ type: 'game-scored', data: { gameId, result, round } }

// Timer events  
{ type: 'timer-countdown', data: { round, duration } }
{ type: 'timer-started', data: { round, expiresAt } }

// Permission changes
{ type: 'role-request', data: { deviceId, deviceName } }
{ type: 'role-granted', data: { deviceId, role } }

// Tournament updates
{ type: 'tournament-update', data: { ...tournament } }
```

### **Security & Recovery**

**Superuser System:**
```json
// server/data/superuser-config.json
{
  "enabled": true,
  "password": "generated-on-first-run",
  "passwordHash": null  // Optional SHA256 hash
}
```

**Access Recovery Flow:**
1. User loses admin device/access
2. Navigate to tournament list
3. Click "Superuser Login" in footer
4. Enter password from config file
5. Gain admin access to any tournament

## Deployment Architecture

### **Docker Configuration**
```yaml
version: '3.8'
services:
  tournament-manager:
    build: .
    ports:
      - "3001:3001"
    volumes:
      - tournament-data:/app/server/data
    environment:
      - NODE_ENV=production
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
    restart: unless-stopped
```

### **Production Considerations**
- Nginx reverse proxy for SSL
- Regular automated backups
- Log rotation for debugging
- Resource limits for stability
- Health monitoring

## Future Enhancement Ideas

### **Tournament Formats**
- Bracket elimination
- Swiss system
- League play over multiple days
- Handicap systems

### **Advanced Features**
- Player statistics and history
- Team rankings across tournaments
- Mobile app with QR code check-in
- Live streaming integration
- Venue display boards

### **Game Integrations**
- Electronic dartboards API
- Shuffleboard sensors
- Score tracking cameras
- Automated game detection

### **Social Features**
- Player profiles with photos
- Tournament photos/highlights
- Social media sharing
- Achievement badges

The system is designed to grow with your needs while maintaining the simplicity that makes it accessible to non-technical tournament organizers.

## Credits

© 2025 Visarc Ltd  
Built by AI under the supervision of humans
