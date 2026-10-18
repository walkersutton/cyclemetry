import * as backend from './backend.js'

/**
 * Load a GPX file (either a path string from the native dialog or a File object
 * from a web drag-and-drop). Returns duration and filename on success.
 * @param {string|File} fileOrPath
 * @param {object} state - app state object (for updating store)
 */
export default async function loadGpx(fileOrPath, state) {
  const isPath = typeof fileOrPath === 'string'
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

  const duration = result.duration_seconds
  if (!(duration > 0)) {
    throw new Error(
      'This activity file does not contain a usable timestamped timeline.',
    )
  }

  // The backend copies native dialog selections into Cyclemetry's uploads dir.
  // Persist the copied filename, not the original absolute path, so macOS does
  // not request Downloads/Desktop/Documents access again on the next launch.
  state.gpxFilename = result.filename ?? displayName
  state.gpxStartTime = result.start_time ?? null
  state.activityDuration = duration
  state.activityMetrics = result.valid_attributes ?? null
  state.hasSessionCalories = result.has_session_calories ?? false
  state.selectedSecond = 0
  if (state.config?.scene) {
    state.updateScene({ start: 0, end: duration })
  }

  return {
    filename: displayName,
    duration,
  }
}
