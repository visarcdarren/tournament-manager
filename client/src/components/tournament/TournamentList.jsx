import React, { useState } from 'react'
import { Plus, Trophy, Calendar, Users, Download, Upload, KeyRound } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { useNavigate } from '@/App'
import api from '@/utils/api'
import useDeviceStore from '@/stores/deviceStore'
import SuperuserLoginDialog from './SuperuserLoginDialog'

export default function TournamentList() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const deviceStore = useDeviceStore()
  const [tournaments, setTournaments] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showSuperuserDialog, setShowSuperuserDialog] = useState(false)
  const [selectedTournamentForLogin, setSelectedTournamentForLogin] = useState(null)
  const [newTournamentName, setNewTournamentName] = useState('')
  
  // Initialize device on mount
  React.useEffect(() => {
    deviceStore.initializeDevice()
    window.deviceStore = deviceStore // Make available globally for API
    loadTournaments()
  }, [])
  
  const loadTournaments = async () => {
    try {
      setIsLoading(true)
      const data = await api.getTournaments()
      setTournaments(data)
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
  
  const handleSuperuserLogin = (tournamentId) => {
    setSelectedTournamentForLogin(tournamentId)
    setShowSuperuserDialog(true)
  }
  
  const onSuperuserLoginSuccess = () => {
    if (selectedTournamentForLogin) {
      navigate(`/tournament/${selectedTournamentForLogin}`)
    }
  }
  
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
          gameTypes: [
            {
              id: 'shuffleboard',
              name: 'Shuffleboard',
              playersPerTeam: 1,
              stations: [
                { id: 'shuffleboard-1', name: 'Shuffleboard 1' },
                { id: 'shuffleboard-2', name: 'Shuffleboard 2' }
              ]
            },
            {
              id: 'darts',
              name: 'Darts',
              playersPerTeam: 1,
              stations: [
                { id: 'darts-1', name: 'Darts 1' },
                { id: 'darts-2', name: 'Darts 2' }
              ]
            }
          ],
          timer: {
            enabled: false,
            duration: 30
          },
          rounds: 6,
          scoring: { win: 3, draw: 1, loss: 0 }
        },
        teams: [],
        schedule: [],
        currentState: { round: 1, status: 'setup' }
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
    <div className="min-h-screen bg-background flex flex-col" style={{ backgroundColor: '#0f172a', color: '#f8fafc', minHeight: '100vh' }}>
      <div className="flex-1 p-4" style={{ flex: 1, padding: '1rem' }}>
        <div className="mx-auto max-w-6xl" style={{ maxWidth: '72rem', margin: '0 auto' }}>
        <div className="mb-8 flex items-center justify-between" style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 className="text-4xl font-bold" style={{ fontSize: '2.25rem', fontWeight: 'bold' }}>Tournament Manager</h1>
            <p className="text-muted-foreground" style={{ color: '#94a3b8' }}>Tournament management for parties</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => document.getElementById('import-file').click()}>
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
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  New Tournament
                </Button>
              </DialogTrigger>
              <DialogContent>
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
                      placeholder="Summer League 2024"
                      onKeyDown={(e) => e.key === 'Enter' && createTournament()}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" onClick={createTournament}>
                    Create Tournament
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
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
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {tournaments.map((tournament) => (
              <Card
                key={tournament.id}
                className="cursor-pointer transition-colors hover:bg-accent"
                onClick={() => navigate(`/tournament/${tournament.id}`)}
              >
                <CardHeader>
                  <CardTitle>{tournament.name}</CardTitle>
                  <CardDescription>
                    <span className="flex items-center gap-4 text-sm">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(tournament.created).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {tournament.status}
                      </span>
                    </span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    tournament.status === 'completed' ? 'bg-green-100 text-green-800' :
                    tournament.status === 'active' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {tournament.status}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        </div>
      </div>
      
      {/* Footer */}
      <footer className="mt-auto border-t" style={{ marginTop: 'auto', borderTop: '1px solid #334155', backgroundColor: '#1e293b' }}>
        <div className="mx-auto max-w-6xl px-4 py-6" style={{ maxWidth: '72rem', margin: '0 auto', padding: '1.5rem 1rem' }}>
          <div className="flex items-center justify-between text-sm text-muted-foreground" style={{ fontSize: '0.875rem', color: '#94a3b8' }}>
            <div>
              <p>© 2025 Visarc Ltd</p>
              <p className="text-xs mt-1" style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>Built by AI under the supervision of humans and a Franc</p>
            </div>
            {tournaments.length > 0 && (
              <button
                onClick={() => handleSuperuserLogin(tournaments[0].id)}
                className="hover:text-primary transition-colors"
                style={{ cursor: 'pointer', textDecoration: 'none' }}
              >
                <span className="flex items-center gap-1">
                  <KeyRound className="h-3 w-3" />
                  Superuser Login
                </span>
              </button>
            )}
          </div>
        </div>
      </footer>
      
      {/* Superuser Login Dialog */}
      {showSuperuserDialog && (
        <SuperuserLoginDialog
          open={showSuperuserDialog}
          onOpenChange={setShowSuperuserDialog}
          tournamentId={selectedTournamentForLogin}
          onSuccess={onSuperuserLoginSuccess}
        />
      )}
    </div>
  )
}
