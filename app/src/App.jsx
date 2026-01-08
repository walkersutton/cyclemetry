import { useEffect, useState, useRef } from 'react'
import useStore from './store/useStore'
import './index.css'

import { Command } from '@tauri-apps/plugin-shell'

// UI components
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import ControlPanel from '@/components/ControlPanel'
import ErrorAlert from '@/components/ErrorAlert'
import RenderProgressOverlay from '@/components/RenderProgressOverlay'

// Icons
import { Upload, Play, Activity } from 'lucide-react'

// Global state for sidecar
window.__SIDECAR_DEBUG__ = {
  status: 'initializing',
  error: null,
  pid: null,
  logs: [],
  startTime: null,
}

const logSidecar = (message) => {
  const timestamp = new Date().toISOString()
  console.log(`[Sidecar] ${message}`)
  window.__SIDECAR_DEBUG__.logs.push(`[${timestamp}] ${message}`)
  if (window.__SIDECAR_DEBUG__.logs.length > 50) {
    window.__SIDECAR_DEBUG__.logs.shift()
  }
}

// Template list
const TEMPLATES = [
  { id: 'safa_brian_a_4k_gradient.json', name: 'Safa Brian A (4K)' },
  { id: 'safa_brian_b_4k_gradient.json', name: 'Safa Brian B (4K)' },
  { id: 'my_laps_1080.json', name: 'My Laps (1080p)' },
]

// Spinner
function Spinner({ className = 'h-4 w-4' }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )
}

