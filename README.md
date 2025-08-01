# Tournament Manager

A comprehensive web-based tournament management system for game parties and competitive events. Features dynamic game type configuration, multi-player team games, real-time scoring, role-based permissions, and optional synchronized timers across multiple devices.

## Features

- **Dynamic Game Types**: Configure any game type (shuffleboard, darts, pool, cornhole, etc.) with custom player counts
- **Flexible Team Sizes**: Support for 1v1, 2v2, 5v5, or any team configuration
- **Smart Scheduling**: Automatic game assignments with fair rotation and partner management
- **Schedule Viewer**: View schedules by round, station, or individual player
- **Multi-Device Support**: Admin control with distributed scoring devices
- **Real-Time Updates**: Live score updates via Server-Sent Events (SSE)
- **Optional Round Timers**: Configurable timers with synchronized countdowns
- **Role Management**: Admin, Scorer, and Viewer roles with permission control
- **Superuser Access**: Emergency admin access via password-protected login
- **Progressive Web App**: Installable and works offline
- **Complete Analytics**: Leaderboards, statistics, and tournament history

## What's New in Version 2

- **Dynamic Game Types**: No longer limited to shuffleboard and darts
- **Multi-Player Games**: Support for team games (2v2, 3v3, etc.)
- **Partner Modes**: Fixed or rotating partnerships for team games
- **Schedule Viewer**: Comprehensive schedule views with print support
- **Optional Timers**: Timers can now be disabled entirely
- **Superuser Login**: Emergency admin access recovery
- **Enhanced Validation**: Clear feedback on setup requirements

## Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Shadcn/ui
- **State Management**: Zustand
- **Backend**: Node.js, Express
- **Real-time**: Server-Sent Events (SSE)
- **Storage**: JSON file-based (no database required)

## Installation

### Prerequisites
- Node.js 16+ 
- npm or yarn
- Docker (for containerized deployment)

### Generate Lock Files (First Time Setup)

Before building with Docker, generate the package-lock.json files:

**Windows:**
```cmd
generate-locks.bat
```

**Linux/Mac:**
```bash
chmod +x generate-locks.sh
./generate-locks.sh
```

### Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd tournament-manager
```

2. Install server dependencies:
```bash
cd server
npm install
```

3. Install client dependencies:
```bash
cd ../client
npm install
```

4. Start the development servers:

In one terminal (server):
```bash
cd server
npm start
```

In another terminal (client):
```bash
cd client
npm run dev
```

The application will be available at `http://localhost:5173`

## Usage

### Creating a Tournament

1. Click "New Tournament" on the home screen
2. Configure basic settings:
   - Number of teams (2-10)
   - Players per team (4-10, must be even)
   - Number of rounds
   - Optional timer settings
   - Scoring system

3. Add game types:
   - Click "Add Game Type"
   - Enter game name (e.g., "Pool", "Cornhole")
   - Set players per team (1 for 1v1, 2 for 2v2, etc.)
   - Set number of stations
   - Choose partner mode for team games

4. Add teams and players
5. Generate schedule to start the tournament

### Game Type Configuration

- **Single Player Games** (1v1): Traditional head-to-head matches
- **Team Games** (2v2, 3v3, etc.): 
  - **Fixed Partners**: Same teammates throughout tournament
  - **Rotating Partners**: Different teammates each round

### Device Roles

- **Admin**: Full control, created automatically for tournament creator
- **Scorer**: Can score games, requires admin approval
- **Viewer**: Read-only access to tournament data

### Superuser Access

If you lose admin access:
1. Go to the tournament list page
2. Click "Superuser Login" in the footer
3. Enter the superuser password (found in `server/data/superuser-config.json`)
4. Gain admin access to any tournament

### Schedule Views

Access the Schedule tab to view:
- **By Round**: All games in each round
- **By Station**: Schedule for each game location
- **By Player**: Individual player schedules showing when and where to play

Print any view for posting at the venue.

### Scoring Games

1. Scorers see active games for their assigned stations
2. Click winner team/player or "Draw"
3. Scores update in real-time across all devices

### Round Timer (Optional)

If enabled in settings:
1. Admin sets timer duration (1-120 minutes)
2. 5-second countdown synchronizes all devices
3. Visual and audio warnings at 5 minutes remaining

## Deployment

### Production Build

```bash
cd client
npm run build
```

The built files will be in `client/dist/`

### Server Deployment

The server requires:
- Node.js runtime
- Write access to a data directory
- Port 3001 (or configure PORT environment variable)

### Docker Deployment

```bash
# Using Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

## Data Management

### Backup Tournament Data
```bash
# Docker
docker run --rm -v tournament-manager_tournament-data:/data -v $(pwd):/backup alpine tar -czf /backup/tournament-backup.tar.gz -C /data .

# Local development
cp -r server/data server/data-backup
```

### Superuser Configuration

The superuser password is stored in `server/data/superuser-config.json`:
```json
{
  "enabled": true,
  "password": "your-secure-password",
  "passwordHash": null
}
```

## Architecture

### Data Flow
```
Client (React) <-> API (Express) <-> File System (JSON)
                      |
                      v
                Server-Sent Events (Real-time updates)
```

### File Structure
```
tournament-manager/
├── client/               # React frontend
│   ├── src/
│   │   ├── components/   # UI components
│   │   ├── stores/       # Zustand stores
│   │   └── utils/        # Helper functions
│   └── public/           # Static assets
├── server/               # Express backend
│   ├── server.js         # Main server file
│   ├── scheduleGenerator.js  # Scheduling algorithm
│   └── data/            # Tournament JSON files
└── README.md
```

## Troubleshooting

### Lost Admin Access
Use the superuser login feature from the tournament list page footer.

### Schedule Generation Fails
- Ensure all teams have the same number of active players
- Check that teams have enough players for all game types
- Verify at least one station per game type

### Docker Issues
```bash
# View logs
docker-compose logs tournament-manager

# Reset everything (WARNING: deletes all data)
docker-compose down -v
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - see LICENSE file for details

## Credits

© 2025 Visarc Ltd  
Built by AI under the supervision of humans

---

## 📚 Documentation

This project includes comprehensive documentation to help you understand, deploy, and use the Tournament Manager:

### 📖 **Setup & Usage**
- **[User Guide](USER_GUIDE.md)** - Complete step-by-step guide for creating tournaments, configuring game types, and running events
- **[Docker Build Instructions](DOCKER_BUILD.md)** - Docker deployment, troubleshooting, and build fixes
- **[CSS Fix Guide](CSS_FIX.md)** - Solutions for Tailwind CSS styling issues in Docker builds

### 🔧 **Technical Documentation** 
- **[System Overview](SYSTEM_OVERVIEW.md)** - Architecture, design decisions, data structures, and future enhancement ideas
- **[AI Project Info](AI_PROJECT_INFO.md)** - Project structure, file locations, and important notes for AI assistants
- **[Team Name Generator](TEAM_NAME_GENERATOR.md)** - Implementation details for the automatic team name generation feature

### 🎯 **Quick Start**
New to the project? Start here:
1. **[User Guide](USER_GUIDE.md)** - Learn how to create and run tournaments
2. **[Docker Build Instructions](DOCKER_BUILD.md)** - Get the app running
3. **[System Overview](SYSTEM_OVERVIEW.md)** - Understand how it all works

### 🆘 **Troubleshooting**
Having issues? Check:
- **[Docker Build Instructions](DOCKER_BUILD.md)** for deployment problems
- **[CSS Fix Guide](CSS_FIX.md)** for styling issues
- **[User Guide](USER_GUIDE.md)** for usage questions

---
