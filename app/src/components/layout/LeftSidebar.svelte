<script>
  import { getContext } from 'svelte'
  import TemplateSection from '../panels/TemplateSection.svelte'
  import ElementList from '../panels/ElementList.svelte'
  import Select from '../ui/Select.svelte'

  const app = getContext('app')

  const ADD_FONT = '__add_font__'

  function fontOpts() {
    return [
      ...app.fonts.map((f) => ({ value: f, label: f.replace(/\.(ttf|otf)$/i, '') })),
      { value: ADD_FONT, label: '+ Add custom font…' },
    ]
  }

  async function onSceneFont(v) {
    if (v === ADD_FONT) {
      const f = await app.addCustomFont()
      if (f) app.updateScene({ font: f })
      return
    }
    app.updateScene({ font: v })
  }

  // Resolution presets — common formats for cycling/action cam footage sharing
  const RES_PRESETS = [
    { label: '4K',       w: 3840, h: 2160 },
    { label: '1080p',    w: 1920, h: 1080 },
    { label: '720p',     w: 1280, h: 720  },
    { label: 'Portrait', w: 1080, h: 1920 },
    { label: 'Square',   w: 1080, h: 1080 },
  ]

  // h:mm:ss when >= 1 hour, m:ss otherwise
  function secToTimecode(s) {
    s = Math.floor(s)
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const ss = String(s % 60).padStart(2, '0')
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${ss}`
    return `${m}:${ss}`
  }

  // Accepts h:mm:ss, m:ss, or plain seconds
  function timecodeToSec(str) {
    str = str.trim()
    if (/^\d+:\d{1,2}:\d{1,2}$/.test(str)) {
      const [h, m, s] = str.split(':').map(Number)
      return h * 3600 + m * 60 + s
    }
    if (/^\d+:\d{1,2}$/.test(str)) {
      const [m, s] = str.split(':').map(Number)
      return m * 60 + s
    }
    const n = Number(str)
    return !isNaN(n) && n >= 0 ? Math.floor(n) : NaN
  }

  let timelineError = $derived.by(() => {
    const s = app.config?.scene
    if (!s) return null
    const start = s.start ?? 0
    const end = s.end ?? app.activityDuration
    if (start >= end) return `Start must be before end (${secToTimecode(start)} ≥ ${secToTimecode(end)})`
    return null
  })
</script>

<aside class="w-[272px] shrink-0 flex flex-col border-r border-zinc-800 bg-zinc-900/30 overflow-hidden">
  <TemplateSection />

  <!-- Scene settings -->
  {#if app.config?.scene}
    <section class="px-4 py-3 border-b border-zinc-800 space-y-3">
      <p class="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Scene</p>

      <!-- Resolution -->
      <div class="space-y-1.5">
        <span class="text-[11px] text-zinc-500">Resolution</span>
        <div class="flex items-center gap-1.5">
          <input
            type="number"
            value={app.outputWidth}
            min={1}
            oninput={(e) => { const v = parseInt(e.target.value); if (v > 0) app.outputWidth = v }}
            class="h-7 w-full rounded-[6px] border border-zinc-700 bg-zinc-800/60 px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring font-mono"
          />
          <span class="text-zinc-600 text-xs shrink-0">×</span>
          <input
            type="number"
            value={app.outputHeight}
            min={1}
            oninput={(e) => { const v = parseInt(e.target.value); if (v > 0) app.outputHeight = v }}
            class="h-7 w-full rounded-[6px] border border-zinc-700 bg-zinc-800/60 px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring font-mono"
          />
        </div>
        <div class="flex flex-wrap gap-1">
          {#each RES_PRESETS as p (p.label)}
            {@const active = app.outputWidth === p.w && app.outputHeight === p.h}
            <button
              onclick={() => { app.outputWidth = p.w; app.outputHeight = p.h }}
              class="rounded px-1.5 py-0.5 text-[10px] border transition-colors duration-[150ms]
                {active
                  ? 'border-zinc-500 text-zinc-300 bg-zinc-800'
                  : 'border-zinc-700 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300'}"
            >{p.label}</button>
          {/each}
        </div>
      </div>

      <!-- Font (scene default — elements inherit unless overridden) -->
      <div class="space-y-1">
        <span class="text-[11px] text-zinc-500">Font</span>
        <Select
          value={app.config.scene.font ?? 'Arial.ttf'}
          options={fontOpts()}
          onchange={onSceneFont}
        />
      </div>

      <!-- FPS -->
      <label class="flex items-center justify-between">
        <span class="text-[11px] text-zinc-500">FPS</span>
        <input
          type="number"
          min="1"
          max="240"
          value={app.config.scene.fps ?? 30}
          oninput={(e) => { const v = parseInt(e.target.value); if (v > 0) app.updateScene({ fps: v }) }}
          class="h-7 w-24 rounded-[6px] border border-zinc-700 bg-zinc-800/60 px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring font-mono"
        />
      </label>

      <!-- Timeline range -->
      <div class="space-y-1">
        <div class="flex items-baseline justify-between">
          <span class="text-[11px] text-zinc-500">Timeline</span>
          <button
            onclick={() => app.updateScene({ end: app.activityDuration })}
            title="Set end to GPX duration"
            class="text-[11px] text-zinc-600 hover:text-zinc-300 transition-colors duration-[150ms] tabular-nums"
          >{secToTimecode(app.activityDuration)} total</button>
        </div>
        <div class="flex gap-2 items-center">
          <input
            type="text"
            value={secToTimecode(app.config.scene.start ?? 0)}
            placeholder="0:00"
            onchange={(e) => {
              const v = timecodeToSec(e.target.value)
              if (!isNaN(v)) app.updateScene({ start: Math.min(Math.max(0, v), app.activityDuration) })
              else e.target.value = secToTimecode(app.config.scene.start ?? 0)
            }}
            class="h-7 w-full rounded-[6px] border bg-zinc-800/60 px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring font-mono
              {timelineError ? 'border-red-500' : 'border-zinc-700'}"
          />
          <span class="text-zinc-600 text-xs shrink-0">→</span>
          <input
            type="text"
            value={secToTimecode(app.config.scene.end ?? app.activityDuration)}
            placeholder={secToTimecode(app.activityDuration)}
            onchange={(e) => {
              if (e.target.value.trim().toLowerCase() === 'end') {
                app.updateScene({ end: app.activityDuration })
                e.target.value = secToTimecode(app.activityDuration)
                return
              }
              const v = timecodeToSec(e.target.value)
              if (!isNaN(v)) app.updateScene({ end: Math.min(Math.max(0, v), app.activityDuration) })
              else e.target.value = secToTimecode(app.config.scene.end ?? app.activityDuration)
            }}
            class="h-7 w-full rounded-[6px] border bg-zinc-800/60 px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring font-mono
              {timelineError ? 'border-red-500' : 'border-zinc-700'}"
          />
        </div>
        {#if timelineError}
          <p class="text-[11px] text-red-500">{timelineError}</p>
        {/if}
      </div>
    </section>
  {/if}

  <ElementList />
</aside>
