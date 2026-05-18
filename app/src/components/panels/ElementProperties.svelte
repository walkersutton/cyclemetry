<script>
  /**
   * Right panel: property editor for the currently selected element.
   * All changes write directly into app.config via app.updateElement().
   */
  import { getContext } from 'svelte'
  import Input from '../ui/Input.svelte'
  import Select from '../ui/Select.svelte'

  const app = getContext('app')

  const ADD_FONT = '__add_font__'

  // Single source of truth: app.fonts (bundled ∪ user-installed), plus an
  // inline "add custom font" affordance.
  function fontOpts(includeSceneDefault) {
    return [
      ...(includeSceneDefault ? [{ value: '', label: 'Scene default' }] : []),
      ...app.fonts.map((f) => ({ value: f, label: f.replace(/\.(ttf|otf)$/i, '') })),
      { value: ADD_FONT, label: '+ Add custom font…' },
    ]
  }

  async function pickFont(apply) {
    const f = await app.addCustomFont()
    if (f) apply(f)
  }
  const METRICS = ['speed', 'heartrate', 'power', 'elevation', 'cadence', 'gradient', 'temperature', 'time']
  const PLOT_METRICS = ['elevation', 'speed', 'heartrate', 'power', 'cadence', 'gradient', 'temperature', 'course']
  const UNITS = [
    { value: '', label: 'Default' },
    { value: 'imperial', label: 'Imperial' },
    { value: 'metric', label: 'Metric' },
  ]

  let selected = $derived(() => {
    const id = app.selectedElementId
    if (!id || !app.config) return null
    const m = id.match(/^(label|value|plot)-(\d+)$/)
    if (!m) return null
    const catMap = { label: 'labels', value: 'values', plot: 'plots' }
    const category = catMap[m[1]]
    const idx = parseInt(m[2])
    const item = app.config[category]?.[idx]
    return item ? { id, category, idx, item, type: m[1] } : null
  })

  function update(field, raw) {
    const s = selected()
    if (!s) return
    const numFields = ['x', 'y', 'width', 'height', 'font_size', 'opacity', 'decimal_rounding']
    const value = numFields.includes(field) ? (raw === '' ? undefined : Number(raw)) : raw
    app.updateElement(s.category, s.idx, { [field]: value })
  }

  // Update a nested object field: updateNested('line', 'color', '#fff')
  function updateNested(obj, field, raw) {
    const s = selected()
    if (!s) return
    const numFields = ['width', 'opacity']
    const value = numFields.includes(field) ? (raw === '' ? undefined : Number(raw)) : raw
    const current = s.item[obj] ?? {}
    app.updateElement(s.category, s.idx, { [obj]: { ...current, [field]: value } })
  }

  // Update points[0] — the tracking marker. Creates it if absent.
  function updatePoint(field, raw) {
    const s = selected()
    if (!s) return
    const numFields = ['weight', 'opacity']
    const value = numFields.includes(field) ? (raw === '' ? undefined : Number(raw)) : raw
    const current = s.item.points?.[0] ?? {}
    app.updateElement(s.category, s.idx, { points: [{ ...current, [field]: value }] })
  }

  // Point label (value text next to the chart marker, e.g. "960 M").
  const POINT_LABEL_DEFAULT = {
    font: 'Furore.otf',
    font_size: 64,
    color: '#ffffffc8',
    x_offset: 30,
    y_offset: 30,
    units: ['metric', 'imperial'],
    decimal_rounding: 0,
  }

  function togglePointLabel(enabled) {
    const s = selected()
    if (!s) return
    app.updateElement(s.category, s.idx, {
      point_label: enabled ? { ...POINT_LABEL_DEFAULT } : undefined,
    })
  }

  function updatePL(field, raw) {
    const s = selected()
    if (!s) return
    const numFields = ['font_size', 'x_offset', 'y_offset', 'decimal_rounding']
    const value = numFields.includes(field)
      ? raw === ''
        ? undefined
        : Number(raw)
      : raw
    const current = s.item.point_label ?? {}
    app.updateElement(s.category, s.idx, {
      point_label: { ...current, [field]: value },
    })
  }

  // units is an ordered array; keep metric before imperial.
  function toggleUnit(unit, on) {
    const s = selected()
    if (!s) return
    const cur = s.item.point_label?.units ?? []
    const next = on ? [...cur, unit] : cur.filter((u) => u !== unit)
    const units = ['metric', 'imperial'].filter((u) => next.includes(u))
    const current = s.item.point_label ?? {}
    app.updateElement(s.category, s.idx, {
      point_label: { ...current, units },
    })
  }

  function numVal(item, field) {
    return item[field] ?? ''
  }

  // Color row helper — returns [colorValue, hexDisplay]
  function colorRow(obj, field, fallback = '#ffffff') {
    const s = selected()
    return s?.item[obj]?.[field] ?? fallback
  }

  // The element's representative color, shown by the single basic-mode swatch.
  function primaryColor() {
    const s = selected()
    if (!s) return '#ffffff'
    const it = s.item
    return (
      it.color ??
      it.line?.color ??
      it.points?.[0]?.color ??
      '#ffffff'
    )
  }

  // Basic mode: one color drives every color on the element. Applied as a
  // single updateElement call so it's one undo step.
  function setAllColors(raw) {
    const s = selected()
    if (!s) return
    if (s.type === 'plot') {
      const it = s.item
      const patch = {
        color: raw,
        line: { ...(it.line ?? {}), color: raw },
        fill: { ...(it.fill ?? {}), color: raw },
      }
      if (it.points?.[0]) patch.points = [{ ...it.points[0], color: raw }]
      if (it.point_label) patch.point_label = { ...it.point_label, color: raw }
      app.updateElement(s.category, s.idx, patch)
    } else {
      app.updateElement(s.category, s.idx, { color: raw })
    }
  }

  // Progressive disclosure: most overlays reuse the same colors/fonts/line
  // weights, so detailed/structural controls hide behind "Advanced".
  let showAdvanced = $state(false)
