<script>
  /**
   * A single draggable/selectable handle in the WYSIWYG SVG overlay.
   * Uses a dragDelta offset so the bounds prop stays reactive to parent
   * config changes even across drags.
   */
  let {
    bounds = { x: 0, y: 0, w: 50, h: 30 },
    label = '',
    selected = false,
    onselect,
    ondragend,  // (dx, dy) in scene/overlay coords
  } = $props()

  let dragging = $state(false)
  let dragOrigin = { mx: 0, my: 0 }
  let dragDelta = $state({ dx: 0, dy: 0 })

  // Display position: base bounds + live drag offset
  let d = $derived.by(() => ({
    x: bounds.x + dragDelta.dx,
    y: bounds.y + dragDelta.dy,
    w: bounds.w,
    h: bounds.h,
  }))

  function screenToOverlayDelta(svg, mx0, my0, mx1, my1) {
    const ctm = svg.getScreenCTM()
    if (!ctm) return { dx: 0, dy: 0 }
    const inv = ctm.inverse()
    const p0 = new DOMPoint(mx0, my0).matrixTransform(inv)
    const p1 = new DOMPoint(mx1, my1).matrixTransform(inv)
    return { dx: p1.x - p0.x, dy: p1.y - p0.y }
  }

  function onpointerdown(e) {
    e.stopPropagation()
    onselect?.()
    dragging = true
    dragOrigin = { mx: e.clientX, my: e.clientY }
    dragDelta = { dx: 0, dy: 0 }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function onpointermove(e) {
    if (!dragging) return
    const svg = e.currentTarget.ownerSVGElement
    if (!svg) return
    dragDelta = screenToOverlayDelta(svg, dragOrigin.mx, dragOrigin.my, e.clientX, e.clientY)
  }

  function onpointerup() {
    if (!dragging) return
    dragging = false
    ondragend?.(dragDelta.dx, dragDelta.dy)
    dragDelta = { dx: 0, dy: 0 }
  }
</script>

<!-- Hit area (larger than visual for easier grabbing) -->
<rect
  x={d.x - 4}
  y={d.y - 4}
  width={Math.max(d.w + 8, 24)}
  height={Math.max(d.h + 8, 24)}
  fill="transparent"
  style="cursor: {dragging ? 'grabbing' : 'grab'}; pointer-events: all"
  role="button"
  aria-label="Move {label}"
  tabindex="0"
  {onpointerdown}
  {onpointermove}
  {onpointerup}
/>

<!-- Visual border -->
<rect
  x={d.x}
  y={d.y}
  width={Math.max(d.w, 4)}
  height={Math.max(d.h, 4)}
  fill="none"
  stroke={selected ? '#DC143C' : 'rgba(255,255,255,0.25)'}
  stroke-width={selected ? 1.5 : 1}
  stroke-dasharray={selected ? 'none' : '4 3'}
  rx="2"
  style="pointer-events: none"
/>

<!-- Label tag (only when selected) -->
{#if selected}
  <rect
    x={d.x}
    y={d.y - 18}
    width={Math.max(label.length * 6.5 + 8, 30)}
    height={16}
    fill="#DC143C"
    rx="3"
    style="pointer-events: none"
  />
  <text
    x={d.x + 4}
    y={d.y - 6}
    font-size="10"
    fill="white"
    font-family="system-ui"
    style="pointer-events: none; user-select: none"
  >{label}</text>

  <!-- Corner handles -->
  {#each [
    [d.x, d.y],
    [d.x + d.w, d.y],
    [d.x, d.y + d.h],
    [d.x + d.w, d.y + d.h],
  ] as [cx, cy], i (i)}
    <rect
      x={cx - 3}
      y={cy - 3}
      width={6}
      height={6}
      fill="#DC143C"
      rx="1"
      style="pointer-events: none"
    />
  {/each}
{/if}
