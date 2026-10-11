/**
 * Backend API — all calls go through Tauri invoke() to native Rust commands.
 */

// ─── Response types ───────────────────────────────────────────────────────────

/**
 * @typedef {Object} TemplateListItem
 * @property {string} id - filename, e.g. "my_template.json"
 * @property {string} name - display name
 * @property {'user'|'community'|'community-modified'} type
 * @property {string|null} preview_url
 */

/**
 * @typedef {Object} RenderProgress
 * @property {number} frames_rendered
 * @property {number} total_frames
 * @property {number} fraction - 0–1
 * @property {boolean} is_running
 * @property {string|null} error
 */

/**
 * @typedef {Object} ElementBounds
 * @property {string} id
 * @property {number} x
 * @property {number} y
 * @property {number} w
 * @property {number} h
 */

/**
 * @typedef {Object} DemoFrame
 * @property {string} image - data:image/png;base64,… PNG of the rendered frame
 * @property {ElementBounds[]} elements
 * @property {string|null} warning
 */

/**
 * @typedef {Object} RenderStarted
 * @property {'started'} status
 * @property {string} output_path
 */

/**
 * @typedef {Object} DistanceInfo
 * @property {number} total_m - total activity distance in metres
 * @property {number} overlay_start_m - distance at overlay start in metres
 * @property {number} overlay_end_m - distance at overlay end in metres
 */

/**
 * @typedef {Object} MetricRange
 * @property {string} metric
 * @property {number} min
 * @property {number} max
 */

import { invoke as tauriInvoke } from '@tauri-apps/api/core'

async function invoke(cmd, args = {}) {
  const result = await tauriInvoke(cmd, args)
  // Commands that return JSON strings need parsing; typed returns pass through as-is.
  if (typeof result === 'string') {
    try {
      return JSON.parse(result)
    } catch {
      return result
    }
  }
  return result
}

// ─── Build info ───────────────────────────────────────────────────────────────

/** @returns {Promise<string>} */
export const appBuildInfo = () => invoke('app_build_info')

// ─── Templates ────────────────────────────────────────────────────────────────

/** @returns {Promise<TemplateListItem[]>} */
export const listTemplates = () => invoke('backend_list_templates')

/**
 * @param {string} filename
 * @returns {Promise<import('./elementTypes.js').Template>}
 */
export const getTemplate = (filename) =>
  invoke('backend_get_template', { filename })

/**
 * @param {string} filename
 * @param {import('./elementTypes.js').Template} config
 * @returns {Promise<void>}
 */
export const saveTemplate = (filename, config) =>
  invoke('backend_save_template', { filename, config })

/**
 * @param {string} path
 * @returns {Promise<{filename: string}>}
 */
export const importTemplate = (path) =>
  invoke('backend_import_template', { path })

/** @returns {Promise<void>} */
export const openTemplatesFolder = () => invoke('backend_open_templates')

/**
 * Generate or edit a template from a natural-language prompt. The OpenRouter
 * API key lives on the hosted proxy, never in the app. Pass `currentTemplate`
 * to edit it in place; omit it to create a new template.
 * @param {string} prompt
 * @param {import('./elementTypes.js').Template} [currentTemplate]
 * @returns {Promise<import('./elementTypes.js').Template>}
 */
export const generateTemplate = (prompt, currentTemplate) =>
  invoke('backend_generate_template', {
    prompt,
    currentTemplate: currentTemplate ?? null,
  })

// ─── Fonts ────────────────────────────────────────────────────────────────────

/**
 * @typedef {{ value: string, label: string, source: 'bundled' | 'custom' | 'system' }} FontItem
 */

/** @returns {Promise<FontItem[]>} */
export const listFonts = () => invoke('backend_list_fonts')

/**
 * @param {string} path
 * @returns {Promise<FontItem[]>}
 */
export const importFont = (path) => invoke('backend_import_font', { path })

/** @returns {Promise<void>} */
export const openActivitiesFolder = () => invoke('backend_open_activities')

