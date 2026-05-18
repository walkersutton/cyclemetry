import * as backend from './backend.js'

const ETA_REANCHOR_MS = 30_000
const ETA_MIN_SAMPLE_SECONDS = 5
const ETA_MAX_UPWARD_ADJUST_SECONDS = 15

export default async function renderVideo(state) {
  const { config, gpxFilename, outputDir, outputWidth, outputHeight } = state
  if (!config?.scene) throw new Error('No valid config available')
  if (!gpxFilename) throw new Error('No GPX file selected')
  const start = config.scene.start ?? 0
  const end = config.scene.end ?? state.activityDuration
  if (start >= end)
    throw new Error(
      `Timeline start (${start}s) must be less than end (${end}s) — fix the timeline range before rendering`,
    )

  const fps = config.scene.fps ?? 30

  state.renderProgress = {
    current: 0,
    total: 0,
    percent: 0,
    status: 'starting',
    estimatedSecondsRemaining: null,
    overlaySecondsRendered: 0,
    overlayTotalSeconds: 0,
  }
  state.renderingVideo = true

  try {
    const startData = await backend.nativeStartRender(
      config,
      gpxFilename,
      outputDir,
      outputWidth,
      outputHeight,
    )
    const outputPath = startData.output_path

    await new Promise((resolve, reject) => {
      const t0 = Date.now()
      let etaAnchorRemaining = null
      let etaAnchorAt = null
      let etaLastReanchorAt = 0

      function currentEta(now) {
        if (etaAnchorRemaining == null || etaAnchorAt == null) return null
        return Math.max(
          0,
          Math.round(etaAnchorRemaining - (now - etaAnchorAt) / 1000),
        )
      }

      function reanchorEta(rawRemaining, now) {
        const shown = currentEta(now)
        let next = rawRemaining

        if (shown != null) {
          if (rawRemaining > shown) {
            next = Math.min(
              shown + ETA_MAX_UPWARD_ADJUST_SECONDS,
              Math.round(shown * 0.8 + rawRemaining * 0.2),
            )
          } else {
            next = Math.round(shown * 0.35 + rawRemaining * 0.65)
          }
        }

        etaAnchorRemaining = next
        etaAnchorAt = now
        etaLastReanchorAt = now
      }

      const iv = setInterval(async () => {
        try {
          const now = Date.now()
          const p = await backend.nativeGetProgress()
          const elapsed = (now - t0) / 1000
          const rate = elapsed > 0 ? p.frames_rendered / elapsed : 0
          const rawRemaining =
            elapsed >= ETA_MIN_SAMPLE_SECONDS && rate > 0
              ? Math.round((p.total_frames - p.frames_rendered) / rate)
              : null
          if (
            rawRemaining != null &&
            (etaAnchorRemaining == null ||
              now - etaLastReanchorAt >= ETA_REANCHOR_MS)
          ) {
            reanchorEta(rawRemaining, now)
          }
          const pct =
            p.total_frames > 0
              ? Math.round((p.frames_rendered / p.total_frames) * 100)
              : 0
          state.renderProgress = {
            current: p.frames_rendered,
            total: p.total_frames,
            percent: pct,
            status: 'rendering',
            estimatedSecondsRemaining: currentEta(now),
            // Overlay timeline position (NOT wall-clock): how much of the
            // overlay's own duration has been rendered, so the user can sanity
            // -check the render length while it runs.
            overlaySecondsRendered: p.frames_rendered / fps,
            overlayTotalSeconds: p.total_frames / fps,
          }
          if (!p.is_running) {
            clearInterval(iv)
            if (p.error) reject(new Error(p.error))
            else {
              if (p.frames_rendered > 0 && elapsed > 0) {
                const fps = p.frames_rendered / elapsed
                state.lastRenderFps = fps
                localStorage.setItem('lastRenderFps', fps.toFixed(4))
              }
              resolve()
            }
          }
        } catch (err) {
          clearInterval(iv)
          reject(err)
        }
      }, 200)
    })

    try {
      await backend.openVideo(outputPath)
    } catch {
      /* open is best-effort */
    }
    return { success: true, filename: outputPath }
  } catch (error) {
    if (error.message?.toLowerCase().includes('cancelled')) {
      return { success: false, cancelled: true }
    }
    throw error
  } finally {
    state.renderingVideo = false
    state.renderProgress = {
      current: 0,
      total: 0,
      percent: 0,
      status: 'idle',
      estimatedSecondsRemaining: null,
      overlaySecondsRendered: 0,
      overlayTotalSeconds: 0,
    }
  }
}
