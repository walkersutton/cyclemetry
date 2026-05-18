<script>
  import { getContext } from 'svelte'
  import { LayoutGrid } from 'lucide-svelte'

  const app = getContext('app')

  let currentLabel = $derived.by(() => {
    if (!app.loadedTemplateFilename) return null
    const t = (app.templates ?? []).find((t) => t.id === app.loadedTemplateFilename)
    return t?.name ?? app.loadedTemplateFilename.replace('.json', '')
  })
</script>

<section class="px-4 py-3 border-b border-zinc-800">
  <p class="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-2">Template</p>

  <button
    onclick={() => { app.showTemplatePicker = true }}
    class="w-full flex items-center justify-between gap-2 h-7 rounded-[6px] border border-zinc-700
           bg-zinc-800/60 px-2.5 text-sm text-left cursor-pointer
           hover:border-zinc-500 hover:bg-zinc-800 transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
  >
    <span class="truncate {currentLabel ? 'text-foreground' : 'text-zinc-500'}">
      {currentLabel ?? 'Browse templates…'}
      {#if currentLabel && app.isTemplateModified}
        <span class="text-amber-400" title="Unsaved changes">•</span>
      {/if}
    </span>
    <LayoutGrid size={12} class="shrink-0 text-zinc-500" />
  </button>

  {#if app.isTemplateModified}
    <button
      onclick={() => app.saveTemplate().catch((e) => { app.errorMessage = e?.message ?? String(e) })}
      class="mt-2 w-full flex items-center justify-center gap-1.5 h-7 rounded-[6px]
             border border-amber-500/60 bg-amber-500/10 px-2.5 text-sm font-medium text-amber-400
             hover:border-amber-400 hover:bg-amber-500/20 hover:text-amber-300
             transition-colors focus:outline-none focus:ring-1 focus:ring-amber-500"
    >
      <span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
      Save changes
    </button>
  {/if}
</section>
