/**
 * Composite elements: a scene group flagged `composite: true` that the editor
 * presents as ONE widget ("Speed gauge") instead of its raw members.
 *
 * Composites are authoring sugar, not a render concept. On disk a composite
 * is an ordinary `scene.editor.groups` entry plus the flag; its members are
 * ordinary elements, usually wired together with `anchor` so the readout
 * stays pinned inside its dial/bar/panel. "Expand" just clears the flag.
 *
 * Everything here is pure (config in → updates out) so the app state, the
 * element list and the composite panel share one implementation and it can
 * be unit tested without Svelte.
 */

/** @param {{composite?: boolean}|null|undefined} group */
export const isComposite = (group) => group?.composite === true

/** The composite group that owns `elementId`, or null. */
export function compositeGroupOf(groups, elementId) {
  return (
    (groups ?? []).find(
      (g) => isComposite(g) && g.element_ids.includes(elementId),
    ) ?? null
  )
}

/** Member elements of a group, in config (draw) order. */
export function groupMembers(group, elements) {
  const ids = new Set(group?.element_ids ?? [])
  return (elements ?? []).filter((e) => ids.has(e.id))
}

// ─── Icon ─────────────────────────────────────────────────────────────────────

/**
 * Icon token (same vocabulary as elementMeta) for a composite: its most
 * distinctive member wins, so a panel + readout reads as a stat, not a rect.
 */
export function compositeIcon(members) {
  const has = (pred) => members.some(pred)
  if (has((e) => e.type === 'gauge')) return 'gauge'
  if (has((e) => e.type === 'meter')) return 'meter'
  if (has((e) => e.type === 'plot' && e.value === 'course')) return 'map'
  if (has((e) => e.type === 'plot')) return 'bar'
  if (has((e) => e.type === 'value')) return 'hash'
  if (has((e) => e.type === 'image')) return 'image'
  if (has((e) => e.type === 'rect')) return 'rect'
  return 'type'
}

// ─── Metric ───────────────────────────────────────────────────────────────────

const METRIC_TYPES = ['value', 'meter', 'gauge', 'plot']

// The metric an element reads, or null. Course plots draw the route, not a
// metric series, and image pulse_metric only drives an animation rate, so
// neither is retargetable.
function memberMetric(el) {
  if (el.type === 'label') return el.unit_of || null
  if (!METRIC_TYPES.includes(el.type)) return null
  if (el.type === 'plot' && el.value === 'course') return null
  return el.value || null
}

/** Distinct metrics the composite reads, in member order. */
export function compositeMetrics(members) {
  const out = []
  for (const el of members) {
    const m = memberMetric(el)
    if (m && !out.includes(m)) out.push(m)
  }
  return out
}

const CAPTIONS = {
  speed: 'Speed',
  heartrate: 'Heart rate',
  power: 'Power',
  power_to_weight: 'W/kg',
  elevation: 'Elevation',
  cadence: 'Cadence',
  gradient: 'Grade',
  lean: 'Lean',
  temperature: 'Temp',
  calories: 'Calories',
  gear: 'Gear',
  front_gear: 'Chainring',
  rear_gear: 'Cog',
  time: 'Time',
  distance: 'Distance',
  running_time: 'Time',
  running_distance: 'Distance',
  running_elevation_gain: 'Climb',
  running_elevation_loss: 'Descent',
  lap: 'Lap',
  laps_to_go: 'Laps to go',
  lap_fraction: 'Lap',
}

/** Short human caption for a metric ("Speed", "Heart rate"). */
export function metricCaption(metric) {
  if (CAPTIONS[metric]) return CAPTIONS[metric]
  const raw = String(metric ?? '')
    .replace(/^custom:/, '')
    .replace(/[_-]+/g, ' ')
    .trim()
  return raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : ''
}

// Base telemetry attribute a derived metric reports in (avg_speed → speed,
// running_elevation_gain → elevation) — the one its unit words belong to.
function baseMetric(metric) {
  const m = String(metric ?? '').replace(/^(avg|max|min|total|running)_/, '')
  return m === 'elevation_gain' || m === 'elevation_loss' ? 'elevation' : m
}

