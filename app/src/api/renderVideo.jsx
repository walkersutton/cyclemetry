import useStore from '../store/useStore'
import * as backend from './backend'

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

    console.log('📤 Sending video render request:', {
      gpx: gpxFilename,
      start: config?.scene?.start,
      end: config?.scene?.end,
      duration: (config?.scene?.end || 0) - (config?.scene?.start || 0),
    })

    const data = await backend.renderVideo(config, gpxFilename)

    if (data.error) {
      throw new Error(data.error)
    }

    const videoFilename = data.filename

    if (videoFilename) {
      setVideoFilename(videoFilename)

      // Tell backend to open the video in default player
      try {
        await backend.openVideo(videoFilename)
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
