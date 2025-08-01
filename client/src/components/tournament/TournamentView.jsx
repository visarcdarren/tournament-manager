import React, { useState, useEffect } from 'react'
import { ArrowLeft, Settings, Users, Play, Trophy, Clock, Shield, Eye, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { useNavigate } from '@/App'
import api from '@/utils/api'
import useDeviceStore from '@/stores/deviceStore'
import useTournamentStore from '@/stores/tournamentStore'
import TournamentSetup from './TournamentSetup'
import TeamManagement from './TeamManagement'
import LiveTournament from './LiveTournament'
import Leaderboard from './Leaderboard'
import CompletionScreen from './CompletionScreen'
import DevicePermissions from './DevicePermissions'
import RoleRequestDialog from './RoleRequestDialog'
import { getCurrentRound, isTournamentComplete } from '@/utils/tournament'

export default function TournamentView({ tournamentId }) {
  const navigate = useNavigate()
  const { toast } = useToast()
  const deviceStore = useDeviceStore()
  const tournamentStore = useTournamentStore()
  const [activeTab, setActiveTab] = useState('setup')
  const [showRoleRequest, setShowRoleRequest] = useState(false)
  
  const { tournament, userRole, isLoading } = tournamentStore
  
  // Load tournament and connect to SSE
  useEffect(() => {
    if (!tournamentId) return
    
    loadTournament()
    connectToEvents()
    
    return () => {
      tournamentStore.reset()
    }
  }, [tournamentId])
  
  // Update active tab based on tournament state
  useEffect(() => {
    if (!tournament) return
    
    // Only show completion screen if tournament is actually complete
    if (tournament.currentState?.status === 'completed' || (tournament.schedule?.length > 0 && isTournamentComplete(tournament))) {
      setActiveTab('completion')
    } else if (tournament.currentState?.status === 'active') {
      setActiveTab('live')
    } else if (tournament.teams?.length >= 2) {
      setActiveTab('teams')
    } else {
      setActiveTab('setup')
    }
  }, [tournament])
  
  const loadTournament = async () => {
    try {
      tournamentStore.setLoading(true)
      const data = await api.getTournament(tournamentId)
      tournamentStore.setTournament(data)
      tournamentStore.setUserRole(data.userRole || 'VIEWER')
      
      // Update device role
      deviceStore.setRole(data.userRole || 'VIEWER')
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load tournament',
        variant: 'destructive'
      })
      navigate('/')
    } finally {
      tournamentStore.setLoading(false)
    }
  }
  
  const connectToEvents = () => {
    const eventSource = api.connectToEvents(tournamentId, {
      'tournament-update': (data) => {
        tournamentStore.setTournament(data)
      },
      'game-scored': (data) => {
        tournamentStore.updateGameResult(data.round, data.gameId, data.result)
        toast({
          title: 'Game Scored',
          description: `Round ${data.round} game updated`
        })
      },
      'timer-countdown': (data) => {
        tournamentStore.updateTimerStatus(data.round, { status: 'countdown' })
      },
      'timer-started': (data) => {
        tournamentStore.updateTimerStatus(data.round, { 
          status: 'running',
          expiresAt: data.expiresAt 
        })
      },
      'role-request': (data) => {
        if (userRole === 'ADMIN') {
          toast({
            title: 'New Role Request',
            description: `${data.deviceName} requests scorer access`
          })
          loadTournament() // Reload to get pending requests
        }
      },
      'role-granted': (data) => {
        if (data.deviceId === deviceStore.deviceId) {
          toast({
            title: 'Access Granted',
            description: 'You now have scorer permissions'
          })
          loadTournament()
        }
      },
      'role-revoked': (data) => {
        if (data.deviceId === deviceStore.deviceId) {
          toast({
            title: 'Access Revoked',
            description: 'Your scorer permissions have been removed',
            variant: 'destructive'
          })
          loadTournament()
        }
      },
      'connected': () => {
        tournamentStore.setConnected(true)
      },
      'error': (error) => {
        tournamentStore.setConnected(false)
        console.error('SSE error:', error)
      }
    })
    
    tournamentStore.setEventSource(eventSource)
  }
  
  const exportTournament = async () => {
    try {
      await api.exportTournament(tournamentId)
      toast({
        title: 'Success',
        description: 'Tournament exported successfully'
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to export tournament',
        variant: 'destructive'
      })
    }
  }
  
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-muted-foreground">Loading tournament...</p>
        </div>
      </div>
    )
  }
  
  if (!tournament) {
    return null
  }
  
  const isAdmin = userRole === 'ADMIN'
  const isScorer = userRole === 'SCORER' || isAdmin
  const currentRound = getCurrentRound(tournament)
  const isComplete = isTournamentComplete(tournament)
  
  return (
    <div className="min-h-screen bg-background" style={{ minHeight: '100vh', backgroundColor: '#0f172a', color: '#f8fafc' }}>
      {/* Header */}
      <div className="border-b bg-card" style={{ borderBottom: '1px solid #334155', backgroundColor: '#1e293b' }}>
        <div className="mx-auto max-w-7xl px-4 py-4" style={{ maxWidth: '80rem', padding: '1rem' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold">{tournament.name}</h1>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    {userRole === 'ADMIN' ? (
                      <Shield className="h-3 w-3" />
                    ) : userRole === 'SCORER' ? (
                      <Users className="h-3 w-3" />
                    ) : (
                      <Eye className="h-3 w-3" />
                    )}
                    {userRole}
                  </span>
                  {tournament.currentState.status === 'active' && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Round {currentRound} of {tournament.settings.rounds}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {userRole === 'VIEWER' && !isComplete && (
                <Button variant="outline" onClick={() => setShowRoleRequest(true)}>
                  Request Scorer Access
                </Button>
              )}
              {isAdmin && (
                <Button variant="outline" size="icon" onClick={exportTournament}>
                  <Download className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="mx-auto max-w-7xl p-4" style={{ maxWidth: '80rem', padding: '1rem' }}>
        {isComplete && tournament.schedule?.length > 0 ? (
          <CompletionScreen tournament={tournament} />
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="setup" disabled={!isAdmin}>
                <Settings className="mr-2 h-4 w-4" />
                Setup
              </TabsTrigger>
              <TabsTrigger value="teams" disabled={!isAdmin}>
                <Users className="mr-2 h-4 w-4" />
                Teams
              </TabsTrigger>
              <TabsTrigger value="live" disabled={tournament.currentState.status !== 'active'}>
                <Play className="mr-2 h-4 w-4" />
                Live
              </TabsTrigger>
              <TabsTrigger value="leaderboard">
                <Trophy className="mr-2 h-4 w-4" />
                Leaderboard
              </TabsTrigger>
              {isAdmin && (
                <TabsTrigger value="devices">
                  <Shield className="mr-2 h-4 w-4" />
                  Devices
                </TabsTrigger>
              )}
            </TabsList>
            
            <TabsContent value="setup">
              <TournamentSetup tournament={tournament} isAdmin={isAdmin} />
            </TabsContent>
            
            <TabsContent value="teams">
              <TeamManagement tournament={tournament} isAdmin={isAdmin} />
            </TabsContent>
            
            <TabsContent value="live">
              <LiveTournament 
                tournament={tournament} 
                currentRound={currentRound}
                isAdmin={isAdmin}
                isScorer={isScorer}
              />
            </TabsContent>
            
            <TabsContent value="leaderboard">
              <Leaderboard tournament={tournament} />
            </TabsContent>
            
            {isAdmin && (
              <TabsContent value="devices">
                <DevicePermissions tournament={tournament} />
              </TabsContent>
            )}
          </Tabs>
        )}
      </div>
      
      {/* Role Request Dialog */}
      <RoleRequestDialog 
        open={showRoleRequest} 
        onOpenChange={setShowRoleRequest}
        tournamentId={tournamentId}
      />
    </div>
  )
}
