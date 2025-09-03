import React, { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Settings, Users, Play, Trophy, Clock, Eye, Download, Trash2, Calendar, Globe, Lock, Share, User, Shield, Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import PlayerPoolManager from './PlayerPoolManager'
import ScheduleViewer from './ScheduleViewer'
import DevicePermissions from './DevicePermissions'
import { getCurrentRound, isTournamentComplete } from '@/utils/tournament'

export default function TournamentView({ tournamentId }) {
  const navigate = useNavigate()
  const { toast } = useToast()
  const deviceStore = useDeviceStore()
  const tournamentStore = useTournamentStore()
  const [activeTab, setActiveTab] = useState('setup')
  const manualTabChangeRef = useRef(false) // Use ref instead of state for immediate updates
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showShareDialog, setShowShareDialog] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  
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
  
  // Reset manual flag when tournament status changes significantly
  useEffect(() => {
    if (!tournament) return
    
    // Reset manual flag if tournament becomes active or completed
    if (tournament.currentState?.status === 'active' || 
        tournament.currentState?.status === 'completed' ||
        (tournament.schedule?.length > 0 && isTournamentComplete(tournament))) {
      manualTabChangeRef.current = false
    }
  }, [tournament?.currentState?.status, tournament?.schedule])

  // Update active tab based on tournament state (but not if user manually changed it)
  useEffect(() => {
    if (!tournament || manualTabChangeRef.current) {
      return
    }
    
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
      
      // Role is now 'ADMIN', 'SCORER', or 'VIEWER'
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
      'tournament-reset': (data) => {
        tournamentStore.setTournament(data)
        toast({
          title: 'Tournament Reset',
          description: 'Tournament has been reset to setup state',
        })
      },
      'tournament-rescheduled': (data) => {
        tournamentStore.setTournament(data)
        toast({
          title: 'Schedule Regenerated',
          description: 'Tournament schedule has been regenerated with new matchups',
        })
      },
      'tournament-deleted': (data) => {
        toast({
          title: 'Tournament Deleted',
          description: 'This tournament has been deleted',
          variant: 'destructive'
        })
        navigate('/')
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
  
  const deleteTournament = async () => {
    setIsDeleting(true)
    try {
      await api.deleteTournament(tournamentId)
      toast({
        title: 'Success',
        description: 'Tournament deleted successfully'
      })
      navigate('/')
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete tournament',
        variant: 'destructive'
      })
      setIsDeleting(false)
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
  const isScorer = userRole === 'SCORER' || userRole === 'ADMIN'
  const isOriginalAdmin = tournament.isOriginalAdmin
  const currentRound = getCurrentRound(tournament)
  const isComplete = isTournamentComplete(tournament)
  
  // Determine tournament phase for mobile navigation
  const isInSetupPhase = tournament.currentState?.status === 'setup' && (!tournament.schedule || tournament.schedule.length === 0)
  
  // Get mobile bottom tabs based on tournament state
  const getMobileBottomTabs = () => {
    if (isInSetupPhase) {
      // Setup phase: Setup, Players, Teams
      return [
        { id: 'setup', icon: Settings, label: 'Setup', disabled: !isAdmin },
        { id: 'players', icon: User, label: 'Players', disabled: !isAdmin },
        { id: 'teams', icon: Users, label: 'Teams', disabled: !isAdmin }
      ]
    } else {
      // Active/Running phase: Schedule, Live, Leaderboard
      // Now that Schedule page has start button, we can show consistent nav
      return [
        { id: 'schedule', icon: Calendar, label: 'Schedule', disabled: !tournament.schedule || tournament.schedule.length === 0 },
        { id: 'live', icon: Play, label: 'Live', disabled: tournament.currentState?.status !== 'active' },
        { id: 'leaderboard', icon: Trophy, label: 'Leaderboard', disabled: false }
      ]
    }
  }
  
  // Get hamburger menu items based on tournament state
  const getHamburgerItems = () => {
    if (isInSetupPhase) {
      // Setup phase: Devices in hamburger
      return isAdmin ? [
        { id: 'devices', icon: Shield, label: 'Devices' }
      ] : []
    } else {
      // Active/Running phase: Setup, Players, Teams, Devices in hamburger
      // Now Teams is always in hamburger since it's not needed in bottom nav for start button
      const items = []
      if (isAdmin) {
        items.push(
          { id: 'setup', icon: Settings, label: 'Setup' },
          { id: 'players', icon: User, label: 'Players' },
          { id: 'teams', icon: Users, label: 'Teams' },
          { id: 'devices', icon: Shield, label: 'Devices' }
        )
      }
      return items
    }
  }
  
  const togglePublicStatus = async () => {
    const wasPublic = tournament.isPublic
    
    try {
      await api.toggleTournamentPublic(tournamentId)
      
      // Show share dialog if tournament was just made public
      if (!wasPublic) {
        setShowShareDialog(true)
      }
      
      toast({
        title: 'Success',
        description: `Tournament is now ${wasPublic ? 'private' : 'public'}`
      })
      loadTournament() // Reload to get updated status
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update tournament visibility',
        variant: 'destructive'
      })
    }
  }
  
  const shareUrl = `${window.location.origin}/tournament/${tournamentId}`
  
  // Start tournament function to pass to ScheduleViewer
  const handleStartTournament = async () => {
    try {
      const validation = await api.validateTournament(tournament.id)
      
      if (!validation.valid) {
        toast({
          title: 'Cannot Start Tournament',
          description: validation.errors.join(', '),
          variant: 'destructive'
        })
        return
      }
      
      if (validation.warnings && validation.warnings.length > 0) {
        validation.warnings.forEach(warning => {
          toast({
            title: 'Warning',
            description: warning
          })
        })
      }
      
      const response = await api.generateSchedule(tournament.id)
      
      toast({
        title: 'Tournament Started!',
        description: `Started with ${response.schedule.length} rounds and ${response.schedule.reduce((sum, r) => sum + r.games.length, 0)} total games`
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to start tournament',
        variant: 'destructive'
      })
    }
  }
  
  const handleShare = async () => {
    const shareData = {
      title: `${tournament.name} - Tournament`,
      text: `Follow the ${tournament.name} tournament progress`,
      url: shareUrl
    }
    
    try {
      // Use native sharing if available (mobile)
      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData)
        return
      }
    } catch (error) {
      console.log('Native sharing failed, falling back to clipboard')
    }
    
    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(shareUrl)
      toast({
        title: 'Link Copied!',
        description: 'Tournament link copied to clipboard'
      })
    } catch (error) {
      // Ultimate fallback: show the dialog
      setShowShareDialog(true)
    }
  }
  
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              {/* Back button - larger on mobile */}
              <button 
                onClick={() => navigate('/')} 
                className="h-12 w-12 sm:h-10 sm:w-10 flex-shrink-0 p-0 flex items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground transition-colors md:hidden"
                style={{ minWidth: '48px', minHeight: '48px' }}
              >
                <ArrowLeft 
                  style={{ 
                    width: '28px', 
                    height: '28px', 
                    minWidth: '28px', 
                    minHeight: '28px',
                    flexShrink: 0 
                  }} 
                />
              </button>
              {/* Desktop back button */}
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => navigate('/')} 
                className="hidden md:flex flex-shrink-0"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-xl lg:text-2xl font-bold truncate">
                  {tournament.name}
                </h1>
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Eye className="h-3 w-3 flex-shrink-0" />
                    {isAdmin ? (isOriginalAdmin ? 'Original Admin' : 'Admin') : (userRole === 'SCORER' ? 'Scorer' : 'Viewer')}
                  </span>
                  {tournament.currentState.status === 'active' && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3 flex-shrink-0" />
                      Round {currentRound} of {tournament.settings.rounds}
                    </span>
                  )}
                </div>
              </div>
              {/* Mobile hamburger menu button */}
              {getHamburgerItems().length > 0 && (
                <>
                  {/* Mobile hamburger - larger */}
                  <button 
                    onClick={() => setShowMobileMenu(true)}
                    className="h-12 w-12 flex-shrink-0 md:hidden p-0 flex items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
                    style={{ minWidth: '48px', minHeight: '48px' }}
                  >
                    <Menu 
                      style={{ 
                        width: '28px', 
                        height: '28px', 
                        minWidth: '28px', 
                        minHeight: '28px',
                        flexShrink: 0 
                      }} 
                    />
                  </button>
                  {/* Desktop hamburger - normal size */}
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => setShowMobileMenu(true)}
                    className="hidden md:flex flex-shrink-0"
                  >
                    <Menu className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              {/* Header actions removed - moved to Setup tab */}
            </div>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="mx-auto max-w-7xl p-4 sm:p-6 pb-20 md:pb-6">
        {isComplete && tournament.schedule?.length > 0 ? (
          <CompletionScreen tournament={tournament} />
        ) : (
          <Tabs value={activeTab} onValueChange={(value) => {
            manualTabChangeRef.current = true
            setActiveTab(value)
            setShowMobileMenu(false) // Close mobile menu when tab changes
          }}>
            {/* Desktop Navigation - completely hidden on mobile */}
            <div className="hidden md:block">
              <TabsList className="w-full grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 h-auto">
              <TabsTrigger value="setup" disabled={!isAdmin} className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 px-2 sm:px-4">
                <Settings className="h-4 w-4 flex-shrink-0" />
                <span className="text-xs sm:text-sm">Setup</span>
              </TabsTrigger>
              <TabsTrigger value="players" disabled={!isAdmin} className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 px-2 sm:px-4">
                <User className="h-4 w-4 flex-shrink-0" />
                <span className="text-xs sm:text-sm">Players</span>
              </TabsTrigger>
              <TabsTrigger value="teams" disabled={!isAdmin} className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 px-2 sm:px-4">
                <Users className="h-4 w-4 flex-shrink-0" />
                <span className="text-xs sm:text-sm">Teams</span>
              </TabsTrigger>
              <TabsTrigger value="schedule" disabled={!tournament.schedule || tournament.schedule.length === 0} className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 px-2 sm:px-4">
                <Calendar className="h-4 w-4 flex-shrink-0" />
                <span className="text-xs sm:text-sm">Schedule</span>
              </TabsTrigger>
              <TabsTrigger value="live" disabled={tournament.currentState.status !== 'active'} className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 px-2 sm:px-4">
                <Play className="h-4 w-4 flex-shrink-0" />
                <span className="text-xs sm:text-sm">Live</span>
              </TabsTrigger>
              <TabsTrigger value="leaderboard" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 px-2 sm:px-4">
                <Trophy className="h-4 w-4 flex-shrink-0" />
                <span className="text-xs sm:text-sm">Leaderboard</span>
              </TabsTrigger>
              {isAdmin && (
                <TabsTrigger value="devices" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 px-2 sm:px-4">
                  <Shield className="h-4 w-4 flex-shrink-0" />
                  <span className="text-xs sm:text-sm">Devices</span>
                </TabsTrigger>
              )}
              </TabsList>
            </div>
            
            <TabsContent value="setup">
              <TournamentSetup 
                tournament={tournament} 
                isAdmin={isAdmin}
                isOriginalAdmin={isOriginalAdmin}
                onNavigateToPlayers={() => {
                  manualTabChangeRef.current = true
                  setActiveTab('players')
                }}
                onTogglePublicStatus={togglePublicStatus}
                onExportTournament={exportTournament}
                onDeleteTournament={() => setShowDeleteDialog(true)}
                onShare={handleShare}
              />
            </TabsContent>
            
            <TabsContent value="players">
              <PlayerPoolManager 
                tournament={tournament} 
                isAdmin={isAdmin}
                onNavigateToTeams={() => {
                  manualTabChangeRef.current = true
                  setActiveTab('teams')
                }}
              />
            </TabsContent>
            
            <TabsContent value="teams">
              <TeamManagement tournament={tournament} isAdmin={isAdmin} />
            </TabsContent>
            
            <TabsContent value="schedule">
              <ScheduleViewer 
                tournament={tournament} 
                isAdmin={isAdmin} 
                onStartTournament={handleStartTournament}
              />
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
                <DevicePermissions 
                  tournament={tournament} 
                  isOriginalAdmin={isOriginalAdmin}
                />
              </TabsContent>
            )}
          </Tabs>
        )}
      </div>
      
      {/* Mobile Bottom Navigation - only visible on mobile */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t md:hidden safe-bottom z-50">
        <div className="grid grid-cols-3 h-16">
          {getMobileBottomTabs().map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => {
                  if (!tab.disabled) {
                    manualTabChangeRef.current = true
                    setActiveTab(tab.id)
                  }
                }}
                disabled={tab.disabled}
                className={`flex flex-col items-center justify-center gap-1 transition-colors ${
                  activeTab === tab.id 
                    ? 'text-primary bg-primary/10' 
                    : tab.disabled 
                      ? 'text-muted-foreground opacity-50'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs font-medium">{tab.label}</span>
              </button>
            )
          })}
        </div>
      </div>
      
      {/* Mobile Hamburger Menu */}
      <Dialog open={showMobileMenu} onOpenChange={setShowMobileMenu}>
        <DialogContent className="mx-4 max-w-sm [&>button]:hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>More Options</span>
              <Button 
                variant="ghost" 
                onClick={() => setShowMobileMenu(false)}
                className="h-10 w-10 p-0 flex items-center justify-center"
              >
                <X className="h-6 w-6" style={{ flexShrink: 0 }} />
              </Button>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-4">
            {getHamburgerItems().map(item => {
              const Icon = item.icon
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    manualTabChangeRef.current = true
                    setActiveTab(item.id)
                    setShowMobileMenu(false)
                  }}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                    activeTab === item.id
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-accent'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="font-medium">{item.label}</span>
                </button>
              )
            })}
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Tournament</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{tournament?.name}"? This action cannot be undone.
              All tournament data, game results, and history will be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                deleteTournament()
                setShowDeleteDialog(false)
              }}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete Tournament'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Share Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="mx-4 max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share className="h-5 w-5" />
              Share Tournament
            </DialogTitle>
            <DialogDescription>
              Your tournament is now public! Share this link so others can follow the progress.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tournament Link:</label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input 
                  type="text" 
                  value={shareUrl}
                  readOnly
                  className="flex-1 px-3 py-2 text-sm border rounded-md bg-gray-50 text-gray-700 min-w-0"
                  onClick={(e) => e.target.select()}
                />
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(shareUrl)
                      toast({
                        title: 'Copied!',
                        description: 'Link copied to clipboard'
                      })
                    } catch (error) {
                      toast({
                        title: 'Error',
                        description: 'Could not copy to clipboard',
                        variant: 'destructive'
                      })
                    }
                  }}
                  className="w-full sm:w-auto flex-shrink-0"
                >
                  Copy
                </Button>
              </div>
            </div>
            
            <div className="text-sm text-muted-foreground space-y-1">
              <p>• Others can view tournament progress in real-time</p>
              <p>• They can see schedules, scores, and leaderboards</p>
              <p>• Only you can edit or score games</p>
            </div>
            
            {/* Native share button for mobile */}
            {navigator.share && (
              <Button 
                onClick={async () => {
                  try {
                    await navigator.share({
                      title: `${tournament.name} - Tournament`,
                      text: `Follow the ${tournament.name} tournament progress`,
                      url: shareUrl
                    })
                    setShowShareDialog(false)
                  } catch (error) {
                    console.log('User cancelled sharing')
                  }
                }}
                className="w-full"
              >
                <Share className="mr-2 h-4 w-4" />
                Share via Apps
              </Button>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowShareDialog(false)} className="w-full">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
