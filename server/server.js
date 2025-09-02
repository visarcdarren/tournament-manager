import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { generateSchedule, validateTournamentSetup, migrateTournamentToV2 } from './scheduleGenerator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === 'production';

// Middleware
app.use(cors());
app.use(express.json());

// Data directory
const DATA_DIR = path.join(__dirname, 'data');

// Ensure data directory exists
async function ensureDataDir() {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
}
ensureDataDir();

// Removed: Superuser configuration - no longer needed
// Tournament creators have full control of their tournaments

// In production, serve the client build
if (isProduction) {
  const clientPath = path.join(__dirname, '..', 'client', 'dist');
  app.use(express.static(clientPath));
  
  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  });
}

// In-memory store for SSE connections
const sseClients = new Map(); // tournamentId -> Set of response objects

// Audit log helper
async function addAuditEntry(tournamentId, entry) {
  const auditPath = path.join(DATA_DIR, `${tournamentId}-audit.json`);
  let audit = { entries: [] };
  
  try {
    const data = await fs.readFile(auditPath, 'utf8');
    audit = JSON.parse(data);
  } catch (e) {
    // File doesn't exist yet
  }
  
  audit.entries.unshift({
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    ...entry
  });
  
  // Keep only last 100 entries
  audit.entries = audit.entries.slice(0, 100);
  
  await fs.writeFile(auditPath, JSON.stringify(audit, null, 2));
}

// Load tournament data
async function loadTournament(id) {
  try {
    const data = await fs.readFile(path.join(DATA_DIR, `${id}.json`), 'utf8');
    const tournament = JSON.parse(data);
    // Migrate old tournaments to new format
    return migrateTournamentToV2(tournament);
  } catch (e) {
    return null;
  }
}

// Save tournament data
async function saveTournament(id, data) {
  await fs.writeFile(path.join(DATA_DIR, `${id}.json`), JSON.stringify(data, null, 2));
}

// Broadcast to SSE clients
function broadcastToTournament(tournamentId, data) {
  const clients = sseClients.get(tournamentId);
  if (clients) {
    const message = `data: ${JSON.stringify(data)}\n\n`;
    clients.forEach(client => {
      try {
        client.write(message);
      } catch (e) {
        // Client disconnected
        clients.delete(client);
      }
    });
  }
}

// Authentication middleware
function authenticate(req, res, next) {
  const deviceId = req.headers['x-device-id'];
  if (!deviceId) {
    return res.status(401).json({ error: 'Device ID required' });
  }
  req.deviceId = deviceId;
  next();
}

// Creator authentication
async function authenticateCreator(req, res, next) {
  authenticate(req, res, async () => {
    const tournament = await loadTournament(req.params.id);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    if (tournament.creatorDeviceId !== req.deviceId) {
      return res.status(403).json({ error: 'Creator access required' });
    }
    req.tournament = tournament;
    next();
  });
}

// Removed: authenticateScorer - no longer needed in simplified system

// Routes

// Get team names data for name generation
app.get('/api/team-names', async (req, res) => {
  try {
    const teamNamesPath = path.join(__dirname, 'settings', 'team-names.json');
    const data = await fs.readFile(teamNamesPath, 'utf8');
    res.json(JSON.parse(data));
  } catch (error) {
    console.error('Failed to load team names:', error);
    res.status(500).json({ error: 'Failed to load team names data' });
  }
});

