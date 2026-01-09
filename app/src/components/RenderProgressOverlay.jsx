import React from 'react'
import useStore from '../store/useStore'
import { Progress } from '@/components/ui/progress'
import { Loader2, Timer, Film } from 'lucide-react'

export default function RenderProgressOverlay() {
  const { renderingVideo, renderProgress } = useStore()

  if (!renderingVideo) return null

  const { percent, current, total, message, estimatedSecondsRemaining } =
    renderProgress

  const formatTime = (seconds) => {
    if (seconds === null || seconds === undefined) return '--:--'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/90 backdrop-blur-md animate-in fade-in duration-300">
      <div className="w-full max-w-md p-8 rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl space-y-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center relative">
            <Loader2 className="h-10 w-10 text-red-500 animate-spin absolute" />
            <Film className="h-5 w-5 text-red-500/50" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">
              Generating Video
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {message || 'Processing frames...'}
            </p>
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

        <p className="text-[10px] text-center text-muted-foreground/50 italic pt-4">
          Please keep the application open during rendering
        </p>
      </div>
    </div>
  )
}