// Static captions that spell out a unit ("MPH", "W"). Retargeting turns them
// into live unit_of labels so they follow the new metric.
const UNIT_WORDS = {
  speed: ['mph', 'kph', 'km/h', 'kmh', 'kmph'],
  distance: ['mi', 'mi.', 'km', 'miles', 'kilometers'],
  elevation: ['ft', 'm', 'feet', 'meters'],
  power: ['w', 'watts'],
  power_to_weight: ['w/kg'],
  heartrate: ['bpm'],
  cadence: ['rpm'],
  temperature: ['°f', '°c'],
  calories: ['kcal', 'cal'],
  gradient: ['%'],
}

// Keep the authored casing style when rewriting a caption.
function matchCase(sample, text) {
  if (sample === sample.toUpperCase()) return text.toUpperCase()
  if (sample === sample.toLowerCase()) return text.toLowerCase()
  return text
}

const isNumber = (v) => typeof v === 'number' && Number.isFinite(v)

/**
 * Updates (id → partial element) that switch every member reading `from` to
 * `to`: metric fields, unit labels, captions naming the metric, and the
 * bits that only made sense for the old metric (explicit unit overrides,
 * hand-typed suffixes, fixed dial ranges).
 */
export function retargetMetric(members, from, to) {
  const updates = {}
  if (!from || !to || from === to) return updates
  const oldCaption = metricCaption(from).toLowerCase()
  const oldUnitWords = UNIT_WORDS[baseMetric(from)] ?? []
  for (const el of members) {
    if (el.type === 'label') {
      if (el.unit_of === from) {
        updates[el.id] = { unit_of: to, unit: undefined }
        continue
      }
      if (el.unit_of) continue
      const text = String(el.text ?? '').trim()
      const lower = text.toLowerCase()
      if (lower && (lower === oldCaption || lower === from)) {
        updates[el.id] = { text: matchCase(text, metricCaption(to)) }
      } else if (lower && oldUnitWords.includes(lower)) {
        updates[el.id] = { unit_of: to, text: '' }
      }
      continue
    }
    if (memberMetric(el) !== from) continue
    const u = { value: to, unit: undefined }
    if (el.type === 'value') {
      // A hand-typed suffix was the old metric's unit — let it follow instead.
      const custom =
        el.suffix_mode === 'custom' || (!el.suffix_mode && el.suffix)
      if (custom) u.suffix_mode = 'auto'
    }
    if (el.type === 'meter' || el.type === 'gauge') {
      // A fixed 0–60 speed range is meaningless for power — fall back to the
      // activity's own range.
      if (isNumber(el.min)) u.min = 'min'
      if (isNumber(el.max)) u.max = 'max'
    }
    updates[el.id] = u
  }
  return updates
}

/**
 * Metric choices valid for every member reading `metric`: value readouts
 * accept summary/running metrics, dials only live series, and so on.
 * `optionsByType` maps element type → [{ value, label, group? }].
 */
export function metricChoices(members, metric, optionsByType) {
  const types = [
    ...new Set(
      members
        .filter((el) => el.type !== 'label' && memberMetric(el) === metric)
        .map((el) => el.type),
    ),
  ]
  const lists = types.map((t) => optionsByType[t] ?? [])
  let choices = lists[0] ?? optionsByType.value ?? []
  for (const list of lists.slice(1)) {
    const allowed = new Set(list.map((o) => o.value))
    choices = choices.filter((o) => allowed.has(o.value))
  }
  if (metric && !choices.some((o) => o.value === metric)) {
    choices = [{ value: metric, label: metricCaption(metric) }, ...choices]
  }
  return choices
}

// ─── Colors ───────────────────────────────────────────────────────────────────

// Arrays (gradient stops, color_by bands, course markers) are palettes with
// their own semantics — they stay out of the composite color scheme.
const SKIP_COLOR_KEYS = new Set(['anchor', 'color_by'])

const BASE_COLOR_ROLES = {
  label: 'Text',
  value: 'Readout',
  meter: 'Fill',
  gauge: 'Dial',
  rect: 'Panel',
  plot: 'Chart',
}
const KEY_ROLES = {
  arc_color: 'Track',
  progress_color: 'Progress',
  needle_color: 'Needle',
  cap_color: 'Cap',
  background_color: 'Backdrop',
  background: 'Track',
  border_color: 'Border',
  scale_color: 'Scale',
  edge_color: 'Outline',
}
const NESTED_ROLES = {
  line: 'Line',
  fill: 'Area',
  point: 'Marker',
  point_label: 'Marker label',
}

