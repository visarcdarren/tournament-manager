# Tournament Manager Project Information

## Project Structure
```
tournament-manager/          # Project root directory
├── client/                 # React frontend application
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── stores/         # Zustand state management
│   │   └── utils/          # Utility functions including api.js
│   └── package.json
├── server/                 # Node.js/Express backend
│   ├── server.js          # Main server file
│   └── package.json
├── data/                  # Tournament data storage (JSON files)
├── docker-compose.yml     # Docker configuration
└── README.md             # Project documentation
```

## Key File Locations (Relative to Project Root)
- **Backend Server:** `./server/server.js`
- **API Client:** `./client/src/utils/api.js`
- **Tournament View Component:** `./client/src/components/tournament/TournamentView.jsx`
- **Role Request Dialog:** `./client/src/components/tournament/RoleRequestDialog.jsx`
- **Device Permissions:** `./client/src/components/tournament/DevicePermissions.jsx`

## Configuration Files
- **Superuser Config:** `./data/superuser-config.json` (created on first run)
- **Tournament Data:** `./data/[tournament-id].json`
- **Audit Logs:** `./data/[tournament-id]-audit.json`

## Development Commands
```bash
# From project root directory

# Start backend server
cd server
npm start

# Start frontend development server (in new terminal)
cd client
npm run dev

# Docker deployment
docker-compose up -d
```

## Important Note for AI Assistants

**ALWAYS request access to the project root directory first by asking:**
"Please provide access to the tournament-manager project root directory so I can work with the code files."

Once access is granted, all file operations should use paths relative to the project root. The project follows a standard Node.js/React structure with separate client and server directories.
