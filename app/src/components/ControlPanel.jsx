import { useState, useEffect } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Card } from '@/components/ui/card'
import {
  Tag,
  ChevronLeft,
  Settings2,
  Plus,
  Trash2,
  Sparkles,
  Gauge,
  Mountain,
  Map,
  TrendingUp,
  Video,
  Move,
  Type,
  Palette,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

// Available fonts
const FONTS = [
  { id: 'Arial.ttf', name: 'Arial' },
  { id: 'Evogria.otf', name: 'Evogria' },
  { id: 'Furore.otf', name: 'Furore' },
]

// Element type icons and labels
const ELEMENT_ICONS = {
  speed: Gauge,
  elevation: Mountain,
  gradient: TrendingUp,
  course: Map,
  label: Tag,
}

const ELEMENT_LABELS = {
  speed: 'Speed',
  elevation: 'Elevation',
  gradient: 'Gradient',
  course: 'Route Map',
}

// Parse config into flat element list
function parseElements(config) {
  if (!config) return []

  const elements = []

  // Labels
  ;(config.labels || []).forEach((label, i) => {
    elements.push({
      id: `label-${i}`,
      type: 'label',
      category: 'labels',
      index: i,
      name: `Label: "${label.text}"`,
      data: label,
    })
  })

  // Values
  ;(config.values || []).forEach((value, i) => {
    const unit = value.unit ? ` (${value.unit})` : ''
    elements.push({
      id: `value-${i}`,
      type: value.value,
      category: 'values',
      index: i,
      name: `${ELEMENT_LABELS[value.value] || value.value}${unit}`,
      data: value,
    })
  })

  // Plots
  ;(config.plots || []).forEach((plot, i) => {
    elements.push({
      id: `plot-${i}`,
      type: plot.value,
      category: 'plots',
      index: i,
      name: `${ELEMENT_LABELS[plot.value] || plot.value} Chart`,
      data: plot,
    })
  })

  return elements
}

export default function ControlPanel({ config, onConfigChange, onApply }) {
  const [selectedElementId, setSelectedElementId] = useState(null)
  const scene = config?.scene
  const elements = parseElements(config)
  const selectedElement = elements.find((e) => e.id === selectedElementId)

  // Local state for dropdown modes to fix "Custom" lag/logic issues
  const [resMode, setResMode] = useState('1080p')
  const [fpsMode, setFpsMode] = useState('30')

  // Sync mode with config when config changes (e.g. template reload)
  useEffect(() => {
    if (scene) {
      if (scene.width === 3840 && scene.height === 2160) setResMode('4k')
      else if (scene.width === 1920 && scene.height === 1080)
        setResMode('1080p')
      else setResMode('custom')

      if ([24, 30, 60].includes(scene.fps)) setFpsMode(String(scene.fps))
      else setFpsMode('custom')
    }
  }, [scene])

  // Reset selection when config changes significantly
  useEffect(() => {
    if (
      selectedElementId &&
      !elements.find((e) => e.id === selectedElementId)
    ) {
      setSelectedElementId(null)
    }
  }, [config, selectedElementId, elements, scene])

  const updateElement = (element, updates) => {
    const newConfig = { ...config }
    const category = element.category
    const index = element.index

    if (newConfig[category]) {
      const newArray = [...newConfig[category]]
      newArray[index] = { ...newArray[index], ...updates }
      newConfig[category] = newArray
      onConfigChange(newConfig)
    }
  }

  const addElement = (type) => {
    const newConfig = { ...config }
    let id = ''

    if (type === 'label') {
      if (!newConfig.labels) newConfig.labels = []
      const newLabel = {
        x: 100,
        y: 100,
        font_size: 60,
        text: 'New Label',
      }
      newConfig.labels.push(newLabel)
      id = `label-${newConfig.labels.length - 1}`
    } else if (['speed', 'elevation', 'gradient', 'course'].includes(type)) {
      if (['course', 'elevation'].includes(type) || type === 'gradient') {
        // These are typically plots in the backend engine
        if (!newConfig.plots) newConfig.plots = []
        const newPlot = {
          value: type,
          x: 100,
          y: 100,
          width: 400,
          height: 200,
          color: '#ffffff',
        }
        newConfig.plots.push(newPlot)
        id = `plot-${newConfig.plots.length - 1}`
      } else {
        // These are values
        if (!newConfig.values) newConfig.values = []
        const newValue = {
          x: 100,
          y: 100,
          font_size: 100,
          value: type,
        }
        newConfig.values.push(newValue)
        id = `value-${newConfig.values.length - 1}`
      }
    }

    onConfigChange(newConfig)
    onApply?.()
    if (id) setSelectedElementId(id)
  }

  const deleteElement = (e, element) => {
    e.stopPropagation() // Prevent selecting the element before deleting
    const newConfig = { ...config }
    const category = element.category
    const index = element.index

    if (newConfig[category]) {
      newConfig[category] = newConfig[category].filter((_, i) => i !== index)
      if (selectedElementId === element.id) {
        setSelectedElementId(null)
      }
      onConfigChange(newConfig)
      onApply?.()
    }
  }

  // Video settings update
  const updateScene = (key, value) => {
    onConfigChange({
      ...config,
      scene: { ...config.scene, [key]: value },
    })
  }

  if (!config) {
    return (
      <div className="p-6 text-muted-foreground text-sm">
        Select a template to edit
      </div>
    )
  }

  // Element properties view
  if (selectedElement) {
    const el = selectedElement
    const Icon = ELEMENT_ICONS[el.type] || Tag

    return (
      <div className="p-6 space-y-6">
        {/* Back button */}
        <Button
          variant="ghost"
          size="sm"
          className="mb-2 -ml-2"
          onClick={() => setSelectedElementId(null)}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to Elements
        </Button>

        {/* Element header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
            <Icon className="h-5 w-5 text-emerald-500" />
          </div>
          <div>
            <h3 className="font-semibold">{el.name}</h3>
            <p className="text-xs text-muted-foreground capitalize">
              {el.category.slice(0, -1)}
            </p>
          </div>
        </div>

        <Separator />

        {/* Position */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Move className="h-4 w-4 text-emerald-500" />
            <h4 className="font-medium text-sm">Position</h4>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs mb-1 block">X</Label>
              <Input
                type="number"
                value={el.data.x ?? 0}
                onChange={(e) =>
                  updateElement(el, { x: parseInt(e.target.value) || 0 })
                }
              />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Y</Label>
              <Input
                type="number"
                value={el.data.y ?? 0}
                onChange={(e) =>
                  updateElement(el, { y: parseInt(e.target.value) || 0 })
                }
              />
            </div>
          </div>

          {/* Size for plots */}
          {el.category === 'plots' && (
            <div className="grid grid-cols-2 gap-3 mt-2">
              <div>
                <Label className="text-xs mb-1 block">Width</Label>
                <Input
                  type="number"
                  value={el.data.width ?? 400}
                  onChange={(e) =>
                    updateElement(el, {
                      width: parseInt(e.target.value) || 400,
                    })
                  }
                />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Height</Label>
                <Input
                  type="number"
                  value={el.data.height ?? 200}
                  onChange={(e) =>
                    updateElement(el, {
                      height: parseInt(e.target.value) || 200,
                    })
                  }
                />
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Typography (for labels and values) */}
        {(el.category === 'labels' || el.category === 'values') && (
          <>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Type className="h-4 w-4 text-emerald-500" />
                <h4 className="font-medium text-sm">Typography</h4>
              </div>

              {el.category === 'labels' && (
                <div>
                  <Label className="text-xs mb-1 block">Text</Label>
                  <Input
                    value={el.data.text || ''}
                    onChange={(e) =>
                      updateElement(el, { text: e.target.value })
                    }
                  />
                </div>
              )}

              <div>
                <Label className="text-xs mb-2 block">
                  Font Size: {el.data.font_size || scene?.font_size || 30}px
                </Label>
                <Slider
                  min={8}
                  max={300}
                  step={1}
                  value={[el.data.font_size || scene?.font_size || 30]}
                  onValueChange={([v]) => updateElement(el, { font_size: v })}
                />
              </div>

              {el.category === 'values' && el.data.unit !== undefined && (
                <div>
                  <Label className="text-xs mb-1 block">Unit System</Label>
                  <Select
                    value={el.data.unit || 'metric'}
                    onValueChange={(v) => updateElement(el, { unit: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="metric">Metric (km/h)</SelectItem>
                      <SelectItem value="imperial">Imperial (mph)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <Separator />
          </>
        )}

        {/* Style (for plots) */}
        {el.category === 'plots' && (
          <>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Palette className="h-4 w-4 text-emerald-500" />
                <h4 className="font-medium text-sm">Style</h4>
              </div>

              <div>
                <Label className="text-xs mb-1 block">Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={el.data.color || '#ffffff'}
                    onChange={(e) =>
                      updateElement(el, { color: e.target.value })
                    }
                    className="w-12 h-9 p-1 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={el.data.color || '#ffffff'}
                    onChange={(e) =>
                      updateElement(el, { color: e.target.value })
                    }
                    className="flex-1 font-mono text-xs"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs mb-1 block">
                  Rotation: {el.data.rotation ?? 0}°
                </Label>
                <Slider
                  min={0}
                  max={360}
                  step={5}
                  value={[el.data.rotation ?? 0]}
                  onValueChange={([v]) => updateElement(el, { rotation: v })}
                />
              </div>

              {el.data.line && (
                <div>
                  <Label className="text-xs mb-1 block">
                    Line Width: {el.data.line?.width ?? 1}px
                  </Label>
                  <Slider
                    min={0.5}
                    max={10}
                    step={0.25}
                    value={[el.data.line?.width ?? 1]}
                    onValueChange={([v]) =>
                      updateElement(el, { line: { ...el.data.line, width: v } })
                    }
                  />
                </div>
              )}
            </div>
            <Separator />
          </>
        )}

        {/* Apply button */}
        <Button
          className="w-full bg-emerald-600 hover:bg-emerald-700"
          onClick={onApply}
        >
          Apply Changes
        </Button>
      </div>
    )
  }

  // Main element list view
  return (
    <div className="p-6 space-y-6">
      {/* Video Settings */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Video className="h-4 w-4 text-emerald-500" />
          <h3 className="font-semibold">Video Settings</h3>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs mb-1 block">Resolution</Label>
            <Select
              value={resMode}
              onValueChange={(v) => {
                setResMode(v)
                if (v === '4k') {
                  updateScene('width', 3840)
                  updateScene('height', 2160)
                } else if (v === '1080p') {
                  updateScene('width', 1920)
                  updateScene('height', 1080)
                }
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1080p">1080p (1920x1080)</SelectItem>
                <SelectItem value="4k">4K (3840x2160)</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs mb-1 block">FPS</Label>
            <Select
              value={fpsMode}
              onValueChange={(v) => {
                setFpsMode(v)
                if (v !== 'custom') {
                  updateScene('fps', parseInt(v))
                }
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24">24</SelectItem>
                <SelectItem value="30">30</SelectItem>
                <SelectItem value="60">60</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Custom Resolution Inputs */}
        {resMode === 'custom' && (
          <div className="grid grid-cols-2 gap-2 border-l-2 border-emerald-500/20 pl-3 pt-1">
            <div>
              <Label className="text-[10px] text-muted-foreground uppercase font-bold mb-1 block">
                Custom Width
              </Label>
              <Input
                type="number"
                value={scene?.width ?? 1920}
                onChange={(e) =>
                  updateScene('width', parseInt(e.target.value) || 0)
                }
                className="h-8 text-xs"
              />
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground uppercase font-bold mb-1 block">
                Custom Height
              </Label>
              <Input
                type="number"
                value={scene?.height ?? 1080}
                onChange={(e) =>
                  updateScene('height', parseInt(e.target.value) || 0)
                }
                className="h-8 text-xs"
              />
            </div>
          </div>
        )}

        {/* Custom FPS Input */}
        {fpsMode === 'custom' && (
          <div className="border-l-2 border-emerald-500/20 pl-3 pt-1">
            <Label className="text-[10px] text-muted-foreground uppercase font-bold mb-1 block">
              Custom FPS
            </Label>
            <Input
              type="number"
              min={1}
              value={scene?.fps ?? 30}
              onChange={(e) =>
                updateScene('fps', parseInt(e.target.value) || 1)
              }
              className="h-8 text-xs"
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs mb-1 block">Start (s)</Label>
            <Input
              type="number"
              min={0}
              value={scene?.start ?? 0}
              onChange={(e) =>
                updateScene('start', Math.max(0, parseInt(e.target.value) || 0))
              }
            />
          </div>
          <div>
            <Label className="text-xs mb-1 block">End (s)</Label>
            <Input
              type="number"
              min={1}
              value={scene?.end ?? 60}
              onChange={(e) =>
                updateScene('end', Math.max(1, parseInt(e.target.value) || 60))
              }
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Global Style */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Settings2 className="h-4 w-4 text-emerald-500" />
          <h3 className="font-semibold">Global Style</h3>
        </div>
        <div>
          <Label className="text-xs mb-1 block">Font</Label>
          <Select
            value={scene?.font || FONTS[0].id}
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
        <div>
          <Label className="text-xs mb-1 block">Text Color</Label>
          <div className="flex gap-2">
            <Input
              type="color"
              value={scene?.color || '#ffffff'}
              onChange={(e) => updateScene('color', e.target.value)}
              className="w-12 h-9 p-1 cursor-pointer"
            />
            <Input
              type="text"
              value={scene?.color || '#ffffff'}
              onChange={(e) => updateScene('color', e.target.value)}
              className="flex-1 font-mono text-xs"
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Add Elements */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-emerald-400" />
          <h3 className="font-semibold">Add Overlay</h3>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-[10px] h-8 justify-start font-bold uppercase tracking-wider"
            onClick={() => addElement('label')}
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Label
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-[10px] h-8 justify-start font-bold uppercase tracking-wider"
            onClick={() => addElement('speed')}
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Speed
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-[10px] h-8 justify-start font-bold uppercase tracking-wider"
            onClick={() => addElement('course')}
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Map
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-[10px] h-8 justify-start font-bold uppercase tracking-wider"
            onClick={() => addElement('elevation')}
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Chart
          </Button>
        </div>
      </div>

      <Separator />

      {/* Overlay Elements */}
      <div className="space-y-3 overflow-hidden">
        <h3 className="font-semibold">Elements List</h3>
        <div className="space-y-2 pb-8">
          {elements.length === 0 ? (
            <p className="text-xs text-muted-foreground italic p-4 text-center border-2 border-dashed rounded-lg">
              No elements added yet
            </p>
          ) : (
            elements.map((el) => {
              const Icon = ELEMENT_ICONS[el.type] || Tag
              return (
                <Card
                  key={el.id}
                  className="p-3 cursor-pointer transition-all hover:border-emerald-500 hover:bg-emerald-500/10 group overflow-hidden relative"
                  onClick={() => setSelectedElementId(el.id)}
                >
                  <div className="flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-3">
                      <Icon className="h-4 w-4 text-emerald-500" />
                      <div>
                        <span className="text-sm font-medium">{el.name}</span>
                        <p className="text-[10px] text-muted-foreground">
                          x:{el.data.x ?? 0} y:{el.data.y ?? 0}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:bg-destructive/10"
                        onClick={(e) => deleteElement(e, el)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                      <ChevronLeft className="h-4 w-4 text-muted-foreground rotate-180" />
                    </div>
                  </div>
                </Card>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