const isColorKey = (k) =>
  k === 'color' || k.endsWith('_color') || k === 'background'

function roleFor(type, path) {
  if (path.length === 2) {
    const base = NESTED_ROLES[path[0]] ?? path[0]
    if (path[1] === 'color') return base
    return `${base} ${(KEY_ROLES[path[1]] ?? path[1]).toLowerCase()}`
  }
  if (path[0] === 'color') return BASE_COLOR_ROLES[type] ?? 'Color'
  return KEY_ROLES[path[0]] ?? path[0]
}

function colorRefs(el) {
  const refs = []
  for (const [k, v] of Object.entries(el)) {
    if (SKIP_COLOR_KEYS.has(k)) continue
    if (typeof v === 'string' && isColorKey(k)) {
      refs.push({ id: el.id, path: [k], value: v, role: roleFor(el.type, [k]) })
    } else if (v && typeof v === 'object' && !Array.isArray(v)) {
      for (const [nk, nv] of Object.entries(v)) {
        if (typeof nv === 'string' && isColorKey(nk)) {
          const path = [k, nk]
          refs.push({
            id: el.id,
            path,
            value: nv,
            role: roleFor(el.type, path),
          })
        }
      }
    }
  }
  return refs
}

/**
 * The composite's color scheme: one entry per distinct color (hex or
 * `$var`), listing the roles that use it — e.g. `#ffffff` → Readout,
 * Progress. Recoloring an entry rewrites every field that shares it.
 * @returns {{ value: string, roles: string[], refs: {id: string, path: string[]}[] }[]}
 */
export function compositeColors(members) {
  const entries = []
  for (const el of members) {
    for (const ref of colorRefs(el)) {
      const key = ref.value.toLowerCase()
      let entry = entries.find((e) => e.value.toLowerCase() === key)
      if (!entry) {
        entry = { value: ref.value, roles: [], refs: [] }
        entries.push(entry)
      }
      if (!entry.roles.includes(ref.role)) entry.roles.push(ref.role)
      entry.refs.push({ id: ref.id, path: ref.path })
    }
  }
  return entries
}

/** Updates (id → partial element) that set every ref in `refs` to `color`. */
export function recolor(members, refs, color) {
  const byId = new Map(members.map((e) => [e.id, e]))
  const updates = {}
  for (const { id, path } of refs) {
    const el = byId.get(id)
    if (!el) continue
    const u = (updates[id] ??= {})
    if (path.length === 1) {
      u[path[0]] = color
    } else {
      u[path[0]] = { ...(u[path[0]] ?? el[path[0]]), [path[1]]: color }
    }
  }
  return updates
}

// ─── Position ─────────────────────────────────────────────────────────────────

// Members that carry their own x/y. Anchored members derive theirs from the
// anchor target, so they never count toward (or get written by) a move.
const isFree = (el) => !el.anchor?.target

/** Top-left authored origin of the composite's free members, or null. */
export function compositeOrigin(members) {
  const free = members.filter(isFree)
  if (free.length === 0) return null
  return {
    x: Math.min(...free.map((e) => e.x ?? 0)),
    y: Math.min(...free.map((e) => e.y ?? 0)),
  }
}

/**
 * Updates that shift the whole composite by (dx, dy). Members anchored to a
 * sibling ride along for free; members anchored outside the composite shift
 * their anchor offset instead of x/y.
 */
export function moveComposite(members, dx, dy) {
  const ids = new Set(members.map((e) => e.id))
  const updates = {}
  for (const el of members) {
    if (isFree(el)) {
      updates[el.id] = {
        x: Math.round((el.x ?? 0) + dx),
        y: Math.round((el.y ?? 0) + dy),
      }
    } else if (!ids.has(el.anchor.target)) {
      updates[el.id] = {
        anchor: {
          ...el.anchor,
          offset_x: Math.round((el.anchor.offset_x ?? 0) + dx),
          offset_y: Math.round((el.anchor.offset_y ?? 0) + dy),
        },
      }
    }
  }
  return updates
}

// ─── Size ─────────────────────────────────────────────────────────────────────

