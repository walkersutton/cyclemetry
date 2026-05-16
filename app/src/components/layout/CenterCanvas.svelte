<script>
  /**
   * Center panel: manages the frame buffer, canvas preview, WYSIWYG SVG overlay,
   * and playback controls. This is the heart of the new UI.
   */
  import { getContext, untrack } from 'svelte'
  import { SvelteMap, SvelteSet } from 'svelte/reactivity'
  import PreviewCanvas from '../canvas/PreviewCanvas.svelte'
  import WysiwygLayer from '../canvas/WysiwygLayer.svelte'
  import PlaybackControls from '../canvas/PlaybackControls.svelte'
  import * as backend from '@/api/backend.js'

  const app = getContext('app')

  // ── Frame buffer ─────────────────────────────────────────────────────────────
  // Cache keyed by frame index (integer at previewFps resolution).
  // frame index 0 = scene start, increases by 1 per (1/previewFps) seconds.
  let cache = new SvelteMap()
  let pending = new SvelteSet()
  let shownWarnings = new SvelteSet()

  let currentFrameData = $state(null)  // { image, elements }
  let fetchError = $state(null)
  let playing = $state(false)
  let rafHandle = null
  let lastTick = null
  let stallTimer = null

  const PREFETCH_AHEAD = 5
  const MAX_CACHE = 30
  const MAX_CONCURRENT = 3

  let previewFps = $derived(app.previewFps ?? 1)

  // Convert absolute second → frame index relative to scene start
  function secToFrameIdx(sec, fps, start) {
    return Math.round((sec - start) * fps)
  }

  // Buffered positions as seconds (for the scrub bar indicators)
  let bufferedSeconds = $derived(
    [...cache.keys()].map(idx => sceneStart + idx / previewFps).sort((a, b) => a - b)
  )

  function clearBuffer() {
    cache.clear()
    pending.clear()
    fetchError = null
    if (stallTimer) { clearTimeout(stallTimer); stallTimer = null }
  }

  async function fetchFrame(frameIdx) {
    const config = app.config
    if (!config) return
    const fps = app.previewFps ?? 1
    const start = config.scene?.start ?? 0
    const end = config.scene?.end ?? app.activityDuration
    const maxFrameIdx = Math.round((end - start) * fps)
    if (frameIdx < 0 || frameIdx > maxFrameIdx) return
    if (cache.has(frameIdx) || pending.has(frameIdx)) return
    if (pending.size >= MAX_CONCURRENT) return
    // Fall back to the bundled demo GPX when no file has been loaded yet.
    const gpx = app.gpxFilename || 'demo.gpxinit'

    pending.add(frameIdx)
    try {
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Preview timed out. Try reloading, or check that your GPX file is valid.')), 8000)
      )
      let data = await Promise.race([backend.nativeGenerateDemo(config, gpx, frameIdx, fps), timeout])
      if (data?.image) {
        fetchError = null
        if (stallTimer) { clearTimeout(stallTimer); stallTimer = null }
        // Surface any backend warning (e.g. GPX not found, using demo) — once per message
        if (data.warning && !shownWarnings.has(data.warning)) {
          shownWarnings.add(data.warning)
          app.errorMessage = data.warning
        }
        cache.set(frameIdx, data)
        // Evict oldest frames beyond MAX_CACHE
        if (cache.size > MAX_CACHE) {
          const oldest = cache.keys().next().value
          cache.delete(oldest)
        }
        // Show this frame if it's current, or if we don't have the current frame yet
        const currentIdx = secToFrameIdx(app.selectedSecond, fps, start)
        if (frameIdx === currentIdx || (frameIdx < currentIdx && !cache.has(currentIdx))) {
          currentFrameData = data
        }
      }
    } catch (e) {
      console.warn('Frame fetch failed for frame', frameIdx, e)
      const fps2 = app.previewFps ?? 1
      const start2 = app.config?.scene?.start ?? 0
      const currentIdx = secToFrameIdx(app.selectedSecond, fps2, start2)
      const isCurrent = frameIdx === currentIdx
      const wasNeeded = !currentFrameData
      if (isCurrent || wasNeeded) {
        fetchError = e?.message ?? String(e)
      }
    } finally {
      pending.delete(frameIdx)
    }
  }

  // Re-fetch when config, gpx, or previewFps changes.
  $effect(() => {
    const _config = app.config
    const _fps = app.previewFps ?? 1
    void app.gpxFilename // reactive dep: re-run when GPX changes
    clearBuffer()
    if (_config) {
      const start = _config.scene?.start ?? 0
      const end = _config.scene?.end ?? app.activityDuration
      // Don't attempt to fetch when the timeline range is invalid — the sidebar
      // already shows a validation error; no point spinning here too.
      if (end <= start) {
        currentFrameData = null
        return
      }
      // untrack selectedSecond — only needed for initial seek position
      const s = Math.max(start, untrack(() => app.selectedSecond))
      const frameIdx = secToFrameIdx(s, _fps, start)
      untrack(() => fetchFrame(frameIdx))
      stallTimer = setTimeout(() => { stallTimer = null }, 5000)
    }
  })

  // Prefetch around playhead. cache.get(frameIdx) is the only intended reactive dep —
  // it re-runs when that frame arrives. fetchFrame calls are untracked to avoid
  // reads of pending/cache inside fetchFrame triggering re-runs.
  $effect(() => {
    const fps = previewFps
    const start = sceneStart
    const frameIdx = secToFrameIdx(app.selectedSecond, fps, start)
    const frame = cache.get(frameIdx)
    if (frame) currentFrameData = frame
    untrack(() => { for (let i = 0; i < PREFETCH_AHEAD; i++) fetchFrame(frameIdx + i) })
  })

  // ── Playback RAF loop ────────────────────────────────────────────────────────
  $effect(() => {
    if (playing) {
      lastTick = performance.now()
      rafHandle = requestAnimationFrame(tick)
    } else {
      if (rafHandle) cancelAnimationFrame(rafHandle)
    }
    return () => { if (rafHandle) cancelAnimationFrame(rafHandle) }
  })

  function tick(now) {
    if (!playing) return
    const dt = (now - lastTick) / 1000
    lastTick = now
    const next = Math.min(app.selectedSecond + dt, sceneEnd)
    app.selectedSecond = next
    if (next >= sceneEnd) { playing = false; return }
    rafHandle = requestAnimationFrame(tick)
  }

  function seek(s) {
    app.selectedSecond = s
  }

  let sceneStart = $derived(app.config?.scene?.start ?? 0)
  let sceneEnd = $derived(app.config?.scene?.end ?? app.activityDuration)
  let sceneW = $derived(app.config?.scene?.width ?? 1920)
  let sceneH = $derived(app.config?.scene?.height ?? 1080)
  let aspectRatio = $derived(sceneH / sceneW)
  let sceneInvalid = $derived(sceneEnd <= sceneStart)

  // Preview zoom/pan. Pinch or Ctrl+wheel zooms toward the cursor; two-finger
  // scroll pans while zoomed (trackpad-native, no conflict with the element-
  // drag pointer layer). transform-origin is 0 0 so the focal math is a clean
  // closed form. Safe for WYSIWYG editing — drag reads svg.getScreenCTM(),
  // which already accounts for ancestor transforms. Double-click resets.
  let zoom = $state(1)
  let panX = $state(0)
  let panY = $state(0)
  let stageEl

  // Keep the scaled content overlapping the viewport so it can't be lost.
  function clampPan() {
    if (zoom <= 1) {
      panX = 0
      panY = 0
      return
    }
    const w = stageEl?.offsetWidth ?? 0
    const h = stageEl?.offsetHeight ?? 0
    const maxX = (zoom - 1) * w
    const maxY = (zoom - 1) * h
    panX = Math.min(0, Math.max(-maxX, panX))
    panY = Math.min(0, Math.max(-maxY, panY))
  }

  function onCanvasWheel(e) {
    if (!stageEl) return
    if (e.ctrlKey) {
      // Pinch / Ctrl+wheel → zoom toward the cursor.
      e.preventDefault()
      const next = Math.min(6, Math.max(1, zoom * Math.exp(-e.deltaY * 0.01)))
      if (next === zoom) return
      const rect = stageEl.getBoundingClientRect()
      const ratio = 1 - next / zoom
      panX += (e.clientX - rect.left) * ratio
      panY += (e.clientY - rect.top) * ratio
      zoom = next
      clampPan()
    } else if (zoom > 1) {
      // Two-finger scroll → pan the zoomed view.
      e.preventDefault()
      panX -= e.deltaX
      panY -= e.deltaY
      clampPan()
    }
  }

  function resetZoom() {
    zoom = 1
    panX = 0
    panY = 0
  }

  // Clamp playhead when scene start/end changes.
  // Skip when the range is invalid — clamping to a negative sceneEnd would corrupt selectedSecond
  // and cause fetchFrame to silently bail out (frameIdx < 0 guard) even after the user fixes values.
  $effect(() => {
    const s = sceneStart
    const e = sceneEnd
    if (e <= s) return
    if (app.selectedSecond < s) app.selectedSecond = s
    else if (app.selectedSecond > e) app.selectedSecond = e
  })
