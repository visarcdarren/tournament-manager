import React, { useState, useEffect } from 'react'
import useDeviceStore from '@/stores/deviceStore'
import TournamentOverviewPage from './TournamentOverviewPage'
import MasterSchedulePage from './MasterSchedulePage'
import PlayerSchedulePage from './PlayerSchedulePage'
import StationBreakdownPage from './StationBreakdownPage'
import TeamScoringSheet from './TeamScoringSheet'

const PrintSchedule = ({ tournamentId }) => {
  const [tournament, setTournament] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const { deviceId } = useDeviceStore()

  useEffect(() => {
    const fetchTournament = async () => {
      try {
        const response = await fetch(`/api/tournament/${tournamentId}`, {
          headers: {
            'X-Device-ID': deviceId
          }
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to fetch tournament')
        }

        const data = await response.json()
        setTournament(data)
      } catch (err) {
        console.error('Error fetching tournament:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    if (tournamentId && deviceId) {
      fetchTournament()
    }
  }, [tournamentId, deviceId])

  // Get all active players across all teams
  const getAllActivePlayers = () => {
    if (!tournament?.teams) return []
    
    const players = []
    tournament.teams.forEach(team => {
      team.players.filter(p => p.status === 'active').forEach(player => {
        players.push({
          ...player,
          teamId: team.id,
          teamName: team.name
        })
      })
    })
    
    // Sort players by team name, then by player name
    return players.sort((a, b) => {
      const teamCompare = a.teamName.localeCompare(b.teamName)
      if (teamCompare !== 0) return teamCompare
      return a.name.localeCompare(b.name)
    })
  }

  if (loading) {
    return (
      <div className="print-loading">
        <div className="text-center p-8">
          <div className="mb-4 h-8 w-8 mx-auto border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p>Loading tournament data for printing...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="print-error">
        <div className="text-center p-8">
          <h1 className="text-xl font-bold text-red-600 mb-4">Error Loading Tournament</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!tournament) {
    return (
      <div className="print-error">
        <div className="text-center p-8">
          <h1 className="text-xl font-bold text-red-600 mb-4">Tournament Not Found</h1>
          <p className="text-gray-600">The requested tournament could not be found.</p>
        </div>
      </div>
    )
  }

  const allPlayers = getAllActivePlayers()

  return (
    <>
      {/* Print-specific styles */}
      <style>{`
        @media print {
          body { margin: 0; font-size: 12pt; }
          .page-break { page-break-after: always; }
          .no-print { display: none !important; }
          .print-only { display: block !important; }
        }
        
        @media screen {
          .print-only { display: none; }
          .print-container { 
            max-width: 8.5in; 
            margin: 0 auto; 
            background: white; 
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
          }
          .page-break { 
            border-bottom: 2px dashed #ccc; 
            margin: 2rem 0; 
            padding-bottom: 2rem;
          }
        }
        
        .print-container {
          font-family: 'Arial', sans-serif;
          line-height: 1.4;
          color: #000;
        }
        
        .print-page {
          padding: 0.75in;
          min-height: 10in;
        }
        
        .print-header {
          text-align: center;
          margin-bottom: 1.5rem;
          border-bottom: 2px solid #333;
          padding-bottom: 1rem;
        }
        
        .print-title {
          font-size: 24pt;
          font-weight: bold;
          margin-bottom: 0.5rem;
        }
        
        .print-subtitle {
          font-size: 14pt;
          color: #666;
          margin-bottom: 0.25rem;
        }
        
        .print-date {
          font-size: 11pt;
          color: #888;
        }
      `}</style>

      {/* Screen-only navigation and controls */}
      <div className="no-print bg-gray-100 p-4 border-b">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">Print Schedule: {tournament.name}</h1>
            <p className="text-gray-600">
              This page is optimized for printing. Use your browser's print function (Ctrl+P / Cmd+P)
            </p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => window.print()} 
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Print
            </button>
            <button 
              onClick={() => window.history.back()} 
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Back
            </button>
          </div>
        </div>
      </div>

      {/* Print content */}
      <div className="print-container">
        {/* Page 1: Tournament Overview */}
        <div className="print-page">
          <TournamentOverviewPage tournament={tournament} allPlayers={allPlayers} />
        </div>
        <div className="page-break"></div>

        {/* Page 2: Master Schedule */}
        <div className="print-page">
          <MasterSchedulePage tournament={tournament} />
        </div>
        <div className="page-break"></div>

        {/* Pages 3+: Individual Player Schedules */}
        {allPlayers.map((player, index) => (
          <React.Fragment key={player.id}>
            <div className="print-page">
              <PlayerSchedulePage 
                tournament={tournament} 
                player={player} 
                playerNumber={index + 1}
                totalPlayers={allPlayers.length}
              />
            </div>
            {index < allPlayers.length - 1 && <div className="page-break"></div>}
          </React.Fragment>
        ))}
        
        <div className="page-break"></div>

        {/* Final Page: Station Breakdown */}
        <div className="print-page">
          <StationBreakdownPage tournament={tournament} />
        </div>
        
        <div className="page-break"></div>

        {/* Final Page: Team Scoring Summary */}
        <div className="print-page">
          <TeamScoringSheet tournament={tournament} />
        </div>
      </div>
    </>
  )
}

export default PrintSchedule