// Spatial fields per element type. Mirrors `Element::scale` in
// src-tauri/render-core/src/template.rs (the authored→output resize), so a
// scaled composite looks exactly like the same widget authored bigger — keep
// the two in sync. Colors, opacity, fractional margins etc. are size-free.
const SPATIAL = {
  label: ['font_size', 'letter_spacing'],
  value: ['font_size'],
  plot: ['width', 'height'],
  meter: [
    'width',
    'height',
    'radius',
    'gap',
    'border_width',
    'scale_font_size',
    'scale_offset',
    'scale_tick_length',
    'scale_tick_width',
  ],
  gauge: [
    'width',
    'height',
    'arc_width',
    'needle_width',
    'cap_radius',
    'background_margin',
  ],
  rect: ['width', 'height', 'radius', 'border_width'],
  image: ['width', 'height'],
}
const SPATIAL_NESTED = {
  plot: {
    line: ['width'],
    point: ['weight', 'edge_width'],
    point_label: ['font_size', 'x_offset', 'y_offset'],
  },
}
const BOX_TYPES = ['plot', 'meter', 'gauge', 'rect', 'image']
const TEXT_TYPES = ['label', 'value']
// Renderer fallback for text with no font_size and no scene font_size.
const DEFAULT_FONT_SIZE = 32

const round2 = (v) => Math.round(v * 100) / 100

// width/height are integer pixels in the schema; everything else is a float.
function scaleField(key, value, factor) {
  if (key === 'width' || key === 'height')
    return Math.max(1, Math.round(value * factor))
  return round2(value * factor)
}

const fontSizeOf = (el, sceneFontSize) =>
  isNumber(el.font_size) ? el.font_size : (sceneFontSize ?? DEFAULT_FONT_SIZE)

/**
 * The number the Size control edits: the largest box member's width, or —
 * for text-only composites — the largest text size.
 * @returns {{ kind: 'width'|'font', value: number }|null}
 */
export function compositeSizeRef(members, sceneFontSize) {
  const boxes = members.filter(
    (e) =>
      BOX_TYPES.includes(e.type) && isNumber(e.width) && isNumber(e.height),
  )
  if (boxes.length > 0) {
    const biggest = boxes.reduce((a, e) =>
      e.width * e.height > a.width * a.height ? e : a,
    )
    return { kind: 'width', value: biggest.width }
  }
  const texts = members.filter((e) => TEXT_TYPES.includes(e.type))
  if (texts.length === 0) return null
  return {
    kind: 'font',
    value: Math.max(...texts.map((e) => fontSizeOf(e, sceneFontSize))),
  }
}

/**
 * Updates that scale the whole composite by `factor` about its origin:
 * positions, sizes, strokes, text sizes and anchor offsets together, so the
 * widget keeps its proportions. Always pass the members as they were when
 * the edit began — every update is absolute, so re-applying from that
 * snapshot never compounds rounding.
 */
export function scaleComposite(members, factor, sceneFontSize) {
  const updates = {}
  if (!(factor > 0)) return updates
  const origin = compositeOrigin(members) ?? {
    x: Math.min(...members.map((e) => e.x ?? 0)),
    y: Math.min(...members.map((e) => e.y ?? 0)),
  }
  for (const el of members) {
    const u = {}
    if (isNumber(el.x)) u.x = Math.round(origin.x + (el.x - origin.x) * factor)
    if (isNumber(el.y)) u.y = Math.round(origin.y + (el.y - origin.y) * factor)
    for (const key of SPATIAL[el.type] ?? []) {
      if (isNumber(el[key])) u[key] = scaleField(key, el[key], factor)
    }
    // Text left on the scene's font size has to become explicit to scale.
    if (TEXT_TYPES.includes(el.type) && !isNumber(el.font_size)) {
      u.font_size = round2(fontSizeOf(el, sceneFontSize) * factor)
    }
    for (const [obj, keys] of Object.entries(SPATIAL_NESTED[el.type] ?? {})) {
      if (!el[obj] || typeof el[obj] !== 'object') continue
      const next = { ...el[obj] }
      // Nested sizes (line width, marker weight…) are all float strokes.
      for (const key of keys) {
        if (isNumber(next[key])) next[key] = round2(next[key] * factor)
      }
      u[obj] = next
    }
    if (el.type === 'plot' && Array.isArray(el.markers)) {
      // Course-marker sizes are floats, unlike the element's own width/height.
      u.markers = el.markers.map((m) => ({
        ...m,
        ...(isNumber(m.width) && { width: round2(m.width * factor) }),
        ...(isNumber(m.height) && { height: round2(m.height * factor) }),
      }))
    }
    if (el.anchor) {
      const a = el.anchor
      u.anchor = {
        ...a,
        ...(isNumber(a.offset_x) && {
          offset_x: Math.round(a.offset_x * factor),
        }),
        ...(isNumber(a.offset_y) && {
          offset_y: Math.round(a.offset_y * factor),
        }),
      }
    }
    updates[el.id] = u
  }
  return updates
}

