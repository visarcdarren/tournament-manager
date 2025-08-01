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

// Load superuser configuration
let superuserConfig = {};
async function loadSuperuserConfig() {
  try {
    const configPath = path.join(__dirname, 'settings', 'superuser-config.json');
    
    try {
      const data = await fs.readFile(configPath, 'utf8');
      superuserConfig = JSON.parse(data);
    } catch {
      // Create default config if it doesn't exist
      const defaultConfig = {
        enabled: true,
        password: crypto.randomBytes(16).toString('hex'),
        passwordHash: null
      };
      await fs.writeFile(configPath, JSON.stringify(defaultConfig, null, 2));
      console.log('\n=== SUPERUSER CONFIG CREATED ===');
      console.log('Password:', defaultConfig.password);
      console.log('Config file:', configPath);
      console.log('Please change this password!\n');
      superuserConfig = defaultConfig;
    }
  } catch (e) {
    console.error('Failed to load superuser config:', e);
    superuserConfig = { enabled: false };
  }
}
loadSuperuserConfig();

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

// Admin authentication
async function authenticateAdmin(req, res, next) {
  authenticate(req, res, async () => {
    const tournament = await loadTournament(req.params.id);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    if (tournament.adminDeviceId !== req.deviceId) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    req.tournament = tournament;
    next();
  });
}

// Scorer authentication
async function authenticateScorer(req, res, next) {
  authenticate(req, res, async () => {
    const tournament = await loadTournament(req.params.id);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    
    const device = tournament.devices?.find(d => d.id === req.deviceId);
    if (!device || (device.role !== 'SCORER' && device.role !== 'ADMIN')) {
      return res.status(403).json({ error: 'Scorer access required' });
    }
    
    req.tournament = tournament;
    req.device = device;
    next();
  });
}

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
    console.log('[TOURNAMENTS] Attempting to read directory:', DATA_DIR)
    const files = await fs.readdir(DATA_DIR);
    console.log('[TOURNAMENTS] Files found:', files)
    const tournaments = [];
    
    for (const file of files) {
      if (file.endsWith('.json') && !file.includes('-audit')) {
        console.log('[TOURNAMENTS] Processing file:', file)
        try {
          const data = await fs.readFile(path.join(DATA_DIR, file), 'utf8');
          const tournament = JSON.parse(data);
          console.log('[TOURNAMENTS] Parsed tournament:', { id: tournament.id, name: tournament.name })
          tournaments.push({
            id: tournament.id,
            name: tournament.name,
            status: tournament.currentState.status,
            created: tournament.created
          });
        } catch (fileError) {
          console.error('[TOURNAMENTS] Error processing file:', file, fileError)
          // Skip this file and continue with others
        }
      }
    }
    
    console.log('[TOURNAMENTS] Returning tournaments:', tournaments.length)
    res.json(tournaments);
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
  await addAuditEntry(tournament.id, {
    deviceId: req.deviceId,
    deviceName: req.headers['x-device-name'] || 'Admin Device',
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
  
  // Check device permissions
  const device = tournament.devices?.find(d => d.id === req.deviceId);
  const role = device?.role || 'VIEWER';
  
  // Filter data based on role
  if (role === 'VIEWER') {
    // Remove sensitive data for viewers
    const { pendingRequests, ...viewerData } = tournament;
    res.json({ ...viewerData, userRole: role });
  } else {
    res.json({ ...tournament, userRole: role });
  }
});

// Update tournament (admin or superuser)
app.put('/api/tournament/:id', authenticateSuperuser, async (req, res) => {
  await saveTournament(req.params.id, req.body);
  
  broadcastToTournament(req.params.id, {
    type: 'tournament-update',
    data: req.body
  });
  
  res.json({ success: true });
});

