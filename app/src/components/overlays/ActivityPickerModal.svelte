<script>
  import { getContext, onMount } from 'svelte'
  import WindowDragStrip from './WindowDragStrip.svelte'
  import { open } from '@tauri-apps/plugin-dialog'
  import * as backend from '@/api/backend.js'
  import { X, Trash2, FolderOpen } from 'lucide-svelte'
  import Tooltip from '@/components/ui/Tooltip.svelte'
  import { dialogExtensions } from '@/lib/utils.js'

  const app = getContext('app')
  let { onload, onclose } = $props()

  let saved = $state([])
  let loading = $state(true)
  let loadError = $state(null)
  let deleting = $state([])
  let opening = $state(false)
  let sortMode = $state('recent')

  onMount(() => {
    window.addEventListener('keydown', onKeydown)
    refresh()
    return () => window.removeEventListener('keydown', onKeydown)
  })

  function onKeydown(e) {
    if (e.key === 'Escape') onclose()
  }

  async function refresh() {
    loading = true
    try {
      saved = await backend.listActivities()
    } catch (e) {
      loadError = e?.message ?? String(e)
    } finally {
      loading = false
    }
  }

  function isActive(filename) {
    return app.gpxFilename === filename
  }

  function formatStart(ms) {
    if (!ms) return ''
    const d = new Date(ms)
    const now = new Date()
    return d.toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      year: d.getFullYear() === now.getFullYear() ? undefined : 'numeric',
    })
  }

  function displayName(filename) {
    // Strip the extension only; keep dots that are part of the name (e.g. "2024.05.20.gpx").
    return filename.replace(/\.[^.]+$/, '')
  }

  function formatDuration(s) {
    if (!s) return ''
    const total = Math.round(s)
    if (total < 60) return `${total}s`
    const h = Math.floor(total / 3600)
    const m = Math.floor((total % 3600) / 60)
    return h > 0 ? `${h}h ${m}m` : `${m}m`
  }

  function metaLine(a) {
    return [formatStart(a.start_ms), formatDuration(a.duration_s)]
      .filter(Boolean)
      .join(' · ')
  }

  let sortedSaved = $derived.by(() => {
    const items = [...saved]
    if (sortMode === 'name-asc') {
      return items.sort((a, b) =>
        displayName(a.filename).localeCompare(displayName(b.filename)),
      )
    }
    if (sortMode === 'name-desc') {
      return items.sort((a, b) =>
        displayName(b.filename).localeCompare(displayName(a.filename)),
      )
    }
    if (sortMode === 'oldest') {
      return items.sort((a, b) => (a.start_ms ?? 0) - (b.start_ms ?? 0))
    }
    return items.sort((a, b) => (b.start_ms ?? 0) - (a.start_ms ?? 0))
  })

  async function handleChooseFromDisk() {
    opening = true
    try {
      const selected = await open({
        multiple: false,
        filters: [
          {
            name: 'Activity (GPX, FIT, TCX)',
            extensions: dialogExtensions(['gpx', 'fit', 'tcx']),
          },
        ],
        title: 'Select Activity File',
      })
      if (!selected) return
      await onload(selected)
      onclose()
    } catch (e) {
      app.errorMessage = `Activity load failed: ${e?.message ?? e}`
    } finally {
      opening = false
    }
  }

  async function handleLoadSaved(filename) {
    if (isActive(filename)) {
      onclose()
      return
    }
    try {
      await onload({ savedFilename: filename })
      onclose()
    } catch (e) {
      const msg = e?.message ?? String(e)
      if (msg.includes('missing or its source moved')) {
        // Broken symlink — remove it and tell the user why it vanished.
        await backend.deleteActivity(filename).catch(() => {})
        await refresh()
        app.errorMessage = `"${filename}" can't be found — the original file may have been moved or deleted. Use the file picker to locate it again.`
      } else {
        app.errorMessage = `Could not open ${filename}: ${msg}`
      }
    }
  }

  async function handleDelete(filename) {
    deleting = [...deleting, filename]
    try {
      await backend.deleteActivity(filename)
      if (app.gpxFilename === filename) {
        // Activity no longer exists — clear it so the UI doesn't show a stale label.
        app.gpxFilename = null
      }
      await refresh()
    } catch (e) {
      app.errorMessage = `Delete failed: ${e?.message ?? e}`
    } finally {
      deleting = deleting.filter((x) => x !== filename)
    }
  }
</script>

<div
  role="dialog"
  aria-modal="true"
  aria-label="Choose Activity"
  tabindex="-1"
  class="fixed inset-0 z-50 flex items-center justify-center pt-14"
