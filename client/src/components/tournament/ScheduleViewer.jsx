import React, { useState, useEffect } from 'react'
import { Calendar, Printer, MapPin, Users, Clock, ChevronRight, Trophy, Medal } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { getCurrentRound } from '@/utils/tournament'

export default function ScheduleViewer({ tournament }) {
  // Initialize selectedRound to current round
  const currentRound = getCurrentRound(tournament)
  const [selectedRound, setSelectedRound] = useState(currentRound)
  const [selectedPlayer, setSelectedPlayer] = useState(null)
  
  // Update selectedRound when currentRound changes
  useEffect(() => {
    if (tournament.currentState?.status === 'active') {
      setSelectedRound(getCurrentRound(tournament))
    }
  }, [tournament])
  
  if (!tournament.schedule || tournament.schedule.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
          <p className="text-muted-foreground">No schedule generated yet</p>
        </CardContent>
      </Card>
    )
  }
  
  // Helper function to get game icon (similar to LiveTournament)
  const getGameIcon = (game) => {
    const gameType = game.gameTypeName?.toLowerCase() || game.gameType?.toLowerCase() || ''
    if (gameType.includes('shuffleboard')) {
      return <span className="text-blue-600">▬</span> // Rectangular icon for shuffleboard
    } else if (gameType.includes('dart')) {
      return <span className="text-red-600">▯</span> // Target icon for darts
    }
    return <span className="text-gray-600">●</span> // Default circle
  }
  const formatGameResult = (game) => {
    if (!game.result) return null
    
    if (game.result === 'draw') {
      return {
        text: 'Draw',
        variant: 'secondary',
        className: 'text-blue-600 border-blue-200'
      }
    }
    
    // Determine winner
    let winnerName = ''
    let winnerTeam = ''
    
    if (game.team1Players && game.team2Players) {
      // Team games
      if (game.result === 'team1-win') {
        winnerName = game.team1Players.map(p => p.playerName).join(' & ')
        winnerTeam = game.team1Players[0].teamName
      } else if (game.result === 'team2-win') {
        winnerName = game.team2Players.map(p => p.playerName).join(' & ')
        winnerTeam = game.team2Players[0].teamName
      }
    } else {
      // Individual games
      if (game.result === 'player1-win') {
        winnerName = game.player1.playerName
        winnerTeam = game.player1.teamName
      } else if (game.result === 'player2-win') {
        winnerName = game.player2.playerName
        winnerTeam = game.player2.teamName
      }
    }
    
    return {
      text: winnerName,
      team: winnerTeam,
      variant: 'default',
      className: 'text-green-700 bg-green-50 border-green-200'
    }
  }
  
  const handlePrint = () => {
    window.print()
  }
  
  // Get all players for player view
  const allPlayers = tournament.teams.flatMap(team => 
    team.players.filter(p => p.status === 'active').map(player => ({
      ...player,
      teamName: team.name,
      teamId: team.id
    }))
  )
  
  // Get player's games across all rounds
  const getPlayerGames = (playerId) => {
    const games = []
    tournament.schedule.forEach((round, roundIndex) => {
      round.games.forEach(game => {
        const isInGame = 
          game.player1?.playerId === playerId ||
          game.player2?.playerId === playerId ||
          game.team1Players?.some(p => p.playerId === playerId) ||
          game.team2Players?.some(p => p.playerId === playerId)
          
        if (isInGame) {
          games.push({
            ...game,
            round: roundIndex + 1
          })
        }
      })
    })
    return games
  }
  
  // Get player's complete schedule (games + rest) in round order
  const getPlayerSchedule = (playerId) => {
    const schedule = []
    tournament.schedule.forEach((round, roundIndex) => {
      const roundNumber = roundIndex + 1
      
      // Check if player has a game this round
      const gameInRound = round.games.find(game => 
        game.player1?.playerId === playerId ||
        game.player2?.playerId === playerId ||
        game.team1Players?.some(p => p.playerId === playerId) ||
        game.team2Players?.some(p => p.playerId === playerId)
      )
      
      if (gameInRound) {
        // Player has a game this round
        schedule.push({
          ...gameInRound,
          round: roundNumber,
          type: 'game'
        })
      } else {
        // Player is resting this round
        schedule.push({
          round: roundNumber,
          type: 'rest'
        })
      }
    })
    return schedule
  }
  
  // Get all games at a specific station
  const getStationGames = (stationId) => {
    const games = []
    tournament.schedule.forEach((round, roundIndex) => {
      const stationGame = round.games.find(g => g.station === stationId)
      if (stationGame) {
        games.push({
          ...stationGame,
          round: roundIndex + 1
        })
      }
    })
    return games
  }
  
  // Get unique stations
  const allStations = [...new Set(
    tournament.schedule.flatMap(round => 
      round.games.map(game => ({
        id: game.station,
        name: game.stationName || game.station,
        gameType: game.gameTypeName || game.gameType
      }))
    )
  )].reduce((unique, station) => {
    const exists = unique.find(s => s.id === station.id)
    if (!exists) unique.push(station)
    return unique
  }, [])
  
  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl sm:text-2xl font-bold">Tournament Schedule</h2>
        {/* Temporarily disabled - print layout needs improvement
        <Button onClick={handlePrint} variant="outline" size="sm" className="w-full sm:w-auto">
          <Printer className="mr-2 h-4 w-4" />
          Print Schedule
        </Button>
        */}
      </div>
      
      <Tabs defaultValue="rounds" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="rounds">By Round</TabsTrigger>
          <TabsTrigger value="stations">By Station</TabsTrigger>
          <TabsTrigger value="players">By Player</TabsTrigger>
        </TabsList>
        
        {/* By Round View */}
        <TabsContent value="rounds" className="space-y-4">
          <div className="flex gap-2 flex-wrap justify-center sm:justify-start">
            {tournament.schedule.map((_, index) => (
              <Button
                key={index}
                variant={selectedRound === index + 1 ? "default" : 
                        (tournament.currentState?.status === 'active' && index + 1 === currentRound) ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedRound(index + 1)}
                className={`min-w-0 px-2 sm:px-3 ${
                  tournament.currentState?.status === 'active' && index + 1 === currentRound ? 
                  'bg-green-600 hover:bg-green-700 border-green-600' : ''
                }`}
              >
                <span className="text-xs sm:text-sm">
                  Round {index + 1}
                  {tournament.currentState?.status === 'active' && index + 1 === currentRound && (
                    <span className="ml-1">•</span>
                  )}
                </span>
              </Button>
            ))}
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Round {selectedRound}
              </CardTitle>
              <CardDescription>
                {(() => {
                  const roundData = tournament.schedule[selectedRound - 1]
                  const completedGames = roundData.games.filter(g => g.result).length
                  const totalGames = roundData.games.length
                  
                  if (completedGames === totalGames && totalGames > 0) {
                    return `${totalGames} games completed`
                  } else {
                    return `${totalGames} games scheduled`
                  }
                })()}
                {tournament.settings.timer?.enabled && (
                  <span> • {tournament.settings.timer.duration} minute rounds</span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {tournament.schedule[selectedRound - 1].games.map(game => {
                  const result = formatGameResult(game)
                  
                  // Check if this is a multi-player game
                  const isMultiPlayer = game.team1Players && game.team2Players
                  
                  // Get display names for teams
                  const getTeamDisplay = (players) => {
                    if (!players || players.length === 0) return ''
                    if (players.length === 1) return players[0].playerName
                    return players.map(p => p.playerName).join(' & ')
                  }
                  
                  const getTeamName = (players) => {
                    if (!players || players.length === 0) return ''
                    return players[0].teamName
                  }
                  
                  const team1Display = isMultiPlayer 
                    ? getTeamDisplay(game.team1Players)
                    : game.player1?.playerName || ''
                    
                  const team2Display = isMultiPlayer
                    ? getTeamDisplay(game.team2Players)
                    : game.player2?.playerName || ''
                    
                  const team1Name = isMultiPlayer
                    ? getTeamName(game.team1Players)
                    : game.player1?.teamName || ''
                    
                  const team2Name = isMultiPlayer
                    ? getTeamName(game.team2Players)
                    : game.player2?.teamName || ''
                  
                  return (
                    <Card key={game.id} className={result ? 'opacity-90' : ''}>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between text-base">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            <span>{game.stationName || game.station}</span>
                            {game.gameTypeName && (
                              <span className="text-xs text-muted-foreground">({game.gameTypeName})</span>
                            )}
                          </div>
                          {result && (
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${result.className} flex items-center gap-1`}
                            >
                              {result.text === 'Draw' ? (
                                <>
                                  <Medal className="h-3 w-3" />
                                  Draw
                                </>
                              ) : (
                                <>
                                  <Trophy className="h-3 w-3" />
                                  Winner
                                </>
                              )}
                            </Badge>
                          )}
                          {!result && (
                            <Badge variant="outline" className="text-xs text-muted-foreground">
                              Pending
                            </Badge>
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Players/Teams Display */}
                        <div className="space-y-3">
                          {/* Team 1 */}
                          <div className="rounded-lg border p-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="flex items-center gap-2">
                                  {isMultiPlayer && <Users className="h-4 w-4 text-muted-foreground" />}
                                  <div className="font-semibold">{team1Display}</div>
                                </div>
                                <div className="text-sm text-muted-foreground">{team1Name}</div>
                              </div>
                            </div>
                          </div>
                          
                          {/* VS Divider */}
                          <div className="text-center text-sm font-semibold text-muted-foreground">VS</div>
                          
                          {/* Team 2 */}
                          <div className="rounded-lg border p-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="flex items-center gap-2">
                                  {isMultiPlayer && <Users className="h-4 w-4 text-muted-foreground" />}
                                  <div className="font-semibold">{team2Display}</div>
                                </div>
                                <div className="text-sm text-muted-foreground">{team2Name}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Result Display */}
                        {result && (
                          <div className="rounded-lg bg-muted p-3 text-center">
                            <div className="text-sm font-semibold">
                              {result.text === 'Draw' ? 'Draw' : `${result.text} Won`}
                            </div>
                            {result.text !== 'Draw' && (
                              <div className="mt-1 text-xs text-muted-foreground">
                                ({result.team})
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* By Station View */}
        <TabsContent value="stations" className="space-y-4">
          <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
            {allStations.map(station => {
              const stationGames = getStationGames(station.id)
              return (
                <Card key={station.id}>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {station.name}
                    </CardTitle>
                    <CardDescription>
                      {station.gameType} • {stationGames.length} games total
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {stationGames.map(game => (
                        <div key={game.id} className="rounded border p-2 text-sm">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold">Round {game.round}</span>
                            {game.status === 'completed' && (
                              <Badge variant="outline" className="text-xs text-green-600">Done</Badge>
                            )}
                            {game.result && game.status !== 'completed' && (
                              <Badge variant="outline" className="text-xs text-blue-600">Scored</Badge>
                            )}
                          </div>
                          <div className="text-muted-foreground">
                            {game.team1Players ? (
                              <div>
                                {game.team1Players.map(p => p.playerName).join(' & ')} vs{' '}
                                {game.team2Players.map(p => p.playerName).join(' & ')}
                              </div>
                            ) : (
                              <div>
                                {game.player1.playerName} vs {game.player2.playerName}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>
        
        {/* By Player View */}
        <TabsContent value="players" className="space-y-4">
          <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {allPlayers.map(player => (
              <Button
                key={player.id}
                variant={selectedPlayer?.id === player.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedPlayer(player)}
                className="justify-start text-left h-auto py-2 px-3"
              >
                <div className="flex flex-col items-start gap-0.5 w-full min-w-0">
                  <span className="font-medium text-sm truncate w-full">{player.name}</span>
                  <span className="text-xs text-muted-foreground truncate w-full">
                    ({player.teamName})
                  </span>
                </div>
              </Button>
            ))}
          </div>
          
          {selectedPlayer && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  {selectedPlayer.name}
                </CardTitle>
                <CardDescription>
                  {selectedPlayer.teamName} • {getPlayerGames(selectedPlayer.id).length} games scheduled • {getPlayerSchedule(selectedPlayer.id).filter(item => item.type === 'rest').length} rest periods
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  {getPlayerSchedule(selectedPlayer.id).map((item, index) => {
                    if (item.type === 'rest') {
                      return (
                        <Card key={`round-${item.round}`} className="border-dashed opacity-60">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              Round {item.round}
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-center text-muted-foreground py-4">
                              <span className="text-sm font-medium">Rest</span>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    } else {
                      // This is a game - use same card format as main schedule
                      const game = item
                      const result = formatGameResult(game)
                      
                      // Check if this is a multi-player game
                      const isMultiPlayer = game.team1Players && game.team2Players
                      
                      // Get display names for teams
                      const getTeamDisplay = (players) => {
                        if (!players || players.length === 0) return ''
                        if (players.length === 1) return players[0].playerName
                        return players.map(p => p.playerName).join(' & ')
                      }
                      
                      const getTeamName = (players) => {
                        if (!players || players.length === 0) return ''
                        return players[0].teamName
                      }
                      
                      const team1Display = isMultiPlayer 
                        ? getTeamDisplay(game.team1Players)
                        : game.player1?.playerName || ''
                        
                      const team2Display = isMultiPlayer
                        ? getTeamDisplay(game.team2Players)
                        : game.player2?.playerName || ''
                        
                      const team1Name = isMultiPlayer
                        ? getTeamName(game.team1Players)
                        : game.player1?.teamName || ''
                        
                      const team2Name = isMultiPlayer
                        ? getTeamName(game.team2Players)
                        : game.player2?.teamName || ''
                      
                      // Determine opponent display
                      const isPlayerInTeam1 = isMultiPlayer 
                        ? game.team1Players?.some(p => p.playerId === selectedPlayer.id)
                        : game.player1?.playerId === selectedPlayer.id
                      
                      const opponentDisplay = isPlayerInTeam1 ? team2Display : team1Display
                      const opponentTeam = isPlayerInTeam1 ? team2Name : team1Name
                      
                      // Get partners if any
                      const playerTeam = isPlayerInTeam1 
                        ? (isMultiPlayer ? game.team1Players : null)
                        : (isMultiPlayer ? game.team2Players : null)
                      const partners = playerTeam?.filter(p => p.playerId !== selectedPlayer.id) || []
                      
                      return (
                        <Card key={game.id} className={result ? 'opacity-90' : ''}>
                          <CardHeader>
                            <CardTitle className="flex items-center justify-between text-base">
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                <span>Round {game.round}</span>
                                <span className="text-xs text-muted-foreground">•</span>
                                <span className="text-sm">{game.stationName || game.station}</span>
                                {game.gameTypeName && (
                                  <span className="text-xs text-muted-foreground">({game.gameTypeName})</span>
                                )}
                              </div>
                              {result && (
                                <Badge 
                                  variant="outline" 
                                  className={`text-xs ${result.className} flex items-center gap-1`}
                                >
                                  {result.text === 'Draw' ? (
                                    <>
                                      <Medal className="h-3 w-3" />
                                      Draw
                                    </>
                                  ) : (
                                    <>
                                      <Trophy className="h-3 w-3" />
                                      {result.text === selectedPlayer.name ? 'Won' : 'Lost'}
                                    </>
                                  )}
                                </Badge>
                              )}
                              {!result && (
                                <Badge variant="outline" className="text-xs text-muted-foreground">
                                  Pending
                                </Badge>
                              )}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            {/* Partners section (only if there are actual partners) */}
                            {partners.length > 0 && (
                              <div className="rounded-lg border p-3 bg-blue-50 border-blue-200">
                                <div className="text-sm">
                                  <span className="font-medium text-blue-700">Partners with:</span>
                                  <div className="text-muted-foreground mt-1">
                                    {partners.map(p => p.playerName).join(', ')}
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            {/* VS Section */}
                            <div className="text-center text-sm font-semibold text-muted-foreground">VS</div>
                            
                            {/* Opponent */}
                            <div className="rounded-lg border p-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="flex items-center gap-2">
                                    {isMultiPlayer && <Users className="h-4 w-4 text-muted-foreground" />}
                                    <div className="font-semibold">{opponentDisplay}</div>
                                  </div>
                                  <div className="text-sm text-muted-foreground">{opponentTeam}</div>
                                </div>
                              </div>
                            </div>
                            
                            {/* Result Display */}
                            {result && (
                              <div className="rounded-lg bg-muted p-3 text-center">
                                <div className="text-sm font-semibold">
                                  {result.text === 'Draw' 
                                    ? 'Draw' 
                                    : result.text === selectedPlayer.name 
                                      ? `${selectedPlayer.name} Won!` 
                                      : `${result.text} Won`
                                  }
                                </div>
                                {result.text !== 'Draw' && (
                                  <div className="mt-1 text-xs text-muted-foreground">
                                    ({result.team})
                                  </div>
                                )}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      )
                    }
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
      
      {/* Print Styles */}
      <style jsx>{`
        @media print {
          .no-print {
            display: none !important;
          }
          
          body {
            font-size: 12px;
          }
          
          .print-break {
            page-break-after: always;
          }
        }
      `}</style>
    </div>
  )
}