// Request role with enhanced debugging
app.post('/api/tournament/:id/request-role', authenticate, async (req, res) => {
  console.log('[ROLE REQUEST] Received:', {
    tournamentId: req.params.id,
    deviceId: req.deviceId,
    body: req.body
  });
  
  try {
    const tournament = await loadTournament(req.params.id);
    if (!tournament) {
      console.error('[ROLE REQUEST ERROR] Tournament not found:', req.params.id);
      return res.status(404).json({ error: 'Tournament not found' });
    }
    
    const { requestedRole, stations, deviceName } = req.body;
    
    // Initialize pendingRequests if not exists
    if (!tournament.pendingRequests) {
      tournament.pendingRequests = [];
    }
    
    // Check if device already has a pending request
    const existingRequestIndex = tournament.pendingRequests.findIndex(
      r => r.deviceId === req.deviceId
    );
    
    const newRequest = {
      deviceId: req.deviceId,
      deviceName: deviceName || 'Unknown Device',
      requestedRole,
      stations,
      requestedAt: new Date().toISOString()
    };
    
    if (existingRequestIndex >= 0) {
      // Update existing request
      tournament.pendingRequests[existingRequestIndex] = newRequest;
      console.log('[ROLE REQUEST] Updated existing request:', newRequest);
    } else {
      // Add new request
      tournament.pendingRequests.push(newRequest);
      console.log('[ROLE REQUEST] Added new request:', newRequest);
    }
    
    // Save tournament with retry logic
    let saveAttempts = 0;
    const maxAttempts = 3;
    let saved = false;
    
    while (saveAttempts < maxAttempts && !saved) {
      try {
        await saveTournament(tournament.id, tournament);
        saved = true;
      } catch (saveError) {
        saveAttempts++;
        console.error(`[SAVE ERROR] Attempt ${saveAttempts}:`, saveError);
        if (saveAttempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    }
    
    if (!saved) {
      console.error('[ROLE REQUEST ERROR] Failed to save after', maxAttempts, 'attempts');
      return res.status(500).json({ error: 'Failed to save request' });
    }
    
    // Verify the request was saved
    const verifyTournament = await loadTournament(tournament.id);
    const savedRequest = verifyTournament.pendingRequests?.find(
      r => r.deviceId === req.deviceId
    );
    
    if (!savedRequest) {
      console.error('[ROLE REQUEST ERROR] Request not found after save');
      return res.status(500).json({ error: 'Request save verification failed' });
    }
    
    console.log('[ROLE REQUEST] Verified saved request:', savedRequest);
    console.log('[ROLE REQUEST] Total pending requests:', verifyTournament.pendingRequests.length);
    
    // Notify admin
    broadcastToTournament(tournament.id, {
      type: 'role-request',
      data: {
        deviceId: req.deviceId,
        deviceName,
        requestedRole,
        timestamp: new Date().toISOString()
      }
    });
    
    console.log('[BROADCAST] Role request notification sent to tournament:', tournament.id);
    
    res.json({ 
      status: 'pending',
      request: savedRequest
    });
    
  } catch (error) {
    console.error('[ROLE REQUEST ERROR] Unexpected error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Grant role (admin or superuser)
app.post('/api/tournament/:id/grant-role', authenticateSuperuser, async (req, res) => {
  const { deviceId, role, stations } = req.body;
  const tournament = req.tournament;
  
  // Update device role
  tournament.devices = tournament.devices || [];
  const existingDevice = tournament.devices.find(d => d.id === deviceId);
  
  if (existingDevice) {
    existingDevice.role = role;
    existingDevice.stations = stations;
  } else {
    const request = tournament.pendingRequests?.find(r => r.deviceId === deviceId);
    tournament.devices.push({
      id: deviceId,
      name: request?.deviceName || 'Unknown Device',
      role,
      stations
    });
  }
  
  // Remove from pending requests
  tournament.pendingRequests = tournament.pendingRequests?.filter(r => r.deviceId !== deviceId) || [];
  
  await saveTournament(tournament.id, tournament);
  await addAuditEntry(tournament.id, {
    deviceId: req.deviceId,
    deviceName: 'Admin',
    action: 'GRANT_PERMISSION',
    details: { targetDeviceId: deviceId, role, stations }
  });
  
  // Notify all clients
  broadcastToTournament(tournament.id, {
    type: 'role-granted',
    data: { deviceId, role }
  });
  
  res.json({ success: true });
});

// Revoke role (admin or superuser)
app.post('/api/tournament/:id/revoke-role', authenticateSuperuser, async (req, res) => {
  const { deviceId } = req.body;
  const tournament = req.tournament;
  
  // Update device role
  const device = tournament.devices?.find(d => d.id === deviceId);
  if (device) {
    device.role = 'VIEWER';
    delete device.stations;
  }
  
  await saveTournament(tournament.id, tournament);
  await addAuditEntry(tournament.id, {
    deviceId: req.deviceId,
    deviceName: 'Admin',
    action: 'REVOKE_PERMISSION',
    details: { targetDeviceId: deviceId }
  });
  
  // Notify all clients
  broadcastToTournament(tournament.id, {
    type: 'role-revoked',
    data: { deviceId }
  });
  
  res.json({ success: true });
});

// Generate schedule endpoint (admin or superuser)
app.post('/api/tournament/:id/generate-schedule', authenticateSuperuser, async (req, res) => {
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

// Validate tournament setup endpoint (admin or superuser)
app.post('/api/tournament/:id/validate', authenticateSuperuser, async (req, res) => {
  const tournament = req.tournament;
  const validation = validateTournamentSetup(tournament);
  res.json(validation);
});

// Score game
app.post('/api/tournament/:id/score', authenticateScorer, async (req, res) => {
  const { gameId, result } = req.body;
  const tournament = req.tournament;
  
  // Find the game
  let gameFound = false;
  for (const round of tournament.schedule) {
    const game = round.games.find(g => g.id === gameId);
    if (game) {
      // Check if scorer can score this game
      if (req.device.stations && !req.device.stations.includes(game.station)) {
        return res.status(403).json({ error: 'Not authorized for this station' });
      }
      
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
        deviceName: req.device.name,
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

// Timer control (admin or superuser)
app.post('/api/tournament/:id/round/:round/timer/start', authenticateSuperuser, async (req, res) => {
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

// Get audit log (admin or superuser)
app.get('/api/tournament/:id/audit', authenticateSuperuser, async (req, res) => {
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

// Superuser login endpoint
app.post('/api/tournament/:id/superuser-login', authenticate, async (req, res) => {
  const { password } = req.body;
  const tournamentId = req.params.id;
  
  if (!superuserConfig.enabled) {
    return res.status(403).json({ error: 'Superuser login disabled' });
  }
  
  // Verify password
  const isValidPassword = superuserConfig.passwordHash 
    ? crypto.createHash('sha256').update(password).digest('hex') === superuserConfig.passwordHash
    : password === superuserConfig.password;
    
  if (!isValidPassword) {
    // Add delay to prevent brute force
    await new Promise(resolve => setTimeout(resolve, 1000));
    return res.status(401).json({ error: 'Invalid password' });
  }
  
  // Load tournament
  const tournament = await loadTournament(tournamentId);
  if (!tournament) {
    return res.status(404).json({ error: 'Tournament not found' });
  }
  
  // Grant admin access to this device
  const deviceId = req.deviceId;
  const deviceName = req.headers['x-device-name'] || 'Superuser Device';
  
  // Update devices array
  tournament.devices = tournament.devices || [];
  const existingDevice = tournament.devices.find(d => d.id === deviceId);
  
  if (existingDevice) {
    existingDevice.role = 'ADMIN';
    existingDevice.name = deviceName;
  } else {
    tournament.devices.push({
      id: deviceId,
      name: deviceName,
      role: 'ADMIN'
    });
  }
  
  // Save tournament
  await saveTournament(tournament.id, tournament);
  
  // Log the action
  await addAuditEntry(tournament.id, {
    deviceId: deviceId,
    deviceName: 'Superuser',
    action: 'SUPERUSER_LOGIN',
    details: { 
      grantedAdmin: true,
      timestamp: new Date().toISOString()
    }
  });
  
  // Broadcast the update
  broadcastToTournament(tournament.id, {
    type: 'role-granted',
    data: { deviceId, role: 'ADMIN' }
  });
  
  console.log('[SUPERUSER] Admin access granted to device:', deviceId);
  
  res.json({ 
    success: true, 
    message: 'Admin access granted via superuser login'
  });
});

// Check device status endpoint
app.get('/api/tournament/:id/device-status', authenticate, async (req, res) => {
  // Prevent caching for real-time device status
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
  res.setHeader('Pragma', 'no-cache')
  res.setHeader('Expires', '0')
  
  const tournament = await loadTournament(req.params.id);
  if (!tournament) {
    return res.status(404).json({ error: 'Tournament not found' });
  }
  
  const device = tournament.devices?.find(d => d.id === req.deviceId);
  const isOriginalAdmin = tournament.adminDeviceId === req.deviceId;
  
  res.json({
    deviceId: req.deviceId,
    currentRole: device?.role || 'VIEWER',
    isOriginalAdmin,
    hasPendingRequest: tournament.pendingRequests?.some(r => r.deviceId === req.deviceId)
  });
});

// Check pending requests (admin or superuser)
app.get('/api/tournament/:id/pending-requests', authenticateSuperuser, async (req, res) => {
  // Prevent caching for real-time pending requests
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
  res.setHeader('Pragma', 'no-cache')
  res.setHeader('Expires', '0')
  
  const tournament = req.tournament;
  res.json({
    pendingRequests: tournament.pendingRequests || [],
    totalRequests: (tournament.pendingRequests || []).length,
    devices: tournament.devices || []
  });
});

// Superuser password verification endpoint
app.post('/api/superuser-verify', authenticate, async (req, res) => {
  const { password } = req.body;
  
  if (!superuserConfig.enabled) {
    return res.status(403).json({ error: 'Superuser login disabled' });
  }
  
  // Verify password
  const isValidPassword = superuserConfig.passwordHash 
    ? crypto.createHash('sha256').update(password).digest('hex') === superuserConfig.passwordHash
    : password === superuserConfig.password;
    
  if (!isValidPassword) {
    // Add delay to prevent brute force
    await new Promise(resolve => setTimeout(resolve, 1000));
    return res.status(401).json({ error: 'Invalid password' });
  }
  
  res.json({ 
    success: true, 
    message: 'Superuser password verified'
  });
});

// Superuser authentication middleware
async function authenticateSuperuser(req, res, next) {
  const superuserPassword = req.headers['x-superuser-password'];
  
  if (!superuserPassword) {
    return authenticateAdmin(req, res, next);
  }
  
  // Verify superuser password
  const isValidPassword = superuserConfig.passwordHash 
    ? crypto.createHash('sha256').update(superuserPassword).digest('hex') === superuserConfig.passwordHash
    : superuserPassword === superuserConfig.password;
    
  if (!isValidPassword) {
    return res.status(401).json({ error: 'Invalid superuser password' });
  }
  
  // Superuser has access to any tournament
  authenticate(req, res, async () => {
    const tournament = await loadTournament(req.params.id);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    req.tournament = tournament;
    next();
  });
}

// Delete tournament (admin or superuser)
app.delete('/api/tournament/:id', authenticateSuperuser, async (req, res) => {
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
