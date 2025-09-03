import React, { useState } from 'react'
import { Plus, Trophy, Calendar, Users, Download, Upload, Globe, Lock } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { useNavigate } from '@/App'
import api from '@/utils/api'
import useDeviceStore from '@/stores/deviceStore'
import MobileInstallBanner from '@/components/common/MobileInstallBanner'

// Tournament card component for reuse
function TournamentCard({ tournament, navigate, showAdminControls }) {
  const { toast } = useToast()
  
  return (
    <Card className="transition-colors hover:bg-accent">
      <div
        className="cursor-pointer"
        onClick={() => navigate(`/tournament/${tournament.id}`)}
      >
        <CardHeader className="pb-4">
          {/* Tournament Name - Full width, no truncating */}
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg mb-4">
            <span className="flex-1">{tournament.name}</span>
            {tournament.isPublic ? (
              <Globe className="h-4 w-4 text-green-600 flex-shrink-0" title="Public - Anyone can view this tournament" />
            ) : (
              <Lock className="h-4 w-4 text-red-600 flex-shrink-0" title="Private - Only authorized users can view this tournament" />
            )}
          </CardTitle>
          
          <div className="space-y-3">
            {/* Games being played */}
            <div className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Games: </span>
              {tournament.settings?.gameTypes?.length > 0 ? (
                <span>{tournament.settings.gameTypes.map(gt => gt.name).join(', ')}</span>
              ) : (
                <span className="text-muted-foreground/70">No games configured</span>
              )}
            </div>
            
            {/* Teams and Players */}
            <div className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Format: </span>
              <span>
                {tournament.settings?.teams || 0} teams, {tournament.settings?.playersPerTeam || 0} players each
              </span>
            </div>
            
            {/* Created date */}
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Calendar className="h-3 w-3 flex-shrink-0" />
              <span>Created {new Date(tournament.created).toLocaleDateString()}</span>
            </div>
            
            {/* Status - Final row */}
            <div className="flex items-center gap-1 pt-1">
              <Users className="h-3 w-3 flex-shrink-0" />
              <span className="text-sm font-medium">
                {tournament.status === 'setup' ? 'Setup' :
                 tournament.status === 'active' ? 'Active' :
                 tournament.status === 'completed' ? 'Complete' :
                 tournament.status}
              </span>
            </div>
          </div>
        </CardHeader>
      </div>
    </Card>
  )
}

