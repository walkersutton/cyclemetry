import useStore from '../store/useStore'
import generateDemoFrame from './generateDemoFrame'
import * as backend from './backend'

export default async function saveFile(fileOrPath) {
  const { setGpxFilename } = useStore.getState()
  const isPath = typeof fileOrPath === 'string'
  const filename = isPath ? fileOrPath.split(/[\\/]/).pop() : fileOrPath.name

  console.log('📤 Starting GPX processing:', {
    source: isPath ? 'path' : 'file',
    filename,
  })

  try {
    console.log('📡 Sending request to backend...')
    const result = isPath
      ? await backend.loadGpxFromPath(fileOrPath)
      : await backend.uploadGpx(fileOrPath)

    console.log('✅ Upload successful:', result)

    if (result.error) {
      console.error('❌ Upload failed:', result.error)
      alert(`Failed to upload GPX file: ${result.error}`)
      return
    }

    // Update store with filename and duration
    const {
      setDummyDurationSeconds,
      setEndSecond,
      setStartSecond,
      setSelectedSecond,
    } = useStore.getState()

    setGpxFilename(filename)
    console.log('✅ GPX filename set in store:', filename)

    // Update duration if available
    if (result.duration_seconds && result.duration_seconds > 0) {
      console.log(
        '✅ Setting activity duration:',
        result.duration_seconds,
        'seconds',
      )
      setDummyDurationSeconds(result.duration_seconds)
      setStartSecond(0)
      setEndSecond(result.duration_seconds)
      setSelectedSecond(0)
    } else {
      console.warn('⚠️ No duration data from backend')
    }

    // Trigger demo generation if we have a config
    const { config, setConfig } = useStore.getState()
    if (config) {
      console.log(
        '✅ Config exists, updating timeline and generating demo frame after GPX upload',
      )

      // Update config with new timeline values
      if (result.duration_seconds && result.duration_seconds > 0) {
        const updatedConfig = {
          ...config,
          scene: {
            ...config.scene,
            start: 0,
            end: result.duration_seconds,
          },
        }
        setConfig(updatedConfig)
      }

      await generateDemoFrame()
    } else {
      console.log('⚠️ No config yet, skipping demo generation')
    }
  } catch (error) {
    console.error('❌ GPX upload error:', {
      message: error.message,
      stack: error.stack,
    })
    alert(`Error uploading GPX file: ${error.message}`)
  }
}
