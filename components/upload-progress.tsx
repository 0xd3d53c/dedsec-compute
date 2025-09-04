"use client"

import React from 'react'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent } from '@/components/ui/card'
import { Upload, CheckCircle, AlertTriangle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface UploadProgressProps {
  isVisible: boolean
  progress: number
  status: 'uploading' | 'success' | 'error' | 'idle'
  message?: string
  onClose?: () => void
}

export function UploadProgress({
  isVisible,
  progress,
  status,
  message,
  onClose
}: UploadProgressProps) {
  if (!isVisible) return null

  const getStatusIcon = () => {
    switch (status) {
      case 'uploading':
        return <Upload className="h-4 w-4 animate-pulse text-blue-400" />
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-400" />
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-400" />
      default:
        return null
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case 'uploading':
        return 'border-blue-500/20 bg-blue-950/10'
      case 'success':
        return 'border-green-500/20 bg-green-950/10'
      case 'error':
        return 'border-red-500/20 bg-red-950/10'
      default:
        return 'border-gray-500/20 bg-gray-950/10'
    }
  }

  const getProgressColor = () => {
    switch (status) {
      case 'uploading':
        return 'bg-blue-500'
      case 'success':
        return 'bg-green-500'
      case 'error':
        return 'bg-red-500'
      default:
        return 'bg-gray-500'
    }
  }

  return (
    <Card className={`fixed top-4 right-4 w-80 z-50 ${getStatusColor()}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span className="text-sm font-medium">
              {status === 'uploading' && 'Uploading...'}
              {status === 'success' && 'Upload Complete'}
              {status === 'error' && 'Upload Failed'}
            </span>
          </div>
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-6 w-6 p-0 hover:bg-transparent"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
        
        {status === 'uploading' && (
          <Progress 
            value={progress} 
            className="h-2 mb-2"
          />
        )}
        
        {message && (
          <p className="text-xs text-muted-foreground">
            {message}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

// Hook for managing upload progress state
export function useUploadProgress() {
  const [isVisible, setIsVisible] = React.useState(false)
  const [progress, setProgress] = React.useState(0)
  const [status, setStatus] = React.useState<'uploading' | 'success' | 'error' | 'idle'>('idle')
  const [message, setMessage] = React.useState<string>()

  const startUpload = (message?: string) => {
    setIsVisible(true)
    setProgress(0)
    setStatus('uploading')
    setMessage(message)
  }

  const updateProgress = (newProgress: number) => {
    setProgress(newProgress)
  }

  const completeUpload = (successMessage?: string) => {
    setProgress(100)
    setStatus('success')
    setMessage(successMessage)
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
      setIsVisible(false)
    }, 3000)
  }

  const failUpload = (errorMessage?: string) => {
    setStatus('error')
    setMessage(errorMessage)
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      setIsVisible(false)
    }, 5000)
  }

  const hide = () => {
    setIsVisible(false)
  }

  const endUpload = (success: boolean, message?: string) => {
    if (success) {
      completeUpload(message)
    } else {
      failUpload(message)
    }
  }

  return {
    isVisible,
    progress,
    status,
    message,
    startUpload,
    updateProgress,
    completeUpload,
    failUpload,
    endUpload,
    hide
  }
}
