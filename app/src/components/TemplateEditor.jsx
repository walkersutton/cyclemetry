import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { BlurInput } from '@/components/ui/blur-input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'

// Available fonts in the backend
const FONTS = [
  { id: 'Arial.ttf', name: 'Arial' },
  { id: 'Evogria.otf', name: 'Evogria' },
  { id: 'Furore.otf', name: 'Furore' },
]

// Preset resolutions
const RESOLUTIONS = [
  { id: '4k', name: '4K (3840×2160)', width: 3840, height: 2160 },
  { id: '1080p', name: '1080p (1920×1080)', width: 1920, height: 1080 },
  { id: '720p', name: '720p (1280×720)', width: 1280, height: 720 },
  { id: 'custom', name: 'Custom' },
]

// Helper to sanitize numeric inputs (remove commas and leading zeros)
function sanitizeNumber(val) {
  if (val === undefined || val === null) return val
  const sanitized = val
    .toString()
    .replace(/,/g, '')
    .replace(/^0+(?!$)/, '')
  return parseInt(sanitized, 10) || 0
}

export default function TemplateEditor({ config, onConfigChange, onApply }) {
  const [localConfig, setLocalConfig] = useState(config)
  const [selectedResolution, setSelectedResolution] = useState('custom')

  // Sync with parent config
  useEffect(() => {
    if (config) {
      setLocalConfig(config)
      // Detect resolution preset
      const res = RESOLUTIONS.find(
        (r) =>
          r.width === config.scene?.width && r.height === config.scene?.height,
      )
      setSelectedResolution(res?.id || 'custom')
    }
  }, [config])

  if (!localConfig?.scene) {
    return (
      <Card className="flex-1">
        <CardContent className="p-4 text-muted-foreground text-sm">
          Select a template to edit settings
        </CardContent>
      </Card>
    )
  }

  const scene = localConfig.scene

  const updateScene = (key, value) => {
    // Sanitize numeric inputs (width/height)
    let finalValue = value
    if (['width', 'height', 'start', 'end'].includes(key)) {
      finalValue = sanitizeNumber(value)
    }

    const newConfig = {
      ...localConfig,
      scene: { ...localConfig.scene, [key]: finalValue },
    }
    setLocalConfig(newConfig)
    onConfigChange(newConfig)
  }

  const handleResolutionChange = (resId) => {
    setSelectedResolution(resId)
    const res = RESOLUTIONS.find((r) => r.id === resId)
    if (res && res.id !== 'custom') {
      const newConfig = {
        ...localConfig,
        scene: { ...localConfig.scene, width: res.width, height: res.height },
      }
      setLocalConfig(newConfig)
      onConfigChange(newConfig)
    }
  }

  return (
    <Card className="flex-1 overflow-auto">
      <CardHeader className="p-3 pb-2 flex flex-row items-center justify-between sticky top-0 bg-card z-10">
        <CardTitle className="text-sm">Template Editor</CardTitle>
        <Button size="sm" onClick={onApply}>
          Apply & Preview
        </Button>
      </CardHeader>
      <CardContent className="p-3 pt-0 space-y-4">
        {/* Resolution */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">
            Resolution
          </label>
          <Select
            value={selectedResolution}
            onValueChange={handleResolutionChange}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RESOLUTIONS.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedResolution === 'custom' && (
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div>
                <label className="text-xs text-muted-foreground">Width</label>
                <BlurInput
                  type="number"
                  value={scene.width || ''}
                  onChange={(e) => updateScene('width', e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Height</label>
                <BlurInput
                  type="number"
                  value={scene.height || ''}
                  onChange={(e) => updateScene('height', e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        {/* Font */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">
            Font
          </label>
          <Select
            value={scene.font || FONTS[0].id}
            onValueChange={(v) => updateScene('font', v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FONTS.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Font Size */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <label className="text-xs font-medium text-muted-foreground">
              Font Size
            </label>
            <span className="text-xs text-muted-foreground">
              {scene.font_size || 30}px
            </span>
          </div>
          <Slider
            value={[scene.font_size || 30]}
            min={8}
            max={200}
            step={1}
            onValueChange={([v]) => updateScene('font_size', v)}
          />
        </div>

        {/* Text Color */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">
            Text Color
          </label>
          <div className="flex gap-2">
            <Input
              type="color"
              value={scene.color || '#ffffff'}
              onChange={(e) => updateScene('color', e.target.value)}
              className="w-12 h-9 p-1 cursor-pointer"
            />
            <BlurInput
              type="text"
              value={scene.color || '#ffffff'}
              onChange={(e) => updateScene('color', e.target.value)}
              placeholder="#ffffff"
              className="flex-1 font-mono text-sm"
            />
          </div>
        </div>

        {/* Opacity */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <label className="text-xs font-medium text-muted-foreground">
              Opacity
            </label>
            <span className="text-xs text-muted-foreground">
              {Math.round((scene.opacity || 1) * 100)}%
            </span>
          </div>
          <Slider
            value={[scene.opacity !== undefined ? scene.opacity * 100 : 100]}
            min={0}
            max={100}
            step={1}
            onValueChange={([v]) => updateScene('opacity', v / 100)}
          />
        </div>

        {/* FPS */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">
            Frame Rate (FPS)
          </label>
          <Select
            value={String(scene.fps || 30)}
            onValueChange={(v) => updateScene('fps', parseInt(v))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24">24 fps (Film)</SelectItem>
              <SelectItem value="30">30 fps (Standard)</SelectItem>
              <SelectItem value="60">60 fps (Smooth)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Decimal Rounding */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">
            Decimal Places
          </label>
          <Select
            value={String(scene.decimal_rounding ?? 0)}
            onValueChange={(v) => updateScene('decimal_rounding', parseInt(v))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">0 (Whole numbers)</SelectItem>
              <SelectItem value="1">1 decimal</SelectItem>
              <SelectItem value="2">2 decimals</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Time Range */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">
            Time Range (seconds)
          </label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted-foreground">Start</label>
              <BlurInput
                type="number"
                min={0}
                value={scene.start || 0}
                onChange={(e) =>
                  updateScene(
                    'start',
                    Math.max(0, parseInt(e.target.value) || 0),
                  )
                }
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">End</label>
              <BlurInput
                type="number"
                min={1}
                value={scene.end || 60}
                onChange={(e) =>
                  updateScene(
                    'end',
                    Math.max(1, parseInt(e.target.value) || 60),
                  )
                }
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