// ─── File system ──────────────────────────────────────────────────────────────

/**
 * @param {string} [dir]
 * @returns {Promise<void>}
 */
export const openDownloads = (dir) =>
  invoke('backend_open_downloads', { path: dir ?? null })

/** @returns {Promise<string>} */
export const defaultOutputDir = () => invoke('backend_default_output_dir')

/**
 * Free space on the volume holding the render output directory.
 * `free_bytes` is null when the platform query fails.
 * @param {string} [dir]
 * @returns {Promise<{dir: string, free_bytes: number|null}>}
 */
export const diskFree = (dir) =>
  invoke('backend_disk_free', { outputDir: dir ?? null })

/**
 * @param {string} filename
 * @returns {Promise<void>}
 */
export const openVideo = (filename) =>
  invoke('backend_open_video', { filename })

/**
 * @param {string} path
 * @returns {Promise<{bytes: number}>}
 */
export const fileSize = (path) => invoke('backend_file_size', { path })

// ─── GPX ─────────────────────────────────────────────────────────────────────

/**
 * @param {string} path
 * @returns {Promise<string>} gpx filename stored in the uploads dir
 */
export const loadGpxFromPath = (path) => invoke('backend_load_gpx', { path })

/**
 * @typedef {Object} SavedActivity
 * @property {string} filename
 * @property {number} start_ms - activity's start time as unix epoch ms
 *   (falls back to the file mtime when the activity has no usable timestamp)
 */

/** @returns {Promise<SavedActivity[]>} newest first */
export const listActivities = () => invoke('backend_list_activities')

/**
 * Load a previously saved activity by its filename in the uploads dir.
 * @param {string} filename
 * @returns {Promise<string>}
 */
export const loadSavedActivity = (filename) =>
  invoke('backend_load_saved_activity', { filename })

/**
 * @param {string} filename
 * @returns {Promise<void>}
 */
export const deleteActivity = (filename) =>
  invoke('backend_delete_activity', { filename })

export const devClearCache = () => invoke('backend_dev_clear_cache')

/**
 * @param {string} gpxFilename
 * @param {number} sceneStart
 * @param {number} sceneEnd
 * @returns {Promise<DistanceInfo>}
 */
export const getActivityDistanceInfo = (gpxFilename, sceneStart, sceneEnd) =>
  invoke('backend_activity_distance_info', {
    gpxFilename,
    sceneStart,
    sceneEnd,
  })

/**
 * Returns the Unix timestamp (ms) of the first GPS sample, or null if the
 * file has no timestamps. Used to compute the correct DST offset for a
 * named timezone.
 * @param {string} gpxFilename
 * @returns {Promise<number|null>}
 */
export const getActivityStartTimeMs = (gpxFilename) =>
  invoke('backend_activity_start_time_ms', { gpxFilename })

/**
 * @param {string} gpxFilename
 * @param {string} metric
 * @param {string} [unit]
 * @param {number} sceneStart
 * @param {number} sceneEnd
 * @param {number|null} [riderWeightKg] — rider weight in kg for the W/kg metric
 * @returns {Promise<MetricRange>}
 */
export const getActivityMetricRange = (
  gpxFilename,
  metric,
  unit,
  sceneStart,
  sceneEnd,
  riderWeightKg,
) =>
  invoke('backend_activity_metric_range', {
    gpxFilename,
    metric,
    unit: unit ?? null,
    sceneStart,
    sceneEnd,
    riderWeightKg: riderWeightKg ?? null,
  })

/**
 * @typedef {Object} VideoProbe
 * @property {string} path - absolute path on disk
 * @property {number|null} duration - seconds
 * @property {string|null} creation_time - ISO 8601 from container metadata
 * @property {string|null} codec - e.g. "h264", "hevc", "prores"
 * @property {number} width
 * @property {number} height
 */

/**
 * @param {string} path - absolute path to the video file
 * @returns {Promise<VideoProbe>}
 */
export const probeVideo = (path) => invoke('probe_video', { path })

