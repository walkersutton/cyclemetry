<script>
  /**
   * Draws base64 PNG frames to a canvas element.
   * The canvas always uses the scene's native pixel dimensions and is
   * CSS-scaled to fit its container, so the sibling SVG overlay aligns exactly.
   */
  let { frameDataUrl = null, sceneWidth = 1920, sceneHeight = 1080 } = $props()

  let canvasEl = $state(null)

  $effect(() => {
    if (!canvasEl || !frameDataUrl) return
    const ctx = canvasEl.getContext('2d')
    if (!ctx) return
    const img = new Image()
    img.onload = () => {
      ctx.clearRect(0, 0, sceneWidth, sceneHeight)
      ctx.drawImage(img, 0, 0)
    }
    img.src = frameDataUrl
  })
</script>

<canvas
  bind:this={canvasEl}
  width={sceneWidth}
  height={sceneHeight}
  style="display:block; width:100%; height:100%;"
></canvas>
