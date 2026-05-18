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

  // The backend renders + measures the demo frame at the chosen OUTPUT
  // resolution, scaled from the template's authored size by a uniform
  // height-based factor. The SVG overlay must use that same output space so
  // measured element bounds line up; config-derived fallbacks and drag
  // write-back are converted between authored ↔ output via `authorScale`.
  let sceneWidth = $derived(app.outputWidth ?? 1920)
  let sceneHeight = $derived(app.outputHeight ?? 1080)
  let authoredHeight = $derived(app.config?.scene?.height ?? 1080)
  let authorScale = $derived(sceneHeight / (authoredHeight || sceneHeight))

  let elements = $derived.by(() => {
    if (!app.config) return []
    const measured = new Map(measuredElements.map(e => [e.id, e]))
    const s = authorScale
    // Config-derived fallback bounds are in authored coords; the rendered
    // image (and measured bounds) are in output coords — scale to match.
    const fb = (o) => ({ id: o.id, x: o.x * s, y: o.y * s, w: o.w * s, h: o.h * s })
    const out = []

    for (const [i, l] of (app.config.labels ?? []).entries()) {
      const id = `label-${i}`
      const m = measured.get(id)
      const fs = l.font_size ?? 32
      const text = l.text ?? 'LABEL'
      out.push(m ?? fb({
        id,
        x: l.x ?? 100,
        y: (l.y ?? 100) - fs * 0.8,           // baseline → visual top
        w: Math.max(text.length * fs * 0.58, fs),
        h: fs,
      }))
    }
    for (const [i, v] of (app.config.values ?? []).entries()) {
      const id = `value-${i}`
      const m = measured.get(id)
      const fs = v.font_size ?? 48
      out.push(m ?? fb({
        id,
        x: v.x ?? 100,
        y: (v.y ?? 200) - fs * 0.8,
        w: fs * 3.5,
        h: fs,
      }))
    }
    for (const [i, p] of (app.config.plots ?? []).entries()) {
      const id = `plot-${i}`
      const m = measured.get(id)
      out.push(m ?? fb({
        id,
        x: p.x ?? 50, y: p.y ?? 400,
        w: p.width ?? 400,
        h: p.height ?? 150,
      }))
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

  let selectedSet = $derived(new Set(app.selectedElementIds ?? []))
  // During a group drag: { leaderId, dx, dy }. Non-leader selected handles
  // follow via groupOffset so the whole selection moves in unison.
  let liveGroup = $state(null)

  function isGroupDrag(id) {
    return selectedSet.size > 1 && selectedSet.has(id)
  }

  function handleSelect(id, e) {
    if (e?.shiftKey) {
      app.toggleElementSelection(id)
    } else if (isGroupDrag(id)) {
      // Keep the multi-selection so a plain drag moves the whole group.
    } else {
      app.selectedElementId = id
    }
  }

  function handleDrag(id, dx, dy) {
    liveGroup = isGroupDrag(id) ? { leaderId: id, dx, dy } : null
  }

  function moveFor(id, dx, dy) {
    const el = parseId(id)
    if (!el) return null
    const item = app.config?.[el.category]?.[el.idx]
    if (!item) return null
    // dx/dy are in output space; config x/y are authored — convert back.
    const s = authorScale || 1
    return {
      category: el.category,
      idx: el.idx,
      x: (item.x ?? 0) + dx / s,
      y: (item.y ?? 0) + dy / s,
    }
  }

  function handleDragEnd(id, dx, dy) {
    const ids = isGroupDrag(id) ? [...selectedSet] : [id]
    const moves = ids.map((sid) => moveFor(sid, dx, dy)).filter(Boolean)
    app.updateElementPositions(moves)
    liveGroup = null
  }

  function groupOffsetFor(id) {
    if (liveGroup && liveGroup.leaderId !== id && selectedSet.has(id)) {
      return { dx: liveGroup.dx, dy: liveGroup.dy }
    }
    return { dx: 0, dy: 0 }
  }

  // ── Marquee (rubber-band) selection ───────────────────────────────────────
  let marquee = $state(null) // normalized scene-coord rect being drawn
  let marqueeStart = null // scene-coord anchor
  let marqueeClient = null // client px anchor (drag-vs-click detection)
  let marqueeMoved = false

  function clientToScene(svg, cx, cy) {
    const ctm = svg.getScreenCTM()
    if (!ctm) return { x: 0, y: 0 }
    const p = new DOMPoint(cx, cy).matrixTransform(ctm.inverse())
    return { x: p.x, y: p.y }
  }

  function bgPointerDown(e) {
    const svg = e.currentTarget.ownerSVGElement
    if (!svg) return
    const p = clientToScene(svg, e.clientX, e.clientY)
    marqueeStart = p
    marqueeClient = { cx: e.clientX, cy: e.clientY }
    marqueeMoved = false
    marquee = { x: p.x, y: p.y, w: 0, h: 0 }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function bgPointerMove(e) {
    if (!marqueeStart) return
    const svg = e.currentTarget.ownerSVGElement
    if (!svg) return
    if (
      Math.abs(e.clientX - marqueeClient.cx) > 3 ||
      Math.abs(e.clientY - marqueeClient.cy) > 3
    )
      marqueeMoved = true
    const p = clientToScene(svg, e.clientX, e.clientY)
    marquee = {
      x: Math.min(marqueeStart.x, p.x),
      y: Math.min(marqueeStart.y, p.y),
      w: Math.abs(p.x - marqueeStart.x),
      h: Math.abs(p.y - marqueeStart.y),
    }
  }

  function bgPointerUp() {
    if (!marqueeStart) return
    if (marqueeMoved && marquee) {
      const minX = marquee.x
      const minY = marquee.y
      const maxX = marquee.x + marquee.w
      const maxY = marquee.y + marquee.h
      const hit = elements
        .filter(
          (el) =>
            !(
              el.x + el.w < minX ||
              el.x > maxX ||
              el.y + el.h < minY ||
              el.y > maxY
            ),
        )
        .map((el) => el.id)
      app.setSelectedElements(hit)
    } else {
      app.selectedElementId = null // plain click on empty space → deselect
    }
    marquee = null
    marqueeStart = null
  }
</script>

{#if app.config}
<svg
  viewBox={`0 0 ${sceneWidth} ${sceneHeight}`}
  style="position:absolute; inset:0; width:100%; height:100%; overflow:visible; pointer-events:none"
  xmlns="http://www.w3.org/2000/svg"
>
  <!-- Background: drag to marquee-select, click to deselect.
       FIRST so handles paint on top -->
  <rect
    role="presentation"
    x={0} y={0}
    width={sceneWidth} height={sceneHeight}
    fill="transparent"
    style="pointer-events:all; cursor:crosshair"
    onpointerdown={bgPointerDown}
    onpointermove={bgPointerMove}
    onpointerup={bgPointerUp}
    onkeydown={(e) => { if (e.key === 'Escape') app.selectedElementId = null }}
  />

  {#each elements as el (el.id)}
    <ElementHandle
      id={el.id}
      bounds={{ x: el.x, y: el.y, w: el.w, h: el.h }}
      label={handleLabel(el.id)}
      selected={selectedSet.has(el.id)}
      groupOffset={groupOffsetFor(el.id)}
      onselect={(e) => handleSelect(el.id, e)}
      ondrag={(dx, dy) => handleDrag(el.id, dx, dy)}
      ondragend={(dx, dy) => handleDragEnd(el.id, dx, dy)}
    />
  {/each}

  {#if marquee && (marquee.w > 0 || marquee.h > 0)}
    <rect
      x={marquee.x} y={marquee.y}
      width={marquee.w} height={marquee.h}
      fill="rgba(220,20,60,0.12)"
      stroke="#DC143C" stroke-width="1" stroke-dasharray="4 3"
      style="pointer-events:none"
    />
  {/if}
</svg>
{/if}
