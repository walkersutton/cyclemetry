<script>
  import { getContext, onMount } from 'svelte'
  import * as backend from '@/api/backend.js'
  import { X } from 'lucide-svelte'

  const app = getContext('app')
  let { onclose } = $props()

  let loading = $state(true)
  let fetchError = $state(null)
  let communityList = $state([])
  let installing = $state([])

  onMount(async () => {
    try {
      communityList = await backend.fetchCommunityTemplates()
    } catch (e) {
      fetchError = e?.message ?? 'Failed to load community templates'
    } finally {
      loading = false
    }

    window.addEventListener('keydown', onKeydown)
    return () => window.removeEventListener('keydown', onKeydown)
  })

  function onKeydown(e) {
    if (e.key === 'Escape') onclose()
  }

  function installedType(id) {
    return (app.templates ?? []).find((t) => t.id === id && t.type !== 'built-in')?.type ?? null
  }

  async function handleInstall(id) {
    installing = [...installing, id]
    try {
      await backend.installCommunityTemplate(id)
      await app.fetchTemplates()
    } catch (e) {
      app.errorMessage = `Install failed: ${e?.message ?? e}`
    } finally {
      installing = installing.filter((x) => x !== id)
    }
  }

  async function handleLoad(id) {
    try {
      await app.loadTemplate(id)
      onclose()
    } catch (e) {
      app.errorMessage = `Failed to load template: ${e?.message ?? e}`
    }
  }
</script>

<div
  role="dialog"
  aria-modal="true"
  aria-label="Community Templates"
  tabindex="-1"
  class="fixed inset-0 z-50 flex items-center justify-center"
  onmousedown={(e) => { if (e.target === e.currentTarget) onclose() }}
>
  <div class="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>

  <div class="relative z-10 w-[520px] max-h-[70vh] flex flex-col rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl">

    <!-- Header -->
    <div class="flex items-center justify-between px-5 py-4 border-b border-zinc-800 shrink-0">
      <div>
        <h2 class="text-sm font-semibold text-zinc-100">Community Templates</h2>
        <p class="text-[11px] text-zinc-500 mt-0.5">Install templates from the Cyclemetry repository.</p>
      </div>
      <button
        onclick={onclose}
        class="text-zinc-500 hover:text-zinc-200 transition-colors rounded-md p-0.5"
        aria-label="Close"
      >
        <X size={16} />
      </button>
    </div>

    <!-- Body -->
    <div class="overflow-y-auto flex-1 px-5 py-3">
      {#if loading}
        <p class="text-xs text-zinc-500 py-6 text-center">Loading…</p>
      {:else if fetchError}
        <p class="text-xs text-red-400 py-6 text-center">{fetchError}</p>
      {:else if communityList.length === 0}
        <p class="text-xs text-zinc-500 py-6 text-center">No templates found.</p>
      {:else}
        <ul class="space-y-1.5">
          {#each communityList as tpl (tpl.id)}
            {@const status = installedType(tpl.id)}
            {@const busy = installing.includes(tpl.id)}
            <li class="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-800/40 px-3 py-2.5">
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-zinc-100 truncate">{tpl.name}</p>
                {#if status === 'community-modified'}
                  <p class="text-[11px] text-amber-400 mt-0.5">Installed · modified locally</p>
                {:else if status === 'community'}
                  <p class="text-[11px] text-zinc-500 mt-0.5">Installed</p>
                {:else}
                  <p class="text-[11px] text-zinc-600 mt-0.5">{tpl.id}</p>
                {/if}
              </div>

              {#if status}
                <button
                  onclick={() => handleLoad(tpl.id)}
                  class="shrink-0 text-[11px] px-3 py-1.5 rounded border border-zinc-600 text-zinc-300
                         hover:border-zinc-400 hover:text-zinc-100 transition-colors"
                >
                  Load
                </button>
              {:else}
                <button
                  onclick={() => handleInstall(tpl.id)}
                  disabled={busy}
                  class="shrink-0 text-[11px] px-3 py-1.5 rounded border border-zinc-600 text-zinc-300
                         hover:border-zinc-400 hover:text-zinc-100 transition-colors
                         disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {busy ? 'Installing…' : 'Install'}
                </button>
              {/if}
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  </div>
</div>