function App() {
  const {
    config,
    setConfig,
    imageFilename,
    generatingImage,
    renderingVideo,
    setGeneratingImage,
    setImageFilename,
    setGpxFilename,
    setRenderProgress,
    renderProgress,
    gpxFilename,
  } = useStore()

  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [backendStatus, setBackendStatus] = useState('connecting')
  const [imageError, setImageError] = useState(false)
  const fileInputRef = useRef(null)

  // Sidecar spawn
  useEffect(() => {
    const spawnBackend = async () => {
      if (typeof window.__TAURI__ === 'undefined') {
        setBackendStatus('connected')
        return
      }

      try {
        const response = await fetch('http://localhost:3001/api/health', {
          signal: AbortSignal.timeout(1000),
        })
        if (response.ok) {
          setBackendStatus('connected')
          return
        }
      } catch {
        logSidecar('Backend not running, spawning...')
      }

      try {
        const { Command } = await import('@tauri-apps/plugin-shell')
        const command = Command.sidecar('binaries/cyclemetry-server')
        command.on('close', (data) => {
          if (data.code !== 0) setBackendStatus('error')
        })
        const child = await command.spawn()
        window.__SIDECAR_DEBUG__.childProcess = child
        logSidecar('Sidecar spawned, waiting for health check...')
      } catch (err) {
        console.error('Failed to spawn sidecar:', err)
        setBackendStatus('error')
      }
    }

    spawnBackend()
    return () => {
      if (window.__SIDECAR_DEBUG__?.childProcess) {
        window.__SIDECAR_DEBUG__.childProcess.kill()
      }
    }
  }, [])

  // Health polling with retry logic
  const strikesRef = useRef(0)
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/health', {
          signal: AbortSignal.timeout(2000),
        })
        if (response.ok) {
          setBackendStatus('connected')
          strikesRef.current = 0
        } else {
          throw new Error('Health check failed')
        }
      } catch {
        strikesRef.current++
        // Be significantly more patient during initial connection (60 seconds)
        const threshold = backendStatus === 'connecting' ? 30 : 5
        if (strikesRef.current >= threshold && backendStatus !== 'error') {
          setBackendStatus('error')
        }
      }
    }

    const interval = setInterval(checkHealth, 2000)
    checkHealth()
    return () => clearInterval(interval)
  }, [backendStatus])

  // Render progress polling
  useEffect(() => {
    if (!renderingVideo) return

    const pollProgress = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/render-progress')
        if (response.ok) {
          const data = await response.json()
          setRenderProgress({
            current: data.current || 0,
            total: data.total || 0,
            status: data.status || 'rendering',
            message: data.message || '',
            estimatedSecondsRemaining: data.estimated_seconds_remaining,
          })
        }
      } catch (err) {
        console.error('Error polling render progress:', err)
      }
    }

    const interval = setInterval(pollProgress, 500)
    pollProgress()
    return () => clearInterval(interval)
  }, [renderingVideo, setRenderProgress])

  // Load template
  const handleTemplateChange = async (templateId) => {
    setSelectedTemplate(templateId)
    if (!templateId) return

    try {
      const response = await fetch(`/templates/${templateId}`)
      const templateConfig = await response.json()
      setConfig(templateConfig)
      setGpxFilename('demo.gpxinit')
      await handleGeneratePreview(templateConfig)
    } catch (err) {
      console.error('Error loading template:', err)
    }
  }

  // Generate preview
  const handleGeneratePreview = async (configOverride = null) => {
    const currentConfig = configOverride || config
    if (!currentConfig) return

    try {
      setGeneratingImage(true)
      const response = await fetch('http://localhost:3001/api/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: currentConfig,
          gpx_filename: 'demo.gpxinit',
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setImageError(false)
        setImageFilename(`http://localhost:3001/images/${data.filename}`)
      }
    } catch (err) {
      console.error('Error generating preview:', err)
    } finally {
      setGeneratingImage(false)
    }
  }

  // Render video
  const handleRenderVideo = async () => {
    try {
      const { default: renderVideo } = await import('./api/renderVideo')
      await renderVideo()
    } catch (err) {
      console.error('Render failed:', err)
      useStore.getState().setErrorMessage(err.message || 'Unknown error')
    }
  }

  // Open downloads
  const handleOpenDownloads = async () => {
    try {
      await fetch('http://localhost:3001/api/open-downloads', {
        method: 'POST',
      })
    } catch (e) {
      console.error('Error opening downloads:', e)
    }
  }

  // Handle GPX file selection
  const handleGpxFileSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setGeneratingImage(true)
      const { default: saveFile } = await import('./api/gpxUtils')
      await saveFile(file)
      // Refresh preview after gpx load
      await handleGeneratePreview()
    } catch (err) {
      console.error('GPX upload failed:', err)
      useStore.getState().setErrorMessage(`GPX Upload failed: ${err.message}`)
    } finally {
      setGeneratingImage(false)
      // Reset input so the same file can be selected again
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="h-screen dark flex flex-col bg-[#0a0a0a] text-foreground">
      <ErrorAlert />
      <RenderProgressOverlay />
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center justify-between px-6 py-3">
          {/* Left - Logo & Template */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg" />
              <div>
                <h1 className="font-semibold text-sm">Cyclemetry</h1>
                <p className="text-xs text-muted-foreground">
                  GPX Overlay Editor
                </p>
              </div>
            </div>

            <div className="h-6 w-px bg-border" />

            <Select
              value={selectedTemplate}
              onValueChange={handleTemplateChange}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select template" />
              </SelectTrigger>
              <SelectContent>
                {TEMPLATES.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Right - Actions & Status */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".gpx"
                onChange={handleGpxFileSelect}
              />
              <Button
                variant="outline"
                size="sm"
                className="gap-2 h-8 px-3 border-zinc-700/50 hover:bg-zinc-800/50 text-muted-foreground hover:text-foreground"
                onClick={() => fileInputRef.current?.click()}
              >
                <Activity className="h-3.5 w-3.5" />
                <span className="max-w-[100px] truncate">
                  {gpxFilename === 'demo.gpxinit' ? 'Load GPX' : (gpxFilename || 'Load GPX')}
                </span>
              </Button>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="gap-2 h-8 px-3 border-emerald-500/30 hover:border-emerald-500/50 hover:bg-emerald-500/5"
              onClick={handleGeneratePreview}
              disabled={generatingImage}
            >
              {generatingImage ? (
                <Spinner className="h-3.5 w-3.5" />
              ) : (
                <Upload className="h-3.5 w-3.5 text-emerald-500" />
              )}
              <span>Refresh Preview</span>
            </Button>

            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={
                !config || renderingVideo || backendStatus !== 'connected'
              }
              onClick={handleRenderVideo}
            >
              <Play className="mr-2 h-4 w-4" />
              {renderingVideo ? 'Rendering...' : 'Render'}
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="gap-2 h-8 px-3 border-emerald-500/30 hover:border-emerald-500/50 hover:bg-emerald-500/5 text-muted-foreground hover:text-foreground"
              onClick={handleOpenDownloads}
            >
              <Upload className="h-3.5 w-3.5" />
              <span>Downloads</span>
            </Button>

            <div className="h-6 w-px bg-border" />

            <div className="flex items-center gap-2">
              {backendStatus === 'connecting' && <Spinner />}
              <Badge
                variant={
                  backendStatus === 'connected'
                    ? 'default'
                    : backendStatus === 'connecting'
                      ? 'secondary'
                      : 'destructive'
                }
              >
                {backendStatus === 'connected'
                  ? 'Connected'
                  : backendStatus === 'connecting'
                    ? 'Starting...'
                    : 'Offline'}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Preview - Left */}
        <div className="flex-1 flex items-center justify-center p-8 bg-[#0a0a0a]">
          {generatingImage && (
            <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10">
              <div className="flex flex-col items-center gap-2">
                <Spinner className="h-8 w-8" />
                <span className="text-sm text-muted-foreground">
                  Generating preview...
                </span>
              </div>
            </div>
          )}

          {imageFilename && !imageError ? (
            <div className="relative">
              <img
                src={imageFilename}
                alt="Preview"
                className="max-w-full max-h-full object-contain rounded-lg shadow-2xl border border-zinc-800"
                onError={() => setImageError(true)}
              />
              {config?.scene && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2">
                  <div className="px-3 py-1 rounded-full bg-zinc-950/80 backdrop-blur-sm border border-zinc-700">
                    <span className="text-xs font-medium text-zinc-400">
                      {config.scene.width} × {config.scene.height}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 text-center">
              {backendStatus === 'connecting' ? (
                <>
                  <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center">
                    <Spinner className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-medium">
                      {strikesRef.current > 5
                        ? 'Still starting up...'
                        : 'Starting Backend'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {strikesRef.current > 5
                        ? 'This is taking a bit longer than usual, please hang tight.'
                        : 'Please wait...'}
                    </p>
                  </div>
                </>
              ) : backendStatus === 'error' ? (
                <>
                  <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center border border-destructive/20">
                    <svg
                      className="w-8 h-8 text-destructive"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium">Backend Connection Issue</p>
                    <p className="text-sm text-muted-foreground mb-4">
                      The server is taking longer than expected to respond.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setBackendStatus('connecting')
                        strikesRef.current = 0
                      }}
                      className="border-emerald-500/30 hover:bg-emerald-500/10"
                    >
                      Retry Connection
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center">
                    <svg
                      className="w-8 h-8 text-muted-foreground"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium">No Preview</p>
                    <p className="text-sm text-muted-foreground">
                      Select a template to start
                    </p>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Control Panel - Right */}
        <div className="w-96 border-l border-border bg-card/30 backdrop-blur-sm overflow-y-auto">
          <ControlPanel
            config={config}
            onConfigChange={setConfig}
            onApply={() => handleGeneratePreview()}
          />
        </div>
      </div>
    </div>
  )
}

export default App
