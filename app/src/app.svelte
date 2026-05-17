<script>
  import { setContext, onMount } from 'svelte'
  import { open } from '@tauri-apps/plugin-dialog'
  import { listen } from '@tauri-apps/api/event'
  import { createAppState } from './state/appState.svelte.js'
  import * as backend from './api/backend.js'
  import loadGpx from './api/gpxUtils.js'
  import renderVideo from './api/renderVideo.js'

  import LeftSidebar from './components/layout/LeftSidebar.svelte'
  import CenterCanvas from './components/layout/CenterCanvas.svelte'
  import RightPanel from './components/layout/RightPanel.svelte'
  import RenderProgressOverlay from './components/overlays/RenderProgressOverlay.svelte'
  import ErrorToast from './components/overlays/ErrorToast.svelte'
  import UpdateBanner from './components/overlays/UpdateBanner.svelte'
  import Settings from './components/overlays/Settings.svelte'
  import TemplatePickerModal from './components/overlays/TemplatePickerModal.svelte'
  import Button from './components/ui/Button.svelte'
  import Tooltip from './components/ui/Tooltip.svelte'

  import { Activity, Play, FolderOpen } from 'lucide-svelte'

  // ── State ──────────────────────────────────────────────────────────────────
  const app = createAppState()
  setContext('app', app)

  let rendering = $state(false)
  let showSettings = $state(false)
  let buildInfo = $state('')

  onMount(() => {
    app.fetchTemplates()
    if (import.meta.env.DEV) backend.appBuildInfo().then(s => { buildInfo = s }).catch(() => {})

    if (typeof window.__TAURI__ !== 'undefined') {
      const unlisteners = [
        listen('menu_open_gpx',         () => handleOpenGpx()),
        listen('menu_open_recent_gpx',  (e) => handleOpenRecentGpx(e.payload)),
        listen('menu_save_template',    () => app.saveTemplate().catch(e => { app.errorMessage = e.message })),
        listen('menu_save_template_as', () => app.saveTemplateAs().catch(e => { app.errorMessage = e.message })),
        listen('menu_new_template',     () => app.newTemplate().catch(e => { app.errorMessage = e.message })),
        listen('menu_show_downloads',   () => handleOpenDownloads()),
        listen('menu_show_templates',   () => backend.openTemplatesFolder().catch(() => {})),
        listen('menu_settings',         () => { showSettings = true }),
        listen('menu_browse_community_templates', () => { app.showTemplatePicker = true }),
      ]
      return () => unlisteners.forEach(p => p.then(fn => fn()))
    }
  })

  // ── Actions ────────────────────────────────────────────────────────────────
  async function handleOpenGpx() {
    try {
      const inTauri = typeof window.__TAURI__ !== 'undefined'
      if (inTauri) {
        const selected = await open({
          multiple: false,
          filters: [{ name: 'GPX', extensions: ['gpx'] }],
          title: 'Select GPX Activity',
        })
        if (!selected) return
        await loadGpx(selected, app)
        backend.recordGpxOpened(selected).catch(() => {})
        if (!app.config) {
          try {
            const def = await backend.getTemplate('default.json')
            app.config = def
            app.loadedTemplateFilename = 'default.json'
            app.updateScene({ start: 0, end: app.activityDuration })
          } catch { /* use existing config */ }
        }
      } else {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = '.gpx'
        input.onchange = async (e) => {
          const file = e.target.files?.[0]
          if (file) await loadGpx(file, app)
        }
        input.click()
      }
    } catch (err) {
      app.errorMessage = `GPX load failed: ${err.message}`
    }
  }

  async function handleOpenRecentGpx(path) {
    try {
      await loadGpx(path, app)
      backend.recordGpxOpened(path).catch(() => {})
      if (!app.config) {
        try {
          const def = await backend.getTemplate('default.json')
          app.config = def
          app.loadedTemplateFilename = 'default.json'
          app.updateScene({ start: 0, end: app.activityDuration })
        } catch { /* use existing config */ }
      }
    } catch (err) {
      app.errorMessage = `Could not open ${path.split('/').pop()}: ${err.message}`
    }
  }

  async function handleRender() {
    if (rendering) return
    rendering = true
    try {
      const result = await renderVideo(app)
      if (result?.cancelled) console.log('Render cancelled')
    } catch (err) {
      app.errorMessage = err.message ?? 'Render failed'
    } finally {
      rendering = false
    }
  }

  async function handleOpenDownloads() {
    try { await backend.openDownloads(app.outputDir) } catch (e) {
      app.errorMessage = `Could not open output folder: ${e.message}`
    }
  }

  let gpxLabel = $derived.by(() => {
    if (!app.gpxFilename) return 'Load GPX'
    const basename = app.gpxFilename.split(/[\\/]/).pop()
    return basename === 'demo.gpxinit' ? 'Load GPX' : basename
  })
</script>

<div class="h-screen flex flex-col bg-[#09090b] text-foreground overflow-hidden select-none">
  <ErrorToast />
  <UpdateBanner />
  <RenderProgressOverlay />
  {#if showSettings}
    <Settings onclose={() => { showSettings = false }} />
  {/if}
  {#if app.showTemplatePicker}
    <TemplatePickerModal onclose={() => { app.showTemplatePicker = false }} />
  {/if}

  <!-- ── Header ─────────────────────────────────────────────────────────────── -->
  <header class="h-12 shrink-0 border-b border-zinc-800 bg-zinc-900/60 backdrop-blur-sm flex items-center gap-3 px-4 z-50">
    <!-- Logo -->
    <div class="flex items-center gap-2.5 mr-2">
      <img src="/logo192.png" alt="" class="w-7 h-7 rounded-[6px]" />
      <span class="text-sm font-semibold tracking-tight">Cyclemetry</span>
    </div>

    <div class="h-5 w-px bg-zinc-800"></div>
    {#if buildInfo}<span class="text-[10px] text-zinc-600 font-mono">{buildInfo}</span>{/if}

    <!-- GPX picker -->
    <Tooltip content={!app.gpxFilename ? 'Load a .gpx activity file' : gpxLabel} side="bottom">
      <Button variant="outline" size="sm" onclick={handleOpenGpx} class="gap-1.5 max-w-[160px]">
        <Activity size={13} />
        <span class="truncate">{gpxLabel}</span>
      </Button>
    </Tooltip>

    <div class="flex-1"></div>

    <!-- Render button -->
    <Tooltip
      content={!app.config ? 'Load a template first' : app.renderingVideo ? 'Render in progress' : null}
      side="bottom"
    >
      <Button
        onclick={handleRender}
        disabled={!app.config || app.renderingVideo}
        class="gap-1.5"
        size="sm"
      >
        <Play size={13} />
        {app.renderingVideo ? 'Rendering…' : 'Render'}
      </Button>
    </Tooltip>

    <!-- Downloads -->
    <Button variant="ghost" size="icon" onclick={handleOpenDownloads} title="Open downloads folder">
      <FolderOpen size={14} />
    </Button>

  </header>

  <!-- ── Three-panel layout ─────────────────────────────────────────────────── -->
  <div class="flex-1 flex overflow-hidden min-h-0">
    <LeftSidebar />
    <CenterCanvas />
    <RightPanel />
  </div>
</div>
