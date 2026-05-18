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
  let previewFps = $state(1)
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

  function addElement(category, defaults) {
    if (!config) return
    const arr = [...(config[category] ?? []), defaults]
    commitConfig({ ...config, [category]: arr })
  }

  function removeElement(category, idx) {
    if (!config?.[category]) return
    const arr = config[category].filter((_, i) => i !== idx)
    commitConfig({ ...config, [category]: arr })
    if (selectedElementId === `${category.slice(0, -1)}-${idx}`) {
      selectOnly(null)
    }
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
    const base = await backend.getTemplate('default.json')
    await backend.saveTemplate(filename, base)
    config = base
    loadedTemplateFilename = filename
    selectOnly(null)
    resetHistory()
    markPristine()
    await fetchTemplates()
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
    selectedElementLabel,
    fetchTemplates,
    loadTemplate,
    saveTemplate,
    saveTemplateAs,
    newTemplate,
  }
}
