<script>
  /**
   * Compact panel for a composite (a group flagged `composite: true`).
   * Deliberately smaller than the sum of its parts: metric, captions, the
   * color scheme and position — each fanned out across the members in one
   * undo step. Anything finer is what "Expand to elements" is for.
   */
  import { getContext } from 'svelte'
  import {
    BarChart2,
    Expand,
    Gauge as GaugeIcon,
    Hash,
    Image as ImageIcon,
    Map as MapIcon,
    Square,
    Thermometer,
    Trash2,
    Type,
  } from 'lucide-svelte'
  import ColorInput from '../ui/ColorInput.svelte'
  import Input from '../ui/Input.svelte'
  import RiderWeightPrompt from '../ui/RiderWeightPrompt.svelte'
  import Select from '../ui/Select.svelte'
  import {
    compositeColors,
    compositeIcon,
    compositeMetrics,
    compositeOrigin,
    compositeSizeRef,
    groupMembers,
    metricCaption,
    metricChoices,
    moveComposite,
    recolor,
    retargetMetric,
    scaleComposite,
  } from '../../lib/composites.js'

  // metricOptions: element type → [{ value, label, group? }] valid for it.
  let { group, metricOptions, vars = {} } = $props()

  const app = getContext('app')

  const ICONS = {
    type: Type,
    hash: Hash,
    bar: BarChart2,
    map: MapIcon,
    meter: Thermometer,
    gauge: GaugeIcon,
    rect: Square,
    image: ImageIcon,
  }

  const members = $derived(groupMembers(group, app.config?.elements))
  const metrics = $derived(compositeMetrics(members))
  const colors = $derived(compositeColors(members))
  const origin = $derived(compositeOrigin(members))
  // Static captions ("SPEED") — unit labels track their metric on their own.
  const captions = $derived(
    members.filter((e) => e.type === 'label' && !e.unit_of),
  )
  const HeaderIcon = $derived(ICONS[compositeIcon(members)] ?? Hash)
  const sceneFontSize = $derived(app.config?.scene?.font_size)
  // What "Size" shows and edits: the main box's width, or the largest text
  // size for text-only composites. Editing it scales every part together.
  const sizeRef = $derived(compositeSizeRef(members, sceneFontSize))

  const sectionLabel = 'text-[10px] uppercase tracking-wider text-zinc-600'

  function setMetric(from, to) {
    app.updateElements(retargetMetric(members, from, to))
  }

  function setColor(entry, value) {
    app.updateElements(recolor(members, entry.refs, value))
  }

  function setOrigin(axis, raw) {
    const n = Math.round(Number(raw))
    if (raw === '' || !Number.isFinite(n) || !origin) return
    const dx = axis === 'x' ? n - origin.x : 0
    const dy = axis === 'y' ? n - origin.y : 0
    if (dx || dy) app.updateElements(moveComposite(members, dx, dy))
  }

  // Members as they were when the size edit began. Every keystroke scales
  // from this snapshot, so passing through "1" on the way to "120" can't
  // compound rounding; the number Input batches the edit into one undo step.
  let sizeBase = null

  function beginSize() {
    sizeBase = { members: $state.snapshot(members), ref: sizeRef }
  }

  function endSize() {
    sizeBase = null
  }

  function setSize(raw) {
    const n = Number(raw)
    const base = sizeBase ?? { members, ref: sizeRef }
    if (raw === '' || !(n > 0) || !base.ref) return
    app.updateElements(
      scaleComposite(base.members, n / base.ref.value, sceneFontSize),
    )
  }
</script>

<!-- Header: widget icon chip + name + member count -->
<div
  class="-mx-4 mb-4 flex items-center gap-2.5 border-b border-white/[0.06] px-4 pb-3"
>
  <span
    class="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary"
  >
    <HeaderIcon size={15} />
  </span>
  <div class="min-w-0">
    <p class="truncate text-sm font-semibold text-zinc-100">{group.name}</p>
    <p class="truncate font-mono text-[11px] text-[var(--dim)]">
      composite · {members.length} element{members.length !== 1 ? 's' : ''}
    </p>
  </div>
</div>