/** @returns {Promise<string>} HTTP URL for streaming the video file */
export const videoSrcUrl = (path) => invoke('video_src_url', { path })

/**
 * @param {File} file
 * @returns {Promise<string>} stored gpx filename
 */
export async function uploadGpx(file) {
  const buffer = await file.arrayBuffer()
  const fileData = Array.from(new Uint8Array(buffer))
  return invoke('backend_upload', { fileData, filename: file.name })
}

// ─── Community templates ──────────────────────────────────────────────────────

/** @returns {Promise<TemplateListItem[]>} */
export const fetchCommunityTemplates = () =>
  invoke('backend_community_templates')

/**
 * @param {string} id
 * @returns {Promise<void>}
 */
export const installCommunityTemplate = (id) =>
  invoke('backend_install_community_template', { id })

/**
 * @param {string} filename
 * @returns {Promise<void>}
 */
export const deleteTemplate = (filename) =>
  invoke('backend_delete_template', { filename })

/**
 * Dev only: overwrite the repo's community template JSON with the current user copy.
 * @param {string} filename
 * @returns {Promise<void>}
 */
export const overwriteCommunityTemplate = (filename) =>
  invoke('backend_overwrite_community_template', { filename })

/**
 * @param {string} filename
 * @param {string} imageDataUrl
 * @returns {Promise<void>}
 */
export const saveTemplatePreview = (filename, imageDataUrl) =>
  invoke('backend_save_template_preview', { filename, imageDataUrl })

/**
 * @param {string} title
 * @param {string} body
 * @returns {Promise<void>}
 */
export const reportIssue = (title, body) =>
  invoke('backend_report_issue', { title, body })

// ─── Native Rust renderer ─────────────────────────────────────────────────────

/**
 * @param {import('./elementTypes.js').Template} config
 * @param {string} gpxFilename
 * @param {number} frameIndex
 * @param {number} previewFps
 * @param {number} [targetWidth]
 * @param {number} [targetHeight]
 * @param {number|null} [riderWeightKg] — rider weight in kg for the W/kg metric
 * @returns {Promise<DemoFrame>}
 */
export const nativeGenerateDemo = (
  config,
  gpxFilename,
  frameIndex,
  previewFps,
  targetWidth,
  targetHeight,
  riderWeightKg,
) =>
  invoke('native_demo', {
    config,
    gpxFilename,
    frameIndex,
    previewFps,
    targetWidth,
    targetHeight,
    riderWeightKg: riderWeightKg ?? null,
  })

/**
 * Zoomed-preview crop: supersample just the visible window of the scene so text
 * stays crisp at any zoom. `targetWidth`/`targetHeight` must match the base
 * frame's dims (they key the shared render cache, so no rebuild on zoom/pan).
 * `view*` are in base-scene pixel coords; `viewOutW/H` are the device pixels to
 * render that window into. Returns a DemoFrame whose `image` is the crop.
 *
 * @param {import('./elementTypes.js').Template} config
 * @param {string} gpxFilename
 * @param {number} frameIndex
 * @param {number} previewFps
 * @param {number} targetWidth
 * @param {number} targetHeight
 * @param {number} viewX
 * @param {number} viewY
 * @param {number} viewW
 * @param {number} viewH
 * @param {number} viewOutW
 * @param {number} viewOutH
 * @param {number|null} [riderWeightKg] — rider weight in kg for the W/kg metric
 * @returns {Promise<DemoFrame>}
 */
export const nativeGenerateDemoCrop = (
  config,
  gpxFilename,
  frameIndex,
  previewFps,
  targetWidth,
  targetHeight,
  viewX,
  viewY,
  viewW,
  viewH,
  viewOutW,
  viewOutH,
  riderWeightKg,
) =>
  invoke('native_demo', {
    config,
    gpxFilename,
    frameIndex,
    previewFps,
    targetWidth,
    targetHeight,
    viewX,
    viewY,
    viewW,
    viewH,
    viewOutW,
    viewOutH,
    riderWeightKg: riderWeightKg ?? null,
  })