export default function TournamentList() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const deviceStore = useDeviceStore()
  const [tournaments, setTournaments] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newTournamentName, setNewTournamentName] = useState('')
  
  // Initialize device on mount
  React.useEffect(() => {
    // Device is already initialized in App.jsx, just make it available
    window.deviceStore = useDeviceStore.getState()
    loadTournaments()
  }, [])
  
  const loadTournaments = async () => {
    try {
      setIsLoading(true)
      const data = await api.getTournaments()
      
      // API now returns { myTournaments, publicTournaments }
      const allTournaments = [
        ...data.myTournaments.map(t => ({ ...t, section: 'mine' })),
        ...data.publicTournaments.map(t => ({ ...t, section: 'public' }))
      ]
      
      setTournaments(allTournaments)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load tournaments',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }
  
  // Removed: Superuser functionality - no longer needed
  // Tournament creators have full control of their own tournaments
  
  const createTournament = async () => {
    if (!newTournamentName.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a tournament name',
        variant: 'destructive'
      })
      return
    }
    
    try {
      const tournament = await api.createTournament({
        name: newTournamentName,
        settings: {
          teams: 4,
          playersPerTeam: 6,
          gameTypes: [], // Start with empty game types array
          timer: {
            enabled: false,
            duration: 30
          },
          rounds: 6,
          scoring: { win: 3, draw: 1, loss: 0 }
        },
        teams: [],
        playerPool: [],
        schedule: [],
        currentState: { round: 1, status: 'setup' },
        isPublic: false // Start as private
      })
      
      setShowCreateDialog(false)
      setNewTournamentName('')
      navigate(`/tournament/${tournament.id}`)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create tournament',
        variant: 'destructive'
      })
    }
  }
  
  const handleImport = async (event) => {
    const file = event.target.files[0]
    if (!file) return
    
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      const result = await api.importTournament(data)
      
      toast({
        title: 'Success',
        description: 'Tournament imported successfully'
      })
      
      navigate(`/tournament/${result.id}`)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to import tournament',
        variant: 'destructive'
      })
    }
  }
  
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Mobile Install Banner */}
      <MobileInstallBanner />
      
      <div className="flex-1 p-3 sm:p-4">
        <div className="mx-auto max-w-6xl">
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">Visarc Tournament Manager</h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                Tournament management for game parties
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Button variant="outline" onClick={() => document.getElementById('import-file').click()} className="w-full sm:w-auto">
                <Upload className="mr-2 h-4 w-4" />
                Import
              </Button>
              <input
                id="import-file"
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleImport}
              />
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button className="w-full sm:w-auto">
                    <Plus className="mr-2 h-4 w-4" />
                    New Tournament
                  </Button>
                </DialogTrigger>
                <DialogContent className="mx-4 max-w-md">
                  <DialogHeader>
                    <DialogTitle>Create New Tournament</DialogTitle>
                    <DialogDescription>
                      Enter a name for your tournament. You can configure teams and settings later.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="name">Tournament Name</Label>
                      <Input
                        id="name"
                        value={newTournamentName}
                        onChange={(e) => setNewTournamentName(e.target.value)}
                        placeholder="Summer League 2025"
                        onKeyDown={(e) => e.key === 'Enter' && createTournament()}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" onClick={createTournament} className="w-full">
                      Create Tournament
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
              <p className="text-muted-foreground">Loading tournaments...</p>
            </div>
          </div>
        ) : tournaments.length === 0 ? (
          <Card className="p-12 text-center">
            <Trophy className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">No tournaments yet</h3>
            <p className="mb-4 text-muted-foreground">Create your first tournament to get started</p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Tournament
            </Button>
          </Card>
        ) : (
          <div className="space-y-8">
            {/* My Tournaments Section */}
            {tournaments.filter(t => t.section === 'mine').length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-4">My Tournaments</h2>
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {tournaments.filter(t => t.section === 'mine').slice(0, 5).map((tournament) => (
                    <TournamentCard 
                    key={tournament.id} 
                    tournament={tournament} 
                    navigate={navigate} 
                    />
                  ))}
                </div>
                {tournaments.filter(t => t.section === 'mine').length > 5 && (
                  <Button variant="outline" className="mt-4">
                    Show More ({tournaments.filter(t => t.section === 'mine').length - 5} more)
                  </Button>
                )}
              </div>
            )}
            
            {/* Public Tournaments Section */}
            {tournaments.filter(t => t.section === 'public').length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Public Tournaments</h2>
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {tournaments.filter(t => t.section === 'public').slice(0, 5).map((tournament) => (
                    <TournamentCard 
                    key={tournament.id} 
                    tournament={tournament} 
                    navigate={navigate} 
                    />
                  ))}
                </div>
                {tournaments.filter(t => t.section === 'public').length > 5 && (
                  <Button variant="outline" className="mt-4">
                    Show More ({tournaments.filter(t => t.section === 'public').length - 5} more)
                  </Button>
                )}
              </div>
            )}
            
            {/* Show message if no tournaments in either section */}
            {tournaments.filter(t => t.section === 'mine').length === 0 && tournaments.filter(t => t.section === 'public').length === 0 && (
              <Card className="p-12 text-center">
                <Trophy className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="mb-2 text-lg font-semibold">No tournaments available</h3>
                <p className="mb-4 text-muted-foreground">Create your first tournament to get started</p>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Tournament
                </Button>
              </Card>
            )}
          </div>
        )}
        </div>
      </div>
      
      {/* Footer */}
      <footer className="mt-auto border-t bg-card">
        <div className="mx-auto max-w-6xl px-3 sm:px-4 py-4 sm:py-6">
          <div className="text-xs sm:text-sm text-muted-foreground text-center space-y-1">
            <p>© 2025 Visarc Ltd</p>
            <p className="text-xs">
              Built by AI under the supervision of humans and a Franc
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