</script>

<main class="flex-1 flex flex-col overflow-hidden bg-[#09090b]">
  <!-- Canvas area (flexible height) -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="flex-1 flex items-center justify-center p-6 overflow-hidden"
    onwheel={onCanvasWheel}
    ondblclick={resetZoom}
  >
    {#if app.config}
      <!-- Aspect-ratio wrapper — always shown when a template is loaded -->
      <div
        bind:this={stageEl}
        class="relative shadow-2xl"
        style={`width: min(100%, calc((100vh - 180px) / ${aspectRatio})); aspect-ratio: ${sceneW} / ${sceneH}; transform-origin: 0 0; transform: translate(${panX}px, ${panY}px) scale(${zoom});`}
      >
        <!-- Background -->
        <div
          class="absolute inset-0 rounded-lg overflow-hidden border border-zinc-800 bg-zinc-950"
          style={currentFrameData?.image ? `background-image:
            linear-gradient(45deg, #1a1a1a 25%, transparent 25%),
            linear-gradient(-45deg, #1a1a1a 25%, transparent 25%),
            linear-gradient(45deg, transparent 75%, #1a1a1a 75%),
            linear-gradient(-45deg, transparent 75%, #1a1a1a 75%);
            background-size: 16px 16px;
            background-position: 0 0, 0 8px, 8px -8px, -8px 0px;` : ''}
        ></div>

        <!-- Rendered frame -->
        {#if sceneInvalid}
          <!-- Invalid timeline range — shown first so it always wins over stale frame/spinner -->
          <div class="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6">
            <p class="text-xs text-red-500 text-center">Fix the timeline range — start must be less than end</p>
          </div>
        {:else if currentFrameData?.image}
          <div class="absolute inset-0 rounded-lg overflow-hidden">
            <PreviewCanvas
              frameDataUrl={currentFrameData.image}
              sceneWidth={sceneW}
              sceneHeight={sceneH}
            />
          </div>
        {:else if fetchError}
          <!-- Error state -->
          <div class="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6">
            <svg class="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            </svg>
            <p class="text-xs text-red-400 text-center leading-relaxed">{fetchError}</p>
            <button
              class="text-xs text-zinc-400 hover:text-zinc-200 border border-zinc-700 hover:border-zinc-500 rounded px-3 py-1 transition-colors"
              onclick={() => { fetchError = null; clearBuffer(); fetchFrame(Math.floor(app.selectedSecond)) }}
            >Retry</button>
          </div>
        {:else}
          <!-- Generating preview -->
          <div class="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <svg class="h-5 w-5 text-zinc-600 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            <p class="text-xs text-zinc-600">Generating preview…</p>
          </div>
        {/if}

        <!-- WYSIWYG drag layer — always on top -->
        <WysiwygLayer measuredElements={currentFrameData?.elements ?? []} />

        <!-- Resolution badge -->
        <div class="absolute top-2 right-2 flex items-center gap-1.5">
          {#if zoom !== 1}
            <button
              onclick={resetZoom}
              class="text-[10px] font-mono text-zinc-300 bg-zinc-950/70 rounded px-1.5 py-0.5 hover:text-primary transition-colors"
              title="Reset zoom (or double-click the canvas)"
            >
              {Math.round(zoom * 100)}% · reset
            </button>
          {/if}
          <span class="text-[10px] font-mono text-zinc-600 bg-zinc-950/70 rounded px-1.5 py-0.5 pointer-events-none">
            {sceneW}×{sceneH}
          </span>
        </div>
      </div>
    {:else}
      <!-- No template loaded -->
      <div class="flex flex-col items-center gap-3 text-center">
        <div class="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center">
          <svg class="w-6 h-6 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
          </svg>
        </div>
        <p class="text-sm text-zinc-500">Select a template to start</p>
      </div>
    {/if}
  </div>

  <!-- Playback controls (fixed at bottom of canvas area) -->
  <PlaybackControls
    bind:playhead={app.selectedSecond}
    start={sceneStart}
    end={sceneEnd}
    bind:playing
    bind:previewFps={app.previewFps}
    buffered={bufferedSeconds}
    onseek={seek}
  />
</main>
