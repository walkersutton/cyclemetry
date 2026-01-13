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
 * Robust JSON stringify that handles cyclic structures
 */
function safeJsonStringify(obj) {
  try {
    return JSON.stringify(obj)
  } catch {
    // Only use cycle breaking if normal stringify fails
    const seen = new WeakSet()
    return JSON.stringify(obj, (key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return // Circular reference found
        }
        seen.add(value)
      }
      return value
    })
  }
}

/**
 * Helper to handle calls with fallback
 */
async function apiCall(
  method,
  tauriCmd,
  tauriArgs,
  fetchPath,
  fetchOptions = {},
) {
  const invoke = await getInvoke()

  // If in Tauri, try the Rust bridge (which uses Unix socket)
  if (invoke) {
    try {
      // Check if socket is ready on the Rust side
      const ready = await invoke('backend_socket_ready')
      if (ready) {
        console.log(`[Backend] Socket READY. Invoking: ${tauriCmd}`)
        try {
          const result = await invoke(tauriCmd, tauriArgs)
          return JSON.parse(result)
        } catch (invokeErr) {
          console.error(`[Backend] INVOKE FAILED for ${tauriCmd}:`, invokeErr)
          // Don't fall back to fetch if the socket COMMAND failed (the backend is reached but errored)
          throw invokeErr
        }
      } else {
        console.warn(
          `[Backend] Socket NOT READY for ${tauriCmd}. Backend might still be starting.`,
        )
        // In Tauri mode, we ONLY use the socket. Falling back to localhost:31337
        // will usually fail because the backend is in socket mode anyway.
        throw new Error(
          'Backend server is still starting or unreachable (socket not found)',
        )
      }
    } catch (e) {
      console.error(`[Backend] Tauri bridge error for ${tauriCmd}:`, e)
      // Normalize errors to standard Error objects
      if (typeof e === 'string') {
        throw new Error(e)
      }
      if (e instanceof Error) {
        throw e
      }
      throw new Error(e?.message || e?.toString() || 'Unknown Tauri error')
    }
  }

  // Fallback to fetch (Only for web development mode / non-Tauri)
  const baseUrl = 'http://localhost:31337'
  const url = fetchPath.startsWith('http')
    ? fetchPath
    : `${baseUrl}${fetchPath}`

  console.log(`[Backend] Web Fetch: ${method} ${url}`)
  try {
    const response = await fetch(url, {
      method,
      headers:
        fetchOptions.headers ||
        (method === 'POST' ? { 'Content-Type': 'application/json' } : {}),
      body: fetchOptions.body,
      signal: fetchOptions.signal,
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => '')
      throw new Error(errorText || `HTTP error! status: ${response.status}`)
    }

    return response.json()
  } catch (e) {
    console.error(`[Backend] Fetch to ${url} failed:`, e)
    // Normalize and add specific message about connection failure
    if (
      e.name === 'TypeError' &&
      (e.message === 'Load failed' || e.message === 'Failed to fetch')
    ) {
      throw new Error(
        'Could not connect to backend. Please ensure the server is running.',
      )
    }
    if (typeof e === 'string') {
      throw new Error(e)
    }
    if (e instanceof Error) {
      throw e
    }
    throw new Error(e?.message || e?.toString() || 'Unknown fetch error')
  }
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
export async function generateDemo(config, gpx_filename, second) {
  const safeConfig = safeJsonStringify(config)
  return apiCall(
    'POST',
    'backend_demo',
    {
      config: safeConfig,
      gpxFilename: gpx_filename,
      second,
    },
    '/api/demo',
    {
      body: safeJsonStringify({ config, gpx_filename, second }),
    },
  )
}

/**
 * Start video render
 */
export async function renderVideo(config, gpx_filename) {
  const safeConfig = safeJsonStringify(config)
  return apiCall(
    'POST',
    'backend_render',
    {
      config: safeConfig,
      gpxFilename: gpx_filename,
    },
    '/api/render-video',
    {
      body: safeJsonStringify({ config, gpx_filename }),
    },
  )
}

/**
 * Get render progress
 */
export async function getRenderProgress() {
  return apiCall('GET', 'backend_progress', {}, '/api/render-progress')
}

/**
 * Cancel current video render
 */
export async function cancelRender() {
  return apiCall('POST', 'backend_cancel', {}, '/api/cancel-render')
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
  return apiCall(
    'POST',
    'backend_open_video',
    { filename },
    '/api/open-video',
    {
      body: safeJsonStringify({ filename }),
    },
  )
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
 * Load GPX file from absolute path (Tauri native dialog)
 */
export async function loadGpxFromPath(path) {
  const invoke = await getInvoke()
  if (invoke) {
    try {
      const result = await invoke('backend_load_gpx', { path })
      return JSON.parse(result)
    } catch (e) {
      console.error('Tauri load_gpx failed:', e)
      throw e
    }
  }
  throw new Error('Native file loading only available in desktop app')
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
      console.warn(
        'Failed to fetch image data via Tauri, falling back to fetch',
        e,
      )
    }
  }

  // Fallback to fetch (TCP mode)
  return `http://localhost:31337/images/${filename}`
}

/**
 * List all available templates
 */
export async function listTemplates() {
  return apiCall('GET', 'backend_list_templates', {}, '/api/templates')
}

/**
 * Get template content
 */
export async function getTemplate(filename) {
  return apiCall(
    'GET',
    'backend_get_template',
    { filename },
    `/templates/${filename}`,
  )
}

/**
 * Save a template configuration
 */
export async function saveTemplate(filename, config) {
  const safeConfig = safeJsonStringify(config)
  return apiCall(
    'POST',
    'backend_save_template',
    {
      filename,
      config: safeConfig,
    },
    '/api/save-template',
    {
      body: safeJsonStringify({ filename, config }),
    },
  )
}

/**
 * Open the user templates folder
 */
export async function openTemplatesFolder() {
  return apiCall('POST', 'backend_open_templates', {}, '/api/open-templates')
}
