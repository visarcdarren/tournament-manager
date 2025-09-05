import React from 'react'

const TeamScoringSheet = ({ tournament }) => {
  const getTeamsInOrder = () => {
    if (!tournament.teams) return []
    // Return teams in alphabetical order for consistent manual scoring
    return tournament.teams
      .filter(team => team.players.some(p => p.status === 'active'))
      .sort((a, b) => a.name.localeCompare(b.name))
  }

  const getAllGameTypes = () => {
    if (!tournament.settings?.gameTypes) return []
    return tournament.settings.gameTypes.map(gt => gt.name)
  }

  const getTeamGamesPerRound = (teamId) => {
    if (!tournament.schedule) return []
    
    return tournament.schedule.map(round => {
      const teamGames = round.games.filter(game => 
        game.team1Players.some(p => p.teamId === teamId) ||
        game.team2Players.some(p => p.teamId === teamId)
      )
      return {
        round: round.round,
        gameCount: teamGames.length
      }
    })
  }

  if (!tournament.schedule || tournament.schedule.length === 0) {
    return (
      <>
        <div className="print-header">
          <div className="print-title">{tournament.name}</div>
          <div className="print-subtitle">Team Scoring Summary</div>
        </div>
        <div className="text-center text-gray-600">
          <p>No schedule generated yet. This sheet will be available once games are scheduled.</p>
        </div>
      </>
    )
  }

  const teams = getTeamsInOrder()
  const gameTypes = getAllGameTypes()
  const totalRounds = tournament.schedule.length

  return (
    <>
      <div className="print-header">
        <div className="print-title">{tournament.name}</div>
        <div className="print-subtitle">Team Scoring Summary Sheet</div>
        <div className="print-date">
          Manual Score Entry & Tournament Standings
        </div>
      </div>

      {/* Instructions */}
      <div className="mb-4 p-3 bg-blue-50 border border-blue-300 rounded">
        <h3 className="text-sm font-bold mb-2 text-blue-800">📋 How to Use This Sheet</h3>
        <div className="text-xs text-blue-700 space-y-1">
          <div>• <strong>Record Results:</strong> After each round, fill in W (win), L (loss), or D (draw) for each team</div>
          <div>• <strong>Points:</strong> Write actual game scores in the points columns</div>
          <div>• <strong>Running Totals:</strong> Add up wins and points as you go</div>
          <div>• <strong>Final Rankings:</strong> Rank teams by total wins, then by point differential (Points For - Points Against)</div>
        </div>
      </div>

      {/* Round-by-Round Scoring Grid */}
      <div className="mb-6">
        <h3 className="text-lg font-bold mb-3 border-b border-gray-300 pb-1">
          Round-by-Round Scoring
        </h3>
        
        <div className="overflow-hidden border border-gray-300 rounded">
          <table className="w-full text-xs">
            <thead className="bg-gray-100">
              <tr>
                <th className="border border-gray-300 p-2 text-left font-bold">Team Name</th>
                {Array.from({ length: totalRounds }, (_, i) => {
                  // Calculate total games for this round across all teams for header display
                  const roundGamesTotal = tournament.schedule[i]?.games.length || 0
                  return (
                    <th key={i} className="border border-gray-300 p-1 text-center">
                      <div className="font-bold">Round {i + 1}</div>
                      <div className="text-xs font-normal text-gray-600">
                        ({roundGamesTotal} total games)
                      </div>
                      <div className="text-xs font-normal">W-L-D (Pts)</div>
                    </th>
                  )
                })}
                <th className="border border-gray-300 p-2 text-center bg-yellow-100">
                  <div className="font-bold">TOTALS</div>
                  <div className="text-xs">W-L-D (Pts For/Against)</div>
                </th>
                <th className="border border-gray-300 p-2 text-center bg-green-100">
                  <div className="font-bold">FINAL</div>
                  <div className="text-xs">RANK</div>
                </th>
              </tr>
            </thead>
            <tbody>
              {teams.map((team, teamIndex) => {
                const teamGamesPerRound = getTeamGamesPerRound(team.id)
                
                return (
                  <tr key={team.id} className="h-16">
                    <td className="border border-gray-300 p-2 font-semibold bg-gray-50">
                      <div className="text-sm">{team.name}</div>
                      <div className="text-xs text-gray-600">
                        {team.players.filter(p => p.status === 'active').length} players
                      </div>
                    </td>
                    {Array.from({ length: totalRounds }, (_, roundIndex) => {
                      const gamesInThisRound = teamGamesPerRound[roundIndex]?.gameCount || 0
                      
                      return (
                        <td key={roundIndex} className="border border-gray-300 p-1 text-center">
                          <div className="space-y-1">
                            {/* W-L-D boxes - only show as many as games this team plays */}
                            <div className="flex justify-center flex-wrap gap-1">
                              {Array.from({ length: gamesInThisRound }, (_, gameIndex) => (
                                <div key={gameIndex} className="w-4 h-4 border border-gray-400 text-xs flex items-center justify-center bg-white"></div>
                              ))}
                              {gamesInThisRound === 0 && (
                                <span className="text-gray-400 text-xs">Rest</span>
                              )}
                            </div>
                            {/* Points box - only if team has games this round */}
                            {gamesInThisRound > 0 && (
                              <div className="w-full h-4 border border-gray-400 bg-white"></div>
                            )}
                          </div>
                        </td>
                      )
                    })}
                    <td className="border border-gray-300 p-1 text-center bg-yellow-50">
                      <div className="space-y-1">
                        {/* Total W-L-D */}
                        <div className="flex justify-center space-x-1">
                          <div className="w-6 h-4 border border-gray-400 bg-white"></div>
                          <span className="text-xs">-</span>
                          <div className="w-6 h-4 border border-gray-400 bg-white"></div>
                          <span className="text-xs">-</span>
                          <div className="w-6 h-4 border border-gray-400 bg-white"></div>
                        </div>
                        {/* Points For/Against */}
                        <div className="flex justify-center space-x-1 text-xs">
                          <div className="w-8 h-4 border border-gray-400 bg-white"></div>
                          <span>/</span>
                          <div className="w-8 h-4 border border-gray-400 bg-white"></div>
                        </div>
                      </div>
                    </td>
                    <td className="border border-gray-300 p-1 text-center bg-green-50">
                      <div className="w-8 h-8 border-2 border-gray-400 bg-white mx-auto rounded flex items-center justify-center font-bold text-lg">
                        {/* Rank box */}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Final Standings */}
      <div className="mb-6">
        <h3 className="text-lg font-bold mb-3 border-b border-gray-300 pb-1">
          🏆 Final Tournament Standings
        </h3>
        
        <div className="grid grid-cols-2 gap-6">
          <div>
            <div className="border border-gray-300 rounded">
              <div className="bg-yellow-100 p-2 border-b border-gray-300">
                <h4 className="font-semibold">Medal Positions</h4>
              </div>
              <div className="p-3 space-y-3">
                <div className="flex items-center justify-between p-2 bg-yellow-50 border border-yellow-300 rounded">
                  <div className="flex items-center">
                    <span className="text-2xl mr-3">🥇</span>
                    <span className="font-bold">1st Place:</span>
                  </div>
                  <div className="w-32 h-6 border-2 border-gray-400 bg-white"></div>
                </div>
                <div className="flex items-center justify-between p-2 bg-gray-50 border border-gray-300 rounded">
                  <div className="flex items-center">
                    <span className="text-2xl mr-3">🥈</span>
                    <span className="font-bold">2nd Place:</span>
                  </div>
                  <div className="w-32 h-6 border-2 border-gray-400 bg-white"></div>
                </div>
                <div className="flex items-center justify-between p-2 bg-orange-50 border border-orange-300 rounded">
                  <div className="flex items-center">
                    <span className="text-2xl mr-3">🥉</span>
                    <span className="font-bold">3rd Place:</span>
                  </div>
                  <div className="w-32 h-6 border-2 border-gray-400 bg-white"></div>
                </div>
              </div>
            </div>
          </div>
          
          <div>
            <div className="border border-gray-300 rounded">
              <div className="bg-blue-100 p-2 border-b border-gray-300">
                <h4 className="font-semibold">Tournament Info</h4>
              </div>
              <div className="p-3 text-sm space-y-2">
                <div className="flex justify-between">
                  <span>Total Games:</span>
                  <span className="font-bold">{tournament.schedule.reduce((sum, round) => sum + round.games.length, 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Rounds:</span>
                  <span className="font-bold">{totalRounds}</span>
                </div>
                <div className="flex justify-between">
                  <span>Teams:</span>
                  <span className="font-bold">{teams.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Game Types:</span>
                  <span className="font-bold">{gameTypes.join(', ')}</span>
                </div>
                <div className="border-t pt-2 mt-3">
                  <div className="text-xs text-gray-600">
                    <strong>Ranking Method:</strong><br/>
                    1. Most Wins<br/>
                    2. Point Differential<br/>
                    3. Head-to-head record
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Notes Section */}
      <div className="mt-6 p-3 bg-gray-50 border border-gray-300 rounded">
        <h4 className="font-semibold text-sm mb-3">📝 Tournament Notes & Comments</h4>
        <div className="space-y-2">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="h-5 border-b border-gray-300 w-full"></div>
          ))}
        </div>
      </div>
    </>
  )
}

export default TeamScoringSheet