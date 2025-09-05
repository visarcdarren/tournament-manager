import { useState } from 'react'
import { useToast } from '@/hooks/use-toast'
import api from '@/utils/api'

export function useSchedulePreview(tournament) {
  const { toast } = useToast()
  const [showPreview, setShowPreview] = useState(false)
  const [previewData, setPreviewData] = useState(null)
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false)
  const [isExistingSchedule, setIsExistingSchedule] = useState(false)
  const [isRegeneratingSchedule, setIsRegeneratingSchedule] = useState(false)
  
  const previewSchedule = async (forceRegenerate = false) => {
    try {
      if (forceRegenerate) {
        setIsRegeneratingSchedule(true)
      } else {
        setIsGeneratingPreview(true)
      }
      
      const result = await api.previewSchedule(tournament.id, forceRegenerate)
      
      // Create a mock tournament object for the ScheduleViewer
      setPreviewData({
        ...tournament,
        schedule: result.schedule,
        validation: result.validation
      })
      
      setIsExistingSchedule(result.isExisting)
      setShowPreview(true)
      
      if (!result.isExisting) {
        toast({
          title: 'Schedule Generated',
          description: 'Your tournament schedule has been created and saved.'
        })
      }
      
      return true
    } catch (error) {
      toast({
        title: 'Preview Failed',
        description: error.message || 'Unable to generate schedule preview',
        variant: 'destructive'
      })
      return false
    } finally {
      setIsGeneratingPreview(false)
      setIsRegeneratingSchedule(false)
    }
  }
  
  const handleRegenerateSchedule = () => {
    previewSchedule(true)
  }
  
  const closePreview = () => {
    setShowPreview(false)
    setPreviewData(null)
  }
  
  return {
    showPreview,
    previewData,
    isGeneratingPreview,
    isExistingSchedule,
    isRegeneratingSchedule,
    previewSchedule,
    handleRegenerateSchedule,
    closePreview
  }
}
