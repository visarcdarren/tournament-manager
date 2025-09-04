import React, { useState, useEffect, useRef } from 'react'
import { Shield, Users, Eye, Trash2, AlertCircle, Globe, Lock, Share2, Download, QrCode, Copy } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import api from '@/utils/api'
import AdminSharingDialog from './AdminSharingDialog'
import QRCode from 'qrcode'

export default function SharingAndDevices({ tournament, isOriginalAdmin, onTogglePublicStatus, onShare }) {
  const { toast } = useToast()
  const [pendingRequests, setPendingRequests] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const qrCanvasRef = useRef(null)
  
  // Generate QR code when tournament becomes public
  useEffect(() => {
    if (tournament.isPublic) {
      generateQRCode()
    }
  }, [tournament.isPublic, tournament.id])
  
  const generateQRCode = async () => {
    try {
      const shareUrl = `${window.location.origin}/tournament/${tournament.id}`
      const qrDataUrl = await QRCode.toDataURL(shareUrl, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      })
      setQrCodeUrl(qrDataUrl)
    } catch (error) {
      console.error('Failed to generate QR code:', error)
    }
  }
  
  const copyShareLink = async () => {
    try {
      const shareUrl = `${window.location.origin}/tournament/${tournament.id}`
      await navigator.clipboard.writeText(shareUrl)
      toast({
        title: 'Link Copied!',
        description: 'Tournament link copied to clipboard'
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Could not copy to clipboard',
        variant: 'destructive'
      })
    }
  }

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
      {/* Access Management - moved from TournamentSetup */}
      <Card>
        <CardHeader>
          <CardTitle>Tournament Sharing</CardTitle>
          <CardDescription>
            Control who can access your tournament and how they can interact with it
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Public/Private Status */}
          <div className="space-y-4">
            <h4 className="font-semibold text-base">Tournament Visibility</h4>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-1">
                <div className="font-medium flex items-center gap-2">
                  {tournament.isPublic ? (
                    <>
                      <Globe className="h-4 w-4 text-green-600" />
                      Public Tournament
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4 text-gray-500" />
                      Private Tournament
                    </>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {tournament.isPublic 
                    ? 'Anyone with the link can view tournament progress in real-time'
                    : 'Only you and shared admins can access this tournament'
                  }
                </p>
                {!tournament.isPublic && (!tournament.schedule || tournament.schedule.length === 0) && (
                  <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
                    ⚠️ Generate a schedule before making the tournament public so viewers have something meaningful to see.
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                {tournament.isPublic && (
                  <Button variant="outline" onClick={onShare} size="sm">
                    <Share2 className="mr-2 h-4 w-4" />
                    Share
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  onClick={onTogglePublicStatus} 
                  size="sm"
                  disabled={!tournament.isPublic && (!tournament.schedule || tournament.schedule.length === 0)}
                  title={!tournament.isPublic && (!tournament.schedule || tournament.schedule.length === 0) ? "Schedule must be generated before making tournament public" : ""}
                >
                  {tournament.isPublic ? (
                    <>
                      <Lock className="mr-2 h-4 w-4" />
                      Make Private
                    </>
                  ) : (
                    <>
                      <Globe className="mr-2 h-4 w-4" />
                      Make Public
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
          
          {/* QR Code Section - only show when public */}
          {tournament.isPublic && (
            <div className="space-y-4">
              <h4 className="font-semibold text-base">Quick Access</h4>
              <div className="flex flex-col sm:flex-row gap-4 p-4 border rounded-lg bg-green-50 border-green-200">
                <div className="flex-shrink-0">
                  {qrCodeUrl ? (
                    <div className="space-y-2">
                      <img 
                        src={qrCodeUrl} 
                        alt="QR Code for tournament link" 
                        className="w-32 h-32 sm:w-40 sm:h-40 border border-gray-200 rounded-lg bg-white p-2"
                      />
                      <p className="text-xs text-center text-green-700">Scan to view tournament</p>
                    </div>
                  ) : (
                    <div className="w-32 h-32 sm:w-40 sm:h-40 border border-gray-200 rounded-lg bg-white flex items-center justify-center">
                      <QrCode className="h-8 w-8 text-gray-400" />
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-3">
                  <div>
                    <h5 className="font-medium text-green-900">Share with QR Code</h5>
                    <p className="text-sm text-green-700">
                      Others can quickly scan this code with their phone camera to access the tournament instantly.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-green-800">Tournament Link:</label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={`${window.location.origin}/tournament/${tournament.id}`}
                        readOnly
                        className="flex-1 px-3 py-2 text-xs border rounded-md bg-white text-gray-700 min-w-0"
                        onClick={(e) => e.target.select()}
                      />
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={copyShareLink}
                        className="flex-shrink-0"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Admin Sharing */}
          <div className="space-y-4">
            <h4 className="font-semibold text-base">Admin Sharing</h4>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Grant admin access to other users via secure password-protected links. 
                Admins can modify tournament settings, manage teams, and control all aspects of the tournament.
              </p>
              <AdminSharingDialog 
                tournament={tournament} 
                isOriginalAdmin={isOriginalAdmin}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Connected Devices */}
      <Card>
        <CardHeader>
          <CardTitle>Device Permissions</CardTitle>
          <CardDescription>
            Manage device access and scorer permissions for tournament operations
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
