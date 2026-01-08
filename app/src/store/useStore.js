import { create } from 'zustand'

// Flags to prevent circular updates
let isUpdatingFromConfig = false
let isUpdatingFromTimeline = false

const useStore = create((set, get) => ({
  communityTemplateFilename: null,
  loadedTemplateFilename: null,
  editor: null,
  generatingImage: false,
  renderingVideo: false,
  errorMessage: null, // For displaying user-friendly errors
  imageFilename: localStorage.getItem('imageFilename') || null,
  videoFilename: localStorage.getItem('videoFilename') || null,
  gpxFilename: localStorage.getItem('gpxFilename') || null,
  renderProgress: {
    current: 0,
    total: 0,
    percent: 0,
    status: 'idle',
    message: '',
    estimatedSecondsRemaining: null,
  },

  // Slider states - load from localStorage if available
  dummyDurationSeconds: (() => {
    const saved = localStorage.getItem('dummyDurationSeconds')
    return saved ? parseInt(saved, 10) : 73
  })(),
  startSecond: (() => {
    const saved = localStorage.getItem('startSecond')
    return saved ? parseInt(saved, 10) : 0
  })(),
  endSecond: (() => {
    const saved = localStorage.getItem('endSecond')
    return saved ? parseInt(saved, 10) : 73
  })(),
  selectedSecond: (() => {
    const saved = localStorage.getItem('selectedSecond')
    return saved ? parseInt(saved, 10) : 0
  })(),

  config: (() => {
    const savedConfig = localStorage.getItem('editorConfig')
    if (savedConfig) {
      try {
        return JSON.parse(savedConfig)
      } catch {
        console.warn('Failed to parse saved config, using null')
      }
    }
    // Start with null - user must select a template
    return null
  })(), // This will hold the editor config
  setConfig: (val) => {
    localStorage.setItem('editorConfig', JSON.stringify(val))

    // Set flag to prevent timeline setters from updating config
    isUpdatingFromConfig = true

    const currentState = get()

    // Preserve existing timeline values if they exist
    // Only use config values if we don't have timeline values yet
    const updates = { config: val }

    if (val.scene) {
      // Only update timeline if we don't have values yet (initial load)
      const hasExistingTimeline =
        currentState.startSecond !== 0 ||
        currentState.endSecond !== currentState.dummyDurationSeconds

      if (!hasExistingTimeline) {
        // Use config values for timeline
        if (val.scene.start !== undefined) {
          updates.startSecond = val.scene.start
        }
        if (val.scene.end !== undefined) {
          updates.endSecond = val.scene.end
          updates.dummyDurationSeconds = val.scene.end
        }
        if (val.scene.start !== undefined) {
          updates.selectedSecond = val.scene.start
        }
      } else {
        // User has edited start/end in the editor - update timeline to match
        if (
          val.scene.start !== undefined &&
          val.scene.start !== currentState.startSecond
        ) {
          updates.startSecond = val.scene.start
          localStorage.setItem('startSecond', val.scene.start.toString())
        }
        if (
          val.scene.end !== undefined &&
          val.scene.end !== currentState.endSecond
        ) {
          updates.endSecond = val.scene.end
          updates.dummyDurationSeconds = val.scene.end
          localStorage.setItem('endSecond', val.scene.end.toString())
          localStorage.setItem('dummyDurationSeconds', val.scene.end.toString())
        }
      }
    }

    set(updates)

    // Reset flag after a short delay
    setTimeout(() => {
      isUpdatingFromConfig = false
    }, 100)
  },

  setGeneratingImage: (generating) => set({ generatingImage: generating }),
  setRenderingVideo: (rendering) => set({ renderingVideo: rendering }),
  setRenderProgress: (progress) => {
    const percent =
      progress.total > 0
        ? Math.round((progress.current / progress.total) * 100)
        : 0
    set({ renderProgress: { ...progress, percent } })
  },
  setErrorMessage: (message) => set({ errorMessage: message }),
  clearError: () => set({ errorMessage: null }),

  setDummyDurationSeconds: (duration) => {
    localStorage.setItem('dummyDurationSeconds', duration.toString())
    set({ dummyDurationSeconds: duration })
  },

  setStartSecond: (second) => {
    localStorage.setItem('startSecond', second.toString())

    const state = get()
    const updates = { startSecond: second }

    // Always update config to match, unless we're in the middle of loading config
    if (!isUpdatingFromConfig && state.config && state.config.scene) {
      const newConfig = JSON.parse(JSON.stringify(state.config)) // Deep clone
      newConfig.scene.start = second
      updates.config = newConfig
      localStorage.setItem('editorConfig', JSON.stringify(newConfig))

      // Don't update editor during drag - it will be updated when drag ends
      // This prevents the editor from being updated on every pixel of drag
    } else if (isUpdatingFromConfig) {
      // Skip config update while loading from config
    } else {
      console.warn('⚠️ No scene in config, cannot update start')
    }

    set(updates)
  },

  setEndSecond: (second) => {
    localStorage.setItem('endSecond', second.toString())

    const state = get()
    const updates = { endSecond: second }

    // Always update config to match, unless we're in the middle of loading config
    if (!isUpdatingFromConfig && state.config && state.config.scene) {
      const newConfig = JSON.parse(JSON.stringify(state.config)) // Deep clone
      newConfig.scene.end = second
      updates.config = newConfig
      localStorage.setItem('editorConfig', JSON.stringify(newConfig))

      // Don't update editor during drag - it will be updated when drag ends
      // This prevents the editor from being updated on every pixel of drag
    } else if (isUpdatingFromConfig) {
      // Skip config update while loading from config
    } else {
      console.warn('⚠️ No scene in config, cannot update end')
    }

    set(updates)
  },

  setSelectedSecond: (second) => {
    localStorage.setItem('selectedSecond', second.toString())
    set({ selectedSecond: second })
  },

  setImageFilename: (filename) => {
    // Prefix with backend URL if just a filename
    const fullUrl =
      filename && !filename.startsWith('http')
        ? `http://localhost:3001/images/${filename}`
        : filename
    localStorage.setItem('imageFilename', fullUrl)
    set({ imageFilename: fullUrl })
  },

  setVideoFilename: (filename) => {
    localStorage.setItem('videoFilename', filename)
    set({ videoFilename: filename })
  },

  setGpxFilename: async (filename) => {
    localStorage.setItem('gpxFilename', filename)
    set({ gpxFilename: filename })
    // Only attempt to fetch local file contents for actual .gpx files
    const isLikelyGpx =
      typeof filename === 'string' &&
      (filename.endsWith('.gpx') || filename.startsWith('http'))
    if (!isLikelyGpx) return
    try {
      const response = await fetch(filename)
      const fileBlob = await response.blob()
      const reader = new FileReader()
      reader.onloadend = () => {
        // const base64String = reader.result.split(',')[1]
        // localStorage.setItem("gpxFilestring", base64String);
        // set({ gpxFilestring: base64String });
      }
      reader.readAsDataURL(fileBlob)
    } catch {
      console.warn(
        'setGpxFilename: could not fetch GPX file contents (expected for demo)',
      )
    }
  },

  setGpxFilenameFromFile: (file) => {
    if (file) {
      set({ gpxFilename: file['name'] })
    } else {
      set({ gpxFilename: null })
    }
  },

  setLoadedTemplateFilename: (filename) => {
    set({ communityTemplateFilename: null, loadedTemplateFilename: filename })
  },

  setEditor: (editor) => set({ editor }),

  SelectCommunityTemplateFilename: async (filename) => {
    set({
      loadedTemplateFilename: null,
      communityTemplateFilename: filename,
    })

    if (!filename) return

    try {
      const url = `/templates/${filename}`
      const response = await fetch(url)

      if (!response.ok) {
        console.error(
          'SelectCommunityTemplateButton: network response was bad',
          response.status,
        )
        throw new Error(`Network response was not ok: ${response.status}`)
      }

      const data = await response.json()

      const editor = get().editor
      const setConfig = get().setConfig
      const state = get()

      // If no GPX file is loaded, automatically load the demo
      if (!state.gpxFilename) {
        // No GPX file loaded, automatically load demo
        const {
          setGpxFilename,
          setDummyDurationSeconds,
          setStartSecond,
          setEndSecond,
          setSelectedSecond,
        } = get()
        setGpxFilename('demo.gpxinit')
        const demoDuration = 7946 // seward.gpx duration
        setDummyDurationSeconds(demoDuration)
        setStartSecond(0)
        setEndSecond(demoDuration)
        setSelectedSecond(0)
      } else {
        // GPX file already loaded
      }

      // Always update the config in the store
      setConfig(data)

      if (editor) {
        // Update the editor UI - this will trigger the change event
        // which will call generateDemoFrame
        editor.setValue(data)
      } else {
        console.warn(
          '⚠️ Editor is not set in store, generating demo frame directly',
        )
        // If editor isn't ready yet, manually trigger demo frame generation
        const generateDemoFrame = (await import('../api/generateDemoFrame.jsx'))
          .default
        await generateDemoFrame(data)
      }
    } catch (error) {
      console.error('Error with community templates:', error)
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        filename: filename,
      })
      alert(`Failed to load template: ${error.message}`)
    }
  },
}))

// Export function to check if we're updating from timeline
export const isUpdatingFromTimelineFlag = () => isUpdatingFromTimeline

export default useStore