// Get tournament list
app.get('/api/tournaments', async (req, res) => {
  // Prevent caching to ensure fresh tournament list
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
  res.setHeader('Pragma', 'no-cache')
  res.setHeader('Expires', '0')
  
  try {
    const deviceId = req.headers['x-device-id']; // Optional for tournament list
    const files = await fs.readdir(DATA_DIR);
    const myTournaments = [];
    const publicTournaments = [];
    
    for (const file of files) {
      if (file.endsWith('.json') && !file.includes('-audit')) {
        try {
          const data = await fs.readFile(path.join(DATA_DIR, file), 'utf8');
          const tournament = JSON.parse(data);
          
          const tournamentInfo = {
            id: tournament.id,
            name: tournament.name,
            status: tournament.currentState.status,
            created: tournament.created,
            isPublic: tournament.isPublic || false,
            isOwner: deviceId && tournament.creatorDeviceId === deviceId
          };
          
          // Sort into creator's tournaments vs public tournaments
          if (deviceId && tournament.creatorDeviceId === deviceId) {
            myTournaments.push(tournamentInfo);
          } else if (tournament.isPublic) {
            publicTournaments.push(tournamentInfo);
          }
        } catch (fileError) {
          console.error('[TOURNAMENTS] Error processing file:', file, fileError)
        }
      }
    }
    
    // Sort by created date (newest first)
    myTournaments.sort((a, b) => new Date(b.created) - new Date(a.created));
    publicTournaments.sort((a, b) => new Date(b.created) - new Date(a.created));
    
    res.json({
      myTournaments,
      publicTournaments
    });
  } catch (e) {
    console.error('[TOURNAMENTS] Critical error:', e)
    res.status(500).json({ error: 'Failed to load tournaments', details: e.message });
  }
});

// Create tournament
app.post('/api/tournaments', authenticate, async (req, res) => {
  const tournament = {
    id: uuidv4(),
    version: 2,
    ...req.body,
    creatorDeviceId: req.deviceId,
    creatorName: req.headers['x-device-name'] || 'Tournament Creator',
    isPublic: false, // Default to private
    created: new Date().toISOString()
  };
  
  await saveTournament(tournament.id, tournament);
  await addAuditEntry(tournament.id, {
    deviceId: req.deviceId,
    deviceName: req.headers['x-device-name'] || 'Tournament Creator',
    action: 'CREATE_TOURNAMENT',
    details: { tournamentName: tournament.name }
  });
  
  res.json(tournament);
});

// Get tournament
app.get('/api/tournament/:id', authenticate, async (req, res) => {
  // Prevent caching to ensure fresh tournament data
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
  res.setHeader('Pragma', 'no-cache')
  res.setHeader('Expires', '0')
  
  const tournament = await loadTournament(req.params.id);
  if (!tournament) {
    return res.status(404).json({ error: 'Tournament not found' });
  }
  
  // Check access permissions
  const isCreator = tournament.creatorDeviceId === req.deviceId;
  const canView = isCreator || tournament.isPublic;
  
  if (!canView) {
    return res.status(403).json({ error: 'Tournament is private' });
  }
  
  // Return tournament data with user role
  res.json({ 
    ...tournament, 
    userRole: isCreator ? 'CREATOR' : 'VIEWER',
    isCreator 
  });
});

// Update tournament (creator only)
app.put('/api/tournament/:id', authenticateCreator, async (req, res) => {
  await saveTournament(req.params.id, req.body);
  
  broadcastToTournament(req.params.id, {
    type: 'tournament-update',
    data: req.body
  });
  
  res.json({ success: true });
});

// Toggle tournament public/private status (creator only)
app.post('/api/tournament/:id/toggle-public', authenticateCreator, async (req, res) => {
  const tournament = req.tournament;
  tournament.isPublic = !tournament.isPublic;
  
  await saveTournament(tournament.id, tournament);
  await addAuditEntry(tournament.id, {
    deviceId: req.deviceId,
    deviceName: tournament.creatorName,
    action: 'TOGGLE_PUBLIC',
    details: { isPublic: tournament.isPublic }
  });
  
  broadcastToTournament(tournament.id, {
    type: 'tournament-update',
    data: tournament
  });
  
  res.json({ 
    success: true, 
    isPublic: tournament.isPublic 
  });
});

// Removed: Complex role management system (request-role, grant-role, revoke-role)
// The system is now simplified to creator-only control

