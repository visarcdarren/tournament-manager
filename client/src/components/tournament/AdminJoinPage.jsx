import React, { useState, useEffect } from 'react'
import { Shield, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { useNavigate } from '@/App'
import api from '@/utils/api'

export default function AdminJoinPage() {
  const path = window.location.pathname
  const tournamentId = path.split('/')[2] // Extract from /admin-join/:id
  const navigate = useNavigate()
  const { toast } = useToast()
  
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [tournament, setTournament] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    loadTournamentInfo()
  }, [tournamentId])

  const loadTournamentInfo = async () => {
    try {
      // Try to get basic tournament info (might fail if private)
      const tournamentData = await api.getTournament(tournamentId)
      setTournament(tournamentData)
    } catch (error) {
      // Tournament might be private, that's okay
      setTournament({ name: 'Tournament', id: tournamentId })
    }
  }

  const joinAsAdmin = async () => {
    if (!password) {
      setError('Password is required')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const response = await api.joinAsAdmin(tournamentId, password)
      
      toast({
        title: 'Success!',
        description: 'You now have admin access to this tournament'
      })
      
      // Navigate to the tournament
      navigate(`/tournament/${tournamentId}`)
    } catch (error) {
      if (error.status === 401) {
        setError('Invalid password')
      } else if (error.status === 404) {
        setError('Admin sharing is not enabled for this tournament')
      } else {
        setError(error.message || 'Failed to join as admin')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      joinAsAdmin()
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Join as Admin</h1>
          <p className="text-muted-foreground">
            Enter the admin password to gain full access to this tournament
          </p>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-lg">{tournament?.name}</CardTitle>
            <CardDescription>
              Tournament Admin Access
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="flex items-start gap-3 rounded-lg bg-red-50 p-4 border border-red-200">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-900">Access Denied</p>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="admin-password">Admin Password</Label>
              <div className="relative">
                <Input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Enter admin password"
                  className="pr-10"
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <Button 
                onClick={joinAsAdmin} 
                disabled={!password || isLoading}
                className="w-full"
              >
                {isLoading ? 'Joining...' : 'Join as Admin'}
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => navigate('/')}
                className="w-full"
              >
                Back to Tournament List
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="text-center text-xs text-muted-foreground">
          Admin access grants full tournament control including setup, scoring, and management
        </div>
      </div>
    </div>
  )
}
