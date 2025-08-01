# Tournament Manager - Quick Start Guide

## 🚀 Running the Application

### Using Docker (Recommended)

1. **Build and start the application:**
   ```bash
   docker-compose -f docker-compose.simple.yml up -d
   ```

2. **Access the application:**
   - Open your browser to http://localhost:3001
   - The application is now running!

3. **Stop the application:**
   ```bash
   docker-compose -f docker-compose.simple.yml down
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
- **Teams**: Set number of teams (2-10)
- **Players per Team**: Must be even number (4-10)
- **Equipment**: Number of shuffleboards and dartboards
- **Rounds**: How many rounds to play
- **Scoring**: Points for Win/Draw/Loss

Example configuration:
- 4 teams × 6 players = 24 total players
- 2 shuffleboards + 2 dartboards = 4 games per round
- 8 players active, 16 resting each round

### Step 3: Add Teams and Players

In the **Teams** tab:
1. Click "Add Team" and enter team name
2. Click "Manage" on each team to add players
3. Add all players (must match your settings)

### Step 4: Generate Schedule & Start

Once all teams and players are added:
1. Go to the **Live** tab
2. Click "Generate Schedule & Start Tournament"
3. The system automatically creates fair 1v1 matchups

### Step 5: Run the Tournament

During each round:

**For Tournament Admin:**
- Start the round timer (optional)
- View all active games
- Swap players if needed (illness, etc.)
- Monitor progress

**For Scorers:**
- Request scorer access (if not admin)
- Click game result buttons: "Player Wins" or "Draw"
- Scores update in real-time

**For Everyone:**
- View live leaderboard
- See who's playing and who's resting
- Watch the countdown timer

### Step 6: Complete Tournament

When all rounds are finished:
- Automatic winner announcement with confetti! 🎉
- Final standings and statistics
- Export results or create next tournament

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

### Frontend (React)

**Technology Stack:**
- React 18 with Vite for fast development
- Tailwind CSS for styling
- Shadcn/ui for polished components
- Zustand for state management
- Progressive Web App (PWA) capable

**Key Features:**
- Single Page Application (SPA)
- Real-time updates via Server-Sent Events (SSE)
- Mobile-responsive design
- Offline capability with service workers
- Role-based UI (Admin/Scorer/Viewer)

### Backend (Node.js)

**Technology Stack:**
- Express.js web server
- Server-Sent Events for real-time updates
- JSON file storage (no database required)
- RESTful API design

**API Endpoints:**
- `GET /api/tournaments` - List all tournaments
- `POST /api/tournaments` - Create new tournament
- `GET /api/tournament/:id` - Get tournament details
- `PUT /api/tournament/:id` - Update tournament
- `POST /api/tournament/:id/score` - Submit game score
- `GET /api/tournament/:id/events` - SSE connection for live updates

### Data Storage

**JSON File Structure:**
```
server/data/
├── tournament-uuid.json       # Tournament data
├── tournament-uuid-audit.json # Action history
└── ...
```

**Why JSON files?**
- No database setup required
- Human-readable data format
- Easy backup and restore
- Sufficient for tournament scale (100s of games)
- Portable between systems

### Real-Time Updates

**Server-Sent Events (SSE):**
- One-way communication from server to clients
- Automatic reconnection
- Efficient for broadcasting updates
- Works through proxies and firewalls

**Update Flow:**
1. Scorer submits game result
2. Server updates JSON file
3. Server broadcasts update via SSE
4. All connected devices receive update
5. UI updates automatically

### Security & Permissions

**Device-Based Authentication:**
- Each device gets a unique ID (UUID)
- Stored in browser localStorage
- No passwords required

**Role System:**
- **Admin**: Full control (tournament creator)
- **Scorer**: Can score games only
- **Viewer**: Read-only access

**Permission Flow:**
1. Tournament creator becomes Admin
2. Other devices start as Viewers
3. Viewers can request Scorer access
4. Admin approves/denies requests
5. Permissions can be revoked anytime

### Smart Scheduling Algorithm

**Goals:**
- Fair game distribution (everyone plays equally)
- No same-team matchups
- Activity variety (shuffleboard → darts → rest)
- Minimize repeat opponents

**Algorithm Steps:**
1. List all active players with team info
2. Track games played per player
3. Track previous opponents
4. For each station:
   - Find best pairing based on:
     - Fewest games played
     - Haven't played each other
     - Different teams
     - Activity variety
5. Assign remaining players to rest

### Docker Deployment

**Container Structure:**
- Multi-stage build for optimization
- Node.js Alpine Linux (small size)
- Non-root user for security
- Health checks for monitoring

**Data Persistence:**
- Docker volume for tournament data
- Survives container updates
- Easy backup/restore commands

**Production Features:**
- Automatic restart on failure
- Resource limits
- Log rotation
- Optional Nginx reverse proxy
- SSL/HTTPS ready

## 🛠️ Troubleshooting

### Common Issues

**"No tournaments yet"**
- Create your first tournament with the "New Tournament" button

**"Cannot generate schedule"**
- Ensure all teams have the correct number of players
- Check that player count is even per team

**"Permission denied"**
- Request scorer access from the admin
- Admin can grant permissions in the Devices tab

**Styles not loading**
- Clear browser cache
- Rebuild Docker image with `--no-cache` flag

### Data Management

**Backup tournament data:**
```bash
docker run --rm -v tournament-manager-2-opus_tournament-data:/data -v $(pwd):/backup alpine tar -czf /backup/tournament-backup.tar.gz -C /data .
```

**Restore tournament data:**
```bash
docker run --rm -v tournament-manager-2-opus_tournament-data:/data -v $(pwd):/backup alpine tar -xzf /backup/tournament-backup.tar.gz -C /data
```

## 📱 Mobile & PWA Features

The app can be installed on phones/tablets:
1. Open in mobile browser
2. Look for "Add to Home Screen" option
3. Install and use like a native app
4. Works offline once cached

## 🎯 Best Practices

1. **Before the Tournament:**
   - Test the system with a practice tournament
   - Ensure all devices can connect
   - Set up scorer devices at each station

2. **During the Tournament:**
   - Start round timers to keep pace
   - Have admin device easily accessible
   - Use player swap feature for emergencies

3. **After Each Round:**
   - Verify all games are scored
   - Check leaderboard is correct
   - Start next round promptly

4. **Tournament End:**
   - Export results for records
   - Create follow-up tournament if needed
   - Celebrate the winners! 🏆
