import React, { useState } from 'react'
import { Calendar, Printer, MapPin, Users, Clock, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'

export default function ScheduleViewer({ tournament }) {
  const [selectedRound, setSelectedRound] = useState(1)
  const [selectedPlayer, setSelectedPlayer] = useState(null)
  
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Tournament Schedule</h2>
        <Button onClick={handlePrint} variant="outline">
          <Printer className="mr-2 h-4 w-4" />
          Print Schedule
        </Button>
      </div>
      
      <Tabs defaultValue="rounds" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="rounds">By Round</TabsTrigger>
          <TabsTrigger value="stations">By Station</TabsTrigger>
          <TabsTrigger value="players">By Player</TabsTrigger>
        </TabsList>
        
        {/* By Round View */}
        <TabsContent value="rounds" className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            {tournament.schedule.map((_, index) => (
              <Button
                key={index}
                variant={selectedRound === index + 1 ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedRound(index + 1)}
              >
                Round {index + 1}
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
                {tournament.schedule[selectedRound - 1].games.length} games scheduled
                {tournament.settings.timer?.enabled && (
                  <span> • {tournament.settings.timer.duration} minute rounds</span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {tournament.schedule[selectedRound - 1].games.map(game => (
                  <div key={game.id} className="rounded-lg border p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 font-semibold">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          {game.stationName || game.station}
                          {game.gameTypeName && (
                            <Badge variant="secondary" className="text-xs">
                              {game.gameTypeName}
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm space-y-1">
                          <div className="flex items-center gap-2">
                            {game.team1Players ? (
                              <>
                                <Users className="h-3 w-3 text-muted-foreground" />
                                {game.team1Players.map(p => p.playerName).join(' & ')}
                                <span className="text-muted-foreground">({game.team1Players[0].teamName})</span>
                              </>
                            ) : (
                              <>
                                {game.player1.playerName}
                                <span className="text-muted-foreground">({game.player1.teamName})</span>
                              </>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <ChevronRight className="h-3 w-3" />
                            <span>vs</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {game.team2Players ? (
                              <>
                                <Users className="h-3 w-3 text-muted-foreground" />
                                {game.team2Players.map(p => p.playerName).join(' & ')}
                                <span className="text-muted-foreground">({game.team2Players[0].teamName})</span>
                              </>
                            ) : (
                              <>
                                {game.player2.playerName}
                                <span className="text-muted-foreground">({game.player2.teamName})</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      {game.status === 'completed' && (
                        <Badge variant="outline" className="text-green-600">
                          Completed
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* By Station View */}
        <TabsContent value="stations" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
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
                              <Badge variant="outline" className="text-xs">Done</Badge>
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
          <div className="grid gap-2 md:grid-cols-3 lg:grid-cols-4">
            {allPlayers.map(player => (
              <Button
                key={player.id}
                variant={selectedPlayer?.id === player.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedPlayer(player)}
                className="justify-start"
              >
                {player.name}
                <span className="ml-2 text-xs text-muted-foreground">
                  ({player.teamName})
                </span>
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
                  {selectedPlayer.teamName} • {getPlayerGames(selectedPlayer.id).length} games scheduled
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {getPlayerSchedule(selectedPlayer.id).map((item, index) => {
                    if (item.type === 'rest') {
                      return (
                        <div key={`round-${item.round}`} className="rounded-lg border border-dashed p-3 opacity-60">
                          <div className="text-sm">
                            <span className="font-semibold">Round {item.round}</span>
                            <span className="text-muted-foreground ml-2">• Rest</span>
                          </div>
                        </div>
                      )
                    } else {
                      // This is a game
                      const game = item
                      return (
                        <div key={game.id} className="rounded-lg border p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-semibold text-sm">Round {game.round}</span>
                            <Badge variant="secondary" className="text-xs">
                              {game.stationName || game.station}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {/* Only show partners section for team games where player has actual partners */}
                            {(game.team1Players || game.team2Players) && (
                              (() => {
                                // Determine which team the selected player is on and get their partners
                                const isOnTeam1 = game.team1Players?.some(p => p.playerId === selectedPlayer.id)
                                const playerTeam = isOnTeam1 ? game.team1Players : game.team2Players
                                const partners = playerTeam?.filter(p => p.playerId !== selectedPlayer.id) || []
                                
                                // Only show if there are actual partners (team game with more than 1 player per team)
                                if (partners.length > 0) {
                                  return (
                                    <div>
                                      Partners with:{' '}
                                      {partners.map(p => p.playerName).join(', ')}
                                    </div>
                                  )
                                }
                                return null
                              })()
                            )}
                            <div>
                              vs{' '}
                              {game.team1Players ? (
                                game.team1Players.some(p => p.playerId === selectedPlayer.id)
                                  ? game.team2Players.map(p => p.playerName).join(' & ')
                                  : game.team1Players.map(p => p.playerName).join(' & ')
                              ) : (
                                game.player1.playerId === selectedPlayer.id
                                  ? game.player2.playerName
                                  : game.player1.playerName
                              )}
                            </div>
                          </div>
                          {game.status === 'completed' && (
                            <Badge variant="outline" className="mt-2 text-xs">
                              Completed
                            </Badge>
                          )}
                        </div>
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
