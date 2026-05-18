import { open } from '@tauri-apps/plugin-dialog'
import * as backend from '../api/backend.js'
import { parseLocalStorage } from '../lib/utils.js'

export function createAppState() {
  // ── Persistent ──────────────────────────────────────────────────────────────
  // config is the single source of truth: scene settings + all element positions
  let config = $state(parseLocalStorage('editorConfig'))
  const _storedGpx = localStorage.getItem('gpxFilename')
  let gpxFilename = $state(
    _storedGpx && _storedGpx !== 'null' && _storedGpx !== 'undefined'
      ? _storedGpx
      : null,
  )
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
  // Snapshot of `config` as it was last loaded/saved. Used to detect unsaved
  // template edits. Output resolution lives outside `config`, so switching a
  // 1080p template into a 4K view never marks it modified.
  let pristineConfig = $state(
    localStorage.getItem('pristineConfig') ??
      (config ? JSON.stringify(config) : null),
  )

  // ── Transient ────────────────────────────────────────────────────────────────
  let copiedElement = $state(null) // { category, item } — in-memory element clipboard
  let previewFps = $state(1)
  let benchmarking = $state(false)
  let lastRenderFps = $state(
    parseFloat(localStorage.getItem('lastRenderFps') ?? '') || null,
  )
  let renderingVideo = $state(false)
  let currentPreviewImage = $state(null) // data:image/png;base64,... from latest demo frame
  let errorMessage = $state(null)
  let successMessage = $state(null)
  let successTimer = null
  let templates = $state([])
  let fonts = $state([])
  let showTemplatePicker = $state(false)
  let selectedElementId = $state(null)
  let selectedElementIds = $state([])
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
    if (gpxFilename) localStorage.setItem('gpxFilename', gpxFilename)
    else localStorage.removeItem('gpxFilename')
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
  $effect(() => {
    if (pristineConfig != null)
      localStorage.setItem('pristineConfig', pristineConfig)
    else localStorage.removeItem('pristineConfig')
  })

  function markPristine() {
    pristineConfig = config ? JSON.stringify(config) : null
  }

  function templateModified() {
    return (
      !!config &&
      pristineConfig != null &&
      JSON.stringify(config) !== pristineConfig
    )
  }

  // Pending "discard unsaved edits?" action. When set, app.svelte shows a
  // ConfirmDialog; running or clearing it resolves the gate.
  let pendingDiscard = $state(null)

  function confirmIfModified(run) {
    if (templateModified()) pendingDiscard = run
    else run()
  }

  function resolvePendingDiscard(ok) {
    const run = pendingDiscard
    pendingDiscard = null
    showTemplatePicker = false
    if (ok && run) run()
  }

  // ── Selection ─────────────────────────────────────────────────────────────
  // selectedElementId is the "primary" element (drives the properties panel);
  // selectedElementIds is the full set for shift-click multi-select + group drag.

  function selectOnly(id) {
    selectedElementId = id
    selectedElementIds = id ? [id] : []
  }

  function setSelectedElements(ids) {
    selectedElementIds = [...ids]
    selectedElementId = ids.length ? ids[ids.length - 1] : null
  }

  function toggleElementSelection(id) {
    if (selectedElementIds.includes(id)) {
      selectedElementIds = selectedElementIds.filter((x) => x !== id)
      if (selectedElementId === id) {
        selectedElementId =
          selectedElementIds[selectedElementIds.length - 1] ?? null
      }
    } else {
      selectedElementIds = [...selectedElementIds, id]
      selectedElementId = id
    }
  }

  // ── Undo history ──────────────────────────────────────────────────────────
  // Snapshots of `config` taken just before each edit. Template load/new and
  // wholesale config replacement clear it (you can't undo across a switch).
  const HISTORY_LIMIT = 50
  let history = $state([])

  // Apply an edit, recording the pre-edit config so it can be undone.
  function commitConfig(next) {
    if (config) {
      history = [...history.slice(-(HISTORY_LIMIT - 1)), JSON.stringify(config)]
    }
    config = next
  }

  function resetHistory() {
    history = []
  }

  function undo() {
    if (history.length === 0) return
    const prev = history[history.length - 1]
    history = history.slice(0, -1)
    config = JSON.parse(prev)
  }

  // ── Config mutation helpers ───────────────────────────────────────────────

  function updateScene(updates) {
    if (!config?.scene) return
    commitConfig({ ...config, scene: { ...config.scene, ...updates } })
  }

  function updateElement(category, idx, updates) {
    if (!config?.[category]) return
    const arr = [...config[category]]
    arr[idx] = { ...arr[idx], ...updates }
    commitConfig({ ...config, [category]: arr })
  }

  function updateElementPos(category, idx, x, y) {
    updateElement(category, idx, { x: Math.round(x), y: Math.round(y) })
  }

  // Apply several position changes as ONE edit (one undo step) — used by
  // group drag so the whole move reverts together.
  function updateElementPositions(moves) {
    if (!config || moves.length === 0) return
    let next = config
    for (const m of moves) {
      const arr = [...(next[m.category] ?? [])]
      if (!arr[m.idx]) continue
      arr[m.idx] = { ...arr[m.idx], x: Math.round(m.x), y: Math.round(m.y) }
      next = { ...next, [m.category]: arr }
    }
    commitConfig(next)
  }

  function elementIdFor(category, idx) {
    return `${category.slice(0, -1)}-${idx}`
  }

  function allElementIds(nextConfig = config) {
    if (!nextConfig) return []
    return [
      ...(nextConfig.labels ?? []).map((_, i) => `label-${i}`),
      ...(nextConfig.plots ?? []).map((_, i) => `plot-${i}`),
      ...(nextConfig.values ?? []).map((_, i) => `value-${i}`),
    ]
  }

  function normalizedElementLayerIds(nextConfig = config) {
    const ids = allElementIds(nextConfig)
    const existing = (nextConfig?.scene?.layers ?? []).filter((id) =>
      ids.includes(id),
    )
    const missing = ids.filter((id) => !existing.includes(id))
    return [...existing, ...missing]
  }

  function withNormalizedLayers(nextConfig) {
    if (!nextConfig?.scene) return nextConfig
    return {
      ...nextConfig,
      scene: {
        ...nextConfig.scene,
        layers: normalizedElementLayerIds(nextConfig),
      },
    }
  }

  function addElement(category, defaults) {
    if (!config) return
    const arr = [...(config[category] ?? []), defaults]
    const next = { ...config, [category]: arr }
    const layers = normalizedElementLayerIds(next)
    const id = elementIdFor(category, arr.length - 1)
    commitConfig({
      ...next,
      scene: { ...next.scene, layers: [...layers.filter((x) => x !== id), id] },
    })
  }

  function removeElement(category, idx) {
    if (!config?.[category]) return
    const arr = config[category].filter((_, i) => i !== idx)
    commitConfig(withNormalizedLayers({ ...config, [category]: arr }))
    if (selectedElementId === elementIdFor(category, idx)) {
      selectOnly(null)
    }
  }

  function moveElementLayer(id, delta) {
    if (!config?.scene) return
    const layers = normalizedElementLayerIds()
    const from = layers.indexOf(id)
    if (from < 0) return
    const to = Math.max(0, Math.min(layers.length - 1, from + delta))
    if (to === from) return
    const next = [...layers]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    commitConfig({ ...config, scene: { ...config.scene, layers: next } })
  }

  const ELEMENT_CATEGORY = { label: 'labels', value: 'values', plot: 'plots' }
  const ELEMENT_TYPE_NAME = { label: 'Label', value: 'Metric', plot: 'Chart' }

  function parseSelectedElement() {
    if (!selectedElementId || !config) return null
    const m = selectedElementId.match(/^(label|value|plot)-(\d+)$/)
    if (!m) return null
    const category = ELEMENT_CATEGORY[m[1]]
    const idx = parseInt(m[2])
    const item = config[category]?.[idx]
    return item ? { category, idx, item, type: m[1] } : null
  }

  function selectedElementLabel() {
    const s = parseSelectedElement()
    if (!s) return null
    const text = s.item.text || s.item.value || ''
    return text
      ? `${ELEMENT_TYPE_NAME[s.type]} "${text}"`
      : ELEMENT_TYPE_NAME[s.type]
  }

  function deleteSelectedElement() {
    const s = parseSelectedElement()
    if (s) removeElement(s.category, s.idx)
  }

  function copyElement() {
    const s = parseSelectedElement()
    if (!s) return
    copiedElement = { category: s.category, item: s.item }
  }

  function pasteElement() {
    if (!copiedElement) return
    addElement(copiedElement.category, {
      ...copiedElement.item,
      x: (copiedElement.item.x ?? 0) + 20,
      y: (copiedElement.item.y ?? 0) + 20,
    })
  }

  // ── Template actions ─────────────────────────────────────────────────────

  function toFilename(raw) {
    const stem = raw
      .trim()
      .toLowerCase()
      .replace(/\.json$/, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
    return stem ? `${stem}.json` : null
  }

  function templateDisplayName(filename) {
    return filename
      .replace(/\.json$/, '')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase())
  }

  function blankTemplate(name) {
    return {
      scene: {
        width: outputWidth,
        height: outputHeight,
        fps: 30,
        start: 0,
        end: Math.max(1, Math.floor(activityDuration || 60)),
        color: '#ffffff',
        opacity: 1,
        font_size: 64,
        overlay_filename: name.replace(/\.json$/, ''),
        layers: [],
      },
      labels: [],
      values: [],
      plots: [],
    }
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
      if (!filename) return
    }
    await backend.saveTemplate(filename, config)
    loadedTemplateFilename = filename
    markPristine()
    if (currentPreviewImage) {
      backend.saveTemplatePreview(filename, currentPreviewImage).catch(() => {})
    }
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
    if (!filename) return
    await backend.saveTemplate(filename, config)
    loadedTemplateFilename = filename
    markPristine()
    if (currentPreviewImage) {
      backend.saveTemplatePreview(filename, currentPreviewImage).catch(() => {})
    }
    await fetchTemplates()
    showSuccess(`Saved "${filename}"`)
  }

  async function newTemplate() {
    const name = prompt('New template name:', 'my_overlay')
    if (!name) return
    const filename = toFilename(name)
    if (!filename) return
    const base = blankTemplate(filename)
    await backend.saveTemplate(filename, base)
    config = base
    loadedTemplateFilename = filename
    selectOnly(null)
    resetHistory()
    markPristine()
    await fetchTemplates()
    showSuccess(`Created "${templateDisplayName(filename)}"`)
  }

  async function renameTemplate(nextName = null) {
    if (!loadedTemplateFilename) {
      errorMessage = 'Load or create a template before renaming it.'
      return
    }
    const current = loadedTemplateFilename.replace(/\.json$/, '')
    const name = nextName ?? prompt('Rename template:', current)
    if (!name) return
    const filename = toFilename(name)
    if (!filename || filename === loadedTemplateFilename) return
    try {
      await backend.renameTemplate(loadedTemplateFilename, filename)
    } catch (e) {
      const message = e?.message ?? String(e)
      if (!message.includes('Template not found')) throw e
      if (!config) throw e
      await backend.saveTemplate(filename, config)
      markPristine()
    }
    loadedTemplateFilename = filename
    await fetchTemplates()
    showSuccess(`Renamed to "${templateDisplayName(filename)}"`)
  }

  async function fetchTemplates() {
    try {
      templates = await backend.listTemplates()
    } catch (err) {
      console.error('Failed to fetch templates:', err)
    }
  }

  async function fetchFonts() {
    try {
      fonts = await backend.listFonts()
    } catch (err) {
      console.error('Failed to fetch fonts:', err)
    }
  }

  // Pick a .ttf/.otf, copy it into the user fonts dir, refresh the list, and
  // return the new font's filename so the caller can select it.
  async function addCustomFont() {
    const selected = await open({
      multiple: false,
      filters: [{ name: 'Fonts', extensions: ['ttf', 'otf'] }],
    })
    if (!selected) return null
    try {
      fonts = await backend.importFont(selected)
      return selected.split(/[\\/]/).pop()
    } catch (err) {
      errorMessage = `Could not add font: ${err?.message ?? err}`
      return null
    }
  }

  async function runBenchmark() {
    if (renderingVideo || benchmarking || !config || !gpxFilename) return
    benchmarking = true
    try {
      const result = await backend.nativeBenchmark(
        config,
        gpxFilename,
        90,
        outputWidth,
        outputHeight,
      )
      if (result.frames > 0 && result.elapsed_ms > 0) {
        const fps = (result.frames / result.elapsed_ms) * 1000
        lastRenderFps = fps
        localStorage.setItem('lastRenderFps', fps.toFixed(4))
      }
    } catch (e) {
      console.debug('Benchmark failed:', e)
    } finally {
      benchmarking = false
    }
  }

  // Re-benchmark whenever the template or GPX changes (debounced so rapid
  // config edits don't flood the Rust thread pool).
  $effect(() => {
    void loadedTemplateFilename
    void gpxFilename
    void outputWidth
    void outputHeight
    if (!config || !gpxFilename) return
    const timer = setTimeout(runBenchmark, 800)
    return () => clearTimeout(timer)
  })

  async function loadTemplate(filename) {
    const data = await backend.getTemplate(filename)
    config = data
    loadedTemplateFilename = filename
    selectOnly(null)
    resetHistory()
    markPristine()
  }

  return {
    get config() {
      return config
    },
    set config(v) {
      config = v
      resetHistory()
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
    get isTemplateModified() {
      return templateModified()
    },
    get pendingDiscard() {
      return pendingDiscard
    },
    confirmIfModified,
    resolvePendingDiscard,
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
    get currentPreviewImage() {
      return currentPreviewImage
    },
    set currentPreviewImage(v) {
      currentPreviewImage = v
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
    get fonts() {
      return fonts
    },
    fetchFonts,
    addCustomFont,
    get showTemplatePicker() {
      return showTemplatePicker
    },
    set showTemplatePicker(v) {
      showTemplatePicker = v
    },
    get selectedElementId() {
      return selectedElementId
    },
    set selectedElementId(v) {
      selectOnly(v)
    },
    get selectedElementIds() {
      return selectedElementIds
    },
    toggleElementSelection,
    setSelectedElements,
    get canUndo() {
      return history.length > 0
    },
    undo,
    get elementLayerOrder() {
      return normalizedElementLayerIds()
    },
    moveElementLayer,
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
    updateElementPositions,
    addElement,
    removeElement,
    deleteSelectedElement,
    get copiedElement() {
      return copiedElement
    },
    copyElement,
    pasteElement,
    get lastRenderFps() {
      return lastRenderFps
    },
    set lastRenderFps(v) {
      lastRenderFps = v
    },
    get benchmarking() {
      return benchmarking
    },
    selectedElementLabel,
    fetchTemplates,
    loadTemplate,
    saveTemplate,
    saveTemplateAs,
    newTemplate,
    renameTemplate,
  }
}
