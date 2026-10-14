export function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v))
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
  if (handle === 'start') {
    return { field: 'start', value: clamp(next, 0, (currentEnd ?? t) - 1) }
  }
  return { field: 'end', value: clamp(next, (currentStart ?? 0) + 1, t) }
}

export function nudgeTrim({
  handle,
  currentStart,
  currentEnd,
  total,
  deltaSec,
}) {
  const t = Math.max(0.0001, total ?? 0)
  if (handle === 'start') {
    const next = (currentStart ?? 0) + deltaSec
    return { field: 'start', value: clamp(next, 0, (currentEnd ?? t) - 1) }
  }
  const next = (currentEnd ?? t) + deltaSec
  return { field: 'end', value: clamp(next, (currentStart ?? 0) + 1, t) }
}