// ─── Instantiation ────────────────────────────────────────────────────────────

/**
 * Give `elements` fresh `type-N` ids that avoid `takenIds` (the same scheme as
 * appState.newElementId), rewriting anchors between them so the copy stays
 * wired to itself rather than to the original.
 */
export function assignIds(elements, takenIds) {
  const taken = new Set(takenIds)
  const remap = new Map()
  for (const el of elements) {
    let n = 0
    let id
    do {
      id = `${el.type}-${n++}`
    } while (taken.has(id))
    taken.add(id)
    remap.set(el.id, id)
  }
  return elements.map((el) => {
    const out = { ...el, id: remap.get(el.id) }
    if (el.anchor?.target && remap.has(el.anchor.target)) {
      out.anchor = { ...el.anchor, target: remap.get(el.anchor.target) }
    }
    return out
  })
}

/** A pasteable copy of a composite, offset by (dx, dy), with fresh ids. */
export function cloneComposite(members, takenIds, dx = 0, dy = 0) {
  const moved = moveComposite(members, dx, dy)
  return assignIds(
    members.map((el) => ({ ...el, ...moved[el.id] })),
    takenIds,
  )
}

// Fallback x/y for an anchored element: where the Rust pre-pass will put it.
// Keeps the authored position sensible if the anchor is ever removed by hand.
// prettier-ignore
const POINT_FRACS = {
  'top-left': [0, 0], top: [0.5, 0], 'top-right': [1, 0],
  left: [0, 0.5], center: [0.5, 0.5], right: [1, 0.5],
  'bottom-left': [0, 1], bottom: [0.5, 1], 'bottom-right': [1, 1],
}
function pinTo(target, el) {
  const a = el.anchor
  const [fx, fy] = POINT_FRACS[a.point ?? 'center']
  return {
    ...el,
    anchor: { ...a, target: target.id },
    x: Math.round(target.x + target.width * fx + (a.offset_x ?? 0)),
    y: Math.round(target.y + target.height * fy + (a.offset_y ?? 0)),
  }
}

// Presets are drawn for the 4K authoring canvas (templates are authored at
// 3840×2160 and scaled at render time); `k` rescales them for scenes authored
// at another height so a new composite is the same visual size either way.
const AUTHOR_HEIGHT = 2160

