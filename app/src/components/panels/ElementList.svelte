<script>
  import { getContext } from 'svelte'
  import {
    ArrowDown,
    ArrowUp,
    BarChart2,
    Hash,
    Map,
    Trash2,
    Type,
  } from 'lucide-svelte'

  const app = getContext('app')

  // Flat list of all elements with category + index
  let elements = $derived(() => {
    if (!app.config) return []
    const byId = {}
    for (const [i, l] of (app.config.labels ?? []).entries())
      byId[`label-${i}`] = {
        id: `label-${i}`,
        category: 'labels',
        idx: i,
        type: 'label',
        name: l.text ?? 'Label',
      }
    for (const [i, v] of (app.config.values ?? []).entries())
      byId[`value-${i}`] = {
        id: `value-${i}`,
        category: 'values',
        idx: i,
        type: 'value',
        name: v.value ?? 'value',
        unit: v.unit ?? null,
      }
    for (const [i, p] of (app.config.plots ?? []).entries())
      byId[`plot-${i}`] = {
        id: `plot-${i}`,
        category: 'plots',
        idx: i,
        type: p.value === 'course' ? 'map' : 'plot',
        name: p.value === 'course' ? 'map' : `${p.value} chart`,
      }
    return [...(app.elementLayerOrder ?? [])]
      .reverse()
      .map((id) => byId[id])
      .filter(Boolean)
  })

  function addLabel() {
    app.addElement('labels', {
      text: 'LABEL',
      x: 100, y: 100,
      font_size: app.config?.scene?.font_size ?? 32,
      color: '#ffffff',
      opacity: 1,
    })
  }

  function addValue() {
    app.addElement('values', {
      value: 'speed',
      x: 100, y: 200,
      font_size: app.config?.scene?.font_size ?? 48,
      opacity: 1,
    })
  }

  function addChart() {
    app.addElement('plots', {
      value: 'elevation',
      x: 50, y: 800,
      width: 500, height: 120,
      opacity: 1,
      line: { color: '#ffffff', width: 1.5 },
      fill: { opacity: 0.25, color: '#ffffff' },
      points: [{ color: '#ffffff', weight: 80, remove_edge_color: true }],
    })
  }

  function addMap() {
    app.addElement('plots', {
      value: 'course',
      x: 50, y: 580,
      width: 200, height: 200,
      opacity: 1,
      line: { color: '#ffffff', width: 1.5 },
      points: [{ color: '#ef4444', weight: 80, edge_color: '#ffffff' }],
    })
  }
</script>

<section class="px-4 py-3 flex-1 overflow-y-auto">
  <div class="flex items-center justify-between mb-2">
    <p class="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Elements</p>
    <div class="flex gap-0.5">
      <button onclick={addLabel} title="Add text label" class="p-1 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors">
        <Type size={13} />
      </button>
      <button onclick={addValue} title="Add metric value" class="p-1 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors">
        <Hash size={13} />
      </button>
      <button onclick={addChart} title="Add chart" class="p-1 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors">
        <BarChart2 size={13} />
      </button>
      <button onclick={addMap} title="Add map (GPS route)" class="p-1 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors">
        <Map size={13} />
      </button>
    </div>
  </div>

  {#if !app.config}
    <p class="text-xs text-zinc-600 italic">Load a template to see elements.</p>
  {:else if elements().length === 0}
    <p class="text-xs text-zinc-600 italic">No elements. Add one above.</p>
  {:else}
    <ul class="space-y-0.5">
      {#each elements() as el (el.id)}
        {@const selected = app.selectedElementId === el.id}
        <li class="relative group">
          <button
            onclick={() => app.selectedElementId = selected ? null : el.id}
            class={`w-full flex items-center gap-2 px-2.5 py-2 pr-20 rounded-[6px] text-left text-sm transition-colors
              ${selected
                ? 'bg-primary/10 text-primary border border-primary/30'
                : 'text-zinc-300 hover:bg-zinc-800/60 hover:text-zinc-100'}`}
          >
            {#if el.type === 'label'}
              <Type size={12} class="shrink-0 opacity-60" />
            {:else if el.type === 'value'}
              <Hash size={12} class="shrink-0 opacity-60" />
            {:else if el.type === 'map'}
              <Map size={12} class="shrink-0 opacity-60" />
            {:else}
              <BarChart2 size={12} class="shrink-0 opacity-60" />
            {/if}
            <span class="truncate font-mono text-xs">{el.name}</span>
            {#if el.unit}
              <span class="shrink-0 text-[9px] font-medium px-1 py-0.5 rounded bg-zinc-700/60 text-zinc-400 uppercase tracking-wide">{el.unit === 'imperial' ? 'imp' : el.unit}</span>
            {/if}
          </button>
          <div class="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onclick={(e) => { e.stopPropagation(); app.moveElementLayer(el.id, 1) }}
              class="p-1 rounded text-zinc-600 hover:text-zinc-200 transition-colors"
              title="Bring forward"
              tabindex="-1"
            >
              <ArrowUp size={11} />
            </button>
            <button
              onclick={(e) => { e.stopPropagation(); app.moveElementLayer(el.id, -1) }}
              class="p-1 rounded text-zinc-600 hover:text-zinc-200 transition-colors"
              title="Send backward"
              tabindex="-1"
            >
              <ArrowDown size={11} />
            </button>
            <button
              onclick={(e) => { e.stopPropagation(); app.removeElement(el.category, el.idx) }}
              class="p-1 rounded text-zinc-600 hover:text-destructive transition-colors"
              title="Remove"
              tabindex="-1"
            >
              <Trash2 size={11} />
            </button>
          </div>
        </li>
      {/each}
    </ul>
  {/if}
</section>
