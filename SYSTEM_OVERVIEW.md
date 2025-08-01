# Tournament Manager - System Overview

## What is Tournament Manager?

Tournament Manager is a web-based system for running shuffleboard and darts tournaments. It handles the complex logistics of scheduling 1v1 games across multiple stations while ensuring fair play distribution and real-time score tracking across multiple devices.

## Key Problems It Solves

### 1. **Fair Game Scheduling**
**Problem:** With 24 players across 4 teams using 4 game stations, creating fair matchups is complex.

**Solution:** An intelligent algorithm that:
- Ensures everyone plays the same number of games
- Prevents same-team matchups
- Rotates players between shuffleboard, darts, and rest
- Minimizes repeat opponents

### 2. **Multi-Device Coordination**
**Problem:** Tournament director can't be everywhere at once to record scores.

**Solution:** Role-based system where:
- Admin has full control from one device
- Scorers at each station enter results
- Spectators can view live updates
- All devices sync in real-time

### 3. **No Internet/Database Required**
**Problem:** Venue may have poor internet, and setting up databases is complex.

**Solution:** 
- Runs on local network or single computer
- Stores data in simple JSON files
- Can work completely offline once loaded
- Easy backup with file copies

## Core Concepts

### **1v1 Game Structure**
- Every game is one player versus one player
- Players represent their teams but compete individually  
- 4 games happen simultaneously (8 active players)
- 16 players rest each round
- Points go to the player's team

### **Station Types**
- **Shuffleboard**: Sliding puck game requiring strategy
- **Dartboard**: Precision throwing game
- Players rotate between both types for variety

### **Tournament Flow**
```
Setup Phase → Active Rounds → Completion
    │              │              │
    │              │              └── Winner celebration
    │              │                  Export results
    │              │
    │              └── Round 1 → Round 2 → ... → Round N
    │                     │         │               │
    │                     │         │               └── 4 games
    │                     │         └── 4 games         16 resting
    │                     └── 4 games
    │                         16 resting
    │
    └── Configure teams
        Add all players
        Set equipment/rounds
```

### **Scoring System**
- **Win**: 3 points (default, configurable)
- **Draw**: 1 point for each player
- **Loss**: 0 points
- Team score = sum of all player points

## Technical Design Decisions

### **Why React?**
- Modern, component-based UI
- Excellent mobile performance
- Large ecosystem of tools
- Easy state management with Zustand

### **Why No Database?**
- Simplicity - no complex setup
- Portability - just copy files
- Reliability - no connection issues
- Sufficient - tournaments are small scale

### **Why Server-Sent Events (SSE)?**
- Real-time updates without complexity
- Works through firewalls
- Automatic reconnection
- One-way communication is sufficient

### **Why Docker?**
- Consistent deployment environment
- Easy installation - one command
- Data persistence with volumes
- Professional production setup

## System Components

### **Frontend Application (React)**

**Key Files:**
- `App.jsx` - Main application and routing
- `TournamentView.jsx` - Tournament management hub
- `LiveTournament.jsx` - Active round interface
- `GameCard.jsx` - Individual game scoring
- `stores/` - State management with Zustand

**Component Hierarchy:**
```
App
├── TournamentList
│   └── Create/Select Tournament
└── TournamentView
    ├── TournamentSetup (Admin)
    ├── TeamManagement (Admin)
    ├── LiveTournament (All)
    │   ├── RoundTimer
    │   ├── GameCards
    │   └── RestArea
    ├── Leaderboard (All)
    └── DevicePermissions (Admin)
```

### **Backend Server (Node.js/Express)**

**Core Responsibilities:**
1. Serve the React application
2. RESTful API for data operations
3. SSE connections for live updates
4. File system operations for data
5. Permission management

**Key Endpoints:**
```javascript
// Tournament CRUD
GET    /api/tournaments          // List all
POST   /api/tournaments          // Create new
GET    /api/tournament/:id       // Get details
PUT    /api/tournament/:id       // Update

// Game Operations  
POST   /api/tournament/:id/score // Submit result

// Real-time
GET    /api/tournament/:id/events // SSE stream

// Permissions
POST   /api/tournament/:id/request-role
POST   /api/tournament/:id/grant-role
```

### **Data Storage**

**Tournament File Structure:**
```json
{
  "id": "uuid",
  "name": "Summer League 2024",
  "settings": {
    "teams": 4,
    "playersPerTeam": 6,
    "rounds": 6,
    "scoring": { "win": 3, "draw": 1, "loss": 0 }
  },
  "teams": [
    {
      "id": "uuid",
      "name": "Red Dragons",
      "players": [
        { "id": "uuid", "name": "John Smith", "status": "active" }
      ]
    }
  ],
  "schedule": [
    {
      "round": 1,
      "games": [
        {
          "id": "uuid",
          "station": "shuffleboard-1",
          "player1": { "teamId": "...", "playerId": "...", "playerName": "John" },
          "player2": { "teamId": "...", "playerId": "...", "playerName": "Sarah" },
          "status": "completed",
          "result": "player1-win"
        }
      ]
    }
  ]
}
```

### **Real-Time Synchronization**

**Update Flow Example:**
1. Scorer at dartboard-1 clicks "John Wins"
2. Frontend sends POST to `/api/tournament/123/score`
3. Server updates JSON file
4. Server broadcasts via SSE: `{ type: 'game-scored', data: {...} }`
5. All connected clients receive update
6. React components re-render with new data
7. Leaderboard updates automatically

### **Security Model**

**Device-Based (No Passwords):**
- Simple for non-technical users
- No forgotten passwords
- Device ID in localStorage
- Admin controls permissions

**Permission Levels:**
```
Admin (ADMIN)
  ├── Full tournament control
  ├── Grant/revoke permissions
  └── View audit logs

Scorer (SCORER)  
  ├── Score assigned games
  └── View tournament

Viewer (VIEWER)
  └── View tournament only
```

## Deployment Architecture

### **Docker Setup**
```
tournament-manager/
├── client/          # React app
├── server/          # Node.js API
├── Dockerfile       # Build instructions
└── docker-compose.yml
```

### **Container Details**
- Base image: `node:18-alpine` (small & secure)
- Multi-stage build (separate build/runtime)
- Non-root user for security
- Health checks for monitoring
- Automatic restart on failure

### **Data Persistence**
- Docker volume: `tournament-data`
- Mounted at: `/app/server/data`
- Survives container recreation
- Easy backup via volume export

## Future Enhancement Ideas

1. **Tournament Formats**
   - Double elimination brackets
   - Swiss system
   - Round-robin pools

2. **Game Types**
   - Pool/billiards
   - Cornhole
   - Table tennis
   - Custom games

3. **Advanced Features**
   - Player handicaps
   - ELO ratings
   - Tournament history
   - Player profiles

4. **Integration Options**
   - Email notifications
   - SMS alerts
   - Live streaming overlay
   - Venue TV displays

5. **Analytics**
   - Player performance trends
   - Team statistics
   - Game duration tracking
   - Win probability predictions

The system is designed to be extensible while keeping the core functionality simple and reliable for running successful tournaments.
