import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  clamp,
  clampTrim,
  computeTrimDrag,
  isTrimKey,
  nudgeTrim,
  resolveTrimHandle,
  trimFromKey,
} from './trimDragMath.js'

describe('clamp', () => {
  it('bounds values within [lo, hi]', () => {
    assert.equal(clamp(5, 0, 10), 5)
    assert.equal(clamp(-5, 0, 10), 0)
    assert.equal(clamp(15, 0, 10), 10)
  })
})

describe('clampTrim', () => {
  it('clamps start handle between 0 and currentEnd - 1', () => {
    assert.deepEqual(clampTrim('start', 50, 10, 30, 100), {
      field: 'start',
      value: 29,
    })
    assert.deepEqual(clampTrim('start', -10, 10, 30, 100), {
      field: 'start',
      value: 0,
    })
  })

  it('clamps end handle between currentStart + 1 and exact fractional total', () => {
    assert.deepEqual(clampTrim('end', 3610, 10, 100, 3600.6), {
      field: 'end',
      value: 3600.6,
    })
    assert.deepEqual(clampTrim('end', 3610, 10, 100, 3600.4), {
      field: 'end',
      value: 3600.4,
    })
    assert.deepEqual(clampTrim('end', 5, 20, 100, 3600.6), {
      field: 'end',
      value: 21,
    })
  })
})

describe('computeTrimDrag', () => {
  it('computes forward drag for start handle clamped to currentEnd - 1', () => {
    const res = computeTrimDrag({
      handle: 'start',
      initial: 10,
      startX: 100,
      clientX: 200,
      trackWidth: 100,
      total: 100,
      currentStart: 10,
      currentEnd: 50,
    })
    // dxSec = ((200 - 100) / 100) * 100 = 100 -> next = 110, clamped to 49
    assert.deepEqual(res, { field: 'start', value: 49 })
  })

  it('computes backward drag for start handle clamped to 0', () => {
    const res = computeTrimDrag({
      handle: 'start',
      initial: 10,
      startX: 100,
      clientX: 50,
      trackWidth: 100,
      total: 100,
      currentStart: 10,
      currentEnd: 50,
    })
    assert.deepEqual(res, { field: 'start', value: 0 })
  })

  it('computes backward drag for end handle clamped to currentStart + 1', () => {
    const res = computeTrimDrag({
      handle: 'end',
      initial: 80,
      startX: 200,
      clientX: 50,
      trackWidth: 100,
      total: 100,
      currentStart: 30,
      currentEnd: 80,
    })
    assert.deepEqual(res, { field: 'end', value: 31 })
  })

  it('computes forward drag for end handle clamped to exact total', () => {
    const res = computeTrimDrag({
      handle: 'end',
      initial: 80,
      startX: 100,
      clientX: 200,
      trackWidth: 100,
      total: 100,
      currentStart: 30,
      currentEnd: 80,
    })
    assert.deepEqual(res, { field: 'end', value: 100 })
  })

  it('clamps forward drag to fractional total without rounding up or down', () => {
    const resUp = computeTrimDrag({
      handle: 'end',
      initial: 3500,
      startX: 100,
      clientX: 300,
      trackWidth: 100,
      total: 3600.6,
      currentStart: 100,
      currentEnd: 3500,
    })
    assert.deepEqual(resUp, { field: 'end', value: 3600.6 })

    const resDown = computeTrimDrag({
      handle: 'end',
      initial: 3500,
      startX: 100,
      clientX: 300,
      trackWidth: 100,
      total: 3600.4,
      currentStart: 100,
      currentEnd: 3500,
    })
    assert.deepEqual(resDown, { field: 'end', value: 3600.4 })
  })

  it('handles edge case total = 0 gracefully', () => {
    const res = computeTrimDrag({
      handle: 'start',
      initial: 0,
      startX: 100,
      clientX: 150,
      trackWidth: 100,
      total: 0,
      currentStart: 0,
      currentEnd: 0,
    })
    assert.deepEqual(res, { field: 'start', value: 0 })
  })

  it('handles currentEnd undefined fallback', () => {
    const res = computeTrimDrag({
      handle: 'start',
      initial: 10,
      startX: 100,
      clientX: 120,
      trackWidth: 100,
      total: 100,
      currentStart: 10,
      currentEnd: undefined,
    })
    assert.deepEqual(res, { field: 'start', value: 30 })
  })

  it('handles end - 1 < 0 safely', () => {
    const res = computeTrimDrag({
      handle: 'start',
      initial: 5,
      startX: 100,
      clientX: 110,
      trackWidth: 100,
      total: 100,
      currentStart: 0,
      currentEnd: 0,
    })
    assert.deepEqual(res, { field: 'start', value: 0 })
  })
})

