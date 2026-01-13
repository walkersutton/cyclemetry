import React from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import useStore from '../store/useStore'

function ErrorAlert() {
  const { errorMessage, clearError } = useStore()

  if (!errorMessage) {
    return null
  }

  return (
    <div className="fixed top-4 right-4 z-[100] max-w-md animate-in fade-in slide-in-from-top-4 duration-300">
      <Alert
        variant="destructive"
        className="relative pr-12 shadow-lg border-2"
      >
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error Rendering Video</AlertTitle>
        <AlertDescription className="text-sm opacity-90">
          {errorMessage}
        </AlertDescription>
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-8 w-8 hover:bg-destructive-foreground/10"
          onClick={clearError}
        >
          <X className="h-4 w-4" />
        </Button>
      </Alert>
    </div>
  )
}

export default ErrorAlert
