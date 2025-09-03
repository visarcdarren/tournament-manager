// Schedule generation algorithm for multi-player games
import { v4 as uuidv4 } from 'uuid';

// Migrate old tournament format to new format
export function migrateTournamentToV2(tournament) {
  if (tournament.version === 2 && tournament.creatorDeviceId) return tournament;
  
  // Create migrated tournament object
  const migrated = {
    ...tournament,
    version: 2,
    // Migrate old admin device ID to new creator device ID
    creatorDeviceId: tournament.adminDeviceId || tournament.creatorDeviceId,
    creatorName: tournament.devices?.[0]?.name || 'Tournament Creator',
    isPublic: tournament.isPublic || false,
    // Ensure playerPool exists
    playerPool: tournament.playerPool || [],
    settings: {
      ...tournament.settings,
      // Convert old equipment to game types if needed
      gameTypes: tournament.settings.gameTypes || [
        ...(tournament.settings.equipment?.shuffleboards > 0 ? [{
          id: 'shuffleboard',
          name: 'Shuffleboard',
          playersPerTeam: 1,
          stations: Array(tournament.settings.equipment.shuffleboards)
            .fill(null)
            .map((_, i) => ({
              id: `shuffleboard-${i + 1}`,
              name: `Shuffleboard ${i + 1}`
            }))
        }] : []),
        ...(tournament.settings.equipment?.dartboards > 0 ? [{
          id: 'darts',
          name: 'Darts',
          playersPerTeam: 1,
          stations: Array(tournament.settings.equipment.dartboards)
            .fill(null)
            .map((_, i) => ({
              id: `dartboard-${i + 1}`,
              name: `Dartboard ${i + 1}`
            }))
        }] : [])
      ],
      timer: tournament.settings.timer || {
        enabled: false,
        duration: 30
      }
    }
  };
  
  // Remove old fields
  delete migrated.adminDeviceId;
  delete migrated.devices;
  delete migrated.pendingRequests;
  if (migrated.settings.equipment) {
    delete migrated.settings.equipment;
  }
  
  return migrated;
}

