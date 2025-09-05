import React from 'react'

const MasterSchedulePage = ({ tournament }) => {
  const getGamesByStation = (round) => {
    const gamesByStation = {}
    
    round.games.forEach(game => {
      if (!gamesByStation[game.stationName]) {
        gamesByStation[game.stationName] = []
      }
      gamesByStation[game.stationName].push(game)
    })
    
    return gamesByStation
  }

  const formatPlayers = (players) => {
    return players.map(p => p.playerName).join(' & ')
  }

  const formatTeamVs = (game) => {
    const team1Name = game.team1Players[0]?.teamName || 'Team 1'
    const team2Name = game.team2Players[0]?.teamName || 'Team 2'
    return { team1Name, team2Name }
  }

  const getStationOrder = () => {
    // Get all unique stations in a consistent order
    const stations = new Set()
    tournament.schedule?.forEach(round => {
      round.games.forEach(game => {
        stations.add(game.stationName)
      })
    })
    return Array.from(stations).sort()
  }

  if (!tournament.schedule || tournament.schedule.length === 0) {
    return (
      <>
        <div className="print-header">
          <div className="print-title">{tournament.name}</div>
          <div className="print-subtitle">Master Schedule</div>
        </div>
        <div className="text-center text-gray-600">
          <p>No schedule has been generated yet.</p>
        </div>
      </>
    )
  }

  const stationOrder = getStationOrder()

  return (
    <>
      <div className="print-header">
        <div className="print-title">{tournament.name}</div>
        <div className="print-subtitle">Master Schedule</div>
        <div className="print-date">
          All Games by Round and Station
        </div>
      </div>

      <div className="space-y-6">
        {tournament.schedule.map(round => {
          const gamesByStation = getGamesByStation(round)
          
          return (
            <div key={round.round} className="border border-gray-300 rounded">
              <div className="bg-gray-100 p-2 border-b border-gray-300">
                <h3 className="text-base font-bold">
                  Round {round.round}
                  <span className="text-sm font-normal text-gray-600 ml-2">
                    ({round.games.length} games)
                  </span>
                </h3>
              </div>
              
              <div className="p-3">
                {stationOrder.map(stationName => {
                  const stationGames = gamesByStation[stationName] || []
                  
                  if (stationGames.length === 0) {
                    return (
                      <div key={stationName} className="mb-3 pb-2 border-b border-gray-200 last:border-b-0">
                        <div className="font-semibold text-sm text-gray-500">
                          {stationName} - No game this round
                        </div>
                      </div>
                    )
                  }
                  
                  return (
                    <div key={stationName} className="mb-3 pb-2 border-b border-gray-200 last:border-b-0">
                      <div className="font-semibold text-sm mb-1">
                        {stationName} - {stationGames[0].gameTypeName || stationGames[0].gameType}
                      </div>
                      {stationGames.map((game, gameIndex) => {
                        const { team1Name, team2Name } = formatTeamVs(game)
                        return (
                          <div key={game.id} className="text-xs ml-2">
                            <div className="flex justify-between items-center">
                              <div className="flex-1">
                                <div className="font-semibold text-blue-700">{team1Name}</div>
                                <div className="ml-2">{formatPlayers(game.team1Players)}</div>
                              </div>
                              <div className="text-gray-600 mx-4 font-bold">vs</div>
                              <div className="flex-1 text-right">
                                <div className="font-semibold text-red-700">{team2Name}</div>
                                <div className="mr-2">{formatPlayers(game.team2Players)}</div>
                              </div>
                            </div>
                            {gameIndex < stationGames.length - 1 && (
                              <div className="my-2 border-t border-gray-200"></div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Summary section at bottom */}
      <div className="mt-8 p-4 bg-gray-50 border border-gray-300 rounded">
        <h3 className="text-sm font-bold mb-2">Schedule Summary</h3>
        <div className="grid grid-cols-3 gap-4 text-xs">
          <div>
            <div className="font-semibold">Total Rounds:</div>
            <div>{tournament.schedule.length}</div>
          </div>
          <div>
            <div className="font-semibold">Total Games:</div>
            <div>{tournament.schedule.reduce((sum, round) => sum + round.games.length, 0)}</div>
          </div>
          <div>
            <div className="font-semibold">Games per Round:</div>
            <div>{tournament.schedule.map(r => r.games.length).join(', ')}</div>
          </div>
        </div>
      </div>
    </>
  )
}

export default MasterSchedulePage