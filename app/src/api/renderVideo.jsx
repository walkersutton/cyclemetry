import useStore from '../store/useStore'

export default async function renderVideo() {
  try {
    const { gpxFilename, config, setRenderingVideo, setVideoFilename } =
      useStore.getState()

    // Validate we have required data
    if (!config || !config.scene) {
      throw new Error('No valid config available')
    }

    if (!gpxFilename) {
      throw new Error('No GPX file selected')
    }

    if (config.scene.start === undefined || config.scene.end === undefined) {
      throw new Error('Timeline start and end must be set')
    }

    if (config.scene.start >= config.scene.end) {
      throw new Error('Start time must be before end time')
    }

    setRenderingVideo(true)

    const payload = {
      config: config,
      gpx_filename: gpxFilename,
    }

    console.log('📤 Sending video render request:', {
      gpx: gpxFilename,
      start: config?.scene?.start,
      end: config?.scene?.end,
      duration: (config?.scene?.end || 0) - (config?.scene?.start || 0),
    })

    const response = await fetch('http://localhost:3001/api/render-video', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      let errorMessage = `Server error ${response.status}`
      try {
        const errorData = await response.json()
        errorMessage = errorData.error || errorMessage
      } catch {
        // If JSON parsing fails, try to get text
        try {
          const errorText = await response.text()
          errorMessage = errorText.substring(0, 200) // Limit error message length
        } catch {
          // Use default error message
        }
      }
      throw new Error(errorMessage)
    }

    let data
    try {
      data = await response.json()
    } catch {
      throw new Error('Invalid response from server - expected JSON')
    }

    const videoFilename = data.filename

    if (videoFilename) {
      setVideoFilename(videoFilename)

      // Tell backend to open the video in default player
      try {
        await fetch('http://localhost:3001/api/open-video', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: videoFilename }),
        })
      } catch (e) {
        console.error('Error calling open-video:', e)
      }

      return { success: true, filename: videoFilename }
    }

    throw new Error('No video filename returned')
  } catch (error) {
    console.error('Error in renderVideo:', error)
    throw error
  } finally {
    const { setRenderingVideo } = useStore.getState()
    setRenderingVideo(false)
  }
}
