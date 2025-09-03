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

// Admin authentication - supports multiple admins
async function authenticateAdmin(req, res, next) {
  authenticate(req, res, async () => {
    const tournament = await loadTournament(req.params.id);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    
    // Check if user is original admin or has been granted admin access
    const device = tournament.devices?.find(d => d.id === req.deviceId);
    const isOriginalAdmin = tournament.adminDeviceId === req.deviceId;
    const isGrantedAdmin = device?.role === 'ADMIN';
    
    if (!isOriginalAdmin && !isGrantedAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    req.tournament = tournament;
    req.device = device;
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
    const deviceId = req.headers['x-device-id']; // Optional for tournament list
    const files = await fs.readdir(DATA_DIR);
    const myTournaments = [];
    const publicTournaments = [];
    
    for (const file of files) {
      if (file.endsWith('.json') && !file.includes('-audit')) {
        try {
          const data = await fs.readFile(path.join(DATA_DIR, file), 'utf8');
          const tournament = JSON.parse(data);
          
          // Check if user has admin access to this tournament
          const isOriginalAdmin = deviceId && tournament.adminDeviceId === deviceId;
          const hasAdminAccess = deviceId && tournament.devices?.some(d => d.id === deviceId && d.role === 'ADMIN');
          const isAdmin = isOriginalAdmin || hasAdminAccess;
          
          const tournamentInfo = {
            id: tournament.id,
            name: tournament.name,
            status: tournament.currentState.status,
            created: tournament.created,
            isPublic: tournament.isPublic || false,
            isAdmin: isAdmin
          };
          
          // Sort into admin tournaments vs public tournaments
          if (isAdmin) {
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
    adminDeviceId: req.deviceId,
    devices: [{
      id: req.deviceId,
      name: req.headers['x-device-name'] || 'Admin Device',
      role: 'ADMIN'
    }],
    pendingRequests: [],
    isPublic: false, // Default to private
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
  const isOriginalAdmin = tournament.adminDeviceId === req.deviceId;
  const hasAdminAccess = device?.role === 'ADMIN';
  const hasAccessPermission = device?.role && ['ADMIN', 'SCORER'].includes(device.role);
  const canView = isOriginalAdmin || hasAdminAccess || hasAccessPermission || tournament.isPublic;
  
  if (!canView) {
    return res.status(403).json({ error: 'Tournament is private' });
  }
  
  // Determine user role
  const userRole = (isOriginalAdmin || hasAdminAccess) ? 'ADMIN' : (device?.role || 'VIEWER');
  
  // Filter data based on role
  if (userRole === 'VIEWER') {
    // Remove sensitive data for viewers
    const { pendingRequests, adminSharePassword, ...viewerData } = tournament;
    res.json({ ...viewerData, userRole, isOriginalAdmin });
  } else {
    res.json({ ...tournament, userRole, isOriginalAdmin });
  }
});

// Update tournament (admin only)
app.put('/api/tournament/:id', authenticateAdmin, async (req, res) => {
  await saveTournament(req.params.id, req.body);
  
  broadcastToTournament(req.params.id, {
    type: 'tournament-update',
    data: req.body
  });
  
  res.json({ success: true });
});

// Toggle tournament public/private status (admin only)
app.post('/api/tournament/:id/toggle-public', authenticateAdmin, async (req, res) => {
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

// Admin sharing functionality

// Generate admin share link with password (admin only)
app.post('/api/tournament/:id/share-admin', authenticateAdmin, async (req, res) => {
  const { password, baseUrl } = req.body;
  const tournament = req.tournament;
  
  if (!password || password.length < 4) {
    return res.status(400).json({ error: 'Password must be at least 4 characters' });
  }
  
  if (!baseUrl) {
    return res.status(400).json({ error: 'Base URL is required' });
  }
  
  // Store the password hash
  tournament.adminSharePassword = crypto.createHash('sha256').update(password).digest('hex');
  
  await saveTournament(tournament.id, tournament);
  await addAuditEntry(tournament.id, {
    deviceId: req.deviceId,
    deviceName: req.device?.name || 'Admin',
    action: 'CREATE_ADMIN_SHARE',
    details: { hasPassword: true }
  });
  
  // Use the frontend-provided base URL
  const shareLink = `${baseUrl}/admin-join/${tournament.id}`;
  res.json({ shareLink, password });
});

// Join as admin using share link
app.post('/api/tournament/:id/join-admin', authenticate, async (req, res) => {
  const { password } = req.body;
  const tournament = await loadTournament(req.params.id);
  
  if (!tournament) {
    return res.status(404).json({ error: 'Tournament not found' });
  }
  
  if (!tournament.adminSharePassword) {
    return res.status(404).json({ error: 'No admin sharing configured for this tournament' });
  }
  
  const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
  if (passwordHash !== tournament.adminSharePassword) {
    // Add delay to prevent brute force
    await new Promise(resolve => setTimeout(resolve, 1000));
    return res.status(401).json({ error: 'Invalid password' });
  }
  
  // Grant admin access
  const deviceId = req.deviceId;
  const deviceName = req.headers['x-device-name'] || 'Shared Admin Device';
  
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
  
  await saveTournament(tournament.id, tournament);
  await addAuditEntry(tournament.id, {
    deviceId: deviceId,
    deviceName: deviceName,
    action: 'JOIN_AS_ADMIN',
    details: { 
      grantedAdmin: true,
      viaShareLink: true,
      timestamp: new Date().toISOString()
    }
  });
  
  // Broadcast the update
  broadcastToTournament(tournament.id, {
    type: 'admin-joined',
    data: { deviceId, deviceName, role: 'ADMIN' }
  });
  
  console.log('[ADMIN_SHARE] Admin access granted to device:', deviceId);
  
  res.json({ 
    success: true, 
    message: 'Admin access granted',
    userRole: 'ADMIN'
  });
});

// Revoke admin share (admin only)
app.post('/api/tournament/:id/revoke-admin-share', authenticateAdmin, async (req, res) => {
  const tournament = req.tournament;
  
  // Remove the share password
  delete tournament.adminSharePassword;
  
  await saveTournament(tournament.id, tournament);
  await addAuditEntry(tournament.id, {
    deviceId: req.deviceId,
    deviceName: req.device?.name || 'Admin',
    action: 'REVOKE_ADMIN_SHARE',
    details: { revokedAt: new Date().toISOString() }
  });
  
  res.json({ success: true, message: 'Admin sharing disabled' });
});

// Get admin share status (admin only)
app.get('/api/tournament/:id/admin-share-status', authenticateAdmin, async (req, res) => {
  const tournament = req.tournament;
  
  res.json({
    hasSharingEnabled: !!tournament.adminSharePassword,
    adminCount: tournament.devices?.filter(d => d.role === 'ADMIN').length || 1
  });
});

// Device and role management

// Request role
app.post('/api/tournament/:id/request-role', authenticate, async (req, res) => {
  const tournament = await loadTournament(req.params.id);
  if (!tournament) {
    return res.status(404).json({ error: 'Tournament not found' });
  }
  
  const { requestedRole, stations, deviceName } = req.body;
  
  // Add to pending requests
  tournament.pendingRequests = tournament.pendingRequests || [];
  tournament.pendingRequests.push({
    deviceId: req.deviceId,
    deviceName: deviceName || 'Unknown Device',
    requestedRole,
    stations,
    requestedAt: new Date().toISOString()
  });
  
  await saveTournament(tournament.id, tournament);
  
  // Notify admin
  broadcastToTournament(tournament.id, {
    type: 'role-request',
    data: {
      deviceId: req.deviceId,
      deviceName,
      requestedRole
    }
  });
  
  res.json({ status: 'pending' });
});

// Grant role (admin only)
app.post('/api/tournament/:id/grant-role', authenticateAdmin, async (req, res) => {
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
    deviceName: req.device?.name || 'Admin',
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

// Revoke role (admin only)
app.post('/api/tournament/:id/revoke-role', authenticateAdmin, async (req, res) => {
  const { deviceId } = req.body;
  const tournament = req.tournament;
  
  // Prevent revoking original admin
  if (deviceId === tournament.adminDeviceId) {
    return res.status(400).json({ error: 'Cannot revoke original admin access' });
  }
  
  // Update device role
  const device = tournament.devices?.find(d => d.id === deviceId);
  if (device) {
    device.role = 'VIEWER';
    delete device.stations;
  }
  
  await saveTournament(tournament.id, tournament);
  await addAuditEntry(tournament.id, {
    deviceId: req.deviceId,
    deviceName: req.device?.name || 'Admin',
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

// Check device status endpoint
app.get('/api/tournament/:id/device-status', authenticate, async (req, res) => {
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

// Check pending requests (admin only)
app.get('/api/tournament/:id/pending-requests', authenticateAdmin, async (req, res) => {
  const tournament = req.tournament;
  res.json({
    pendingRequests: tournament.pendingRequests || [],
    totalRequests: (tournament.pendingRequests || []).length
  });
});

// Generate schedule endpoint (admin only)
app.post('/api/tournament/:id/generate-schedule', authenticateAdmin, async (req, res) => {
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

// Validate tournament setup endpoint (admin only)
app.post('/api/tournament/:id/validate', authenticateAdmin, async (req, res) => {
  const tournament = req.tournament;
  const validation = validateTournamentSetup(tournament);
  res.json(validation);
});

// Preview schedule endpoint (admin only)
app.post('/api/tournament/:id/preview-schedule', authenticateAdmin, async (req, res) => {
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

// Score game (admin/scorer only)
app.post('/api/tournament/:id/score', authenticateScorer, async (req, res) => {
  const { gameId, result } = req.body;
  const tournament = req.tournament;
  
  // Find the game
  let gameFound = false;
  for (const round of tournament.schedule) {
    const game = round.games.find(g => g.id === gameId);
    if (game) {
      const previousResult = game.result;
      game.result = result;
      // Don't automatically mark as completed - keep status as 'pending' to allow re-scoring
      // game.status = 'completed'; // Removed this line
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
        deviceName: req.device?.name || 'Admin',
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

// Timer control (admin only)
app.post('/api/tournament/:id/round/:round/timer/start', authenticateAdmin, async (req, res) => {
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

// Get audit log (admin only)
app.get('/api/tournament/:id/audit', authenticateAdmin, async (req, res) => {
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
  try {
    const tournamentData = req.body;
    
    // Validate required tournament data structure
    if (!tournamentData || typeof tournamentData !== 'object') {
      return res.status(400).json({ error: 'Invalid tournament data format' });
    }
    
    // Validate required fields
    const requiredFields = ['name', 'settings', 'teams'];
    for (const field of requiredFields) {
      if (!tournamentData[field]) {
        return res.status(400).json({ 
          error: `Missing required field: ${field}` 
        });
      }
    }
    
    // Generate new unique ID for the imported tournament
    const newId = uuidv4();
    
    // Get current device info
    const deviceName = req.headers['x-device-name'] || 'Admin Device';
    
    // Create the imported tournament with new ownership
    const tournament = {
      ...tournamentData,
      // Override critical fields to ensure proper ownership and uniqueness
      id: newId,
      version: 2, // Ensure current version
      adminDeviceId: req.deviceId, // Set importing user as admin
      devices: [{
        id: req.deviceId,
        name: deviceName,
        role: 'ADMIN'
      }],
      pendingRequests: [],
      isPublic: false, // Always import as private initially
      created: new Date().toISOString(),
      // Preserve original creation date as imported metadata if it exists
      originalCreated: tournamentData.created || null,
      importedAt: new Date().toISOString(),
      importedBy: {
        deviceId: req.deviceId,
        deviceName: deviceName
      }
    };
    
    // Reset tournament state to setup if it was active
    if (tournament.currentState) {
      tournament.currentState = {
        ...tournament.currentState,
        status: 'setup' // Always import in setup state
      };
    }
    
    // Clear any existing game results to avoid confusion
    if (tournament.schedule) {
      tournament.schedule = tournament.schedule.map(round => ({
        ...round,
        games: round.games.map(game => ({
          ...game,
          result: null,
          status: 'pending'
        }))
      }));
    }
    
    // Save the tournament
    await saveTournament(tournament.id, tournament);
    
    // Add audit log entry for the import
    await addAuditEntry(tournament.id, {
      deviceId: req.deviceId,
      deviceName: deviceName,
      action: 'IMPORT_TOURNAMENT',
      details: {
        originalName: tournamentData.name,
        originalId: tournamentData.id || null,
        originalCreated: tournamentData.created || null,
        teamsCount: tournament.teams?.length || 0,
        scheduleGenerated: tournament.schedule?.length > 0
      }
    });
    
    res.json({ 
      id: tournament.id,
      name: tournament.name 
    });
    
  } catch (error) {
    console.error('Tournament import error:', error);
    
    // Handle JSON parsing errors specifically
    if (error instanceof SyntaxError) {
      return res.status(400).json({ 
        error: 'Invalid JSON format in tournament file' 
      });
    }
    
    // Handle file system errors
    if (error.code === 'EACCES' || error.code === 'ENOSPC') {
      return res.status(500).json({ 
        error: 'Server storage error. Please try again.' 
      });
    }
    
    // Generic error fallback
    res.status(500).json({ 
      error: 'Failed to import tournament. Please check the file format and try again.' 
    });
  }
});



// Delete tournament (admin only)
app.delete('/api/tournament/:id', authenticateAdmin, async (req, res) => {
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
