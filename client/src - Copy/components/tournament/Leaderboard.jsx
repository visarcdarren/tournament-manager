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
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Tournament Standings</CardTitle>
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
                  className={`flex items-center justify-between rounded-lg p-4 ${
                    position <= 3 ? getPositionClass(position) : 'bg-muted/50'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    {getPositionIcon(position)}
                    <div>
                      <div className="font-semibold">{team.teamName}</div>
                      <div className="text-sm opacity-90">
                        {team.wins}W - {team.draws}D - {team.losses}L
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">{team.points}</div>
                    <div className="text-sm opacity-90">points</div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
      
      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Total Games</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {tournament.schedule?.reduce((sum, round) => 
                sum + round.games.filter(g => g.status === 'completed').length, 0
              ) || 0}
            </div>
            <p className="text-sm text-muted-foreground">
              of {tournament.schedule?.reduce((sum, round) => sum + round.games.length, 0) || 0} played
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Current Round</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {tournament.schedule?.findIndex(round => 
                round.games.some(g => g.status !== 'completed')
              ) + 1 || tournament.settings.rounds}
            </div>
            <p className="text-sm text-muted-foreground">
              of {tournament.settings.rounds} rounds
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Games Per Round</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {tournament.settings.shuffleboards + tournament.settings.dartboards}
            </div>
            <p className="text-sm text-muted-foreground">
              {tournament.settings.shuffleboards} shuffleboard, {tournament.settings.dartboards} darts
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
