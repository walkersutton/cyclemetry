/**
 * Backend API — all calls go through Tauri invoke() to native Rust commands.
 */

// Cache the Tauri invoke function after the first successful import.
let _invoke = null
async function getInvoke() {
  if (_invoke) return _invoke
  if (typeof window.__TAURI__ === 'undefined') return null
  const { invoke } = await import('@tauri-apps/api/core')
  _invoke = invoke
  return _invoke
}

async function invoke(cmd, args = {}) {
  const fn = await getInvoke()
  if (!fn) throw new Error(`Tauri not available — cannot call ${cmd}`)
  const result = await fn(cmd, args)
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

export const appBuildInfo = () => invoke('app_build_info')

// ─── Templates ────────────────────────────────────────────────────────────────

export const listTemplates = () => invoke('backend_list_templates')

export const getTemplate = (filename) =>
  invoke('backend_get_template', { filename })

export const saveTemplate = (filename, config) =>
  invoke('backend_save_template', { filename, config })

export const openTemplatesFolder = () => invoke('backend_open_templates')

// ─── File system ──────────────────────────────────────────────────────────────

export const openDownloads = (dir) =>
  invoke('backend_open_downloads', { path: dir ?? null })

export const openVideo = (filename) =>
  invoke('backend_open_video', { filename })

// ─── GPX ─────────────────────────────────────────────────────────────────────

export const loadGpxFromPath = (path) => invoke('backend_load_gpx', { path })

export async function uploadGpx(file) {
  const buffer = await file.arrayBuffer()
  const fileData = Array.from(new Uint8Array(buffer))
  return invoke('backend_upload', { fileData, filename: file.name })
}

// ─── Community templates ──────────────────────────────────────────────────────

export const fetchCommunityTemplates = () =>
  invoke('backend_community_templates')

export const installCommunityTemplate = (id) =>
  invoke('backend_install_community_template', { id })

// ─── Native Rust renderer ─────────────────────────────────────────────────────

export const nativeGenerateDemo = (
  config,
  gpxFilename,
  frameIndex,
  previewFps,
) => invoke('native_demo', { config, gpxFilename, frameIndex, previewFps })

export const nativeStartRender = (
  config,
  gpxFilename,
  outputDir,
  targetWidth,
  targetHeight,
) =>
  invoke('native_render', {
    config,
    gpxFilename,
    outputDir: outputDir ?? null,
    targetWidth: targetWidth ?? null,
    targetHeight: targetHeight ?? null,
  })

export const nativeGetProgress = () => invoke('native_progress')

export const nativeCancelRender = () => invoke('native_cancel')

// ─── Recent GPX ──────────────────────────────────────────────────────────────

export const recordGpxOpened = (path) => invoke('record_gpx_opened', { path })
