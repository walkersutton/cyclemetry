<script>
  /**
   * Transparent SVG layer positioned over the canvas.
   *
   * Bounds strategy (two sources, merged per element):
   *   1. measuredElements — pixel-perfect Skia bounds returned by the Rust renderer.
   *      These are used whenever available (after the first frame loads).
   *   2. Config-derived fallback — used before the first frame is ready.
   *      Config `y` for text is the Skia baseline, so we subtract ~0.8×font_size
   *      to approximate the visual top of the glyph.
   */
  import { getContext } from 'svelte'
  import ElementHandle from './ElementHandle.svelte'

  const app = getContext('app')

  // Pixel-perfect bounds from the Rust renderer — { id, x, y, w, h }[]
  let { measuredElements = [] } = $props()

  let sceneWidth = $derived(app.config?.scene?.width ?? 1920)
  let sceneHeight = $derived(app.config?.scene?.height ?? 1080)

  let elements = $derived.by(() => {
    if (!app.config) return []
    const measured = new Map(measuredElements.map(e => [e.id, e]))
    const out = []

    for (const [i, l] of (app.config.labels ?? []).entries()) {
      const id = `label-${i}`
      const m = measured.get(id)
      const fs = l.font_size ?? 32
      const text = l.text ?? 'LABEL'
      out.push(m ?? {
        id,
        x: l.x ?? 100,
        y: (l.y ?? 100) - fs * 0.8,           // baseline → visual top
        w: Math.max(text.length * fs * 0.58, fs),
        h: fs,
      })
    }
    for (const [i, v] of (app.config.values ?? []).entries()) {
      const id = `value-${i}`
      const m = measured.get(id)
      const fs = v.font_size ?? 48
      out.push(m ?? {
        id,
        x: v.x ?? 100,
        y: (v.y ?? 200) - fs * 0.8,
        w: fs * 3.5,
        h: fs,
      })
    }
    for (const [i, p] of (app.config.plots ?? []).entries()) {
      const id = `plot-${i}`
      const m = measured.get(id)
      out.push(m ?? {
        id,
        x: p.x ?? 50, y: p.y ?? 400,
        w: p.width ?? 400,
        h: p.height ?? 150,
      })
    }
    return out
  })

  function parseId(id) {
    const m = id.match(/^(label|value|plot)-(\d+)$/)
    if (!m) return null
    return { category: { label: 'labels', value: 'values', plot: 'plots' }[m[1]], idx: parseInt(m[2]) }
  }

  function handleLabel(id) {
    const el = parseId(id)
    if (!el) return id
    const item = app.config?.[el.category]?.[el.idx]
    if (!item) return id
    if (el.category === 'labels') return item.text ?? 'label'
    if (el.category === 'values') return item.value ?? 'value'
    return `${item.value} chart`
  }

  function handleDragEnd(id, dx, dy) {
    const el = parseId(id)
    if (!el) return
    const item = app.config?.[el.category]?.[el.idx]
    if (!item) return
    app.updateElementPos(el.category, el.idx, (item.x ?? 0) + dx, (item.y ?? 0) + dy)
  }
</script>

{#if app.config}
<svg
  viewBox={`0 0 ${sceneWidth} ${sceneHeight}`}
  style="position:absolute; inset:0; width:100%; height:100%; overflow:visible; pointer-events:none"
  xmlns="http://www.w3.org/2000/svg"
>
  <!-- Deselect background — FIRST so handles paint on top -->
  <rect
    role="presentation"
    x={0} y={0}
    width={sceneWidth} height={sceneHeight}
    fill="transparent"
    style="pointer-events:all; cursor:default"
    onclick={() => app.selectedElementId = null}
    onkeydown={(e) => { if (e.key === 'Escape') app.selectedElementId = null }}
  />

  {#each elements as el (el.id)}
    <ElementHandle
      id={el.id}
      bounds={{ x: el.x, y: el.y, w: el.w, h: el.h }}
      label={handleLabel(el.id)}
      selected={app.selectedElementId === el.id}
      onselect={() => app.selectedElementId = el.id}
      ondragend={(dx, dy) => handleDragEnd(el.id, dx, dy)}
    />
  {/each}
</svg>
{/if}
