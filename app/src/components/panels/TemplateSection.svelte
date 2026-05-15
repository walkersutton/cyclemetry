<script>
  import { getContext } from 'svelte'
  import * as backend from '@/api/backend.js'
  import Button from '../ui/Button.svelte'
  import Select from '../ui/Select.svelte'
  import { FolderOpen, Save } from 'lucide-svelte'

  const app = getContext('app')

  let saving = $state(false)

  let templateOptions = $derived(
    (app.templates ?? []).map((t) => ({ value: t.id, label: t.name ?? t.id }))
  )

  async function handleTemplateChange(id) {
    if (!id) return
    try {
      await app.loadTemplate(id)
    } catch (err) {
      app.errorMessage = `Failed to load template: ${err.message}`
    }
  }

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

  <Select
    value={app.loadedTemplateFilename ?? ''}
    options={templateOptions}
    placeholder="Choose template..."
    onchange={handleTemplateChange}
    class="mb-2"
  />

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
