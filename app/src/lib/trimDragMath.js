export function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v))
}

export function clampTrim(handle, next, currentStart, currentEnd, total) {
  const t = Math.max(0.0001, total ?? 0)
  if (handle === 'start') {
    const maxStart = Math.max(0, (currentEnd ?? t) - 1)
    return { field: 'start', value: clamp(next, 0, maxStart) }
  }
  const minEnd = (currentStart ?? 0) + 1
  return { field: 'end', value: clamp(next, minEnd, t) }
}

export function computeTrimDrag({
  handle,
  initial,
  startX,
  clientX,
  trackWidth,
  total,
  currentStart,
  currentEnd,
}) {
  const w = trackWidth || 1
  const t = Math.max(0.0001, total ?? 0)
  const dxSec = ((clientX - startX) / w) * t
  const next = Math.round(initial + dxSec)
  return clampTrim(handle, next, currentStart, currentEnd, t)
}

export function nudgeTrim({
  handle,
  currentStart,
  currentEnd,
  total,
  deltaSec,
}) {
  const t = Math.max(0.0001, total ?? 0)
  const base = handle === 'start' ? (currentStart ?? 0) : (currentEnd ?? t)
  const next = base + deltaSec
  return clampTrim(handle, next, currentStart, currentEnd, t)
}

export function isTrimKey(key) {
  return (
    key === 'ArrowLeft' ||
    key === 'ArrowRight' ||
    key === 'ArrowUp' ||
    key === 'ArrowDown' ||
    key === 'Home' ||
    key === 'End'
  )
}

export function trimFromKey({ key, shiftKey, handle, start, end, total }) {
  const t = Math.max(0.0001, total ?? 0)
  const currentStart = start ?? 0
  const currentEnd = end ?? t

  if (key === 'Home') {
    return handle === 'start'
      ? { field: 'start', value: 0 }
      : { field: 'end', value: currentStart + 1 }
  }
  if (key === 'End') {
    return handle === 'start'
      ? { field: 'start', value: Math.max(0, currentEnd - 1) }
      : { field: 'end', value: t }
  }

  const delta = shiftKey ? 10 : 1
  let step = 0
  if (key === 'ArrowLeft' || key === 'ArrowDown') step = -delta
  else if (key === 'ArrowRight' || key === 'ArrowUp') step = delta
  else return null

  return nudgeTrim({
    handle,
    currentStart,
    currentEnd,
    total: t,
    deltaSec: step,
  })
}

export function resolveTrimHandle({
  handle,
  clientX,
  trackRect,
  start,
  end,
  total,
  thresholdPx = 16,
}) {
  if (!trackRect || trackRect.width <= 0) return handle
  const t = Math.max(0.0001, total ?? 0)
  const currentStart = start ?? 0
  const currentEnd = end ?? t
  const startPx = trackRect.left + (currentStart / t) * trackRect.width
  const endPx = trackRect.left + (currentEnd / t) * trackRect.width
  if (endPx - startPx < thresholdPx) {
    const midPx = (startPx + endPx) / 2
    return clientX <= midPx ? 'start' : 'end'
  }
  return handle
}
