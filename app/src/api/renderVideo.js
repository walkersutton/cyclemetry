import * as backend from './backend.js'

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
      const iv = setInterval(async () => {
        try {
          const p = await backend.nativeGetProgress()
          const elapsed = (Date.now() - t0) / 1000
          const rate = elapsed > 0 ? p.frames_rendered / elapsed : 0
          const remaining =
            rate > 0
              ? Math.round((p.total_frames - p.frames_rendered) / rate)
              : null
          const pct =
            p.total_frames > 0
              ? Math.round((p.frames_rendered / p.total_frames) * 100)
              : 0
          state.renderProgress = {
            current: p.frames_rendered,
            total: p.total_frames,
            percent: pct,
            status: 'rendering',
            estimatedSecondsRemaining: remaining,
          }
          if (!p.is_running) {
            clearInterval(iv)
            if (p.error) reject(new Error(p.error))
            else resolve()
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
  }
}
