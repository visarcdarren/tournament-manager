# Tournament Sharing and Sync Improvements

## Overview
This document outlines the improvements made to address issues with tournament sharing and viewer synchronization.

## Issues Addressed

### 1. Restricted Sharing Until Schedule is Complete ✅
**Problem**: Users could share tournaments before they had schedules, resulting in empty views for viewers.

**Solution**:
- **Client Side**: Added validation in `TournamentSetup.jsx` to disable "Make Public" button until schedule exists
- **Server Side**: Added server-side validation in `/api/tournament/:id/toggle-public` endpoint to prevent sharing without schedule
- **UI Enhancement**: Added warning message explaining why sharing is restricted

**Files Modified**:
- `client/src/components/tournament/TournamentSetup.jsx`
- `server/server.js`
- `client/src/components/tournament/TournamentView.jsx`

### 2. Default View for Viewers ✅
**Problem**: Viewers would start on setup page instead of seeing meaningful content.

**Solution**:
- Modified tab auto-navigation logic in `TournamentView.jsx`
- Viewers now automatically navigate to Schedule tab when tournament has a schedule (even in setup state)
- Only admins see Setup tab by default

**Files Modified**:
- `client/src/components/tournament/TournamentView.jsx`

### 3. Auto-Navigation to Live Tab When Tournament Starts ✅
**Problem**: When tournament started, all viewers should automatically move to live tab.

**Solution**:
- Enhanced SSE event handling for 'tournament-started' event
- All users (including viewers) automatically navigate to live tab when tournament becomes active
- Reset manual tab change flag to ensure navigation happens

**Files Modified**:
- `client/src/components/tournament/TournamentView.jsx`

### 4. Live Tab Updates When Rounds Complete ✅
**Problem**: When rounds completed, viewers' live tabs didn't update to show current round.

**Solution**:
- **Server Side**: Added automatic round advancement when all games in a round are scored
- **Server Side**: Added new 'round-completed' SSE event with detailed data
- **Client Side**: Enhanced event handling to update viewers to current round
- **Backend**: Modified currentState to include currentRound tracking

**Files Modified**:
- `server/server.js`
- `client/src/components/tournament/TournamentView.jsx`
- `client/src/utils/tournament.js` (getCurrentRound utility)

## Technical Details

### Server Changes

#### 1. Sharing Restriction Endpoint
```javascript
// Toggle tournament public/private status (admin only)
app.post('/api/tournament/:id/toggle-public', authenticateAdmin, async (req, res) => {
  const tournament = req.tournament;
  
  // If making public, check if schedule exists
  if (!tournament.isPublic && (!tournament.schedule || tournament.schedule.length === 0)) {
    return res.status(400).json({ 
      error: 'Schedule must be generated before making tournament public',
      details: 'Viewers need a schedule to view tournament progress meaningfully.' 
    });
  }
  // ... rest of logic
});
```

#### 2. Round Completion Detection
```javascript
// In game scoring endpoint
const roundGamesComplete = round.games.every(game => game.result);

// Update tournament status and current round
if (allGamesComplete && tournament.currentState.status !== 'completed') {
  tournament.currentState = {
    ...tournament.currentState,
    status: 'completed'
  };
} else if (roundGamesComplete && !allGamesComplete) {
  // Round completed but tournament not finished - advance to next round
  const nextRound = tournament.schedule.find(r => 
    r.round > round.round && r.games.some(g => !g.result)
  );
  if (nextRound) {
    tournament.currentState = {
      ...tournament.currentState,
      currentRound: nextRound.round
    };
  }
}
```

#### 3. Enhanced SSE Events
```javascript
// If round just completed, broadcast round completion event
if (roundGamesComplete) {
  broadcastToTournament(tournament.id, {
    type: 'round-completed',
    data: { 
      completedRound: round.round, 
      newCurrentRound: tournament.currentState?.currentRound,
      tournament 
    }
  });
}
```

### Client Changes

#### 1. Viewer Default Navigation
```javascript
// Update active tab based on tournament state (but not if user manually changed it)
useEffect(() => {
  if (!tournament || manualTabChangeRef.current) {
    return
  }
  
  // Only show completion screen if tournament is actually complete
  if (tournament.currentState?.status === 'completed' || (tournament.schedule?.length > 0 && isTournamentComplete(tournament))) {
    setActiveTab('completion')
  } else if (tournament.currentState?.status === 'active') {
    setActiveTab('live')
  } else if (tournament.schedule?.length > 0 && !isAdmin) {
    // For viewers, go to schedule tab if schedule exists (even in setup state)
    setActiveTab('schedule')
  } else if (tournament.teams?.length >= 2) {
    setActiveTab('teams')
  } else {
    setActiveTab('setup')
  }
}, [tournament, isAdmin])
```

#### 2. Round Completion Event Handling
```javascript
'round-completed': (data) => {
  // Update tournament data
  tournamentStore.setTournament(data.tournament)
  
  // For viewers on live tab, ensure they see the current round
  if (!isAdmin && activeTab === 'live' && !manualTabChangeRef.current) {
    // The LiveTournament component will automatically show the new current round
    // because it gets updated tournament data with new currentState.currentRound
    console.log(`Round ${data.completedRound} completed, advancing to round ${data.newCurrentRound}`)
  }
  
  toast({
    title: 'Round Complete!',
    description: `Round ${data.completedRound} completed${data.newCurrentRound ? ` - now on Round ${data.newCurrentRound}` : ''}`
  })
},
```

#### 3. UI Improvements for Sharing
```jsx
<Button 
  variant="outline" 
  onClick={onTogglePublicStatus} 
  size="sm"
  disabled={!tournament.isPublic && (!tournament.schedule || tournament.schedule.length === 0)}
  title={!tournament.isPublic && (!tournament.schedule || tournament.schedule.length === 0) ? "Schedule must be generated before making tournament public" : ""}
>
  {/* Button content */}
</Button>

{!tournament.isPublic && (!tournament.schedule || tournament.schedule.length === 0) && (
  <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
    ⚠️ Generate a schedule before making the tournament public so viewers have something meaningful to see.
  </p>
)}
```

## Testing Scenarios

### 1. Sharing Restriction
- ✅ Create tournament without schedule
- ✅ Try to make public - should be disabled/fail
- ✅ Generate schedule
- ✅ Make public should now work

### 2. Viewer Default Navigation
- ✅ Share tournament with schedule in setup state
- ✅ Viewer accesses link - should see Schedule tab
- ✅ Admin accesses same tournament - should see appropriate tab for state

### 3. Tournament Start Auto-Navigation
- ✅ Have viewers on various tabs
- ✅ Admin starts tournament
- ✅ All viewers should auto-navigate to Live tab

### 4. Round Completion Auto-Update
- ✅ Have viewers on Live tab
- ✅ Admin completes all games in a round
- ✅ Viewers should see Live tab update to show next current round automatically
- ✅ Toast notification should show round completion

## Benefits

1. **Better User Experience**: Viewers always see relevant content
2. **Automatic Synchronization**: No manual refresh needed to stay current
3. **Prevents Confusion**: Sharing restricted until tournament is ready
4. **Real-time Updates**: Viewers automatically follow tournament progress
5. **Mobile Friendly**: Works seamlessly on mobile devices

## Future Enhancements

1. **Viewer Count**: Show number of active viewers to admin
2. **Viewer Notifications**: More granular notifications for viewers
3. **Offline Support**: Handle connection drops gracefully
4. **Advanced Permissions**: More granular viewer permissions
