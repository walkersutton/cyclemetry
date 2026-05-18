/**
 * Backend API — all calls go through Tauri invoke() to native Rust commands.
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

export const appBuildInfo = () => invoke('app_build_info')

// ─── Templates ────────────────────────────────────────────────────────────────

export const listTemplates = () => invoke('backend_list_templates')

export const getTemplate = (filename) =>
  invoke('backend_get_template', { filename })

export const saveTemplate = (filename, config) =>
  invoke('backend_save_template', { filename, config })

export const renameTemplate = (from, to) =>
  invoke('backend_rename_template', { from, to })

export const openTemplatesFolder = () => invoke('backend_open_templates')

// ─── Fonts ────────────────────────────────────────────────────────────────────

export const listFonts = () => invoke('backend_list_fonts')

export const importFont = (path) => invoke('backend_import_font', { path })

export const openActivitiesFolder = () => invoke('backend_open_activities')

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

export const deleteTemplate = (filename) =>
  invoke('backend_delete_template', { filename })

export const saveTemplatePreview = (filename, imageDataUrl) =>
  invoke('backend_save_template_preview', { filename, imageDataUrl })

// ─── Native Rust renderer ─────────────────────────────────────────────────────

export const nativeGenerateDemo = (
  config,
  gpxFilename,
  frameIndex,
  previewFps,
  targetWidth,
  targetHeight,
) =>
  invoke('native_demo', {
    config,
    gpxFilename,
    frameIndex,
    previewFps,
    targetWidth,
    targetHeight,
  })

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
