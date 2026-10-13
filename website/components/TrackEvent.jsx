'use client'

import { useEffect } from 'react'

/**
 * Sends a custom event to the stats server once, with the current path. The
 * stats script loads after hydration, so this waits briefly for it rather than
 * dropping the event; visitors it never loads for (Do Not Track, GPC) aren't
 * counted either way.
 */
export default function TrackEvent({ name }) {
  useEffect(() => {
    if (typeof window.stats === 'function') {
      window.stats(name)
      return
    }
    let attempts = 0
    const timer = window.setInterval(() => {
      attempts += 1
      if (typeof window.stats === 'function') {
        window.stats(name)
        window.clearInterval(timer)
      } else if (attempts > 20) {
        window.clearInterval(timer)
      }
    }, 250)
    return () => window.clearInterval(timer)
  }, [name])

  return null
}
