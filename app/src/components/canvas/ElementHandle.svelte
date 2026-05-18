<script>
  /**
   * A single draggable/selectable handle in the WYSIWYG SVG overlay.
   * Uses a dragDelta offset so the bounds prop stays reactive to parent
   * config changes even across drags.
   */

  // Circular-arrow cursor for the rotation handle (clockwise arc + arrowhead).
  const ROTATE_CURSOR = `url("data:image/svg+xml,${encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20">' +
    '<path d="M10 2A8 8 0 1 1 2 10" stroke="white" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '<path d="M10 2A8 8 0 1 1 2 10" stroke="#1a1a1a" stroke-width="1.5" fill="none" stroke-linecap="round"/>' +
    '<path d="M13 2L10 0L10 4Z" fill="white"/>' +
    '<path d="M12.5 2L10 0.5L10 3.5Z" fill="#1a1a1a"/>' +
    '</svg>'
  )}") 10 10, grab`

  let {
    bounds = { x: 0, y: 0, w: 50, h: 30 },
    label = '',
    selected = false,
    rotation = 0,
    groupOffset = { dx: 0, dy: 0 },  // live offset when another group member is dragging
    onselect,   // (event) — event carries shiftKey for multi-select
    ondrag,     // (dx, dy) live, every pointermove
    ondragend,  // (dx, dy) in scene/overlay coords
    onrotate,   // (degrees) live, every pointermove
    onrotateend, // (degrees) committed on pointerup
  } = $props()

  let dragging = $state(false)
  let dragOrigin = { mx: 0, my: 0 }
  let dragDelta = $state({ dx: 0, dy: 0 })

  // Display position: base bounds + live drag offset
  let d = $derived.by(() => ({
    x: bounds.x + dragDelta.dx + groupOffset.dx,
    y: bounds.y + dragDelta.dy + groupOffset.dy,
    w: bounds.w,
    h: bounds.h,
  }))

  let cx = $derived(d.x + d.w / 2)
  let cy = $derived(d.y + d.h / 2)

  const ROTATE_HANDLE_OFFSET = 32

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
    onselect?.(e)
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
    ondrag?.(dragDelta.dx, dragDelta.dy)
  }

  function onpointerup() {
    if (!dragging) return
    dragging = false
    ondragend?.(dragDelta.dx, dragDelta.dy)
    dragDelta = { dx: 0, dy: 0 }
  }

  // ── Rotation handle ───────────────────────────────────────────────────────
  let rotating = $state(false)
  let rotateStartAngle = 0
  let rotateStartValue = 0

  function sceneAngle(svg, mx, my) {
    const ctm = svg.getScreenCTM()
    if (!ctm) return 0
    const p = new DOMPoint(mx, my).matrixTransform(ctm.inverse())
    // atan2 from center, measured clockwise from top (matching CSS/SVG rotate)
    return Math.atan2(p.x - cx, -(p.y - cy)) * (180 / Math.PI)
  }

  function rotatePointerDown(e) {
    e.stopPropagation()
    rotating = true
    rotateStartValue = rotation
    rotateStartAngle = sceneAngle(e.currentTarget.ownerSVGElement, e.clientX, e.clientY)
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function rotatePointerMove(e) {
    if (!rotating) return
    const a = sceneAngle(e.currentTarget.ownerSVGElement, e.clientX, e.clientY)
    onrotate?.(rotateStartValue + (a - rotateStartAngle))
  }

  function rotatePointerUp(e) {
    if (!rotating) return
    rotating = false
    const a = sceneAngle(e.currentTarget.ownerSVGElement, e.clientX, e.clientY)
    onrotateend?.(rotateStartValue + (a - rotateStartAngle))
  }
</script>

<g transform="rotate({rotation} {cx} {cy})">
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
    ] as [hx, hy], i (i)}
      <rect
        x={hx - 3}
        y={hy - 3}
        width={6}
        height={6}
        fill="#DC143C"
        rx="1"
        style="pointer-events: none"
      />
    {/each}

    <!-- Rotation stem -->
    <line
      x1={cx} y1={d.y}
      x2={cx} y2={d.y - ROTATE_HANDLE_OFFSET}
      stroke="#DC143C" stroke-width="1"
      style="pointer-events: none"
    />

    <!-- Rotation handle: large transparent hit area + small visual dot -->
    <circle
      cx={cx}
      cy={d.y - ROTATE_HANDLE_OFFSET}
      r="14"
      fill="transparent"
      style="cursor: {ROTATE_CURSOR}; pointer-events: all"
      onpointerdown={rotatePointerDown}
      onpointermove={rotatePointerMove}
      onpointerup={rotatePointerUp}
    />
    <circle
      cx={cx}
      cy={d.y - ROTATE_HANDLE_OFFSET}
      r="6"
      fill="#DC143C"
      stroke="white"
      stroke-width="1.5"
      style="pointer-events: none"
    />
  {/if}
</g>
