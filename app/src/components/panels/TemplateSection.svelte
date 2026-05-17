<script>
  import { getContext } from 'svelte'
  import * as backend from '@/api/backend.js'
  import Button from '../ui/Button.svelte'
  import { FolderOpen, Save, ChevronDown } from 'lucide-svelte'

  const app = getContext('app')

  let saving = $state(false)

  let currentLabel = $derived.by(() => {
    if (!app.loadedTemplateFilename) return null
    const t = (app.templates ?? []).find((t) => t.id === app.loadedTemplateFilename)
    return t?.name ?? app.loadedTemplateFilename.replace('.json', '')
  })

  async function handleSave() {
    saving = true
    try {
      await app.saveTemplate()
    } catch (err) {
      app.errorMessage = `Save failed: ${err.message}`
    } finally {
      saving = false
    }
  }

  async function handleOpenFolder() {
    try { await backend.openTemplatesFolder() } catch { /* intentionally ignored */ }
  }
</script>

<section class="px-4 py-3 border-b border-zinc-800">
  <p class="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-2">Template</p>

  <button
    onclick={() => { app.showTemplatePicker = true }}
    class="mb-2 w-full flex items-center justify-between gap-2 h-7 rounded-[6px] border border-zinc-700
           bg-zinc-800/60 px-2.5 text-sm text-left cursor-pointer
           hover:border-zinc-500 hover:bg-zinc-800 transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
  >
    <span class="truncate {currentLabel ? 'text-foreground' : 'text-zinc-500'}">
      {currentLabel ?? 'Choose template…'}
    </span>
    <ChevronDown size={12} class="shrink-0 text-zinc-500" />
  </button>

  <div class="flex gap-1.5">
    <Button variant="outline" size="sm" class="flex-1 gap-1" onclick={handleSave} disabled={saving || !app.config}>
      <Save size={12} />
      {saving ? 'Saving…' : 'Save'}
    </Button>
    <Button variant="ghost" size="icon" onclick={handleOpenFolder} title="Open templates folder">
      <FolderOpen size={14} />
    </Button>
  </div>
</section>
