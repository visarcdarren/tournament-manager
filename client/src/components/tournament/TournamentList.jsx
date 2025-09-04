import React, { useState, useRef, useEffect } from 'react'
import { Plus, Trophy, Calendar, Users, Download, Upload, Globe, Lock, QrCode, Camera, Link, X, Scan } from 'lucide-react'
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
import QrScanner from 'qr-scanner'

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
  const [showAllMyTournaments, setShowAllMyTournaments] = useState(false)
  const [showAllPublicTournaments, setShowAllPublicTournaments] = useState(false)
  
  // Connect to tournament state
  const [showConnectDialog, setShowConnectDialog] = useState(false)
  const [connectMode, setConnectMode] = useState('scan') // 'scan' or 'paste'
  const [tournamentCode, setTournamentCode] = useState('')
  const [isScanning, setIsScanning] = useState(false)
  const [qrScanner, setQrScanner] = useState(null)
  const videoRef = useRef(null)
  
  // Initialize device on mount
  React.useEffect(() => {
    // Device is already initialized in App.jsx, just make it available
    window.deviceStore = useDeviceStore.getState()
    loadTournaments()
  }, [])
  
  // Cleanup QR scanner on unmount or when dialog closes
  useEffect(() => {
    return () => {
      if (qrScanner) {
        qrScanner.stop()
        qrScanner.destroy()
      }
    }
  }, [qrScanner])
  
  // Stop scanner when dialog closes
  useEffect(() => {
    if (!showConnectDialog && qrScanner) {
      qrScanner.stop()
      setQrScanner(null)
      setIsScanning(false)
    }
  }, [showConnectDialog, qrScanner])
  
  // Connect via tournament code
  const connectViaTournamentCode = () => {
    if (!tournamentCode.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a tournament code',
        variant: 'destructive'
      })
      return
    }
    
    // Extract tournament ID from code (could be full URL or just ID)
    let tournamentId = tournamentCode.trim()
    
    // If it's a URL, extract the ID
    if (tournamentId.includes('/tournament/')) {
      const match = tournamentId.match(/\/tournament\/([a-f0-9-]+)/i)
      if (match) {
        tournamentId = match[1]
      }
    }
    
    setShowConnectDialog(false)
    setTournamentCode('')
    navigate(`/tournament/${tournamentId}`)
  }
  
  // Start QR code scanning
  const startScanning = async () => {
    try {
      setIsScanning(true)
      
      // First check if we have camera permissions
      if (navigator.permissions) {
        try {
          const permission = await navigator.permissions.query({ name: 'camera' })
          console.log('Camera permission state:', permission.state)
          
          if (permission.state === 'denied') {
            throw new Error('Camera access was denied. Please enable camera permissions in your browser settings.')
          }
        } catch (permError) {
          console.log('Permission query not supported, continuing with camera request')
        }
      }
      
      // Request camera access explicitly first
      let stream
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: 'environment' // Try back camera first
          } 
        })
        console.log('Camera access granted')
        
        // Stop the test stream immediately
        stream.getTracks().forEach(track => track.stop())
      } catch (mediaError) {
        console.error('Camera access error:', mediaError)
        
        // Try again with any camera
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: true })
          console.log('Camera access granted (fallback)')
          stream.getTracks().forEach(track => track.stop())
        } catch (fallbackError) {
          console.error('Fallback camera access error:', fallbackError)
          
          let errorMessage = 'Could not access camera. '
          
          if (fallbackError.name === 'NotAllowedError') {
            errorMessage += 'Camera permission was denied. Please allow camera access and try again.'
          } else if (fallbackError.name === 'NotFoundError') {
            errorMessage += 'No camera found on this device.'
          } else if (fallbackError.name === 'NotSupportedError') {
            errorMessage += 'Camera is not supported in this browser.'
          } else if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
            errorMessage += 'Camera access requires HTTPS. Please use a secure connection.'
          } else {
            errorMessage += 'Please check your camera permissions and try again.'
          }
          
          throw new Error(errorMessage)
        }
      }
      
      if (!videoRef.current) {
        throw new Error('Video element not ready')
      }
      
      const scanner = new QrScanner(
        videoRef.current,
        (result) => {
          console.log('QR Code detected:', result.data)
          handleQrResult(result.data)
        },
        {
          highlightScanRegion: true,
          highlightCodeOutline: true,
          preferredCamera: 'environment', // Use back camera on mobile
          maxScansPerSecond: 5 // Limit scan frequency
        }
      )
      
      await scanner.start()
      setQrScanner(scanner)
      
      console.log('QR Scanner started successfully')
      
    } catch (error) {
      console.error('Failed to start QR scanner:', error)
      toast({
        title: 'Camera Error',
        description: error.message,
        variant: 'destructive'
      })
      setIsScanning(false)
    }
  }
  
  // Handle QR code result
  const handleQrResult = (data) => {
    console.log('Processing QR result:', data)
    
    // Stop scanning
    if (qrScanner) {
      qrScanner.stop()
      setQrScanner(null)
      setIsScanning(false)
    }
    
    // Extract tournament ID from various URL formats
    let tournamentId = null
    
    // Direct tournament ID
    if (/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(data)) {
      tournamentId = data
    }
    // Full URL: https://domain.com/tournament/id
    else if (data.includes('/tournament/')) {
      const match = data.match(/\/tournament\/([a-f0-9-]+)/i)
      if (match) {
        tournamentId = match[1]
      }
    }
    
    if (tournamentId) {
      setShowConnectDialog(false)
      navigate(`/tournament/${tournamentId}`)
    } else {
      toast({
        title: 'Invalid QR Code',
        description: 'This QR code does not contain a valid tournament link.',
        variant: 'destructive'
      })
      // Restart scanning
      setTimeout(startScanning, 1000)
    }
  }
  
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
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">TeamUp!</h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                Tournament management from Visarc
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:gap-4">
              {/* Mobile: 3-column layout with equal spacing */}
              <div className="grid grid-cols-3 gap-2 sm:hidden">
                <Button 
                  variant="outline" 
                  onClick={() => setShowConnectDialog(true)}
                  className="flex flex-col items-center justify-center h-16 text-xs"
                >
                  <QrCode className="h-5 w-5 mb-1" />
                  <span>Connect</span>
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => document.getElementById('import-file').click()}
                  className="flex flex-col items-center justify-center h-16 text-xs"
                >
                  <Upload className="h-5 w-5 mb-1" />
                  <span>Import</span>
                </Button>
                <Button 
                  onClick={() => setShowCreateDialog(true)}
                  className="flex flex-col items-center justify-center h-16 text-xs"
                >
                  <Plus className="h-5 w-5 mb-1" />
                  <span>Create</span>
                </Button>
              </div>
              
              {/* Desktop: Row layout */}
              <div className="hidden sm:flex sm:flex-row gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setShowConnectDialog(true)}
                  className="w-full sm:w-auto"
                >
                  <QrCode className="mr-2 h-4 w-4" />
                  Connect to Tournament
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => document.getElementById('import-file').click()}
                  className="w-full sm:w-auto"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Import
                </Button>
                <Button 
                  onClick={() => setShowCreateDialog(true)}
                  className="w-full sm:w-auto"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  New Tournament
                </Button>
              </div>
              </div>
              </div>
      
      {/* Hidden file input for import */}
      <input
        id="import-file"
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleImport}
      />
      
      {/* Create Tournament Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
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
      
      {/* Connect to Tournament Dialog */}
      <Dialog open={showConnectDialog} onOpenChange={setShowConnectDialog}>
        <DialogContent className="mx-4 max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              Connect to Tournament
            </DialogTitle>
            <DialogDescription>
              Join a tournament by scanning its QR code or entering the tournament link/code.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Mode Toggle */}
            <div className="flex rounded-lg border bg-muted p-1">
              <button
                onClick={() => setConnectMode('scan')}
                className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  connectMode === 'scan'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Camera className="mr-2 h-4 w-4 inline" />
                Scan QR Code
              </button>
              <button
                onClick={() => setConnectMode('paste')}
                className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  connectMode === 'paste'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Link className="mr-2 h-4 w-4 inline" />
                Enter Code
              </button>
            </div>
            
            {/* Scan Mode */}
            {connectMode === 'scan' && (
              <div className="space-y-4">
                {!isScanning ? (
                  <div className="text-center space-y-4">
                    <div className="w-48 h-48 mx-auto border-2 border-dashed border-muted-foreground/25 rounded-lg flex items-center justify-center">
                      <div className="text-center">
                        <Camera className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Camera preview will appear here</p>
                      </div>
                    </div>
                    <Button onClick={startScanning} className="w-full">
                      <Scan className="mr-2 h-4 w-4" />
                      Start Scanning
                    </Button>
                    <div className="text-xs text-muted-foreground space-y-2">
                      <p>• Your browser will ask for camera permission</p>
                      <p>• Make sure to allow camera access when prompted</p>
                      {window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && (
                        <p className="text-amber-600">⚠️ Camera requires HTTPS connection</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="relative">
                      <video
                        ref={videoRef}
                        className="w-full h-48 bg-black rounded-lg object-cover"
                        playsInline
                        muted
                      />
                      <div className="absolute inset-0 border-2 border-primary rounded-lg pointer-events-none">
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 border-2 border-primary rounded-lg"></div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          if (qrScanner) {
                            qrScanner.stop()
                            setQrScanner(null)
                          }
                          setIsScanning(false)
                        }}
                        className="flex-1"
                      >
                        <X className="mr-2 h-4 w-4" />
                        Stop
                      </Button>
                    </div>
                    <p className="text-sm text-center text-muted-foreground">
                      Point your camera at a tournament QR code
                    </p>
                  </div>
                )}
              </div>
            )}
            
            {/* Paste Mode */}
            {connectMode === 'paste' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="tournament-code">Tournament Link or Code</Label>
                  <Input
                    id="tournament-code"
                    value={tournamentCode}
                    onChange={(e) => setTournamentCode(e.target.value)}
                    placeholder="https://domain.com/tournament/abc123 or abc123"
                    onKeyDown={(e) => e.key === 'Enter' && connectViaTournamentCode()}
                  />
                </div>
                <Button onClick={connectViaTournamentCode} className="w-full" disabled={!tournamentCode.trim()}>
                  <Link className="mr-2 h-4 w-4" />
                  Connect to Tournament
                </Button>
                <p className="text-xs text-muted-foreground">
                  Paste the tournament link or just the tournament ID from the URL
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
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
                  {tournaments.filter(t => t.section === 'mine').slice(0, showAllMyTournaments ? undefined : 4).map((tournament) => (
                    <TournamentCard 
                    key={tournament.id} 
                    tournament={tournament} 
                    navigate={navigate} 
                    />
                  ))}
                </div>
                {tournaments.filter(t => t.section === 'mine').length > 4 && !showAllMyTournaments && (
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => setShowAllMyTournaments(true)}
                  >
                    Show More ({tournaments.filter(t => t.section === 'mine').length - 4} more)
                  </Button>
                )}
                {showAllMyTournaments && tournaments.filter(t => t.section === 'mine').length > 4 && (
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => setShowAllMyTournaments(false)}
                  >
                    Show Less
                  </Button>
                )}
              </div>
            )}
            
            {/* Public Tournaments Section */}
            {tournaments.filter(t => t.section === 'public').length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Public Tournaments</h2>
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {tournaments.filter(t => t.section === 'public').slice(0, showAllPublicTournaments ? undefined : 4).map((tournament) => (
                    <TournamentCard 
                    key={tournament.id} 
                    tournament={tournament} 
                    navigate={navigate} 
                    />
                  ))}
                </div>
                {tournaments.filter(t => t.section === 'public').length > 4 && !showAllPublicTournaments && (
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => setShowAllPublicTournaments(true)}
                  >
                    Show More ({tournaments.filter(t => t.section === 'public').length - 4} more)
                  </Button>
                )}
                {showAllPublicTournaments && tournaments.filter(t => t.section === 'public').length > 4 && (
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => setShowAllPublicTournaments(false)}
                  >
                    Show Less
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