>
  <button
    type="button"
    class="absolute inset-0 cursor-default bg-black/60 backdrop-blur-sm"
    aria-label="Close activity picker"
    onclick={onclose}
  ></button>
  <WindowDragStrip />

  <div
    class="relative z-10 w-[720px] max-h-[80vh] flex flex-col rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl"
  >
    <!-- Header -->
    <div
      class="flex items-center justify-between px-5 py-4 border-b border-zinc-800 shrink-0"
    >
      <h2 class="text-sm font-semibold text-zinc-100">Choose Activity</h2>
      <div class="flex items-center gap-2">
        <Tooltip
          content="Choose a GPX, FIT, or TCX activity file"
          side="bottom"
        >
          <button
            onclick={handleChooseFromDisk}
            disabled={opening}
            class="inline-flex cursor-pointer items-center gap-1.5 rounded-[6px] border border-primary/70 bg-primary/15 px-2.5 py-1.5 text-xs font-medium text-zinc-100 transition-colors hover:border-primary hover:bg-primary/25 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FolderOpen size={12} />
            {opening ? 'Opening…' : 'Choose from disk'}
          </button>
        </Tooltip>
        <button
          onclick={onclose}
          class="cursor-pointer text-zinc-500 hover:text-zinc-200 transition-colors rounded-md p-0.5"
          aria-label="Close"
        >
          <X size={16} />
        </button>
      </div>
    </div>

    <!-- Scrollable body -->
    <div class="overflow-y-auto flex-1 px-5 py-4 space-y-6">
      <div>
        {#if saved.length >= 2}
          <div class="mb-3 flex items-center justify-end">
            <label
              class="flex items-center gap-2 text-[10px] font-medium uppercase tracking-wider text-zinc-500"
            >
              Sort by
              <select
                bind:value={sortMode}
                class="h-7 rounded-[6px] border border-zinc-700 bg-zinc-800/60 px-2 text-xs normal-case tracking-normal text-zinc-200 outline-none transition-colors hover:border-zinc-500 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500"
              >
                <option value="recent">Recent</option>
                <option value="oldest">Oldest</option>
                <option value="name-asc">Name A-Z</option>
                <option value="name-desc">Name Z-A</option>
              </select>
            </label>
          </div>
        {/if}

        {#if loading}
          <div class="grid grid-cols-2 gap-2">
            {#each [1, 2, 3, 4] as i (i)}
              <div
                class="h-14 rounded-lg border border-zinc-800 bg-zinc-800/30 animate-pulse"
              ></div>
            {/each}
          </div>
        {:else if loadError}
          <p class="text-xs text-red-400 select-text cursor-text">
            {loadError}
          </p>
        {:else if saved.length === 0}
          <p class="text-xs text-zinc-500">
            No activities yet. Choose one from disk to get started.
          </p>
        {:else}
          <div class="grid grid-cols-2 gap-2">
            {#each sortedSaved as a (a.filename)}
              {@const active = isActive(a.filename)}
              {@const busy = deleting.includes(a.filename)}
              <div
                class="rounded-lg border overflow-hidden transition-colors flex items-center
                       {active
                  ? 'border-primary bg-zinc-800'
                  : 'border-zinc-700 bg-zinc-800/40 hover:border-zinc-500 hover:bg-zinc-800/80'}"
              >
                <button
                  onclick={() => handleLoadSaved(a.filename)}
                  class="flex-1 min-w-0 flex items-center gap-2.5 text-left px-3 py-2.5 cursor-pointer"
                >
                  <svg
                    viewBox="-0.1 -0.1 1.2 1.2"
                    class="h-9 w-9 shrink-0 {active
                      ? 'text-primary'
                      : 'text-zinc-500'}"
                    aria-hidden="true"
                  >
                    {#if a.track?.length}
                      <polyline
                        points={a.track.map(([x, y]) => `${x},${y}`).join(' ')}
                        fill="none"
                        stroke="currentColor"
                        stroke-width="0.07"
                        stroke-linejoin="round"
                        stroke-linecap="round"
                      />
                    {:else}
                      <circle
                        cx="0.5"
                        cy="0.5"
                        r="0.05"
                        fill="currentColor"
                        opacity="0.4"
                      />
                    {/if}
                  </svg>
                  <span class="min-w-0">
                    <span
                      class="text-xs font-medium text-zinc-100 truncate block"
                      >{displayName(a.filename)}</span
                    >
                    <span
                      class="text-[10px] text-zinc-500 truncate block mt-0.5"
                      >{metaLine(a)}</span
                    >
                  </span>
                </button>

                <button
                  onclick={() => handleDelete(a.filename)}
                  disabled={busy}
                  class="shrink-0 cursor-pointer p-2 mr-1 rounded text-zinc-500 hover:text-red-400 transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                  title="Remove from disk"
                >
                  {#if busy}
                    <span class="text-[10px]">…</span>
                  {:else}
                    <Trash2 size={13} />
                  {/if}
                </button>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  </div>
</div>
