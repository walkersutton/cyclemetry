<script>
  import { getContext, onMount } from 'svelte'
  import { open } from '@tauri-apps/plugin-dialog'
  import { X } from 'lucide-svelte'

  const app = getContext('app')

  let { onclose } = $props()

  const DEFAULT_DIR = '~/Movies/Cyclemetry'

  const RESOLUTIONS = [
    { label: '4K',    w: 3840, h: 2160 },
    { label: '1080p', w: 1920, h: 1080 },
    { label: '720p',  w: 1280, h: 720  },
    { label: '480p',  w: 854,  h: 480  },
  ]

  let outputDirLabel = $derived.by(() => {
    if (!app.outputDir) return DEFAULT_DIR
    const m = app.outputDir.match(/^\/Users\/([^/]+)/)
    return m ? app.outputDir.replace(`/Users/${m[1]}`, '~') : app.outputDir
  })

  async function pickOutputDir() {
    const dir = await open({ directory: true, multiple: false, defaultPath: app.outputDir ?? undefined })
    if (dir) app.outputDir = dir
  }

  function onKeydown(e) {
    if (e.key === 'Escape') onclose()
  }

  onMount(() => {
    window.addEventListener('keydown', onKeydown)
    return () => window.removeEventListener('keydown', onKeydown)
  })
</script>

<!-- Backdrop -->
<div
  role="dialog"
  aria-modal="true"
  aria-label="Settings"
  tabindex="-1"
  class="fixed inset-0 z-50 flex items-center justify-center"
  onmousedown={(e) => { if (e.target === e.currentTarget) onclose() }}
>
  <div class="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>

  <!-- Panel -->
  <div class="relative z-10 w-[480px] rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl">

    <!-- Header -->
    <div class="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
      <h2 class="text-sm font-semibold text-zinc-100">Settings</h2>
      <button
        onclick={onclose}
        class="text-zinc-500 hover:text-zinc-200 transition-colors rounded-md p-0.5"
        aria-label="Close"
      >
        <X size={16} />
      </button>
    </div>

    <!-- Body -->
    <div class="px-5 py-4 space-y-6">

      <!-- Output folder -->
      <div class="space-y-2">
        <p class="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Output Folder</p>
        <p class="text-[11px] text-zinc-500">Where rendered videos are saved.</p>
        <div class="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2">
          <span class="flex-1 text-xs text-zinc-300 font-mono truncate" title={app.outputDir ?? DEFAULT_DIR}>
            {outputDirLabel}
          </span>
          <button
            onclick={pickOutputDir}
            class="shrink-0 text-[11px] text-zinc-400 hover:text-zinc-100 border border-zinc-600 hover:border-zinc-400 rounded px-2.5 py-1 transition-colors"
          >Browse…</button>
          {#if app.outputDir}
            <button
              onclick={() => { app.outputDir = null }}
              class="shrink-0 text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors"
            >Reset</button>
          {/if}
        </div>
      </div>

      <!-- Output resolution -->
      <div class="space-y-2">
        <p class="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Output Resolution</p>
        <p class="text-[11px] text-zinc-500">Target resolution for rendered videos. Templates scale from their authored size.</p>
        <div class="flex gap-1.5">
          {#each RESOLUTIONS as r (r.label)}
            {@const active = app.outputWidth === r.w && app.outputHeight === r.h}
            <button
              onclick={() => { app.outputWidth = r.w; app.outputHeight = r.h }}
              class="flex-1 rounded-lg border py-2 text-xs font-medium transition-colors
                {active
                  ? 'border-zinc-400 text-zinc-100 bg-zinc-700'
                  : 'border-zinc-700 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300'}"
            >
              <div>{r.label}</div>
              <div class="text-[10px] font-normal mt-0.5 opacity-60">{r.w}×{r.h}</div>
            </button>
          {/each}
        </div>
      </div>

    </div>
  </div>
</div>