// Generate schedule endpoint (creator only)
app.post('/api/tournament/:id/generate-schedule', authenticateCreator, async (req, res) => {
  try {
    const tournament = req.tournament;
    
    // Validate setup first
    const validation = validateTournamentSetup(tournament);
    if (!validation.valid) {
      return res.status(400).json({ 
        error: 'Invalid tournament setup',
        details: validation
      });
    }
    
    // Generate the schedule
    const schedule = generateSchedule(tournament);
    tournament.schedule = schedule;
    tournament.currentState = {
      status: 'active',
      currentRound: 1
    };
    
    await saveTournament(tournament.id, tournament);
    await addAuditEntry(tournament.id, {
      deviceId: req.deviceId,
      deviceName: 'Admin',
      action: 'GENERATE_SCHEDULE',
      details: { 
        rounds: schedule.length,
        totalGames: schedule.reduce((sum, round) => sum + round.games.length, 0)
      }
    });
    
    // Broadcast update
    broadcastToTournament(tournament.id, {
      type: 'tournament-update',
      data: tournament
    });
    
    res.json({ 
      success: true, 
      schedule,
      validation 
    });
  } catch (error) {
    console.error('Schedule generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate schedule',
      message: error.message 
    });
  }
});

// Validate tournament setup endpoint (creator only)
app.post('/api/tournament/:id/validate', authenticateCreator, async (req, res) => {
  const tournament = req.tournament;
  const validation = validateTournamentSetup(tournament);
  res.json(validation);
});

// Preview schedule endpoint (creator only)
app.post('/api/tournament/:id/preview-schedule', authenticateCreator, async (req, res) => {
  try {
    const tournament = req.tournament;
    
    // Validate setup first
    const validation = validateTournamentSetup(tournament);
    if (!validation.valid) {
      return res.status(400).json({ 
        error: 'Invalid tournament setup',
        details: validation
      });
    }
    
    // Generate preview schedule without saving to tournament
    const schedule = generateSchedule(tournament);
    
    res.json({ 
      success: true, 
      schedule,
      validation 
    });
  } catch (error) {
    console.error('Schedule preview error:', error);
    res.status(500).json({ 
      error: 'Failed to generate schedule preview',
      message: error.message 
    });
  }
});

// Score game (creator only)
app.post('/api/tournament/:id/score', authenticateCreator, async (req, res) => {
  const { gameId, result } = req.body;
  const tournament = req.tournament;
  
  // Find the game
  let gameFound = false;
  for (const round of tournament.schedule) {
    const game = round.games.find(g => g.id === gameId);
    if (game) {
      const previousResult = game.result;
      game.result = result;
      game.status = 'completed';
      gameFound = true;
      
      // Build player lists for logging
      const team1Names = game.team1Players ? 
        game.team1Players.map(p => `${p.playerName} (${p.teamName})`).join(' & ') :
        `${game.player1.playerName} (${game.player1.teamName})`;
      
      const team2Names = game.team2Players ? 
        game.team2Players.map(p => `${p.playerName} (${p.teamName})`).join(' & ') :
        `${game.player2.playerName} (${game.player2.teamName})`;
      
      await saveTournament(tournament.id, tournament);
      await addAuditEntry(tournament.id, {
        deviceId: req.deviceId,
        deviceName: tournament.creatorName,
        action: 'SCORE_GAME',
        details: {
          gameId,
          round: round.round,
          station: game.station,
          gameType: game.gameType || 'unknown',
          team1: team1Names,
          team2: team2Names,
          result,
          previousResult
        }
      });
      
      // Broadcast update
      broadcastToTournament(tournament.id, {
        type: 'game-scored',
        data: { gameId, result, round: round.round }
      });
      
      break;
    }
  }
  
  if (!gameFound) {
    return res.status(404).json({ error: 'Game not found' });
  }
  
  res.json({ success: true });
});

// Timer control (creator only)
app.post('/api/tournament/:id/round/:round/timer/start', authenticateCreator, async (req, res) => {
  const { duration = 30 } = req.body;
  const tournament = req.tournament;
  const roundNum = parseInt(req.params.round);
  
  const round = tournament.schedule.find(r => r.round === roundNum);
  if (!round) {
    return res.status(404).json({ error: 'Round not found' });
  }
  
  // Start countdown
  round.timer = {
    duration,
    status: 'countdown',
    countdownStartedAt: Date.now()
  };
  
  await saveTournament(tournament.id, tournament);
  
  // Broadcast countdown start
  broadcastToTournament(tournament.id, {
    type: 'timer-countdown',
    data: { round: roundNum, duration }
  });
  
  // After 5 seconds, start the actual timer
  setTimeout(async () => {
    const tournament = await loadTournament(req.params.id);
    const round = tournament.schedule.find(r => r.round === roundNum);
    
    round.timer = {
      duration,
      status: 'running',
      startedAt: Date.now(),
      expiresAt: Date.now() + (duration * 60 * 1000)
    };
    
    await saveTournament(tournament.id, tournament);
    
    // Broadcast timer start
    broadcastToTournament(tournament.id, {
      type: 'timer-started',
      data: { round: roundNum, expiresAt: round.timer.expiresAt }
    });
  }, 5000);
  
  res.json({ success: true });
});

