import * as backend from '../api/backend.js'
import { parseLocalStorage } from '../lib/utils.js'

export function createAppState() {
  // ── Persistent ──────────────────────────────────────────────────────────────
  // config is the single source of truth: scene settings + all element positions
  let config = $state(parseLocalStorage('editorConfig'))
  let gpxFilename = $state(localStorage.getItem('gpxFilename') ?? null)
  let activityDuration = $state(
    parseInt(localStorage.getItem('activityDuration') ?? '73'),
  )
  let selectedSecond = $state(
    parseInt(localStorage.getItem('selectedSecond') ?? '0'),
  )
  let loadedTemplateFilename = $state(
    localStorage.getItem('loadedTemplateFilename') ?? null,
  )
  let outputDir = $state(localStorage.getItem('outputDir') ?? null)
  let outputWidth = $state(
    parseInt(localStorage.getItem('outputWidth') ?? '1920'),
  )
  let outputHeight = $state(
    parseInt(localStorage.getItem('outputHeight') ?? '1080'),
  )

  // ── Transient ────────────────────────────────────────────────────────────────
  let previewFps = $state(1)
  let renderingVideo = $state(false)
  let errorMessage = $state(null)
  let successMessage = $state(null)
  let successTimer = null
  let templates = $state([])
  let selectedElementId = $state(null)
  let renderProgress = $state({
    current: 0,
    total: 0,
    percent: 0,
    status: 'idle',
    estimatedSecondsRemaining: null,
    overlaySecondsRendered: 0,
    overlayTotalSeconds: 0,
  })

  // ── Persistence effects ───────────────────────────────────────────────────
  $effect(() => {
    if (config) localStorage.setItem('editorConfig', JSON.stringify(config))
  })
  $effect(() => {
    if (gpxFilename != null) localStorage.setItem('gpxFilename', gpxFilename)
  })
  $effect(() => {
    localStorage.setItem('activityDuration', String(activityDuration))
  })
  $effect(() => {
    localStorage.setItem('selectedSecond', String(selectedSecond))
  })
  $effect(() => {
    if (loadedTemplateFilename)
      localStorage.setItem('loadedTemplateFilename', loadedTemplateFilename)
  })
  $effect(() => {
    if (outputDir) localStorage.setItem('outputDir', outputDir)
    else localStorage.removeItem('outputDir')
  })
  $effect(() => {
    localStorage.setItem('outputWidth', String(outputWidth))
  })
  $effect(() => {
    localStorage.setItem('outputHeight', String(outputHeight))
  })

  // ── Config mutation helpers ───────────────────────────────────────────────

  function updateScene(updates) {
    if (!config?.scene) return
    config = { ...config, scene: { ...config.scene, ...updates } }
  }

  function updateElement(category, idx, updates) {
    if (!config?.[category]) return
    const arr = [...config[category]]
    arr[idx] = { ...arr[idx], ...updates }
    config = { ...config, [category]: arr }
  }

  function updateElementPos(category, idx, x, y) {
    updateElement(category, idx, { x: Math.round(x), y: Math.round(y) })
  }

  function addElement(category, defaults) {
    if (!config) return
    const arr = [...(config[category] ?? []), defaults]
    config = { ...config, [category]: arr }
  }

  function removeElement(category, idx) {
    if (!config?.[category]) return
    const arr = config[category].filter((_, i) => i !== idx)
    config = { ...config, [category]: arr }
    if (selectedElementId === `${category.slice(0, -1)}-${idx}`) {
      selectedElementId = null
    }
  }

  // ── Template actions ─────────────────────────────────────────────────────

  function toFilename(raw) {
    return (
      raw
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/\.json$/, '') + '.json'
    )
  }

  function showSuccess(msg) {
    successMessage = msg
    clearTimeout(successTimer)
    successTimer = setTimeout(() => {
      successMessage = null
    }, 2500)
  }

  async function saveTemplate() {
    if (!config) return
    let filename = loadedTemplateFilename
    const tpl = templates.find((t) => t.id === filename)
    if (!filename || tpl?.type === 'built-in') {
      const name = prompt(
        'Template name:',
        filename?.replace('.json', '') ?? 'my_overlay',
      )
      if (!name) return
      filename = toFilename(name)
    }
    await backend.saveTemplate(filename, config)
    loadedTemplateFilename = filename
    await fetchTemplates()
    showSuccess(`Saved "${filename}"`)
  }

  async function saveTemplateAs() {
    if (!config) return
    const name = prompt(
      'Save as:',
      loadedTemplateFilename?.replace('.json', '') ?? 'my_overlay',
    )
    if (!name) return
    const filename = toFilename(name)
    await backend.saveTemplate(filename, config)
    loadedTemplateFilename = filename
    await fetchTemplates()
    showSuccess(`Saved "${filename}"`)
  }

  async function newTemplate() {
    const name = prompt('New template name:', 'my_overlay')
    if (!name) return
    const filename = toFilename(name)
    const base = await backend.getTemplate('default.json')
    await backend.saveTemplate(filename, base)
    config = base
    loadedTemplateFilename = filename
    selectedElementId = null
    await fetchTemplates()
  }

  async function fetchTemplates() {
    try {
      templates = await backend.listTemplates()
    } catch (err) {
      console.error('Failed to fetch templates:', err)
    }
  }

  async function loadTemplate(filename) {
    const data = await backend.getTemplate(filename)
    config = data
    loadedTemplateFilename = filename
    selectedElementId = null
  }

  return {
    get config() {
      return config
    },
    set config(v) {
      config = v
    },
    get gpxFilename() {
      return gpxFilename
    },
    set gpxFilename(v) {
      gpxFilename = v
    },
    get activityDuration() {
      return activityDuration
    },
    set activityDuration(v) {
      activityDuration = v
    },
    get selectedSecond() {
      return selectedSecond
    },
    set selectedSecond(v) {
      selectedSecond = v
    },
    get loadedTemplateFilename() {
      return loadedTemplateFilename
    },
    set loadedTemplateFilename(v) {
      loadedTemplateFilename = v
    },
    get outputDir() {
      return outputDir
    },
    set outputDir(v) {
      outputDir = v
    },
    get outputWidth() {
      return outputWidth
    },
    set outputWidth(v) {
      outputWidth = v
    },
    get outputHeight() {
      return outputHeight
    },
    set outputHeight(v) {
      outputHeight = v
    },
    get previewFps() {
      return previewFps
    },
    set previewFps(v) {
      previewFps = v
    },
    get renderingVideo() {
      return renderingVideo
    },
    set renderingVideo(v) {
      renderingVideo = v
    },
    get errorMessage() {
      return errorMessage
    },
    set errorMessage(v) {
      errorMessage = v
    },
    get successMessage() {
      return successMessage
    },
    get templates() {
      return templates
    },
    set templates(v) {
      templates = v
    },
    get selectedElementId() {
      return selectedElementId
    },
    set selectedElementId(v) {
      selectedElementId = v
    },
    get renderProgress() {
      return renderProgress
    },
    set renderProgress(v) {
      renderProgress = v
    },
    clearError() {
      errorMessage = null
    },
    updateScene,
    updateElement,
    updateElementPos,
    addElement,
    removeElement,
    fetchTemplates,
    loadTemplate,
    saveTemplate,
    saveTemplateAs,
    newTemplate,
  }
}