describe('nudgeTrim', () => {
  it('nudges start handle forward and clamps', () => {
    const res = nudgeTrim({
      handle: 'start',
      currentStart: 10,
      currentEnd: 20,
      total: 100,
      deltaSec: 15,
    })
    assert.deepEqual(res, { field: 'start', value: 19 })
  })

  it('nudges start handle backward and clamps to 0', () => {
    const res = nudgeTrim({
      handle: 'start',
      currentStart: 5,
      currentEnd: 20,
      total: 100,
      deltaSec: -10,
    })
    assert.deepEqual(res, { field: 'start', value: 0 })
  })

  it('nudges end handle backward and clamps to currentStart + 1', () => {
    const res = nudgeTrim({
      handle: 'end',
      currentStart: 50,
      currentEnd: 60,
      total: 100,
      deltaSec: -20,
    })
    assert.deepEqual(res, { field: 'end', value: 51 })
  })

  it('nudges end handle forward and clamps to fractional total', () => {
    const res = nudgeTrim({
      handle: 'end',
      currentStart: 50,
      currentEnd: 3595,
      total: 3600.6,
      deltaSec: 20,
    })
    assert.deepEqual(res, { field: 'end', value: 3600.6 })
  })
})

describe('isTrimKey', () => {
  it('returns true for navigation and trim keys', () => {
    assert.equal(isTrimKey('ArrowLeft'), true)
    assert.equal(isTrimKey('ArrowRight'), true)
    assert.equal(isTrimKey('ArrowUp'), true)
    assert.equal(isTrimKey('ArrowDown'), true)
    assert.equal(isTrimKey('Home'), true)
    assert.equal(isTrimKey('End'), true)
  })

  it('returns false for modifier or other keys', () => {
    assert.equal(isTrimKey('Shift'), false)
    assert.equal(isTrimKey('Control'), false)
    assert.equal(isTrimKey('Alt'), false)
    assert.equal(isTrimKey('Tab'), false)
    assert.equal(isTrimKey('Space'), false)
    assert.equal(isTrimKey('KeyA'), false)
  })
})

describe('trimFromKey', () => {
  it('handles ArrowLeft / ArrowRight with and without shift', () => {
    const left = trimFromKey({
      key: 'ArrowLeft',
      shiftKey: false,
      handle: 'start',
      start: 20,
      end: 50,
      total: 100,
    })
    assert.deepEqual(left, { field: 'start', value: 19 })

    const rightShift = trimFromKey({
      key: 'ArrowRight',
      shiftKey: true,
      handle: 'start',
      start: 20,
      end: 50,
      total: 100,
    })
    assert.deepEqual(rightShift, { field: 'start', value: 30 })
  })

  it('handles Home key for start and end handles', () => {
    assert.deepEqual(
      trimFromKey({
        key: 'Home',
        shiftKey: false,
        handle: 'start',
        start: 20,
        end: 50,
        total: 100,
      }),
      { field: 'start', value: 0 },
    )
    assert.deepEqual(
      trimFromKey({
        key: 'Home',
        shiftKey: false,
        handle: 'end',
        start: 20,
        end: 50,
        total: 100,
      }),
      { field: 'end', value: 21 },
    )
  })

  it('handles End key for start and end handles with fractional total', () => {
    assert.deepEqual(
      trimFromKey({
        key: 'End',
        shiftKey: false,
        handle: 'start',
        start: 20,
        end: 50,
        total: 3600.6,
      }),
      { field: 'start', value: 49 },
    )
    assert.deepEqual(
      trimFromKey({
        key: 'End',
        shiftKey: false,
        handle: 'end',
        start: 20,
        end: 50,
        total: 3600.6,
      }),
      { field: 'end', value: 3600.6 },
    )
  })

  it('returns null for unhandled keys', () => {
    assert.equal(
      trimFromKey({
        key: 'Tab',
        shiftKey: false,
        handle: 'start',
        start: 20,
        end: 50,
        total: 100,
      }),
      null,
    )
    assert.equal(
      trimFromKey({
        key: 'Enter',
        shiftKey: false,
        handle: 'start',
        start: 20,
        end: 50,
        total: 100,
      }),
      null,
    )
  })
})

describe('resolveTrimHandle', () => {
  const trackRect = { left: 100, width: 800 }
  const total = 14400 // 4 hour ride
  const start = 0
  const end = 60 // 60s overlay window (3.33px wide)

  it('picks start handle when clicking left of midpoint during overlap', () => {
    // startPx = 100 + 0 = 100
    // endPx = 100 + (60 / 14400) * 800 = 103.33
    // midPx = 101.67
    const picked = resolveTrimHandle({
      handle: 'end', // even if DOM clicked on end
      clientX: 101, // left of midpoint
      trackRect,
      start,
      end,
      total,
      thresholdPx: 16,
    })
    assert.equal(picked, 'start')
  })

  it('picks end handle when clicking right of midpoint during overlap', () => {
    const picked = resolveTrimHandle({
      handle: 'start', // even if DOM clicked on start
      clientX: 102.5, // right of midpoint
      trackRect,
      start,
      end,
      total,
      thresholdPx: 16,
    })
    assert.equal(picked, 'end')
  })

  it('keeps targeted handle when handles are far apart', () => {
    const picked = resolveTrimHandle({
      handle: 'start',
      clientX: 100,
      trackRect,
      start: 0,
      end: 7200, // half of total (400px apart)
      total,
      thresholdPx: 16,
    })
    assert.equal(picked, 'start')
  })
})
