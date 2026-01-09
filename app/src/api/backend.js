/**
 * Backend API module - handles communication with Python backend
 * Uses Tauri invoke() for Unix socket (production) or fetch() for development
 */

// Check if we're running in Tauri
const isTauri = () => typeof window.__TAURI__ !== 'undefined'

/**
 * Lazy import of Tauri invoke
 */
async function getInvoke() {
  if (!isTauri()) return null
  const { invoke } = await import('@tauri-apps/api/core')
  return invoke
}

/**
 * Helper to handle calls with fallback
 */
async function apiCall(method, tauriCmd, tauriArgs, fetchPath, fetchOptions = {}) {
  const invoke = await getInvoke()
  if (invoke) {
    try {
      // Check if socket is ready on the Rust side
      const ready = await invoke('backend_socket_ready')
      if (ready) {
        const result = await invoke(tauriCmd, tauriArgs)
        return JSON.parse(result)
      }
    } catch (e) {
      console.warn(`Tauri invoke ${tauriCmd} failed, falling back to fetch`, e)
    }
  }

  // Fallback to fetch (TCP mode)
  const baseUrl = 'http://localhost:31337'
  const url = fetchPath.startsWith('http') ? fetchPath : `${baseUrl}${fetchPath}`
  
  const response = await fetch(url, {
    method,
    headers: fetchOptions.headers || (method === 'POST' ? { 'Content-Type': 'application/json' } : {}),
    body: fetchOptions.body,
    signal: fetchOptions.signal
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => '')
    throw new Error(errorText || `HTTP error! status: ${response.status}`)
  }

  return response.json()
}

/**
 * Health check
 */
export async function healthCheck() {
  return apiCall('GET', 'backend_health', {}, '/api/health')
}

/**
 * Check if socket exists (fast check before health)
 */
export async function socketReady() {
  const invoke = await getInvoke()
  if (invoke) {
    try {
      return await invoke('backend_socket_ready')
    } catch {
      return false
    }
  }
  return false
}

/**
 * Generate demo preview frame
 */
export async function generateDemo(config, gpxFilename, second) {
  return apiCall('POST', 'backend_demo', {
    config: JSON.stringify(config),
    gpxFilename,
    second,
  }, '/api/demo', {
    body: JSON.stringify({ config, gpx_filename: gpxFilename, second })
  })
}

/**
 * Start video render
 */
export async function renderVideo(config, gpxFilename) {
  return apiCall('POST', 'backend_render', {
    config: JSON.stringify(config),
    gpxFilename,
  }, '/api/render-video', {
    body: JSON.stringify({ config, gpx_filename: gpxFilename })
  })
}

/**
 * Get render progress
 */
export async function getRenderProgress() {
  return apiCall('GET', 'backend_progress', {}, '/api/render-progress')
}

/**
 * Open downloads folder
 */
export async function openDownloads() {
  return apiCall('POST', 'backend_open_downloads', {}, '/api/open-downloads')
}

/**
 * Open video file
 */
export async function openVideo(filename) {
  return apiCall('POST', 'backend_open_video', { filename }, '/api/open-video', {
    body: JSON.stringify({ filename })
  })
}

/**
 * Upload GPX file
 */
export async function uploadGpx(file) {
  const invoke = await getInvoke()
  if (invoke) {
    try {
      const ready = await invoke('backend_socket_ready')
      if (ready) {
        const buffer = await file.arrayBuffer()
        const fileData = Array.from(new Uint8Array(buffer))
        const result = await invoke('backend_upload', {
          fileData,
          filename: file.name,
        })
        return JSON.parse(result)
      }
    } catch (e) {
      console.warn('Tauri upload failed, falling back to fetch', e)
    }
  }

  const formData = new FormData()
  formData.append('file', file)
  const response = await fetch('http://localhost:31337/upload', {
    method: 'POST',
    body: formData,
  })
  return response.json()
}

/**
 * Get image URL for a preview/video filename
 */
export async function getImageUrl(filename) {
  const invoke = await getInvoke()
  if (invoke) {
    try {
      const ready = await invoke('backend_socket_ready')
      if (ready) {
        // Fetch image data as base64 from the backend via Rust proxy
        return await invoke('backend_image_data', { filename })
      }
    } catch (e) {
      console.warn('Failed to fetch image data via Tauri, falling back to fetch', e)
    }
  }

  // Fallback to fetch (TCP mode)
  return `http://localhost:31337/images/${filename}`
}
