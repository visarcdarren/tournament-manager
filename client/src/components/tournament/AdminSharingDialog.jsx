import React, { useState, useEffect } from 'react'
import { Share2, Copy, Shield, Eye, EyeOff, Users, X, AlertTriangle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import api from '@/utils/api'

export default function AdminSharingDialog({ tournament, isOriginalAdmin }) {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState('main') // main, create, success
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [shareLink, setShareLink] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sharingStatus, setSharingStatus] = useState({ hasSharingEnabled: false, adminCount: 1 })

  // Load sharing status when dialog opens
  useEffect(() => {
    if (open) {
      loadSharingStatus()
    }
  }, [open])

  const loadSharingStatus = async () => {
    try {
      const status = await api.getAdminShareStatus(tournament.id)
      setSharingStatus(status)
    } catch (error) {
      console.error('Failed to load sharing status:', error)
    }
  }

  const createAdminShare = async () => {
    if (!password || password.length < 4) {
      toast({
        title: 'Error',
        description: 'Password must be at least 4 characters',
        variant: 'destructive'
      })
      return
    }

    setIsLoading(true)
    try {
      const response = await api.shareAdmin(tournament.id, password)
      setShareLink(response.shareLink)
      setStep('success')
      setSharingStatus(prev => ({ ...prev, hasSharingEnabled: true }))
      
      toast({
        title: 'Success',
        description: 'Admin sharing link created successfully'
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create sharing link',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const revokeAdminShare = async () => {
    if (!confirm('Are you sure you want to disable admin sharing? The current link will stop working.')) {
      return
    }

    try {
      await api.revokeAdminShare(tournament.id)
      setSharingStatus(prev => ({ ...prev, hasSharingEnabled: false }))
      setStep('main')
      setPassword('')
      setShareLink('')
      
      toast({
        title: 'Success',
        description: 'Admin sharing disabled'
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to disable admin sharing',
        variant: 'destructive'
      })
    }
  }

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text)
      toast({
        title: 'Copied!',
        description: 'Link copied to clipboard'
      })
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to copy link',
        variant: 'destructive'
      })
    }
  }

  const handleDialogClose = () => {
    setOpen(false)
    setStep('main')
    setPassword('')
    setShowPassword(false)
    setShareLink('')
  }

  const renderMainStep = () => (
    <div className="space-y-6">
      <div className="flex items-start gap-3 rounded-lg bg-blue-50 p-4 border border-blue-200">
        <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-blue-900">
            Share Admin Access
          </p>
          <p className="text-sm text-blue-700">
            Create a password-protected link to grant admin access to other users. 
            All admins have full tournament control.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium">Current Status</h4>
            <p className="text-sm text-muted-foreground">
              {sharingStatus.adminCount} admin(s) • 
              {sharingStatus.hasSharingEnabled ? ' Sharing enabled' : ' Sharing disabled'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{sharingStatus.adminCount}</span>
          </div>
        </div>

        {sharingStatus.hasSharingEnabled ? (
          <div className="space-y-3">
            <div className="flex items-start gap-3 rounded-lg bg-green-50 p-4 border border-green-200">
              <Shield className="h-5 w-5 text-green-600 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-green-900">
                  Admin Sharing Active
                </p>
                <p className="text-sm text-green-700">
                  Others can join as admin using the existing share link and password.
                </p>
              </div>
            </div>
            {isOriginalAdmin && (
              <Button 
                variant="destructive" 
                onClick={revokeAdminShare}
                className="w-full"
              >
                <X className="mr-2 h-4 w-4" />
                Disable Admin Sharing
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-3">
              <Label htmlFor="new-password">Create Admin Password</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter a secure password"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Minimum 4 characters. Share this password with trusted users only.
              </p>
            </div>
            
            <Button 
              onClick={createAdminShare} 
              disabled={!password || password.length < 4 || isLoading}
              className="w-full"
            >
              <Share2 className="mr-2 h-4 w-4" />
              {isLoading ? 'Creating...' : 'Create Share Link'}
            </Button>
          </div>
        )}
      </div>

      {!isOriginalAdmin && (
        <div className="flex items-start gap-3 rounded-lg bg-amber-50 p-4 border border-amber-200">
          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-amber-900">
              Shared Admin Access
            </p>
            <p className="text-sm text-amber-700">
              You have admin access via a share link. Only the original admin can create or revoke share links.
            </p>
          </div>
        </div>
      )}
    </div>
  )

  const renderSuccessStep = () => (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100">
          <Shield className="h-6 w-6 text-green-600" />
        </div>
        <h3 className="text-lg font-semibold">Admin Sharing Created!</h3>
        <p className="text-sm text-muted-foreground">
          Share the link and password below with trusted users to grant them admin access.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="share-link">Share Link</Label>
          <div className="flex gap-2">
            <Input
              id="share-link"
              value={shareLink}
              readOnly
              className="font-mono text-xs"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => copyToClipboard(shareLink)}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div>
          <Label htmlFor="share-password">Password</Label>
          <div className="flex gap-2">
            <Input
              id="share-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              readOnly
              className="font-mono"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => copyToClipboard(password)}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-lg bg-amber-50 p-4 border border-amber-200">
        <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-amber-900">Security Note</p>
          <p className="text-sm text-amber-700">
            Anyone with this link and password will have full admin control. 
            Share only with trusted individuals.
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={() => setStep('main')} className="flex-1">
          Back to Settings
        </Button>
        <Button onClick={handleDialogClose} className="flex-1">
          Done
        </Button>
      </div>
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <Share2 className="mr-2 h-4 w-4" />
          Share Admin Access
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === 'success' ? 'Admin Link Created' : 'Share Admin Access'}
          </DialogTitle>
          <DialogDescription>
            {step === 'success' 
              ? 'Share the link and password with trusted users'
              : 'Grant admin access to other users with a secure link'
            }
          </DialogDescription>
        </DialogHeader>
        
        {step === 'main' && renderMainStep()}
        {step === 'success' && renderSuccessStep()}
      </DialogContent>
    </Dialog>
  )
}