/**
 * @param {import('./elementTypes.js').Template} config
 * @param {string} gpxFilename
 * @param {string} [outputDir]
 * @param {number} [targetWidth]
 * @param {number} [targetHeight]
 * @param {'prores' | 'qtrle' | 'stitched'} [exportFormat]
 * @param {{videoPath: string, videoIn: number}} [stitch] — source footage for
 *   a stitched export; videoIn is seconds into the footage where the overlay's
 *   first frame lands
 * @param {number|null} [riderWeightKg] — rider weight in kg for the W/kg metric
 * @returns {Promise<RenderStarted>}
 */
export const nativeStartRender = (
  config,
  gpxFilename,
  outputDir,
  targetWidth,
  targetHeight,
  exportFormat,
  stitch,
  riderWeightKg,
  fullFrame,
) =>
  invoke('native_render', {
    config,
    gpxFilename,
    outputDir: outputDir ?? null,
    targetWidth: targetWidth ?? null,
    targetHeight: targetHeight ?? null,
    exportFormat: exportFormat ?? null,
    stitchVideoPath: stitch?.videoPath ?? null,
    stitchVideoIn: stitch?.videoIn ?? null,
    fullFrame: fullFrame ?? false,
    riderWeightKg: riderWeightKg ?? null,
  })

/** @returns {Promise<RenderProgress>} */
export const nativeGetProgress = () => invoke('native_progress')

/** @returns {Promise<void>} */
export const nativeCancelRender = () => invoke('native_cancel')

/**
 * @param {import('./elementTypes.js').Template} config
 * @param {string} gpxFilename
 * @param {number} frames
 * @param {number} [targetWidth]
 * @param {number} [targetHeight]
 * @returns {Promise<unknown>}
 */
export const nativeBenchmark = (
  config,
  gpxFilename,
  frames,
  targetWidth,
  targetHeight,
) =>
  invoke('native_benchmark', {
    config,
    gpxFilename,
    frames,
    targetWidth: targetWidth ?? null,
    targetHeight: targetHeight ?? null,
  })

/**
 * Short real export (render + FFmpeg encode) of the first few timeline
 * seconds to a throwaway file — measures wall time and encoded size so
 * time/size estimates reflect this machine and codec.
 * @param {import('./elementTypes.js').Template} config
 * @param {string} gpxFilename
 * @param {'prores' | 'qtrle'} exportFormat
 * @param {number} [seconds]
 * @param {number} [targetWidth]
 * @param {number} [targetHeight]
 * @returns {Promise<{frames: number, elapsed_ms: number, bytes: number}>}
 */
export const nativeCalibrateExport = (
  config,
  gpxFilename,
  exportFormat,
  seconds,
  targetWidth,
  targetHeight,
) =>
  invoke('native_calibrate_export', {
    config,
    gpxFilename,
    exportFormat,
    seconds: seconds ?? null,
    targetWidth: targetWidth ?? null,
    targetHeight: targetHeight ?? null,
  })

// ─── Assets ──────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} AssetItem
 * @property {string} name - filename e.g. "bolt.svg"
 * @property {string} data_url - base64 data URL for the image
 */

/** @returns {Promise<AssetItem[]>} */
export const listAssets = () => invoke('backend_list_assets')

/**
 * @param {string} path - absolute path to source file on disk
 * @returns {Promise<string>} filename stored in user assets dir
 */
export const importAsset = (path) => invoke('backend_import_asset', { path })

/**
 * @param {string} filename - asset filename (e.g. "bolt.svg")
 * @returns {Promise<{width: number, height: number}>}
 */
export const imageSize = (filename) =>
  invoke('backend_image_size', { filename })

// ─── Recent GPX ──────────────────────────────────────────────────────────────

/**
 * @param {string} path
 * @returns {Promise<void>}
 */
export const recordGpxOpened = (path) => invoke('record_gpx_opened', { path })
