import React from 'react'

const TournamentOverviewPage = ({ tournament, allPlayers }) => {
  const getGameTypeStations = () => {
    if (!tournament.settings?.gameTypes) return []
    
    const stations = []
    tournament.settings.gameTypes.forEach(gameType => {
      gameType.stations?.forEach(station => {
        stations.push({
          ...station,
          gameType: gameType.name,
          playersPerTeam: gameType.playersPerTeam
        })
      })
    })
    return stations
  }

  const getRoundSummary = () => {
    if (!tournament.schedule) return { totalRounds: 0, totalGames: 0 }
    
    return {
      totalRounds: tournament.schedule.length,
      totalGames: tournament.schedule.reduce((sum, round) => sum + round.games.length, 0),
      gamesPerRound: tournament.schedule.map(round => round.games.length)
    }
  }

  const getTeamSummary = () => {
    return tournament.teams.map(team => ({
      name: team.name,
      totalPlayers: team.players.length,
      activePlayers: team.players.filter(p => p.status === 'active').length,
      droppedPlayers: team.players.filter(p => p.status !== 'active').length
    }))
  }

  const stations = getGameTypeStations()
  const summary = getRoundSummary()
  const teamSummary = getTeamSummary()

  return (
    <>
      <div className="print-header">
        <div className="print-title">{tournament.name}</div>
        <div className="print-subtitle">Tournament Overview</div>
        <div className="print-date">
          Generated: {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8">
        {/* Left Column */}
        <div>
          {/* Tournament Details */}
          <div className="mb-6">
            <h2 className="text-lg font-bold mb-3 border-b border-gray-300 pb-1">
              Tournament Details
            </h2>
            <div className="space-y-1 text-sm">
              <div><strong>Status:</strong> {tournament.currentState?.status || 'Setup'}</div>
              <div><strong>Total Rounds:</strong> {summary.totalRounds}</div>
              <div><strong>Total Games:</strong> {summary.totalGames}</div>
              <div><strong>Teams:</strong> {tournament.teams.length}</div>
              <div><strong>Active Players:</strong> {allPlayers.length}</div>
              <div><strong>Created:</strong> {new Date(tournament.created).toLocaleDateString()}</div>
            </div>
          </div>

          {/* Game Types & Stations */}
          <div className="mb-6">
            <h2 className="text-lg font-bold mb-3 border-b border-gray-300 pb-1">
              Game Types & Stations
            </h2>
            {tournament.settings?.gameTypes?.map(gameType => (
              <div key={gameType.id} className="mb-3">
                <div className="font-semibold text-sm">{gameType.name}</div>
                <div className="text-xs text-gray-600 mb-1">
                  {gameType.playersPerTeam}v{gameType.playersPerTeam} • 
                  {gameType.partnerMode === 'fixed' ? ' Fixed Partners' : ' Rotating Partners'}
                </div>
                <div className="ml-2">
                  {gameType.stations?.map(station => (
                    <div key={station.id} className="text-xs">
                      • {station.name}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="mb-6">
            <h2 className="text-lg font-bold mb-3 border-b border-gray-300 pb-1">
              Reading the Schedules
            </h2>
            <div className="text-xs space-y-1">
              <div><strong>Round:</strong> The round number (all games in a round happen simultaneously)</div>
              <div><strong>Station:</strong> Where the game takes place</div>
              <div><strong>Game Type:</strong> What game is being played</div>
              <div><strong>Teammates:</strong> Who you're playing with (if applicable)</div>
              <div><strong>Opponents:</strong> Who you're playing against</div>
              <div><strong>Rest:</strong> Rounds where you don't play</div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div>
          {/* Team Rosters */}
          <div className="mb-6">
            <h2 className="text-lg font-bold mb-3 border-b border-gray-300 pb-1">
              Team Rosters
            </h2>
            {tournament.teams.map(team => {
              const activePlayers = team.players.filter(p => p.status === 'active')
              const droppedPlayers = team.players.filter(p => p.status !== 'active')
              
              return (
                <div key={team.id} className="mb-4">
                  <div className="font-semibold text-sm mb-1">
                    {team.name} 
                    <span className="font-normal text-gray-600 ml-1">
                      ({activePlayers.length} active{droppedPlayers.length > 0 ? `, ${droppedPlayers.length} dropped` : ''})
                    </span>
                  </div>
                  <div className="ml-2 text-xs">
                    {activePlayers.map(player => (
                      <div key={player.id} className="text-black">
                        • {player.name}
                      </div>
                    ))}
                    {droppedPlayers.map(player => (
                      <div key={player.id} className="text-gray-500 line-through">
                        • {player.name} (dropped)
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Round Summary */}
          {summary.totalRounds > 0 && (
            <div className="mb-6">
              <h2 className="text-lg font-bold mb-3 border-b border-gray-300 pb-1">
                Round Summary
              </h2>
              <div className="text-xs space-y-1">
                {tournament.schedule.map(round => (
                  <div key={round.round}>
                    <strong>Round {round.round}:</strong> {round.games.length} games
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Station List */}
          <div>
            <h2 className="text-lg font-bold mb-3 border-b border-gray-300 pb-1">
              All Stations
            </h2>
            <div className="text-xs space-y-1">
              {stations.map(station => (
                <div key={station.id}>
                  <strong>{station.name}</strong> - {station.gameType} ({station.playersPerTeam}v{station.playersPerTeam})
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default TournamentOverviewPage