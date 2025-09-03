import React, { useState, useEffect } from 'react'
import { Shield, Users, Eye, Trash2, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import api from '@/utils/api'

export default function DevicePermissions({ tournament, isOriginalAdmin }) {
  const { toast } = useToast()
  const [pendingRequests, setPendingRequests] = useState([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (isOriginalAdmin) {
      loadPendingRequests()
    }
  }, [tournament.id, isOriginalAdmin])

  const loadPendingRequests = async () => {
    try {
      const data = await api.getPendingRequests(tournament.id)
      setPendingRequests(data.pendingRequests || [])
    } catch (error) {
      console.error('Failed to load pending requests:', error)
    }
  }

  const grantRole = async (deviceId, role, stations = []) => {
    try {
      await api.grantRole(tournament.id, deviceId, role, stations)
      await loadPendingRequests()
      
      toast({
        title: 'Success',
        description: `${role.toLowerCase()} access granted`
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to grant permission',
        variant: 'destructive'
      })
    }
  }

  const revokeRole = async (deviceId, deviceName) => {
    if (!confirm(`Remove access for "${deviceName}"?`)) {
      return
    }

    try {
      await api.revokeRole(tournament.id, deviceId)
      
      toast({
        title: 'Success',
        description: `Access removed for ${deviceName}`
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to revoke permission',
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
                      {device.id === tournament.adminDeviceId && ' (Original)'}
                    </div>
                  </div>
                </div>
                {isOriginalAdmin && device.role !== 'ADMIN' && device.id !== tournament.adminDeviceId && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => revokeRole(device.id, device.name)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
                {isOriginalAdmin && device.role === 'ADMIN' && device.id !== tournament.adminDeviceId && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => revokeRole(device.id, device.name)}
                  >
                    Remove Admin
                  </Button>
                )}
              </div>
            ))}
            
            {(!tournament.devices || tournament.devices.length === 0) && (
              <div className="text-center py-4 text-muted-foreground">
                No devices connected
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pending Requests */}
      {isOriginalAdmin && pendingRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Requests</CardTitle>
            <CardDescription>
              Device permission requests awaiting approval
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingRequests.map(request => (
                <div
                  key={request.deviceId}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <div className="font-semibold">{request.deviceName}</div>
                    <div className="text-sm text-muted-foreground">
                      Requested: {request.requestedRole}
                      {request.stations?.length > 0 && ` • Stations: ${request.stations.join(', ')}`}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => grantRole(request.deviceId, request.requestedRole, request.stations)}
                    >
                      Approve
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        // Remove from pending requests without granting
                        setPendingRequests(prev => prev.filter(r => r.deviceId !== request.deviceId))
                      }}
                    >
                      Deny
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info for non-original admins */}
      {!isOriginalAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Device Management</CardTitle>
            <CardDescription>
              Device permissions are managed by the original tournament admin
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-3 rounded-lg bg-blue-50 p-4 border border-blue-200">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-blue-900">
                  Shared Admin Access
                </p>
                <p className="text-sm text-blue-700">
                  You have admin privileges via a share link. Only the original admin can manage device permissions.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
