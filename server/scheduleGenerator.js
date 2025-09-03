// Enhanced Schedule generation algorithm for multi-player games
import { v4 as uuidv4 } from 'uuid';

// Migrate old tournament format to new format
export function migrateTournamentToV2(tournament) {
  // If already version 2, check for creatorDeviceId -> adminDeviceId migration
  if (tournament.version === 2) {
    if (tournament.creatorDeviceId && !tournament.adminDeviceId) {
      // Migrate creatorDeviceId to adminDeviceId
      tournament.adminDeviceId = tournament.creatorDeviceId;
      
      // Ensure devices array includes the admin
      tournament.devices = tournament.devices || [];
      const hasAdminDevice = tournament.devices.some(d => d.id === tournament.adminDeviceId && d.role === 'ADMIN');
      if (!hasAdminDevice) {
        tournament.devices.push({
          id: tournament.adminDeviceId,
          name: tournament.creatorName || 'Admin Device',
          role: 'ADMIN'
        });
      }
      
      // Clean up old fields
      delete tournament.creatorDeviceId;
      delete tournament.creatorName;
    }
    return tournament;
  }
  
  // Migrate from version 1 to version 2
  const migrated = {
    ...tournament,
    version: 2,
    // Use adminDeviceId (new standard) from either old adminDeviceId or creatorDeviceId
    adminDeviceId: tournament.adminDeviceId || tournament.creatorDeviceId,
    devices: tournament.devices || (tournament.adminDeviceId || tournament.creatorDeviceId ? [{
      id: tournament.adminDeviceId || tournament.creatorDeviceId,
      name: tournament.creatorName || tournament.devices?.[0]?.name || 'Admin Device',
      role: 'ADMIN'
    }] : []),
    pendingRequests: tournament.pendingRequests || [],
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
  
  // Clean up old fields
  delete migrated.creatorDeviceId;
  delete migrated.creatorName;
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

// Enhanced tracker for comprehensive scheduling
class ComprehensiveTracker {
  constructor(tournament) {
    this.tournament = tournament;
    this.allPlayers = [];
    this.gameTypes = tournament.settings.gameTypes || [];
    
    // Collect all active players
    tournament.teams.forEach(team => {
      team.players.filter(p => p.status === 'active').forEach(player => {
        this.allPlayers.push({
          ...player,
          teamId: team.id,
          teamName: team.name
        });
      });
    });
    
    // Initialize tracking data
    this.gameTypeParticipation = new Map(); // playerId -> Map(gameType -> count)
    this.roundParticipation = new Map(); // playerId -> Set(roundNumber)
    this.restRounds = new Map(); // playerId -> Set(roundNumber)
    this.pairings = new Map(); // "playerId1,playerId2" -> count
    this.gameTypePairings = new Map(); // "gameType:playerId1,playerId2" -> count
    this.currentRoundAssignments = new Map(); // playerId -> gameId for current round
    this.sitOutCount = new Map(); // playerId -> count (due to team size constraints)
    this.violations = []; // Track rule violations for debugging
    
    // Initialize maps
    this.allPlayers.forEach(player => {
      this.gameTypeParticipation.set(player.id, new Map());
      this.roundParticipation.set(player.id, new Set());
      this.restRounds.set(player.id, new Set());
      this.sitOutCount.set(player.id, 0);
      
      // Initialize game type participation
      const gameTypeMap = new Map();
      this.gameTypes.forEach(gameType => {
        gameTypeMap.set(gameType.id, 0);
      });
      this.gameTypeParticipation.set(player.id, gameTypeMap);
    });
  }
  
  // Get players who need to play a specific game type
  getPlayersNeedingGameType(gameType) {
    const minPlays = Math.min(...this.allPlayers.map(p => 
      this.gameTypeParticipation.get(p.id).get(gameType) || 0
    ));
    
    return this.allPlayers.filter(p => 
      (this.gameTypeParticipation.get(p.id).get(gameType) || 0) === minPlays
    );
  }
  
  // Get players who were resting in the previous round
  getRestingPlayers(currentRound) {
    if (currentRound <= 1) return [];
    
    return this.allPlayers.filter(player => 
      this.restRounds.get(player.id).has(currentRound - 1)
    );
  }
  
  // Check if players are available for current round
  isPlayerAvailable(playerId) {
    return !this.currentRoundAssignments.has(playerId);
  }
  
  // Get pairing frequency
  getPairingCount(playerId1, playerId2) {
    const key = [playerId1, playerId2].sort().join(',');
    return this.pairings.get(key) || 0;
  }
  
  // Get game-specific pairing frequency
  getGameTypePairingCount(gameType, playerId1, playerId2) {
    const key = `${gameType}:${[playerId1, playerId2].sort().join(',')}`;
    return this.gameTypePairings.get(key) || 0;
  }
  
  // Record a game assignment
  recordGame(game, round) {
    const allPlayers = [...game.team1Players, ...game.team2Players];
    
    // Record round participation
    allPlayers.forEach(player => {
      this.roundParticipation.get(player.playerId).add(round);
      this.gameTypeParticipation.get(player.playerId).set(
        game.gameType,
        (this.gameTypeParticipation.get(player.playerId).get(game.gameType) || 0) + 1
      );
      this.currentRoundAssignments.set(player.playerId, game.id);
    });
    
    // Record pairings (all combinations within each team, and cross-team)
    const allPlayerIds = allPlayers.map(p => p.playerId);
    
    // Record team pairings (teammates)
    [game.team1Players, game.team2Players].forEach(teamPlayers => {
      for (let i = 0; i < teamPlayers.length; i++) {
        for (let j = i + 1; j < teamPlayers.length; j++) {
          const key = [teamPlayers[i].playerId, teamPlayers[j].playerId].sort().join(',');
          const gameTypeKey = `${game.gameType}:${key}`;
          this.pairings.set(key, (this.pairings.get(key) || 0) + 1);
          this.gameTypePairings.set(gameTypeKey, (this.gameTypePairings.get(gameTypeKey) || 0) + 1);
        }
      }
    });
    
    // Record opponent pairings (cross-team)
    game.team1Players.forEach(t1Player => {
      game.team2Players.forEach(t2Player => {
        const key = [t1Player.playerId, t2Player.playerId].sort().join(',');
        const gameTypeKey = `${game.gameType}:${key}`;
        this.pairings.set(key, (this.pairings.get(key) || 0) + 1);
        this.gameTypePairings.set(gameTypeKey, (this.gameTypePairings.get(gameTypeKey) || 0) + 1);
      });
    });
  }
  
  // Record players who are resting this round
  recordRest(playerId, round) {
    this.restRounds.get(playerId).add(round);
  }
  
  // Record sit-out (due to team size constraints)
  recordSitOut(playerId) {
    this.sitOutCount.set(playerId, (this.sitOutCount.get(playerId) || 0) + 1);
  }
  
  // Clear current round assignments
  clearRound() {
    this.currentRoundAssignments.clear();
  }
  
  // Add a rule violation for debugging
  addViolation(type, details) {
    this.violations.push({
      type,
      details,
      round: details.round || 'unknown'
    });
  }
  
  // Get comprehensive player statistics
  getPlayerStats(playerId) {
    const player = this.allPlayers.find(p => p.id === playerId);
    if (!player) return null;
    
    return {
      name: player.name,
      teamName: player.teamName,
      gameTypeParticipation: Object.fromEntries(this.gameTypeParticipation.get(playerId)),
      totalGames: Array.from(this.gameTypeParticipation.get(playerId).values()).reduce((a, b) => a + b, 0),
      restRounds: Array.from(this.restRounds.get(playerId)),
      sitOutCount: this.sitOutCount.get(playerId)
    };
  }
  
  // Get debugging summary
  getViolationSummary() {
    if (this.violations.length === 0) {
      return "✅ All scheduling rules were successfully followed!";
    }
    
    const summary = [];
    summary.push(`⚠️ Schedule generated with ${this.violations.length} rule violation(s):`);
    summary.push('');
    
    // Group violations by type
    const groupedViolations = {};
    this.violations.forEach(violation => {
      if (!groupedViolations[violation.type]) {
        groupedViolations[violation.type] = [];
      }
      groupedViolations[violation.type].push(violation);
    });
    
    // Format violations
    Object.entries(groupedViolations).forEach(([type, violations]) => {
      summary.push(`${type.toUpperCase().replace('_', ' ')}:`);
      violations.forEach(violation => {
        summary.push(`  • ${violation.details.description}`);
      });
      summary.push('');
    });
    
    return summary.join('\n');
  }
}

// Enhanced partnership generation with comprehensive tracking
function generateOptimalPartnerships(team, gameType, round, tracker) {
  const activePlayers = team.players.filter(p => p.status === 'active');
  const playersPerPartnership = gameType.playersPerTeam;
  const availablePlayers = activePlayers.filter(p => tracker.isPlayerAvailable(p.id));
  
  if (availablePlayers.length === 0) {
    return [];
  }
  
  // Get players who need this game type most
  const playersNeedingGame = tracker.getPlayersNeedingGameType(gameType.id)
    .filter(p => p.teamId === team.id && tracker.isPlayerAvailable(p.id));
  
  // Get players who were resting last round
  const restingPlayers = tracker.getRestingPlayers(round)
    .filter(p => p.teamId === team.id && tracker.isPlayerAvailable(p.id));
  
  // Priority order for player selection:
  // 1. Players who need this game type AND were resting
  // 2. Players who were resting (regardless of game type need)
  // 3. Players who need this game type
  // 4. All other available players
  
  const priorityGroups = [
    playersNeedingGame.filter(p => restingPlayers.some(rp => rp.id === p.id)),
    restingPlayers.filter(p => !playersNeedingGame.some(np => np.id === p.id)),
    playersNeedingGame.filter(p => !restingPlayers.some(rp => rp.id === p.id)),
    availablePlayers.filter(p => 
      !playersNeedingGame.some(np => np.id === p.id) &&
      !restingPlayers.some(rp => rp.id === p.id)
    )
  ];
  
  const orderedPlayers = [];
  priorityGroups.forEach(group => {
    // Within each group, sort by total game count (ascending) and sit-out count (descending)
    group.sort((a, b) => {
      const aGameCount = Array.from(tracker.gameTypeParticipation.get(a.id).values()).reduce((sum, val) => sum + val, 0);
      const bGameCount = Array.from(tracker.gameTypeParticipation.get(b.id).values()).reduce((sum, val) => sum + val, 0);
      const aSitOut = tracker.sitOutCount.get(a.id) || 0;
      const bSitOut = tracker.sitOutCount.get(b.id) || 0;
      
      // Primary: fewer total games played
      if (aGameCount !== bGameCount) {
        return aGameCount - bGameCount;
      }
      // Secondary: more sit-outs (those who sat out more should play more)
      if (aSitOut !== bSitOut) {
        return bSitOut - aSitOut;
      }
      // Tertiary: add deterministic variety
      return a.id.localeCompare(b.id);
    });
    
    orderedPlayers.push(...group);
  });
  
  // Create partnerships, preferring optimal pairings
  const partnerships = [];
  const usedPlayers = new Set();
  
  if (gameType.partnerMode === 'fixed') {
    // Fixed partnerships - use deterministic pairing
    for (let i = 0; i < orderedPlayers.length; i += playersPerPartnership) {
      const partnership = [];
      for (let j = 0; j < playersPerPartnership && i + j < orderedPlayers.length; j++) {
        if (!usedPlayers.has(orderedPlayers[i + j].id)) {
          partnership.push(orderedPlayers[i + j]);
          usedPlayers.add(orderedPlayers[i + j].id);
        }
      }
      if (partnership.length === playersPerPartnership) {
        partnerships.push(partnership);
      }
    }
  } else {
    // Rotating partnerships - create optimal combinations
    while (orderedPlayers.filter(p => !usedPlayers.has(p.id)).length >= playersPerPartnership) {
      const availableForPartnership = orderedPlayers.filter(p => !usedPlayers.has(p.id));
      
      if (availableForPartnership.length < playersPerPartnership) break;
      
      // Find best partnership combination (minimizing existing pairings)
      const partnership = [];
      partnership.push(availableForPartnership[0]); // Start with highest priority player
      usedPlayers.add(availableForPartnership[0].id);
      
      // Add remaining players for this partnership, minimizing existing pairings
      for (let i = 1; i < playersPerPartnership; i++) {
        const candidates = availableForPartnership.filter(p => !usedPlayers.has(p.id));
        if (candidates.length === 0) break;
        
        // Find candidate with least pairing history with current partnership
        let bestCandidate = candidates[0];
        let lowestPairingScore = Infinity;
        
        candidates.forEach(candidate => {
          let pairingScore = 0;
          partnership.forEach(partner => {
            pairingScore += tracker.getPairingCount(partner.id, candidate.id);
            pairingScore += tracker.getGameTypePairingCount(gameType.id, partner.id, candidate.id) * 2; // Weight game-specific pairings more
          });
          
          if (pairingScore < lowestPairingScore) {
            lowestPairingScore = pairingScore;
            bestCandidate = candidate;
          }
        });
        
        partnership.push(bestCandidate);
        usedPlayers.add(bestCandidate.id);
      }
      
      if (partnership.length === playersPerPartnership) {
        partnerships.push(partnership);
      }
    }
  }
  
  // Record leftover players as sitting out
  availablePlayers.forEach(player => {
    if (!usedPlayers.has(player.id)) {
      tracker.recordSitOut(player.id);
    }
  });
  
  return partnerships;
}

// Find optimal matchup between teams with comprehensive rule checking
function findOptimalMatchup(teams, station, tracker, round) {
  const gameType = tracker.gameTypes.find(gt => gt.id === station.gameType);
  if (!gameType) return null;
  
  // Get teams that can field a partnership for this station
  const eligibleTeams = [];
  
  teams.forEach(team => {
    const partnerships = generateOptimalPartnerships(team, gameType, round, tracker);
    if (partnerships.length > 0) {
      eligibleTeams.push({
        team,
        partnerships
      });
    }
  });
  
  if (eligibleTeams.length < 2) {
    return null;
  }
  
  let bestMatchup = null;
  let bestScore = -Infinity;
  
  // Try all possible team combinations
  for (let i = 0; i < eligibleTeams.length - 1; i++) {
    for (let j = i + 1; j < eligibleTeams.length; j++) {
      const team1Info = eligibleTeams[i];
      const team2Info = eligibleTeams[j];
      
      // Try all partnership combinations
      team1Info.partnerships.forEach(team1Players => {
        team2Info.partnerships.forEach(team2Players => {
          // Verify all players are still available
          const allPlayers = [...team1Players, ...team2Players];
          if (!allPlayers.every(p => tracker.isPlayerAvailable(p.id))) {
            return;
          }
          
          const score = calculateComprehensiveScore(
            team1Players, 
            team2Players, 
            tracker, 
            gameType,
            round
          );
          
          if (score > bestScore) {
            bestScore = score;
            bestMatchup = {
              team1: team1Info.team,
              team2: team2Info.team,
              team1Players,
              team2Players,
              score
            };
          }
        });
      });
    }
  }
  
  return bestMatchup;
}

// Comprehensive scoring function for matchup quality
function calculateComprehensiveScore(team1Players, team2Players, tracker, gameType, round) {
  let score = 100; // Start with base score
  
  const allPlayers = [...team1Players, ...team2Players];
  
  // RULE 1: Prioritize players who need this game type
  let gameTypeNeedScore = 0;
  allPlayers.forEach(player => {
    const currentCount = tracker.gameTypeParticipation.get(player.id).get(gameType.id) || 0;
    const minCount = Math.min(...tracker.allPlayers.map(p => 
      tracker.gameTypeParticipation.get(p.id).get(gameType.id) || 0
    ));
    
    if (currentCount === minCount) {
      gameTypeNeedScore += 50; // High bonus for players who need this game type
    } else {
      gameTypeNeedScore -= (currentCount - minCount) * 25; // Penalty for players who already have more
    }
  });
  score += gameTypeNeedScore;
  
  // RULE 2: Prioritize players who were resting last round
  const restingPlayers = tracker.getRestingPlayers(round);
  let restBonusScore = 0;
  allPlayers.forEach(player => {
    if (restingPlayers.some(rp => rp.id === player.id)) {
      restBonusScore += 40; // High bonus for previously resting players
    } else if (tracker.roundParticipation.get(player.id).has(round - 1)) {
      restBonusScore -= 20; // Penalty for consecutive play
    }
  });
  score += restBonusScore;
  
  // RULE 3: Minimize pairing repetition
  let pairingPenalty = 0;
  
  // Check all pairings within this matchup
  const allPairings = [];
  
  // Team 1 internal pairings
  for (let i = 0; i < team1Players.length; i++) {
    for (let j = i + 1; j < team1Players.length; j++) {
      allPairings.push([team1Players[i].id, team1Players[j].id]);
    }
  }
  
  // Team 2 internal pairings
  for (let i = 0; i < team2Players.length; i++) {
    for (let j = i + 1; j < team2Players.length; j++) {
      allPairings.push([team2Players[i].id, team2Players[j].id]);
    }
  }
  
  // Cross-team pairings (opponents)
  team1Players.forEach(t1Player => {
    team2Players.forEach(t2Player => {
      allPairings.push([t1Player.id, t2Player.id]);
    });
  });
  
  // Calculate pairing penalties
  allPairings.forEach(([p1, p2]) => {
    const generalCount = tracker.getPairingCount(p1, p2);
    const gameSpecificCount = tracker.getGameTypePairingCount(gameType.id, p1, p2);
    
    // Heavy penalty for game-specific repeats
    if (gameSpecificCount > 0) {
      pairingPenalty += gameSpecificCount * 100;
    }
    // Moderate penalty for general pairing repeats
    if (generalCount > 0) {
      pairingPenalty += generalCount * 30;
    }
  });
  
  score -= pairingPenalty;
  
  // Bonus for balanced participation
  const totalGames = allPlayers.map(p => 
    Array.from(tracker.gameTypeParticipation.get(p.id).values()).reduce((a, b) => a + b, 0)
  );
  const avgGames = totalGames.reduce((a, b) => a + b, 0) / totalGames.length;
  const gameVariance = totalGames.reduce((sum, count) => sum + Math.pow(count - avgGames, 2), 0) / totalGames.length;
  score -= gameVariance * 10; // Prefer balanced participation
  
  // Bonus for players with high sit-out counts
  allPlayers.forEach(player => {
    const sitOutCount = tracker.sitOutCount.get(player.id) || 0;
    score += sitOutCount * 15;
  });
  
  // Small random component to break ties
  score += Math.random() * 0.1;
  
  return score;
}

// Generate a single round with comprehensive rule enforcement
function generateOptimalRound(teams, gameTypes, round, tracker) {
  const allStations = [];
  
  // Collect all stations with game type info
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
  
  const roundGames = [];
  
  // Prioritize stations for game types that players need most
  const gameTypeNeedScores = gameTypes.map(gameType => {
    const playersNeeding = tracker.getPlayersNeedingGameType(gameType.id).length;
    const totalStations = gameType.stations.length;
    return {
      gameType: gameType.id,
      needScore: playersNeeding,
      stations: gameType.stations.map(station => ({
        ...station,
        gameType: gameType.id,
        gameTypeName: gameType.name,
        playersPerTeam: gameType.playersPerTeam,
        partnerMode: gameType.partnerMode || 'rotating'
      }))
    };
  });
  
  // Sort game types by need (descending)
  gameTypeNeedScores.sort((a, b) => b.needScore - a.needScore);
  
  // Schedule stations in order of need
  const orderedStations = [];
  gameTypeNeedScores.forEach(gtInfo => {
    orderedStations.push(...gtInfo.stations);
  });
  
  // Try to fill each station
  orderedStations.forEach(station => {
    if (roundGames.length >= allStations.length) return; // Don't exceed station capacity
    
    const matchup = findOptimalMatchup(teams, station, tracker, round);
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
      tracker.recordGame(game, round);
      
      // Check for rule violations and record them
      checkRuleViolations(game, round, tracker);
    }
  });
  
  // Mark players who are resting this round
  teams.forEach(team => {
    team.players.filter(p => p.status === 'active').forEach(player => {
      if (!tracker.isPlayerAvailable(player.id)) {
        // Player is playing
      } else {
        // Player is resting
        tracker.recordRest(player.id, round);
      }
    });
  });
  
  return roundGames;
}

// Check for rule violations and record them for debugging
function checkRuleViolations(game, round, tracker) {
  const allPlayers = [...game.team1Players, ...game.team2Players];
  
  // Check Rule 1: Game type distribution
  const gameTypeCounts = {};
  tracker.allPlayers.forEach(player => {
    const playerGameTypes = tracker.gameTypeParticipation.get(player.playerId);
    if (playerGameTypes) {
      tracker.gameTypes.forEach(gt => {
        if (!gameTypeCounts[gt.id]) gameTypeCounts[gt.id] = [];
        gameTypeCounts[gt.id].push(playerGameTypes.get(gt.id) || 0);
      });
    }
  });
  
  // Check if anyone is playing a game type for the second time while others haven't played it once
  tracker.gameTypes.forEach(gt => {
    const counts = gameTypeCounts[gt.id] || [];
    const minCount = Math.min(...counts);
    const maxCount = Math.max(...counts);
    
    if (maxCount > minCount + 1) {
      // Someone is playing their second game of this type while others haven't played once
      const playersWithMax = tracker.allPlayers.filter(p => 
        (tracker.gameTypeParticipation.get(p.id).get(gt.id) || 0) === maxCount
      );
      const playersWithMin = tracker.allPlayers.filter(p => 
        (tracker.gameTypeParticipation.get(p.id).get(gt.id) || 0) === minCount
      );
      
      if (game.gameType === gt.id) {
        const gameTypePlayers = allPlayers.filter(gp => 
          playersWithMax.some(pwm => pwm.id === gp.playerId)
        );
        
        if (gameTypePlayers.length > 0) {
          tracker.addViolation('game_type_distribution', {
            round,
            description: `Round ${round}: ${gameTypePlayers.map(p => p.playerName).join(', ')} playing ${gt.name} for ${maxCount + 1} time(s) while others have only played ${minCount} time(s)`,
            gameType: gt.name,
            players: gameTypePlayers.map(p => p.playerName)
          });
        }
      }
    }
  });
  
  // Check Rule 2: Consecutive play vs rest priority
  if (round > 1) {
    const playersWhoPlayedLastRound = allPlayers.filter(player => 
      tracker.roundParticipation.get(player.playerId).has(round - 1)
    );
    const playersWhoRestedLastRound = tracker.getRestingPlayers(round);
    const availableRestedPlayers = playersWhoRestedLastRound.filter(p => 
      tracker.allPlayers.some(player => player.id === p.id)
    );
    
    if (playersWhoPlayedLastRound.length > 0 && availableRestedPlayers.length > 0) {
      // Check if we could have used rested players instead
      playersWhoPlayedLastRound.forEach(player => {
        const similarRestedPlayer = availableRestedPlayers.find(rp => 
          rp.teamId === player.teamId
        );
        if (similarRestedPlayer) {
          tracker.addViolation('rest_priority', {
            round,
            description: `Round ${round}: ${player.playerName} plays consecutive rounds while ${similarRestedPlayer.name} from same team was available after resting`,
            consecutivePlayer: player.playerName,
            availableRestedPlayer: similarRestedPlayer.name,
            team: player.teamName
          });
        }
      });
    }
  }
  
  // Check Rule 3: Pairing uniqueness
  const allPairings = [];
  
  // Collect all pairings in this game
  for (let i = 0; i < game.team1Players.length; i++) {
    for (let j = i + 1; j < game.team1Players.length; j++) {
      allPairings.push({
        players: [game.team1Players[i], game.team1Players[j]],
        type: 'teammate'
      });
    }
  }
  
  for (let i = 0; i < game.team2Players.length; i++) {
    for (let j = i + 1; j < game.team2Players.length; j++) {
      allPairings.push({
        players: [game.team2Players[i], game.team2Players[j]],
        type: 'teammate'
      });
    }
  }
  
  game.team1Players.forEach(t1p => {
    game.team2Players.forEach(t2p => {
      allPairings.push({
        players: [t1p, t2p],
        type: 'opponent'
      });
    });
  });
  
  // Check for repeat pairings
  allPairings.forEach(pairing => {
    const [p1, p2] = pairing.players;
    const generalCount = tracker.getPairingCount(p1.playerId, p2.playerId);
    const gameTypeCount = tracker.getGameTypePairingCount(game.gameType, p1.playerId, p2.playerId);
    
    if (gameTypeCount > 0) {
      tracker.addViolation('pairing_uniqueness', {
        round,
        description: `Round ${round}: ${p1.playerName} and ${p2.playerName} paired as ${pairing.type}s in ${game.gameTypeName} for the ${gameTypeCount + 1} time`,
        player1: p1.playerName,
        player2: p2.playerName,
        gameType: game.gameTypeName,
        pairingType: pairing.type,
        repetitionCount: gameTypeCount + 1
      });
    } else if (generalCount > 0) {
      tracker.addViolation('general_pairing', {
        round,
        description: `Round ${round}: ${p1.playerName} and ${p2.playerName} paired together for the ${generalCount + 1} time (across different games)`,
        player1: p1.playerName,
        player2: p2.playerName,
        repetitionCount: generalCount + 1
      });
    }
  });
}

// Enhanced schedule generation with comprehensive rule enforcement
export function generateSchedule(tournament) {
  const validation = validateTournamentSetup(tournament);
  if (!validation.valid) {
    throw new Error(`Cannot generate schedule: ${validation.errors.join(', ')}`);
  }
  
  const { teams, settings } = tournament;
  const { rounds, gameTypes } = settings;
  const tracker = new ComprehensiveTracker(tournament);
  const schedule = [];
  
  console.log('\n🎯 Starting comprehensive tournament scheduling...');
  console.log(`Teams: ${teams.length}, Players per team: ${teams[0].players.filter(p => p.status === 'active').length}`);
  console.log(`Game types: ${gameTypes.map(gt => `${gt.name} (${gt.stations.length} stations)`).join(', ')}`);
  console.log(`Rounds: ${rounds}\n`);
  
  // Generate each round with comprehensive optimization
  for (let round = 1; round <= rounds; round++) {
    console.log(`🎲 Generating round ${round}...`);
    
    const roundGames = generateOptimalRound(teams, gameTypes, round, tracker);
    
    // Clear round assignments for next iteration
    tracker.clearRound();
    
    schedule.push({
      round,
      games: roundGames,
      timer: null
    });
    
    console.log(`   Generated ${roundGames.length} games for round ${round}`);
  }
  
  // Output comprehensive debugging information
  const violationSummary = tracker.getViolationSummary();
  console.log('\n' + '='.repeat(60));
  console.log('📊 SCHEDULING REPORT');
  console.log('='.repeat(60));
  console.log(violationSummary);
  
  // Player participation summary
  console.log('\n👥 PLAYER PARTICIPATION SUMMARY:');
  console.log('-'.repeat(40));
  tracker.allPlayers.forEach(player => {
    const stats = tracker.getPlayerStats(player.id);
    const gameTypeList = Object.entries(stats.gameTypeParticipation)
      .map(([gameType, count]) => `${gameType}: ${count}`)
      .join(', ');
    console.log(`${stats.name} (${stats.teamName}): Total: ${stats.totalGames}, Games: [${gameTypeList}], Rests: ${stats.restRounds.length}, Sit-outs: ${stats.sitOutCount}`);
  });
  
  console.log('\n' + '='.repeat(60));
  
  return schedule;
}

// Legacy compatibility functions

// Generate partnerships for multi-player games (legacy)
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

// Enhanced partnership generation that considers sit-out fairness (legacy)
function generatePartnershipsWithTracker(team, gameType, round, tracker) {
  // Use the new comprehensive system
  const comprehensiveTracker = new ComprehensiveTracker({
    teams: [team],
    settings: { gameTypes: [gameType] }
  });
  
  return generateOptimalPartnerships(team, gameType, round, comprehensiveTracker);
}

// Legacy PlayerTracker for backward compatibility
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

// Legacy find best matchup function (for backward compatibility)
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

// Calculate score for a potential matchup (legacy)
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
