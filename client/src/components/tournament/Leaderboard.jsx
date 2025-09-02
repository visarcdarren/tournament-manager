import React from 'react'
import { Trophy, Medal, Award } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { calculateScores } from '@/utils/tournament'

export default function Leaderboard({ tournament }) {
  const scores = calculateScores(tournament)
  
  const getPositionIcon = (position) => {
    switch (position) {
      case 1:
        return <Trophy className="h-5 w-5 text-yellow-500" />
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />
      case 3:
        return <Award className="h-5 w-5 text-orange-600" />
      default:
        return <span className="w-5 text-center text-sm font-semibold">{position}</span>
    }
  }
  
  const getPositionClass = (position) => {
    switch (position) {
      case 1:
        return 'position-1'
      case 2:
        return 'position-2'
      case 3:
        return 'position-3'
      default:
        return 'bg-muted'
    }
  }
  
  return (
    <div className="space-y-4 sm:space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Tournament Standings</CardTitle>
          <CardDescription>
            Current rankings based on total points earned
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {scores.map((team, index) => {
              const position = index + 1
              return (
                <div
                  key={team.teamId}
                  className={`flex items-center justify-between rounded-lg p-3 sm:p-4 ${
                    position <= 3 ? getPositionClass(position) : 'bg-muted/50'
                  }`}
                >
                  <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
                    <span className="flex-shrink-0">{getPositionIcon(position)}</span>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-sm sm:text-base truncate">{team.teamName}</div>
                      <div className="text-xs sm:text-sm opacity-90">
                        {team.wins}W - {team.draws}D - {team.losses}L
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-lg sm:text-2xl font-bold">{team.points}</div>
                    <div className="text-xs sm:text-sm opacity-90">points</div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
      
      {/* Statistics */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm sm:text-base">Total Games</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="text-xl sm:text-3xl font-bold">
              {tournament.schedule?.reduce((sum, round) => 
                sum + round.games.filter(g => g.result).length, 0
              ) || 0}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              of {tournament.schedule?.reduce((sum, round) => sum + round.games.length, 0) || 0} played
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm sm:text-base">Current Round</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="text-xl sm:text-3xl font-bold">
              {tournament.schedule?.findIndex(round => 
                round.games.some(g => !g.result)
              ) + 1 || tournament.settings.rounds}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              of {tournament.settings.rounds} rounds
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm sm:text-base">Games Per Round</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="text-xl sm:text-3xl font-bold">
              {(() => {
                // Handle both old and new tournament structure formats
                if (tournament.settings.gameTypes && Array.isArray(tournament.settings.gameTypes)) {
                  // New format: calculate from gameTypes
                  return tournament.settings.gameTypes.reduce((sum, gameType) => {
                    return sum + (gameType.stations ? gameType.stations.length : 0)
                  }, 0)
                } else if (tournament.settings.shuffleboards !== undefined && tournament.settings.dartboards !== undefined) {
                  // Old format: use shuffleboards + dartboards
                  const shuffleboards = tournament.settings.shuffleboards || 0
                  const dartboards = tournament.settings.dartboards || 0
                  return shuffleboards + dartboards
                } else {
                  // Fallback: count from actual schedule if available
                  const firstRound = tournament.schedule && tournament.schedule[0]
                  return firstRound ? firstRound.games.length : 0
                }
              })()}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {(() => {
                if (tournament.settings.gameTypes && Array.isArray(tournament.settings.gameTypes)) {
                  // New format: show game type breakdown
                  const breakdown = tournament.settings.gameTypes.map(gameType => 
                    `${gameType.stations ? gameType.stations.length : 0} ${gameType.name.toLowerCase()}`
                  ).join(', ')
                  return breakdown || 'No games configured'
                } else {
                  // Old format: show shuffleboard/darts breakdown
                  const shuffleboards = tournament.settings.shuffleboards || 0
                  const dartboards = tournament.settings.dartboards || 0
                  return `${shuffleboards} shuffleboard, ${dartboards} darts`
                }
              })()}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
