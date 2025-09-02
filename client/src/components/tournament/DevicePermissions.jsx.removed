import React, { useState } from 'react'
import { Shield, Users, Eye, Check, X, AlertCircle, Activity } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import api from '@/utils/api'
import useTournamentStore from '@/stores/tournamentStore'

export default function DevicePermissions({ tournament }) {
  const { toast } = useToast()
  const tournamentStore = useTournamentStore()
  const [auditLog, setAuditLog] = useState([])
  const [showAudit, setShowAudit] = useState(false)
  
  const grantRole = async (request) => {
    try {
      await api.grantRole(tournament.id, {
        deviceId: request.deviceId,
        role: request.requestedRole,
        stations: request.stations
      })
      
      toast({
        title: 'Success',
        description: `Granted ${request.requestedRole} access to ${request.deviceName}`
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to grant role',
        variant: 'destructive'
      })
    }
  }
  
  const revokeRole = async (deviceId, deviceName) => {
    if (!confirm(`Revoke scorer access for ${deviceName}?`)) return
    
    try {
      await api.revokeRole(tournament.id, deviceId)
      
      toast({
        title: 'Success',
        description: `Revoked access for ${deviceName}`
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to revoke role',
        variant: 'destructive'
      })
    }
  }
  
  const loadAuditLog = async () => {
    try {
      const data = await api.getAuditLog(tournament.id)
      setAuditLog(data.entries || [])
      setShowAudit(true)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load audit log',
        variant: 'destructive'
      })
    }
  }
  
  const getRoleIcon = (role) => {
    switch (role) {
      case 'ADMIN':
        return <Shield className="h-4 w-4 text-primary" />
      case 'SCORER':
        return <Users className="h-4 w-4 text-green-600" />
      default:
        return <Eye className="h-4 w-4 text-muted-foreground" />
    }
  }
  
  const formatAuditAction = (entry) => {
    switch (entry.action) {
      case 'SCORE_GAME':
        return `Scored game: ${entry.details.player1} vs ${entry.details.player2} - ${entry.details.result}`
      case 'GRANT_PERMISSION':
        return `Granted ${entry.details.role} role to device`
      case 'REVOKE_PERMISSION':
        return `Revoked permissions from device`
      case 'CREATE_TOURNAMENT':
        return `Created tournament: ${entry.details.tournamentName}`
      default:
        return entry.action
    }
  }
  
  return (
    <div className="space-y-6">
      {/* Connected Devices */}
      <Card>
        <CardHeader>
          <CardTitle>Connected Devices</CardTitle>
          <CardDescription>
            Manage device permissions and scorer access
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {tournament.devices?.map(device => (
              <div
                key={device.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="flex items-center gap-3">
                  {getRoleIcon(device.role)}
                  <div>
                    <div className="font-semibold">{device.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {device.role} {device.stations?.length > 0 && `• Stations: ${device.stations.join(', ')}`}
                    </div>
                  </div>
                </div>
                {device.role === 'SCORER' && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => revokeRole(device.id, device.name)}
                  >
                    Revoke Access
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      {/* Pending Requests */}
      {tournament.pendingRequests?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              Pending Access Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {tournament.pendingRequests.map(request => (
                <div
                  key={request.deviceId}
                  className="flex items-center justify-between rounded-lg border border-orange-200 bg-orange-50 p-3 dark:border-orange-900 dark:bg-orange-950"
                >
                  <div>
                    <div className="font-semibold">{request.deviceName}</div>
                    <div className="text-sm text-muted-foreground">
                      Requesting {request.requestedRole} access
                      {request.stations?.length > 0 && ` for ${request.stations.join(', ')}`}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(request.requestedAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => grantRole(request)}
                    >
                      <Check className="mr-1 h-4 w-4" />
                      Grant
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // Remove from pending requests
                        const updated = {
                          ...tournament,
                          pendingRequests: tournament.pendingRequests.filter(
                            r => r.deviceId !== request.deviceId
                          )
                        }
                        api.updateTournament(tournament.id, updated)
                        tournamentStore.setTournament(updated)
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Activity Log */}
      <Card>
        <CardHeader>
          <CardTitle>Activity & Audit</CardTitle>
          <CardDescription>
            Track all tournament actions and score updates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={loadAuditLog}>
            <Activity className="mr-2 h-4 w-4" />
            View Audit Log
          </Button>
          
          {showAudit && auditLog.length > 0 && (
            <div className="mt-4 space-y-2">
              <div className="max-h-96 space-y-2 overflow-y-auto">
                {auditLog.map(entry => (
                  <div key={entry.id} className="rounded-lg bg-muted p-3 text-sm">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-semibold">{entry.deviceName}</div>
                        <div className="text-muted-foreground">
                          {formatAuditAction(entry)}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(entry.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