// Validate tournament can be scheduled
export function validateTournamentSetup(tournament) {
  const errors = [];
  const warnings = [];
  
  if (!tournament.teams || tournament.teams.length < 2) {
    errors.push('At least 2 teams are required');
    return { valid: false, errors, warnings };
  }
  
  // Check if all teams have the same number of active players
  const teamSizes = tournament.teams.map(team => 
    team.players.filter(p => p.status === 'active').length
  );
  const uniqueSizes = [...new Set(teamSizes)];
  
  if (uniqueSizes.length > 1) {
    errors.push(`All teams must have the same number of active players. Current sizes: ${teamSizes.join(', ')}`);
  }
  
  const playersPerTeam = teamSizes[0] || 0;
  
  // Check game type requirements
  const gameTypes = tournament.settings.gameTypes || [];
  let totalStations = 0;
  let maxPlayersNeeded = 0;
  
  for (const gameType of gameTypes) {
    const stationCount = gameType.stations?.length || 0;
    if (stationCount === 0) {
      errors.push(`${gameType.name} has no stations configured`);
      continue;
    }
    
    totalStations += stationCount;
    
    // Check if teams have enough players for this game type
    if (gameType.playersPerTeam > playersPerTeam) {
      errors.push(`${gameType.name} requires ${gameType.playersPerTeam} players per team, but teams only have ${playersPerTeam} players`);
    }
    
    // Calculate max players needed in a round
    const playersNeededForGameType = stationCount * gameType.playersPerTeam * 2; // 2 teams per game
    maxPlayersNeeded = Math.max(maxPlayersNeeded, playersNeededForGameType);
  }
  
  // Check if we have enough players total
  const totalPlayers = tournament.teams.length * playersPerTeam;
  const minPlayersNeeded = totalStations * 2; // At least 2 players per station (1v1 minimum)
  
  if (totalPlayers < minPlayersNeeded) {
    errors.push(`Not enough players. Need at least ${minPlayersNeeded} players total for ${totalStations} stations`);
  }
  
  // Warnings
  if (totalPlayers < maxPlayersNeeded) {
    warnings.push(`Some game types may not be fully utilized. Consider reducing stations or changing team sizes.`);
  }
  
  // Check partner mode for multi-player games and odd team size impacts
  for (const gameType of gameTypes) {
    if (gameType.playersPerTeam > 1 && !gameType.partnerMode) {
      warnings.push(`${gameType.name} is ${gameType.playersPerTeam}v${gameType.playersPerTeam} but partner mode not set. Defaulting to 'rotating'.`);
    }
    
    // Check for odd team sizes that may cause uneven participation
    if (gameType.playersPerTeam > 1) {
      const remainder = playersPerTeam % gameType.playersPerTeam;
      if (remainder > 0) {
        const leftoverPlayers = remainder;
        const maxPartnerships = Math.floor(playersPerTeam / gameType.playersPerTeam);
        warnings.push(`${gameType.name}: Each team has ${playersPerTeam} players, but game requires groups of ${gameType.playersPerTeam}. ${leftoverPlayers} player(s) per team will rotate sitting out.`);
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    summary: {
      teams: tournament.teams.length,
      playersPerTeam,
      totalPlayers,
      totalStations,
      gameTypes: gameTypes.length
    }
  };
}

// Generate partnerships for multi-player games
function generatePartnerships(team, gameType, round) {
  const activePlayers = team.players.filter(p => p.status === 'active');
  const partnerships = [];
  const playersPerPartnership = gameType.playersPerTeam;
  
  if (gameType.partnerMode === 'fixed') {
    // Fixed partnerships - pair players once and keep them together
    // Use deterministic pairing based on player order
    for (let i = 0; i < activePlayers.length; i += playersPerPartnership) {
      const partnership = [];
      for (let j = 0; j < playersPerPartnership && i + j < activePlayers.length; j++) {
        partnership.push(activePlayers[i + j]);
      }
      if (partnership.length === playersPerPartnership) {
        partnerships.push(partnership);
      }
    }
  } else {
    // Rotating partnerships - create new pairs each round with leftover rotation
    // Calculate rotation offset to ensure different players sit out each round
    const remainder = activePlayers.length % playersPerPartnership;
    const rotationOffset = remainder > 0 ? ((round - 1) * remainder) % activePlayers.length : 0;
    
    // Apply rotation to ensure fair distribution of who sits out
    const rotatedPlayers = [
      ...activePlayers.slice(rotationOffset),
      ...activePlayers.slice(0, rotationOffset)
    ];
    
    // Shuffle within the rotated list for variety, but maintain rotation fairness
    const shuffled = [...rotatedPlayers].sort((a, b) => {
      const seedA = `${round}-${a.id}`.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const seedB = `${round}-${b.id}`.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      return seedA - seedB;
    });
    
    for (let i = 0; i < shuffled.length; i += playersPerPartnership) {
      const partnership = [];
      for (let j = 0; j < playersPerPartnership && i + j < shuffled.length; j++) {
        partnership.push(shuffled[i + j]);
      }
      if (partnership.length === playersPerPartnership) {
        partnerships.push(partnership);
      }
    }
  }
  
  return partnerships;
}

// Enhanced partnership generation that considers sit-out fairness
function generatePartnershipsWithTracker(team, gameType, round, tracker) {
  const activePlayers = team.players.filter(p => p.status === 'active');
  const partnerships = [];
  const playersPerPartnership = gameType.playersPerTeam;
  
  if (gameType.partnerMode === 'fixed') {
    // Fixed partnerships - pair players once and keep them together
    // Use deterministic pairing based on player order
    for (let i = 0; i < activePlayers.length; i += playersPerPartnership) {
      const partnership = [];
      for (let j = 0; j < playersPerPartnership && i + j < activePlayers.length; j++) {
        partnership.push(activePlayers[i + j]);
      }
      if (partnership.length === playersPerPartnership) {
        partnerships.push(partnership);
      }
    }
    
    // Record leftover players as sitting out
    const usedPlayers = new Set(partnerships.flat().map(p => p.id));
    activePlayers.forEach(player => {
      if (!usedPlayers.has(player.id)) {
        tracker.recordSitOut(player.id);
      }
    });
  } else {
    // Rotating partnerships - prioritize players who have sat out the most
    // Sort players by sit-out count (ascending) to prioritize those who have sat out most
    const playersWithSitOutCount = activePlayers.map(player => ({
      ...player,
      sitOutCount: tracker.getSitOutCount(player.id)
    })).sort((a, b) => {
      // Primary: sit-out count (ascending - fewer sit-outs first)
      if (a.sitOutCount !== b.sitOutCount) {
        return a.sitOutCount - b.sitOutCount;
      }
      // Secondary: add some round-based variety
      const seedA = `${round}-${a.id}`.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const seedB = `${round}-${b.id}`.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      return seedA - seedB;
    });
    
    for (let i = 0; i < playersWithSitOutCount.length; i += playersPerPartnership) {
      const partnership = [];
      for (let j = 0; j < playersPerPartnership && i + j < playersWithSitOutCount.length; j++) {
        partnership.push(playersWithSitOutCount[i + j]);
      }
      if (partnership.length === playersPerPartnership) {
        partnerships.push(partnership);
      }
    }
    
    // Record leftover players as sitting out
    const usedPlayers = new Set(partnerships.flat().map(p => p.id));
    playersWithSitOutCount.forEach(player => {
      if (!usedPlayers.has(player.id)) {
        tracker.recordSitOut(player.id);
      }
    });
  }
  
  return partnerships;
}

// Track player assignments and conflicts
class PlayerTracker {
  constructor() {
    this.assignments = new Map(); // playerId -> current assignment
    this.gameHistory = new Map(); // playerId -> Set of playerIds they've played against
    this.restCount = new Map(); // playerId -> number of rest periods
    this.gameCount = new Map(); // playerId -> number of games played
    this.lastActivity = new Map(); // playerId -> last game type played
    this.sitOutCount = new Map(); // playerId -> number of times sat out due to odd team sizes
  }
  
  isAvailable(playerId) {
    return !this.assignments.has(playerId);
  }
  
  assign(playerId, assignment) {
    this.assignments.set(playerId, assignment);
  }
  
  unassign(playerId) {
    this.assignments.delete(playerId);
  }
  
  recordGame(team1Players, team2Players, gameType) {
    // Record games played
    [...team1Players, ...team2Players].forEach(player => {
      this.gameCount.set(player.id, (this.gameCount.get(player.id) || 0) + 1);
      this.lastActivity.set(player.id, gameType);
    });
    
    // Record opponents
    team1Players.forEach(p1 => {
      const history = this.gameHistory.get(p1.id) || new Set();
      team2Players.forEach(p2 => history.add(p2.id));
      this.gameHistory.set(p1.id, history);
    });
    
    team2Players.forEach(p2 => {
      const history = this.gameHistory.get(p2.id) || new Set();
      team1Players.forEach(p1 => history.add(p1.id));
      this.gameHistory.set(p2.id, history);
    });
  }
  
  hasPlayedAgainst(playerId, opponentId) {
    const history = this.gameHistory.get(playerId);
    return history ? history.has(opponentId) : false;
  }
  
  getGameCount(playerId) {
    return this.gameCount.get(playerId) || 0;
  }
  
  getSitOutCount(playerId) {
    return this.sitOutCount.get(playerId) || 0;
  }
  
  recordSitOut(playerId) {
    this.sitOutCount.set(playerId, (this.sitOutCount.get(playerId) || 0) + 1);
  }
  
  recordRest(playerId) {
    this.restCount.set(playerId, (this.restCount.get(playerId) || 0) + 1);
  }
  
  clearRound() {
    this.assignments.clear();
  }
}

// Generate schedule for entire tournament
export function generateSchedule(tournament) {
  const validation = validateTournamentSetup(tournament);
  if (!validation.valid) {
    throw new Error(`Cannot generate schedule: ${validation.errors.join(', ')}`);
  }
  
  const { teams, settings } = tournament;
  const { rounds, gameTypes } = settings;
  const schedule = [];
  const tracker = new PlayerTracker();
  
  // Get all stations across all game types
  const allStations = [];
  gameTypes.forEach(gameType => {
    gameType.stations.forEach(station => {
      allStations.push({
        ...station,
        gameType: gameType.id,
        gameTypeName: gameType.name,
        playersPerTeam: gameType.playersPerTeam,
        partnerMode: gameType.partnerMode || 'rotating'
      });
    });
  });
  
  // Generate schedule for each round
  for (let round = 1; round <= rounds; round++) {
    const roundGames = [];
    const roundAssignments = new Map(); // Track assignments for this round
    
    // Shuffle stations for variety
    const shuffledStations = [...allStations].sort(() => Math.random() - 0.5);
    
    for (const station of shuffledStations) {
      // Find best matchup for this station
      const matchup = findBestMatchup(teams, station, tracker, roundAssignments, round);
      
      if (matchup) {
        const game = {
          id: uuidv4(),
          station: station.id,
          stationName: station.name,
          gameType: station.gameType,
          gameTypeName: station.gameTypeName,
          team1Players: matchup.team1Players.map(p => ({
            teamId: matchup.team1.id,
            teamName: matchup.team1.name,
            playerId: p.id,
            playerName: p.name
          })),
          team2Players: matchup.team2Players.map(p => ({
            teamId: matchup.team2.id,
            teamName: matchup.team2.name,
            playerId: p.id,
            playerName: p.name
          })),
          status: 'pending',
          result: null
        };
        
        roundGames.push(game);
        
        // Mark players as assigned
        matchup.team1Players.forEach(p => {
          tracker.assign(p.id, game.id);
          roundAssignments.set(p.id, true);
        });
        matchup.team2Players.forEach(p => {
          tracker.assign(p.id, game.id);
          roundAssignments.set(p.id, true);
        });
        
        // Record the game
        tracker.recordGame(matchup.team1Players, matchup.team2Players, station.gameType);
      }
    }
    
    // Track players who are resting
    teams.forEach(team => {
      team.players.filter(p => p.status === 'active').forEach(player => {
        if (!roundAssignments.has(player.id)) {
          tracker.recordRest(player.id);
        }
      });
    });
    
    // Clear assignments for next round
    tracker.clearRound();
    
    schedule.push({
      round,
      games: roundGames,
      timer: null
    });
  }
  
  return schedule;
}

// Find best matchup for a station
function findBestMatchup(teams, station, tracker, roundAssignments, round) {
  const availableTeams = teams.filter(team => {
    const availablePlayers = team.players.filter(p => 
      p.status === 'active' && 
      tracker.isAvailable(p.id) && 
      !roundAssignments.has(p.id)
    );
    return availablePlayers.length >= station.playersPerTeam;
  });
  
  if (availableTeams.length < 2) {
    return null;
  }
  
  let bestMatchup = null;
  let bestScore = -Infinity;
  
  // Try all possible team pairings
  for (let i = 0; i < availableTeams.length - 1; i++) {
    for (let j = i + 1; j < availableTeams.length; j++) {
      const team1 = availableTeams[i];
      const team2 = availableTeams[j];
      
      // Generate possible player groups for each team
      const team1Partnerships = generatePartnershipsWithTracker(team1, { 
        playersPerTeam: station.playersPerTeam,
        partnerMode: station.partnerMode
      }, round, tracker);
      
      const team2Partnerships = generatePartnershipsWithTracker(team2, { 
        playersPerTeam: station.playersPerTeam,
        partnerMode: station.partnerMode
      }, round, tracker);
      
      // Find best partnership combination
      for (const team1Players of team1Partnerships) {
        for (const team2Players of team2Partnerships) {
          // Check if all players are available
          const allAvailable = [...team1Players, ...team2Players].every(p => 
            tracker.isAvailable(p.id) && !roundAssignments.has(p.id)
          );
          
          if (!allAvailable) continue;
          
          // Calculate matchup score
          const score = calculateMatchupScore(
            team1Players, 
            team2Players, 
            tracker, 
            station.gameType
          );
          
          if (score > bestScore) {
            bestScore = score;
            bestMatchup = {
              team1,
              team2,
              team1Players,
              team2Players
            };
          }
        }
      }
    }
  }
  
  return bestMatchup;
}

// Calculate score for a potential matchup
function calculateMatchupScore(team1Players, team2Players, tracker, gameType) {
  let score = 0;
  
  // Favor players with fewer games
  const allPlayers = [...team1Players, ...team2Players];
  const avgGames = allPlayers.reduce((sum, p) => sum + tracker.getGameCount(p.id), 0) / allPlayers.length;
  score -= avgGames * 10; // Lower average is better
  
  // Penalize repeat matchups
  let repeatCount = 0;
  team1Players.forEach(p1 => {
    team2Players.forEach(p2 => {
      if (tracker.hasPlayedAgainst(p1.id, p2.id)) {
        repeatCount++;
      }
    });
  });
  score -= repeatCount * 20;
  
  // Favor variety in activities
  let varietyBonus = 0;
  allPlayers.forEach(p => {
    if (tracker.lastActivity.get(p.id) && tracker.lastActivity.get(p.id) !== gameType) {
      varietyBonus++;
    }
  });
  score += varietyBonus * 5;
  
  // Add some randomness to prevent predictable matchups
  score += Math.random() * 5;
  
  return score;
}

// Export all functions
export default {
  generateSchedule,
  validateTournamentSetup,
  migrateTournamentToV2
};