// Get timer status
app.get('/api/tournament/:id/round/:round/timer', authenticate, async (req, res) => {
  const tournament = await loadTournament(req.params.id);
  if (!tournament) {
    return res.status(404).json({ error: 'Tournament not found' });
  }
  
  const round = tournament.schedule.find(r => r.round === parseInt(req.params.round));
  if (!round) {
    return res.status(404).json({ error: 'Round not found' });
  }
  
  res.json(round.timer || { status: 'not-started' });
});

// Get audit log (creator only)
app.get('/api/tournament/:id/audit', authenticateCreator, async (req, res) => {
  try {
    const data = await fs.readFile(path.join(DATA_DIR, `${req.params.id}-audit.json`), 'utf8');
    res.json(JSON.parse(data));
  } catch (e) {
    res.json({ entries: [] });
  }
});

// SSE endpoint for real-time updates
app.get('/api/tournament/:id/events', (req, res) => {
  // For SSE, get device ID from query parameter instead of header
  const deviceId = req.query.deviceId || req.headers['x-device-id'];
  
  if (!deviceId) {
    return res.status(401).json({ error: 'Device ID required' });
  }
  
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  const tournamentId = req.params.id;
  
  // Add client to list
  if (!sseClients.has(tournamentId)) {
    sseClients.set(tournamentId, new Set());
  }
  sseClients.get(tournamentId).add(res);
  
  // Send initial connection message
  res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);
  
  // Clean up on disconnect
  req.on('close', () => {
    const clients = sseClients.get(tournamentId);
    if (clients) {
      clients.delete(res);
      if (clients.size === 0) {
        sseClients.delete(tournamentId);
      }
    }
  });
});

// Export tournament
app.get('/api/tournament/:id/export', authenticate, async (req, res) => {
  const tournament = await loadTournament(req.params.id);
  if (!tournament) {
    return res.status(404).json({ error: 'Tournament not found' });
  }
  
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="tournament-${tournament.name}-${new Date().toISOString().split('T')[0]}.json"`);
  res.json(tournament);
});

// Import tournament
app.post('/api/tournament/import', authenticate, async (req, res) => {
  const tournamentData = req.body;
  const newId = uuidv4();
  
  const tournament = {
    ...tournamentData,
    id: newId,
    adminDeviceId: req.deviceId,
    devices: [{
      id: req.deviceId,
      name: req.headers['x-device-name'] || 'Admin Device',
      role: 'ADMIN'
    }],
    pendingRequests: [],
    created: new Date().toISOString()
  };
  
  await saveTournament(tournament.id, tournament);
  res.json({ id: tournament.id });
});

// Removed: Complex superuser system - no longer needed
// Tournament creators have full control of their tournaments

// Delete tournament (creator only)
app.delete('/api/tournament/:id', authenticateCreator, async (req, res) => {
  const tournamentId = req.params.id;
  
  try {
    // Delete tournament file
    await fs.unlink(path.join(DATA_DIR, `${tournamentId}.json`));
    
    // Delete audit file if it exists
    try {
      await fs.unlink(path.join(DATA_DIR, `${tournamentId}-audit.json`));
    } catch (e) {
      // Audit file might not exist, that's ok
    }
    
    // Notify all connected clients that the tournament was deleted
    broadcastToTournament(tournamentId, {
      type: 'tournament-deleted',
      data: { tournamentId }
    });
    
    // Clean up SSE connections
    sseClients.delete(tournamentId);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete tournament' });
  }
});

// Catch-all route for client-side routing in production
if (isProduction) {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'client', 'dist', 'index.html'));
  });
}

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Tournament Manager Server running on port ${PORT}`);
  console.log(`Environment: ${isProduction ? 'production' : 'development'}`);
});