</script>

<div class="h-full overflow-y-auto px-4 py-3">
  {#if !selected()}
    <div class="flex h-full items-center justify-center">
      <p class="text-xs text-zinc-600 italic text-center">Click an element on the canvas<br>or in the list to edit it.</p>
    </div>
  {:else}
    {@const { item, type } = selected()}

    <p class="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-3">
      {type === 'label' ? 'Text Label' : type === 'value' ? 'Metric Value' : item.value === 'course' ? 'Map' : 'Chart'} Properties
    </p>

    <!-- Advanced disclosure: hides position/size and rarely-changed detail -->
    <button
      onclick={() => (showAdvanced = !showAdvanced)}
      class="mb-4 flex w-full items-center gap-1.5 text-[10px] uppercase tracking-wider text-zinc-600 hover:text-zinc-400 transition-colors duration-150"
    >
      <span class="inline-block transition-transform duration-150 {showAdvanced ? 'rotate-90' : ''}">▸</span>
      {showAdvanced ? 'Hide' : 'Show'} advanced options
    </button>

    <!-- Position (basic) -->
    <section class="mb-4 space-y-2">
      <p class="text-[10px] uppercase tracking-wider text-zinc-600">Position</p>
      <div class="grid grid-cols-2 gap-2">
        <label class="space-y-1">
          <span class="text-xs text-zinc-500">X</span>
          <Input type="number" value={numVal(item, 'x')} oninput={(e) => update('x', e.target.value)} />
        </label>
        <label class="space-y-1">
          <span class="text-xs text-zinc-500">Y</span>
          <Input type="number" value={numVal(item, 'y')} oninput={(e) => update('y', e.target.value)} />
        </label>
      </div>
    </section>

    <!-- Plot size (advanced) -->
    {#if showAdvanced && type === 'plot'}
      <section class="mb-4 space-y-2">
        <p class="text-[10px] uppercase tracking-wider text-zinc-600">Size</p>
        <div class="grid grid-cols-2 gap-2">
          <label class="space-y-1">
            <span class="text-xs text-zinc-500">Width</span>
            <Input type="number" value={numVal(item, 'width')} oninput={(e) => update('width', e.target.value)} />
          </label>
          <label class="space-y-1">
            <span class="text-xs text-zinc-500">Height</span>
            <Input type="number" value={numVal(item, 'height')} oninput={(e) => update('height', e.target.value)} />
          </label>
        </div>
      </section>
    {/if}

    <!-- Text content (label) -->
    {#if type === 'label'}
      <section class="mb-4 space-y-1">
        <p class="text-[10px] uppercase tracking-wider text-zinc-600">Text</p>
        <Input value={item.text ?? ''} oninput={(e) => update('text', e.target.value)} />
      </section>
    {/if}

    <!-- Metric (value) -->
    {#if type === 'value'}
      <section class="mb-4 space-y-1">
        <p class="text-[10px] uppercase tracking-wider text-zinc-600">Metric</p>
        <Select
          value={item.value ?? ''}
          options={METRICS.map((m) => ({ value: m, label: m }))}
          onchange={(v) => update('value', v)}
        />
      </section>
    {/if}

    <!-- Metric or chart value -->
    {#if type === 'plot'}
      <section class="mb-4 space-y-1">
        <p class="text-[10px] uppercase tracking-wider text-zinc-600">Metric</p>
        <Select
          value={item.value ?? ''}
          options={PLOT_METRICS.map((m) => ({ value: m, label: m === 'course' ? 'course (map)' : m }))}
          onchange={(v) => update('value', v)}
        />
      </section>
    {/if}

    <!-- Line & Fill (plots only) -->
    {#if type === 'plot'}
      <section class="mb-4 space-y-2">
        <p class="text-[10px] uppercase tracking-wider text-zinc-600">Line</p>
        {#if showAdvanced}
        <label class="space-y-1 block">
          <span class="text-xs text-zinc-500">Color</span>
          <div class="flex gap-2 items-center">
            <input type="color" value={colorRow('line', 'color')}
              oninput={(e) => updateNested('line', 'color', e.target.value)}
              class="h-7 w-10 rounded border border-zinc-700 bg-zinc-800 cursor-pointer p-0.5" />
            <Input value={colorRow('line', 'color')} oninput={(e) => updateNested('line', 'color', e.target.value)} class="flex-1 font-mono text-xs" />
          </div>
        </label>
        {/if}
        <label class="space-y-1 block">
          <span class="text-xs text-zinc-500">Width (px)</span>
          <Input type="number" value={item.line?.width ?? 1.75} min={0} step={0.25}
            oninput={(e) => updateNested('line', 'width', e.target.value)} />
        </label>
      </section>

      {#if showAdvanced}
      <section class="mb-4 space-y-2">
        <p class="text-[10px] uppercase tracking-wider text-zinc-600">Fill</p>
        <label class="space-y-1 block">
          <span class="text-xs text-zinc-500">Color</span>
          <div class="flex gap-2 items-center">
            <input type="color" value={colorRow('fill', 'color')}
              oninput={(e) => updateNested('fill', 'color', e.target.value)}
              class="h-7 w-10 rounded border border-zinc-700 bg-zinc-800 cursor-pointer p-0.5" />
            <Input value={colorRow('fill', 'color')} oninput={(e) => updateNested('fill', 'color', e.target.value)} class="flex-1 font-mono text-xs" />
          </div>
        </label>
        <label class="space-y-1 block">
          <span class="text-xs text-zinc-500">Opacity (0–1)</span>
          <Input type="number" value={item.fill?.opacity ?? 0} min={0} max={1} step={0.05}
            oninput={(e) => updateNested('fill', 'opacity', e.target.value)} />
        </label>
      </section>
      {/if}

      <!-- Tracking point — points[0] -->
      {@const pt = item.points?.[0] ?? {}}
      <section class="mb-4 space-y-2">
        <p class="text-[10px] uppercase tracking-wider text-zinc-600">Tracking Point</p>
        {#if showAdvanced}
        <label class="space-y-1 block">
          <span class="text-xs text-zinc-500">Color</span>
          <div class="flex gap-2 items-center">
            <input type="color" value={pt.color ?? '#ffffff'}
              oninput={(e) => updatePoint('color', e.target.value)}
              class="h-7 w-10 rounded border border-zinc-700 bg-zinc-800 cursor-pointer p-0.5" />
            <Input value={pt.color ?? '#ffffff'} oninput={(e) => updatePoint('color', e.target.value)} class="flex-1 font-mono text-xs" />
          </div>
        </label>
        {/if}
        <label class="space-y-1 block">
          <span class="text-xs text-zinc-500">Size (area px²)</span>
          <Input type="number" value={pt.weight ?? 80} min={4} step={4}
            oninput={(e) => updatePoint('weight', e.target.value)} />
        </label>
        {#if showAdvanced}
        <label class="space-y-1 block">
          <span class="text-xs text-zinc-500">Edge Color</span>
          <div class="flex gap-2 items-center">
            <input type="color" value={pt.edge_color ?? '#000000'}
              oninput={(e) => updatePoint('edge_color', e.target.value)}
              class="h-7 w-10 rounded border border-zinc-700 bg-zinc-800 cursor-pointer p-0.5" />
            <Input value={pt.edge_color ?? '#000000'} oninput={(e) => updatePoint('edge_color', e.target.value)} class="flex-1 font-mono text-xs" />
          </div>
        </label>
        <label class="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={pt.remove_edge_color ?? false}
            onchange={(e) => updatePoint('remove_edge_color', e.target.checked)}
            class="accent-primary" />
          <span class="text-xs text-zinc-400">Remove edge</span>
        </label>
        {/if}
      </section>

      <!-- Point Label — value text next to the marker -->
      {#if showAdvanced}
      {@const pl = item.point_label}
      <section class="mb-4 space-y-2">
        <p class="text-[10px] uppercase tracking-wider text-zinc-600">Point Label</p>
        <label class="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={pl != null}
            onchange={(e) => togglePointLabel(e.target.checked)}
            class="accent-primary" />
          <span class="text-xs text-zinc-400">Show current value at the marker</span>
        </label>
        {#if pl != null}
          <div class="flex gap-4">
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={(pl.units ?? []).includes('metric')}
                onchange={(e) => toggleUnit('metric', e.target.checked)}
                class="accent-primary" />
              <span class="text-xs text-zinc-400">Metric</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={(pl.units ?? []).includes('imperial')}
                onchange={(e) => toggleUnit('imperial', e.target.checked)}
                class="accent-primary" />
              <span class="text-xs text-zinc-400">Imperial</span>
            </label>
          </div>
          <label class="space-y-1 block">
            <span class="text-xs text-zinc-500">Font</span>
            <Select
              value={pl.font ?? 'Furore.otf'}
              options={fontOpts(false)}
              onchange={(v) => (v === ADD_FONT ? pickFont((f) => updatePL('font', f)) : updatePL('font', v))}
            />
          </label>
          <label class="space-y-1 block">
            <span class="text-xs text-zinc-500">Size</span>
            <Input type="number" value={pl.font_size ?? 64} min={1}
              oninput={(e) => updatePL('font_size', e.target.value)} />
          </label>
          <label class="space-y-1 block">
            <span class="text-xs text-zinc-500">Color</span>
            <div class="flex gap-2 items-center">
              <input type="color" value={(pl.color ?? '#ffffff').slice(0, 7)}
                oninput={(e) => updatePL('color', e.target.value)}
                class="h-7 w-10 rounded border border-zinc-700 bg-zinc-800 cursor-pointer p-0.5" />
              <Input value={pl.color ?? '#ffffffc8'} oninput={(e) => updatePL('color', e.target.value)} class="flex-1 font-mono text-xs" />
            </div>
          </label>
          <div class="flex gap-2">
            <label class="space-y-1 block flex-1">
              <span class="text-xs text-zinc-500">X offset</span>
              <Input type="number" value={pl.x_offset ?? 0}
                oninput={(e) => updatePL('x_offset', e.target.value)} />
            </label>
            <label class="space-y-1 block flex-1">
              <span class="text-xs text-zinc-500">Y offset</span>
              <Input type="number" value={pl.y_offset ?? 0}
                oninput={(e) => updatePL('y_offset', e.target.value)} />
            </label>
          </div>
          <label class="space-y-1 block">
            <span class="text-xs text-zinc-500">Decimal places</span>
            <Input type="number" value={pl.decimal_rounding ?? 0} min={0} step={1}
              oninput={(e) => updatePL('decimal_rounding', e.target.value)} />
          </label>
        {/if}
      </section>
      {/if}
    {/if}

    <!-- Typography (label + value) -->
    {#if type !== 'plot'}
      <section class="mb-4 space-y-2">
        <p class="text-[10px] uppercase tracking-wider text-zinc-600">Typography</p>
        {#if showAdvanced}
        <label class="space-y-1 block">
          <span class="text-xs text-zinc-500">Font</span>
          <Select
            value={item.font ?? ''}
            options={fontOpts(true)}
            onchange={(v) => (v === ADD_FONT ? pickFont((f) => update('font', f)) : update('font', v || undefined))}
          />
        </label>
        {/if}
        <label class="space-y-1 block">
          <span class="text-xs text-zinc-500">Size</span>
          <Input type="number" value={numVal(item, 'font_size')} placeholder="Scene default" oninput={(e) => update('font_size', e.target.value)} />
        </label>
      </section>
    {/if}

    <!-- Appearance -->
    <section class="mb-4 space-y-2">
      <p class="text-[10px] uppercase tracking-wider text-zinc-600">Appearance</p>
      {#if showAdvanced}
      <label class="space-y-1 block">
        <span class="text-xs text-zinc-500">Color</span>
        <div class="flex gap-2 items-center">
          <input
            type="color"
            value={item.color ?? '#ffffff'}
            oninput={(e) => update('color', e.target.value)}
            class="h-7 w-10 rounded border border-zinc-700 bg-zinc-800 cursor-pointer p-0.5"
          />
          <Input value={item.color ?? '#ffffff'} oninput={(e) => update('color', e.target.value)} class="flex-1 font-mono text-xs" />
        </div>
      </label>
      {:else}
      <label class="space-y-1 block">
        <span class="text-xs text-zinc-500">Color</span>
        <div class="flex gap-2 items-center">
          <input
            type="color"
            value={primaryColor().slice(0, 7)}
            oninput={(e) => setAllColors(e.target.value)}
            class="h-7 w-10 rounded border border-zinc-700 bg-zinc-800 cursor-pointer p-0.5"
          />
          <Input value={primaryColor()} oninput={(e) => setAllColors(e.target.value)} class="flex-1 font-mono text-xs" />
        </div>
      </label>
      {/if}
      {#if showAdvanced}
      <label class="space-y-1 block">
        <span class="text-xs text-zinc-500">Opacity (0–1)</span>
        <Input type="number" value={item.opacity ?? app.config?.scene?.opacity ?? 1} min={0} max={1} step={0.05} oninput={(e) => update('opacity', e.target.value)} />
      </label>
      {/if}
    </section>

    <!-- Value-specific -->
    {#if type === 'value'}
      <section class="mb-4 space-y-2">
        <p class="text-[10px] uppercase tracking-wider text-zinc-600">Formatting</p>
        <label class="space-y-1 block">
          <span class="text-xs text-zinc-500">Unit system</span>
          <Select value={item.unit ?? ''} options={UNITS} onchange={(v) => update('unit', v || undefined)} />
        </label>
        {#if showAdvanced}
        <label class="space-y-1 block">
          <span class="text-xs text-zinc-500">Suffix</span>
          <Input value={item.suffix ?? ''} placeholder="e.g. mph" oninput={(e) => update('suffix', e.target.value || undefined)} />
        </label>
        <label class="space-y-1 block">
          <span class="text-xs text-zinc-500">Decimal places</span>
          <Input type="number" value={numVal(item, 'decimal_rounding')} min={0} max={4} oninput={(e) => update('decimal_rounding', e.target.value)} />
        </label>
        {/if}
      </section>
    {/if}
  {/if}
</div>
