import React from 'react'
import { Calendar, Eye, RefreshCw } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import ScheduleViewer from './ScheduleViewer'

export default function SchedulePreviewModal({ 
  isOpen, 
  onClose, 
  previewData,
  isExisting = false,
  onRegenerate,
  isRegenerating = false,
  title = "Schedule Preview",
  description = "This is how your tournament schedule will look. You can review all games before starting.",
  isAdmin = false 
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[100vw] h-[100vh] max-w-none max-h-none m-0 rounded-none p-0 flex flex-col">
        <div className="flex-shrink-0 p-4 sm:p-6 pb-3 sm:pb-4 border-b">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Eye className="h-5 w-5" />
              {title}
              {isExisting && (
                <Badge variant="secondary" className="ml-2">
                  Saved Schedule
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription className="text-sm sm:text-base">
              {isExisting ? (
                "This schedule has been saved and will be used when you start the tournament. Use the button below to create a different schedule."
              ) : (
                description
              )}
            </DialogDescription>
          </DialogHeader>
        </div>
        <div className="flex-1 min-h-0 overflow-hidden">
          {previewData && (
            <div className="h-full w-full overflow-y-auto overflow-x-hidden">
              <div className="p-2 sm:p-4">
                <ScheduleViewer tournament={previewData} isAdmin={isAdmin} />
              </div>
            </div>
          )}
        </div>
        {onRegenerate && (
          <DialogFooter className="flex-shrink-0 p-4 sm:p-6 pt-3 sm:pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={onRegenerate}
              disabled={isRegenerating}
              className="w-full sm:w-auto flex items-center justify-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isRegenerating ? 'animate-spin' : ''}`} />
              {isRegenerating ? 'Regenerating...' : 'Generate New Schedule'}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
