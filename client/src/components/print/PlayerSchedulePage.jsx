import React from 'react'

const PlayerSchedulePage = ({ tournament, player, playerNumber, totalPlayers }) => {
  const getPlayerGames = () => {
    if (!tournament.schedule) return []
    
    const playerGames = []
    
    tournament.schedule.forEach(round => {
      let playerGame = null
      
      // Find if player is in any game this round
      round.games.forEach(game => {
        const isInGame = [...game.team1Players, ...game.team2Players].some(
          p => p.playerId === player.id
        )
        
        if (isInGame) {
          // Determine if player is team1 or team2
          const isTeam1 = game.team1Players.some(p => p.playerId === player.id)
          const teammates = isTeam1 ? game.team1Players : game.team2Players
          const opponents = isTeam1 ? game.team2Players : game.team1Players
          
          playerGame = {
            round: round.round,
            station: game.stationName || game.station,
            gameType: game.gameTypeName || game.gameType,
            teammates: teammates.filter(p => p.playerId !== player.id),
            opponents: opponents,
            isPlaying: true
          }
        }
      })
      
      // If not playing, mark as rest
      if (!playerGame) {
        playerGame = {
          round: round.round,
          station: 'REST',
          gameType: 'Rest Round',
          teammates: [],
          opponents: [],
          isPlaying: false
        }
      }
      
      playerGames.push(playerGame)
    })
    
    return playerGames
  }

  const formatPlayersList = (players) => {
    if (players.length === 0) return 'None'
    if (players.length === 1) return players[0].playerName
    return players.map(p => p.playerName).join(' & ')
  }

  const getPlayerStats = () => {
    const games = getPlayerGames()
    const stats = {
      totalRounds: games.length,
      gamesPlayed: games.filter(g => g.isPlaying).length,
      restRounds: games.filter(g => !g.isPlaying).length,
      gameTypes: {}
    }
    
    // Count games by type
    games.filter(g => g.isPlaying).forEach(game => {
      stats.gameTypes[game.gameType] = (stats.gameTypes[game.gameType] || 0) + 1
    })
    
    return stats
  }

  const playerGames = getPlayerGames()
  const stats = getPlayerStats()

  return (
    <>
      <div className="print-header">
        <div className="print-title" style={{ fontSize: '28pt', color: '#2563eb' }}>
          {player.name}
        </div>
        <div className="print-subtitle" style={{ fontSize: '16pt' }}>
          Team: {player.teamName}
        </div>
        <div className="print-date">
          Personal Schedule
        </div>
      </div>

      {/* Player Stats Summary */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded">
        <h3 className="text-base font-bold mb-2 text-blue-800">Your Tournament Summary</h3>
        <div className="grid grid-cols-4 gap-4 text-sm">
          <div>
            <div className="font-semibold text-blue-700">Games Playing:</div>
            <div className="text-lg font-bold">{stats.gamesPlayed}</div>
          </div>
          <div>
            <div className="font-semibold text-blue-700">Rest Rounds:</div>
            <div className="text-lg font-bold">{stats.restRounds}</div>
          </div>
          <div>
            <div className="font-semibold text-blue-700">Total Rounds:</div>
            <div className="text-lg font-bold">{stats.totalRounds}</div>
          </div>
          <div>
            <div className="font-semibold text-blue-700">Game Types:</div>
            <div className="text-xs">
              {Object.entries(stats.gameTypes).map(([type, count]) => (
                <div key={type}>{type}: {count}</div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Schedule Table */}
      <div className="border border-gray-300 rounded overflow-hidden">
        <div className="bg-gray-100 p-2 border-b border-gray-300">
          <h3 className="text-base font-bold">Your Round-by-Round Schedule</h3>
        </div>
        
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="border border-gray-300 p-2 text-left w-16">Round</th>
              <th className="border border-gray-300 p-2 text-left w-32">Station</th>
              <th className="border border-gray-300 p-2 text-left w-24">Game Type</th>
              <th className="border border-gray-300 p-2 text-left">Teammates</th>
              <th className="border border-gray-300 p-2 text-left">Opponents</th>
            </tr>
          </thead>
          <tbody>
            {playerGames.map(game => (
              <tr key={game.round} className={game.isPlaying ? 'bg-white' : 'bg-gray-100'}>
                <td className="border border-gray-300 p-2 text-center font-bold text-lg">
                  {game.round}
                </td>
                <td className="border border-gray-300 p-2">
                  <div className={`font-bold text-base ${game.isPlaying ? 'text-blue-700' : 'text-gray-500'}`}>
                    {game.station}
                  </div>
                </td>
                <td className="border border-gray-300 p-2">
                  <div className={game.isPlaying ? 'text-black' : 'text-gray-500'}>
                    {game.gameType}
                  </div>
                </td>
                <td className="border border-gray-300 p-2">
                  <div className={game.isPlaying ? 'text-black' : 'text-gray-500'}>
                    {formatPlayersList(game.teammates)}
                  </div>
                </td>
                <td className="border border-gray-300 p-2">
                  <div className={game.isPlaying ? 'text-black' : 'text-gray-500'}>
                    {game.isPlaying ? formatPlayersList(game.opponents) : '—'}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Quick Reference Section */}
      <div className="mt-6 grid grid-cols-2 gap-6">
        <div className="p-4 border border-gray-300 rounded">
          <h4 className="font-bold text-sm mb-2 text-gray-700">Quick Station Reference</h4>
          <div className="text-xs space-y-1">
            {Array.from(new Set(playerGames.filter(g => g.isPlaying).map(g => g.station))).sort().map(station => (
              <div key={station} className="flex justify-between">
                <span className="font-semibold">{station}:</span>
                <span>
                  Rounds {playerGames.filter(g => g.station === station).map(g => g.round).join(', ')}
                </span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="p-4 border border-gray-300 rounded">
          <h4 className="font-bold text-sm mb-2 text-gray-700">Important Notes</h4>
          <div className="text-xs space-y-1">
            <div>• Check the station name before each round</div>
            <div>• Arrive at your station promptly</div>
            <div>• "REST" means you don't play that round</div>
            <div>• If you have questions, ask a tournament official</div>
            {stats.restRounds > 0 && (
              <div className="font-semibold text-blue-700">
                • You have {stats.restRounds} rest round{stats.restRounds > 1 ? 's' : ''} to relax!
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export default PlayerSchedulePage