<section class="mb-4 space-y-2">
  <label class="block space-y-1">
    <span class="text-xs text-zinc-500">Name</span>
    <Input
      value={group.name}
      onchange={(e) => app.renameGroup(group.id, e.target.value)}
    />
  </label>
</section>

{#if metrics.length > 0}
  <section class="mb-4 space-y-2">
    <p class={sectionLabel}>Metric</p>
    {#each metrics as metric (metric)}
      <label class="block space-y-1">
        {#if metrics.length > 1}
          <span class="text-xs text-zinc-500">{metricCaption(metric)}</span>
        {/if}
        <Select
          value={metric}
          options={metricChoices(members, metric, metricOptions)}
          onchange={(v) => setMetric(metric, v)}
        />
      </label>
      {#if metric === 'power_to_weight'}
        <RiderWeightPrompt />
      {/if}
    {/each}
  </section>
{/if}

{#if captions.length > 0}
  <section class="mb-4 space-y-2">
    <p class={sectionLabel}>Text</p>
    {#each captions as caption (caption.id)}
      <Input
        value={caption.text ?? ''}
        oninput={(e) =>
          app.updateElements({ [caption.id]: { text: e.target.value } })}
      />
    {/each}
  </section>
{/if}

{#if colors.length > 0}
  <section class="mb-4 space-y-2">
    <p class={sectionLabel}>Colors</p>
    <!-- Keyed by position, not value: the value changes while the picker is
         being dragged, and re-keying would tear the open picker down. -->
    {#each colors as entry, i (i)}
      <div class="space-y-1">
        <span
          class="block truncate text-xs text-zinc-500"
          title={entry.roles.join(', ')}>{entry.roles.join(', ')}</span
        >
        <ColorInput
          value={entry.value}
          {vars}
          onchange={(v) => setColor(entry, v)}
        />
      </div>
    {/each}
  </section>
{/if}

{#if sizeRef}
  <section class="mb-4 space-y-2">
    <p class={sectionLabel}>Size</p>
    <label class="block space-y-1">
      <span class="text-xs text-zinc-500"
        >{sizeRef.kind === 'width' ? 'Width' : 'Text size'}</span
      >
      <Input
        type="number"
        min="1"
        value={Math.round(sizeRef.value)}
        onfocus={beginSize}
        onblur={endSize}
        oninput={(e) => setSize(e.target.value)}
      />
    </label>
    <p class="text-[10px] leading-relaxed text-zinc-600">
      Scales every part together — text, strokes and spacing keep their
      proportions.
    </p>
  </section>
{/if}

{#if origin}
  <section class="mb-4 space-y-2">
    <p class={sectionLabel}>Position</p>
    <div class="grid grid-cols-2 gap-2">
      <label class="space-y-1">
        <span class="text-xs text-zinc-500">X</span>
        <Input
          type="number"
          value={origin.x}
          oninput={(e) => setOrigin('x', e.target.value)}
        />
      </label>
      <label class="space-y-1">
        <span class="text-xs text-zinc-500">Y</span>
        <Input
          type="number"
          value={origin.y}
          oninput={(e) => setOrigin('y', e.target.value)}
        />
      </label>
    </div>
  </section>
{/if}

<section class="space-y-2 border-t border-white/[0.06] pt-3">
  <div class="flex items-center gap-2">
    <button
      onclick={() => app.setGroupComposite(group.id, false)}
      class="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-[6px] bg-[var(--panel2)] px-2.5 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-[var(--panel3)] hover:text-zinc-100"
      title="Turn this composite into a regular group so each element can be edited"
    >
      <Expand size={12} />
      Expand to elements
    </button>
    <button
      onclick={() => app.deleteGroupAndElements(group.id)}
      class="cursor-pointer rounded-[6px] bg-[var(--panel2)] p-1.5 text-zinc-400 transition-colors hover:bg-[var(--panel3)] hover:text-destructive"
      title="Delete this composite"
      aria-label="Delete composite"
    >
      <Trash2 size={14} />
    </button>
  </div>
  <p class="text-[10px] leading-relaxed text-zinc-600">
    Drag any part on the canvas to move the whole composite. Expand keeps the
    elements exactly as they are — they just become individually editable.
  </p>
</section>
