import React from 'react'

const StationBreakdownPage = ({ tournament }) => {
  const getStationGames = () => {
    if (!tournament.schedule) return {}
    
    const stationGames = {}
    
    tournament.schedule.forEach(round => {
      round.games.forEach(game => {
        const stationName = game.stationName || game.station
        
        if (!stationGames[stationName]) {
          stationGames[stationName] = {
            gameType: game.gameTypeName || game.gameType,
            games: []
          }
        }
        
        stationGames[stationName].games.push({
          ...game,
          round: round.round
        })
      })
    })
    
    // Sort games by round for each station
    Object.keys(stationGames).forEach(station => {
      stationGames[station].games.sort((a, b) => a.round - b.round)
    })
    
    return stationGames
  }

  const formatPlayers = (players) => {
    return players.map(p => p.playerName).join(' & ')
  }

  const formatTeamName = (players) => {
    return players[0]?.teamName || 'Team'
  }

  const getStationStats = (games) => {
    const rounds = games.map(g => g.round)
    const uniqueRounds = [...new Set(rounds)]
    const idleRounds = []
    
    // Find rounds where this station is idle
    if (tournament.schedule) {
      for (let i = 1; i <= tournament.schedule.length; i++) {
        if (!uniqueRounds.includes(i)) {
          idleRounds.push(i)
        }
      }
    }
    
    return {
      totalGames: games.length,
      activeRounds: uniqueRounds.length,
      idleRounds: idleRounds,
      utilization: tournament.schedule ? (uniqueRounds.length / tournament.schedule.length * 100).toFixed(1) : 0
    }
  }

  const stationGames = getStationGames()
  const stationNames = Object.keys(stationGames).sort()

  if (stationNames.length === 0) {
    return (
      <>
        <div className="print-header">
          <div className="print-title">{tournament.name}</div>
          <div className="print-subtitle">Station Breakdown</div>
        </div>
        <div className="text-center text-gray-600">
          <p>No games scheduled yet.</p>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="print-header">
        <div className="print-title">{tournament.name}</div>
        <div className="print-subtitle">Station Breakdown</div>
        <div className="print-date">
          Games Organized by Station for Scorers & Officials
        </div>
      </div>

      {/* Scoring Information */}
      <div className="mb-4 p-3 bg-yellow-50 border border-yellow-300 rounded">
        <h3 className="text-sm font-bold mb-2 text-yellow-800">📝 Scoring Reminder</h3>
        <div className="text-xs text-yellow-700">
          <strong>Record scores in each team's column.</strong> 
          Enter the points/score achieved by each team in their respective column. 
          Higher score typically wins unless otherwise specified for the game type.
        </div>
      </div>

      {/* Station Utilization Summary */}
      <div className="mb-6 p-4 bg-gray-50 border border-gray-300 rounded">
        <h3 className="text-base font-bold mb-3">Station Utilization Summary</h3>
        <div className="grid grid-cols-4 gap-4 text-xs">
          {stationNames.map(stationName => {
            const stats = getStationStats(stationGames[stationName].games)
            return (
              <div key={stationName} className="text-center">
                <div className="font-semibold">{stationName}</div>
                <div>{stats.totalGames} games</div>
                <div>{stats.utilization}% utilized</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Detailed Station Breakdowns */}
      <div className="space-y-6">
        {stationNames.map(stationName => {
          const stationData = stationGames[stationName]
          const stats = getStationStats(stationData.games)
          
          return (
            <div key={stationName} className="border border-gray-300 rounded">
              <div className="bg-blue-100 p-3 border-b border-gray-300">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-bold">{stationName}</h3>
                    <div className="text-sm text-gray-700">
                      {stationData.gameType} • {stats.totalGames} games • {stats.utilization}% utilization
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <div>Active: Rounds {stationData.games.map(g => g.round).join(', ')}</div>
                    {stats.idleRounds.length > 0 && (
                      <div className="text-gray-600">Idle: Rounds {stats.idleRounds.join(', ')}</div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="p-3">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="border border-gray-300 p-2 text-left w-16">Round</th>
                      <th className="border border-gray-300 p-2 text-left">Team 1</th>
                      <th className="border border-gray-300 p-2 text-left">Team 2</th>
                      <th className="border border-gray-300 p-2 text-center w-20">Team 1<br/>Score</th>
                      <th className="border border-gray-300 p-2 text-center w-20">Team 2<br/>Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stationData.games.map(game => {
                      const team1Name = formatTeamName(game.team1Players)
                      const team2Name = formatTeamName(game.team2Players)
                      
                      return (
                        <tr key={game.id} className="hover:bg-gray-50">
                          <td className="border border-gray-300 p-2 text-center font-bold">
                            {game.round}
                          </td>
                          <td className="border border-gray-300 p-2">
                            <div className="font-semibold text-blue-700 text-xs">{team1Name}</div>
                            <div className="text-xs">{formatPlayers(game.team1Players)}</div>
                          </td>
                          <td className="border border-gray-300 p-2">
                            <div className="font-semibold text-red-700 text-xs">{team2Name}</div>
                            <div className="text-xs">{formatPlayers(game.team2Players)}</div>
                          </td>
                          <td className="border border-gray-300 p-2 text-center">
                            {game.result ? (
                              <span className="text-green-600 font-bold text-lg">
                                {game.result.team1Score}
                              </span>
                            ) : (
                              <div className="h-6 border-b border-gray-300 w-full"></div>
                            )}
                          </td>
                          <td className="border border-gray-300 p-2 text-center">
                            {game.result ? (
                              <span className="text-green-600 font-bold text-lg">
                                {game.result.team2Score}
                              </span>
                            ) : (
                              <div className="h-6 border-b border-gray-300 w-full"></div>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                
                {/* Idle rounds notice */}
                {stats.idleRounds.length > 0 && (
                  <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                    <strong>Note:</strong> This station is idle during round{stats.idleRounds.length > 1 ? 's' : ''} {stats.idleRounds.join(', ')}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Overall Statistics */}
      <div className="mt-8 p-4 bg-gray-50 border border-gray-300 rounded">
        <h3 className="text-sm font-bold mb-2">Overall Tournament Statistics</h3>
        <div className="grid grid-cols-4 gap-4 text-xs">
          <div>
            <div className="font-semibold">Total Stations:</div>
            <div>{stationNames.length}</div>
          </div>
          <div>
            <div className="font-semibold">Total Games:</div>
            <div>{Object.values(stationGames).reduce((sum, station) => sum + station.games.length, 0)}</div>
          </div>
          <div>
            <div className="font-semibold">Total Rounds:</div>
            <div>{tournament.schedule?.length || 0}</div>
          </div>
          <div>
            <div className="font-semibold">Avg Games/Round:</div>
            <div>
              {tournament.schedule?.length ? 
                (Object.values(stationGames).reduce((sum, station) => sum + station.games.length, 0) / tournament.schedule.length).toFixed(1) : 
                0
              }
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default StationBreakdownPage