import * as backend from './backend.js'

/**
 * Load a GPX file (either a path string from the native dialog or a File object
 * from a web drag-and-drop). Returns duration and filename on success.
 * @param {string|File} fileOrPath
 * @param {object} state - app state object (for updating store)
 */
export default async function loadGpx(fileOrPath, state) {
  const isPath = typeof fileOrPath === 'string'
  // For native dialog paths: store the full absolute path so the Rust renderer
  // can resolve it directly. For browser File objects: store just the name
  // (the file is uploaded to the backend's upload dir and found by name).
  const storeValue = isPath ? fileOrPath : fileOrPath.name
  const displayName = isPath ? fileOrPath.split(/[\\/]/).pop() : fileOrPath.name

  console.log('📤 Loading GPX:', {
    source: isPath ? 'path' : 'file',
    displayName,
  })

  const result = isPath
    ? await backend.loadGpxFromPath(fileOrPath)
    : await backend.uploadGpx(fileOrPath)

  console.log('✅ GPX loaded:', result)

  if (result.error) {
    throw new Error(result.error)
  }

  state.gpxFilename = storeValue

  if (result.duration_seconds > 0) {
    state.activityDuration = result.duration_seconds
    state.selectedSecond = 0
    if (state.config?.scene) {
      state.updateScene({ start: 0, end: result.duration_seconds })
    }
  }

  return { filename: displayName, duration: result.duration_seconds }
}