const PRESETS = {
  // A progress arc with the live number dead-center and its unit sitting in
  // the arc's open bottom — no needle to cross the digits.
  gauge_value({ k, metric, range }) {
    const s = (v) => Math.round(v * k)
    const dial = {
      type: 'gauge',
      id: 'dial',
      value: metric,
      x: s(160),
      y: s(1440),
      width: s(560),
      height: s(560),
      min: range?.min ?? 0,
      max: range?.max ?? 60,
      start_angle: 135,
      sweep_angle: 270,
      color: '#ffffff',
      arc_color: '#ffffff33',
      arc_width: s(28),
      progress_color: '#ffffff',
      needle_width: 0,
    }
    return {
      name: `${metricCaption(metric)} gauge`,
      elements: [
        dial,
        pinTo(dial, {
          type: 'value',
          id: 'readout',
          value: metric,
          font_size: s(170),
          decimal_rounding: 0,
          tabular_figures: true,
          color: '#ffffff',
          text_align: 'center',
          vertical_align: 'middle',
          anchor: { point: 'center', offset_x: 0, offset_y: 0 },
        }),
        pinTo(dial, {
          type: 'label',
          id: 'unit',
          unit_of: metric,
          font_size: s(48),
          letter_spacing: s(2),
          color: '#ffffff',
          opacity: 0.7,
          text_align: 'center',
          vertical_align: 'bottom',
          anchor: { point: 'bottom', offset_x: 0, offset_y: s(-36) },
        }),
      ],
    }
  },

  // A horizontal fill bar with the reading (and its unit) above the left
  // end and the metric's caption above the right end.
  meter_value({ k, metric, range }) {
    const s = (v) => Math.round(v * k)
    const bar = {
      type: 'meter',
      id: 'bar',
      value: metric,
      x: s(160),
      y: s(1940),
      width: s(960),
      height: s(40),
      min: range?.min ?? 0,
      max: range?.max ?? 60,
      direction: 'right',
      color: '#ffffff',
      fill_opacity: 1,
      background: '#ffffff',
      background_opacity: 0.2,
      radius: s(20),
    }
    return {
      name: `${metricCaption(metric)} bar`,
      elements: [
        bar,
        pinTo(bar, {
          type: 'value',
          id: 'readout',
          value: metric,
          suffix_mode: 'auto',
          font_size: s(120),
          decimal_rounding: 0,
          tabular_figures: true,
          color: '#ffffff',
          text_align: 'left',
          vertical_align: 'baseline',
          anchor: { point: 'top-left', offset_x: 0, offset_y: s(-32) },
        }),
        pinTo(bar, {
          type: 'label',
          id: 'caption',
          text: metricCaption(metric).toUpperCase(),
          font_size: s(40),
          letter_spacing: s(6),
          color: '#ffffff',
          opacity: 0.7,
          text_align: 'right',
          vertical_align: 'baseline',
          anchor: { point: 'top-right', offset_x: 0, offset_y: s(-32) },
        }),
      ],
    }
  },

  // A translucent panel: caption top-left, big readout bottom-left, unit
  // bottom-right on the readout's baseline.
  stat_card({ k, metric }) {
    const s = (v) => Math.round(v * k)
    const panel = {
      type: 'rect',
      id: 'panel',
      x: s(160),
      y: s(1700),
      width: s(480),
      height: s(300),
      color: '#000000',
      fill_opacity: 0.45,
      radius: s(24),
    }
    return {
      name: `${metricCaption(metric)} card`,
      elements: [
        panel,
        pinTo(panel, {
          type: 'label',
          id: 'caption',
          text: metricCaption(metric).toUpperCase(),
          font_size: s(36),
          letter_spacing: s(6),
          color: '#ffffff',
          opacity: 0.7,
          text_align: 'left',
          vertical_align: 'top',
          anchor: { point: 'top-left', offset_x: s(40), offset_y: s(36) },
        }),
        pinTo(panel, {
          type: 'value',
          id: 'readout',
          value: metric,
          font_size: s(170),
          decimal_rounding: 0,
          tabular_figures: true,
          color: '#ffffff',
          text_align: 'left',
          vertical_align: 'baseline',
          anchor: { point: 'bottom-left', offset_x: s(40), offset_y: s(-44) },
        }),
        pinTo(panel, {
          type: 'label',
          id: 'unit',
          unit_of: metric,
          font_size: s(48),
          letter_spacing: s(2),
          color: '#ffffff',
          opacity: 0.7,
          text_align: 'right',
          vertical_align: 'baseline',
          anchor: { point: 'bottom-right', offset_x: s(-40), offset_y: s(-44) },
        }),
      ],
    }
  },
}

/**
 * Add-menu entries for composites. `rangeMetric` marks presets whose dial or
 * bar wants the activity's min/max for its starting range.
 */
export const COMPOSITE_PRESETS = [
  {
    key: 'gauge_value',
    title: 'Gauge with value',
    hint: 'Dial + readout',
    icon: 'gauge',
    rangeMetric: true,
  },
  {
    key: 'meter_value',
    title: 'Bar with value',
    hint: 'Fill bar + readout',
    icon: 'meter',
    rangeMetric: true,
  },
  {
    key: 'stat_card',
    title: 'Stat card',
    hint: 'Panel + readout',
    icon: 'rect',
    rangeMetric: false,
  },
]

/**
 * Build a composite preset as concrete elements with fresh ids.
 * @param {string} key COMPOSITE_PRESETS key
 * @param {{ scene?: {height?: number}, metric?: string,
 *   range?: {min: number, max: number}|null, takenIds?: string[] }} opts
 * @returns {{ name: string, elements: object[] }}
 */
export function buildComposite(
  key,
  { scene, metric = 'speed', range = null, takenIds = [] } = {},
) {
  const k = (scene?.height || AUTHOR_HEIGHT) / AUTHOR_HEIGHT
  const { name, elements } = PRESETS[key]({ k, metric, range })
  return { name, elements: assignIds(elements, takenIds) }
}
