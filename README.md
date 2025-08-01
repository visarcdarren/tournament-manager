# Tournament Manager

A comprehensive web-based tournament management system for shuffleboard and darts competitions. Features 1v1 game scheduling, real-time scoring, role-based permissions, and synchronized timers across multiple devices.

## Features

- **Tournament Setup**: Configure teams, players, equipment, and scoring systems
- **Smart Scheduling**: Automatic 1v1 game assignments with fair rotation
- **Multi-Device Support**: Admin control with distributed scoring devices
- **Real-Time Updates**: Live score updates and synchronized round timers
- **Role Management**: Admin, Scorer, and Viewer roles with permission control
- **Progressive Web App**: Installable and works offline
- **Complete Analytics**: Leaderboards, statistics, and tournament history

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
cd tournament-manager-2-opus
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
2. Configure tournament settings:
   - Number of teams (2-10)
   - Players per team (4-10, must be even)
   - Equipment (shuffleboards and dartboards)
   - Number of rounds
   - Scoring system

3. Add teams and players
4. Generate schedule to start the tournament

### Device Roles

- **Admin**: Full control, created automatically for tournament creator
- **Scorer**: Can score games, requires admin approval
- **Viewer**: Read-only access to tournament data

### Scoring Games

1. Scorers see active games for the current round
2. Click winner button or "Draw" for each game
3. Scores update in real-time across all devices

### Round Timer

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

### Client Deployment

The client can be deployed to any static hosting service:
- Netlify
- Vercel
- GitHub Pages
- Traditional web server

Configure the API endpoint in production by setting the `VITE_API_URL` environment variable.

## PWA Installation

The app can be installed as a Progressive Web App:

1. Visit the site in a modern browser
2. Look for the install prompt or use browser menu
3. Install to home screen/desktop
4. Use offline with cached data

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
│   └── data/            # Tournament JSON files
└── README.md
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## Docker Deployment

### Quick Start with Docker

1. **Using Docker Compose (Recommended)**
   ```bash
   # Build and start
   docker-compose up -d
   
   # View logs
   docker-compose logs -f
   
   # Stop
   docker-compose down
   ```

2. **Using Helper Scripts**
   
   **Linux/Mac:**
   ```bash
   chmod +x docker-helper.sh
   ./docker-helper.sh start
   ```
   
   **Windows:**
   ```cmd
   docker-helper.bat
   ```

### Docker Features

- **Persistent Data**: Tournament data stored in Docker volume
- **Health Checks**: Automatic container health monitoring
- **Production Build**: Optimized multi-stage build
- **Easy Backups**: Built-in backup/restore functionality

### Advanced Docker Setup

1. **With Nginx Reverse Proxy**
   ```bash
   docker-compose --profile with-nginx -f docker-compose.prod.yml up -d
   ```

2. **With Automatic Backups**
   ```bash
   docker-compose --profile with-backup -f docker-compose.prod.yml up -d
   ```

### Data Management

**Manual Backup:**
```bash
# Linux/Mac
./docker-helper.sh backup

# Windows
docker-helper.bat
# Select option 6
```

**Restore from Backup:**
```bash
# Linux/Mac
./docker-helper.sh restore

# Windows
docker-helper.bat
# Select option 7
```

**Data Volume Location:**
- Volume Name: `tournament-manager-2-opus_tournament-data`
- Contains all tournament JSON files
- Persists between container restarts

### Environment Variables

- `NODE_ENV`: Set to 'production' for production builds
- `PORT`: Server port (default: 3001)

### SSL/HTTPS Setup

1. Place SSL certificates in the nginx-certs volume
2. Uncomment SSL sections in nginx.conf
3. Update server_name with your domain
4. Restart nginx container

## Troubleshooting

**Container won't start:**
```bash
docker-compose logs tournament-manager
```

**Permission issues:**
```bash
# Fix data directory permissions
docker-compose exec tournament-manager chown -R nodejs:nodejs /app/server/data
```

**Reset everything:**
```bash
# Warning: This removes all data!
docker-compose down -v
```

## License

MIT License - see LICENSE file for details
