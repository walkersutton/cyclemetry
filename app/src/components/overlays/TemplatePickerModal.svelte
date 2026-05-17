<script>
  import { getContext, onMount } from 'svelte'
  import * as backend from '@/api/backend.js'
  import { X } from 'lucide-svelte'

  const app = getContext('app')
  let { onclose } = $props()

  let communityList = $state([])
  let communityLoading = $state(true)
  let communityError = $state(null)
  let installing = $state([])
  let failedPreviews = $state([])

  onMount(async () => {
    window.addEventListener('keydown', onKeydown)
    try {
      communityList = await backend.fetchCommunityTemplates()
    } catch (e) {
      communityError = e?.message ?? 'Failed to load'
    } finally {
      communityLoading = false
    }
    return () => window.removeEventListener('keydown', onKeydown)
  })

  function onKeydown(e) {
    if (e.key === 'Escape') onclose()
  }

  // Templates the user has locally (any type)
  let installed = $derived(app.templates ?? [])

  // Community templates not yet installed
  let available = $derived(
    communityList.filter((c) => !installed.some((i) => i.id === c.id))
  )

  function isActive(id) {
    return app.loadedTemplateFilename === id
  }

  function statusLabel(type) {
    if (type === 'community-modified') return 'Modified'
    if (type === 'community') return 'Community'
    if (type === 'built-in') return 'Built-in'
    return null
  }

  function previewFailed(id) {
    return failedPreviews.includes(id)
  }

  function onImgError(id) {
    if (!failedPreviews.includes(id)) failedPreviews = [...failedPreviews, id]
  }

  async function handleLoad(id) {
    try {
      await app.loadTemplate(id)
      onclose()
    } catch (e) {
      app.errorMessage = `Failed to load: ${e?.message ?? e}`
    }
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
</script>

<div
  role="dialog"
  aria-modal="true"
  aria-label="Choose Template"
  tabindex="-1"
  class="fixed inset-0 z-50 flex items-center justify-center"
  onmousedown={(e) => { if (e.target === e.currentTarget) onclose() }}
>
  <div class="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>

  <div class="relative z-10 w-[720px] max-h-[80vh] flex flex-col rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl">

    <!-- Header -->
    <div class="flex items-center justify-between px-5 py-4 border-b border-zinc-800 shrink-0">
      <h2 class="text-sm font-semibold text-zinc-100">Choose Template</h2>
      <button
        onclick={onclose}
        class="text-zinc-500 hover:text-zinc-200 transition-colors rounded-md p-0.5"
        aria-label="Close"
      >
        <X size={16} />
      </button>
    </div>

    <!-- Scrollable body -->
    <div class="overflow-y-auto flex-1 px-5 py-4 space-y-6">

      <!-- Installed templates -->
      {#if installed.length > 0}
        <div>
          <p class="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-3">Installed</p>
          <div class="grid grid-cols-3 gap-3">
            {#each installed as tpl (tpl.id)}
              {@const active = isActive(tpl.id)}
              {@const label = statusLabel(tpl.type)}
              <button
                onclick={() => handleLoad(tpl.id)}
                class="text-left rounded-lg border overflow-hidden transition-colors
                       {active
                         ? 'border-[#DC143C] bg-zinc-800'
                         : 'border-zinc-700 bg-zinc-800/40 hover:border-zinc-500 hover:bg-zinc-800/80'}"
              >
                <!-- Preview -->
                <div class="aspect-video bg-zinc-800 flex items-center justify-center overflow-hidden">
                  {#if tpl.preview_url && !previewFailed(tpl.id)}
                    <img
                      src={tpl.preview_url}
                      alt={tpl.name}
                      class="w-full h-full object-cover"
                      onerror={() => onImgError(tpl.id)}
                    />
                  {:else}
                    <span class="text-[10px] text-zinc-600 font-mono">{tpl.id}</span>
                  {/if}
                </div>
                <!-- Info -->
                <div class="px-2.5 py-2 flex items-center justify-between gap-1">
                  <span class="text-xs font-medium text-zinc-100 truncate">{tpl.name}</span>
                  {#if label}
                    <span class="shrink-0 text-[10px] text-zinc-500">{label}</span>
                  {/if}
                </div>
              </button>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Community templates available to install -->
      <div>
        <p class="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-3">Available from Community</p>

        {#if communityLoading}
          <div class="grid grid-cols-3 gap-3">
            {#each [1, 2, 3] as i (i)}
              <div class="rounded-lg border border-zinc-800 bg-zinc-800/30 animate-pulse">
                <div class="aspect-video bg-zinc-800/60"></div>
                <div class="px-2.5 py-2 h-8"></div>
              </div>
            {/each}
          </div>
        {:else if communityError}
          <p class="text-xs text-red-400">{communityError}</p>
        {:else if available.length === 0}
          <p class="text-xs text-zinc-500">All community templates are installed.</p>
        {:else}
          <div class="grid grid-cols-3 gap-3">
            {#each available as tpl (tpl.id)}
              {@const busy = installing.includes(tpl.id)}
              <div class="rounded-lg border border-zinc-700 bg-zinc-800/40 overflow-hidden">
                <!-- Preview -->
                <div class="aspect-video bg-zinc-800 flex items-center justify-center overflow-hidden">
                  {#if tpl.preview_url && !previewFailed(tpl.id)}
                    <img
                      src={tpl.preview_url}
                      alt={tpl.name}
                      class="w-full h-full object-cover"
                      onerror={() => onImgError(tpl.id)}
                    />
                  {:else}
                    <span class="text-[10px] text-zinc-600 font-mono">{tpl.id}</span>
                  {/if}
                </div>
                <!-- Info + install -->
                <div class="px-2.5 py-2 flex items-center justify-between gap-2">
                  <span class="text-xs font-medium text-zinc-100 truncate">{tpl.name}</span>
                  <button
                    onclick={() => handleInstall(tpl.id)}
                    disabled={busy}
                    class="shrink-0 text-[10px] px-2 py-1 rounded border border-zinc-600 text-zinc-300
                           hover:border-zinc-400 hover:text-zinc-100 transition-colors
                           disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {busy ? '…' : 'Install'}
                  </button>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>

    </div>
  </div>
</div>
