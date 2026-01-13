import React, { useState } from 'react'
import useStore from '../store/useStore'
import { Progress } from '@/components/ui/progress'
import { Loader2, Timer, Film } from 'lucide-react'
import { cancelRender } from '../api/backend'

export default function RenderProgressOverlay() {
  const { renderingVideo, renderProgress } = useStore()
  const [isCancelling, setIsCancelling] = useState(false)

  if (!renderingVideo) return null

  const {
    percent,
    current,
    total,
    message,
    estimatedSecondsRemaining,
    encoded,
  } = renderProgress

  const handleCancel = async () => {
    console.log('[Frontend] Cancel button clicked')
    try {
      setIsCancelling(true)
      await cancelRender()
      console.log('[Frontend] Cancel signal sent')
    } catch (error) {
      console.error('Failed to cancel render:', error)
      setIsCancelling(false)
    }
  }

  // Detect when we are done generating frames but still encoding (ffmpeg)
  const isFinalizing = percent >= 100

  const formatTime = (seconds) => {
    if (seconds === null || seconds === undefined) return '--:--'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Determine submessage
  let subMessage = message || 'Processing frames...'
  if (isFinalizing) {
    if (encoded && total > 0) {
      subMessage = `Encoding: ${encoded.toLocaleString()} / ${total.toLocaleString()} frames`
    } else {
      subMessage = 'Encoding output file...'
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/90 backdrop-blur-md animate-in fade-in duration-300">
      <div className="w-full max-w-md p-8 rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl space-y-6 relative">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center relative">
            <Loader2 className="h-10 w-10 text-red-500 animate-spin absolute" />
            <Film className="h-5 w-5 text-red-500/50" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">
              {isFinalizing ? 'Finalizing Video' : 'Generating Video'}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">{subMessage}</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between text-xs font-medium">
            <span className="text-red-500">{percent}% Complete</span>
            <span className="text-muted-foreground">
              {current.toLocaleString()} / {total.toLocaleString()} frames
            </span>
          </div>
          <Progress value={percent} className="h-2 bg-zinc-800" />
        </div>

        {!isFinalizing && (
          <div className="flex items-center justify-center gap-6 pt-2">
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                <Timer className="h-3.5 w-3.5" />
                <span className="text-[10px] uppercase font-bold tracking-wider">
                  Est. Remaining
                </span>
              </div>
              <span className="text-lg font-mono font-bold text-foreground">
                {formatTime(estimatedSecondsRemaining)}
              </span>
            </div>
          </div>
        )}

        <div
          className="flex justify-center pt-2 relative z-[9999]"
          style={{ isolation: 'isolate' }}
        >
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all h-8 px-4 py-2 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 cursor-pointer pointer-events-auto active:scale-95"
            onClick={(e) => {
              e.stopPropagation()
              handleCancel()
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            disabled={isCancelling}
            data-tauri-no-drag="true"
            style={{
              pointerEvents: 'auto',
              cursor: 'pointer',
              position: 'relative',
              zIndex: 99999,
            }}
          >
            {isCancelling ? (
              <>
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                Cancelling...
              </>
            ) : (
              'Cancel'
            )}
          </button>
        </div>

        <p className="text-[10px] text-center text-muted-foreground/50 italic">
          Please keep the application open during rendering
        </p>
      </div>
    </div>
  )
}
