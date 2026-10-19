import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  assignIds,
  buildComposite,
  cloneComposite,
  COMPOSITE_PRESETS,
  compositeColors,
  compositeGroupOf,
  compositeIcon,
  compositeMetrics,
  compositeOrigin,
  compositeSizeRef,
  metricChoices,
  moveComposite,
  recolor,
  retargetMetric,
  scaleComposite,
} from './composites.js'

describe('compositeGroupOf', () => {
  const groups = [
    { id: 'g0', name: 'plain', element_ids: ['a'] },
    { id: 'g1', name: 'widget', element_ids: ['b', 'c'], composite: true },
  ]
  it('finds only composite groups', () => {
    assert.equal(compositeGroupOf(groups, 'c')?.id, 'g1')
    assert.equal(compositeGroupOf(groups, 'a'), null)
    assert.equal(compositeGroupOf(groups, 'zzz'), null)
  })
})

describe('buildComposite', () => {
  for (const preset of COMPOSITE_PRESETS) {
    it(`${preset.key}: anchors resolve to sibling ids`, () => {
      const { name, elements } = buildComposite(preset.key, {
        scene: { height: 2160 },
        metric: 'power',
        takenIds: ['gauge-0', 'value-0', 'rect-0', 'meter-0'],
      })
      assert.ok(name.toLowerCase().startsWith('power'))
      const ids = elements.map((e) => e.id)
      assert.equal(new Set(ids).size, ids.length, 'ids are unique')
      for (const id of ['gauge-0', 'value-0', 'rect-0', 'meter-0'])
        assert.ok(!ids.includes(id), `${id} was already taken`)
      for (const el of elements.filter((e) => e.anchor)) {
        assert.ok(ids.includes(el.anchor.target), 'anchored to a sibling')
        assert.ok(Number.isInteger(el.x) && Number.isInteger(el.y))
      }
      assert.deepEqual(compositeMetrics(elements), ['power'])
    })
  }

  it('scales to the scene height and seeds the activity range', () => {
    const hd = buildComposite('gauge_value', {
      scene: { height: 1080 },
      range: { min: 3, max: 71 },
    }).elements
    const dial = hd.find((e) => e.type === 'gauge')
    assert.equal(dial.width, 280)
    assert.equal(dial.min, 3)
    assert.equal(dial.max, 71)
  })
})

describe('compositeIcon', () => {
  it('prefers the most distinctive member', () => {
    assert.equal(
      compositeIcon([{ type: 'rect' }, { type: 'value' }, { type: 'gauge' }]),
      'gauge',
    )
    assert.equal(compositeIcon([{ type: 'rect' }, { type: 'value' }]), 'hash')
    assert.equal(compositeIcon([{ type: 'plot', value: 'course' }]), 'map')
  })
})

describe('retargetMetric', () => {
  const members = [
    { id: 'g', type: 'gauge', value: 'speed', unit: 'mph', min: 0, max: 60 },
    { id: 'v', type: 'value', value: 'speed', suffix: ' mph' },
    { id: 'u', type: 'label', unit_of: 'speed' },
    { id: 'c', type: 'label', text: 'SPEED' },
    { id: 'w', type: 'label', text: 'MPH' },
    { id: 'x', type: 'label', text: 'Top speed today' },
    { id: 'm', type: 'plot', value: 'course' },
  ]

  it('switches metric fields and the bits tied to the old metric', () => {
    const u = retargetMetric(members, 'speed', 'power')
    assert.deepEqual(u.g, {
      value: 'power',
      unit: undefined,
      min: 'min',
      max: 'max',
    })
    assert.deepEqual(u.v, {
      value: 'power',
      unit: undefined,
      suffix_mode: 'auto',
    })
    assert.deepEqual(u.u, { unit_of: 'power', unit: undefined })
    assert.deepEqual(u.c, { text: 'POWER' })
    assert.deepEqual(u.w, { unit_of: 'power', text: '' })
    assert.equal(u.x, undefined, 'free text is left alone')
    assert.equal(u.m, undefined, 'course plots are not metric readouts')
  })

  it('keeps activity-relative ranges and explicit suffix modes', () => {
    const u = retargetMetric(
      [
        { id: 'g', type: 'gauge', value: 'speed', min: 'min', max: 'max' },
        { id: 'v', type: 'value', value: 'speed', suffix_mode: 'none' },
      ],
      'speed',
      'heartrate',
    )
    assert.equal(u.g.min, undefined)
    assert.equal(u.v.suffix_mode, undefined)
  })

  it('is a no-op for an unchanged metric', () => {
    assert.deepEqual(retargetMetric(members, 'speed', 'speed'), {})
  })
})

describe('metricChoices', () => {
  const opts = {
    value: [
      { value: 'speed', label: 'speed' },
      { value: 'power', label: 'power' },
      { value: 'avg_speed', label: 'Avg speed' },
    ],
    gauge: [
      { value: 'speed', label: 'speed' },
      { value: 'power', label: 'power' },
    ],
  }
  it('intersects the options of every member type', () => {
    const members = [
      { id: 'g', type: 'gauge', value: 'speed' },
      { id: 'v', type: 'value', value: 'speed' },
    ]
    assert.deepEqual(
      metricChoices(members, 'speed', opts).map((o) => o.value),
      ['speed', 'power'],
    )
  })
  it('keeps the current metric even when unavailable', () => {
    const members = [{ id: 'v', type: 'value', value: 'lean' }]
    assert.equal(metricChoices(members, 'lean', opts)[0].value, 'lean')
  })
})

describe('compositeColors / recolor', () => {
  const members = [
    {
      id: 'g',
      type: 'gauge',
      color: '#FFFFFF',
      progress_color: '#ffffff',
      arc_color: '#ffffff33',
      gradient: ['#000000'],
    },
    { id: 'v', type: 'value', color: '$accent' },
    {
      id: 'p',
      type: 'plot',
      line: { color: '#ffffff', width: 2 },
      color_by: { bands: [{ color: '#ff0000' }] },
      anchor: { target: 'g' },
    },
  ]

  it('groups fields by shared color, case-insensitively', () => {
    const entries = compositeColors(members)
    assert.deepEqual(
      entries.map((e) => [e.value, e.roles]),
      [
        ['#FFFFFF', ['Dial', 'Progress', 'Line']],
        ['#ffffff33', ['Track']],
        ['$accent', ['Readout']],
      ],
    )
  })

  it('rewrites every field of an entry, merging nested objects', () => {
    const [white] = compositeColors(members)
    const u = recolor(members, white.refs, '$primary')
    assert.deepEqual(u.g, { color: '$primary', progress_color: '$primary' })
    assert.deepEqual(u.p, { line: { color: '$primary', width: 2 } })
    assert.equal(u.v, undefined)
  })
})

describe('position', () => {
  const members = [
    { id: 'r', type: 'rect', x: 100, y: 200, width: 50, height: 50 },
    { id: 'v', type: 'value', x: 0, y: 0, anchor: { target: 'r' } },
    {
      id: 'l',
      type: 'label',
      x: 10,
      y: 10,
      anchor: { target: 'outside', offset_x: 5, offset_y: 6 },
    },
    { id: 'i', type: 'image', x: 140, y: 180 },
  ]

  it('origin ignores anchored members', () => {
    assert.deepEqual(compositeOrigin(members), { x: 100, y: 180 })
    assert.equal(compositeOrigin([members[1]]), null)
  })

  it('moves free members and outside-anchored offsets only', () => {
    const u = moveComposite(members, 10, -20)
    assert.deepEqual(u.r, { x: 110, y: 180 })
    assert.deepEqual(u.i, { x: 150, y: 160 })
    assert.equal(u.v, undefined, 'sibling-anchored members follow for free')
    assert.deepEqual(u.l.anchor, {
      target: 'outside',
      offset_x: 15,
      offset_y: -14,
    })
  })
})

describe('assignIds / cloneComposite', () => {
  it('remaps sibling anchors and avoids taken ids', () => {
    const out = assignIds(
      [
        { id: 'a', type: 'rect' },
        { id: 'b', type: 'label', anchor: { target: 'a' } },
        { id: 'c', type: 'label', anchor: { target: 'elsewhere' } },
      ],
      ['rect-0', 'label-0'],
    )
    assert.deepEqual(
      out.map((e) => e.id),
      ['rect-1', 'label-1', 'label-2'],
    )
    assert.equal(out[1].anchor.target, 'rect-1')
    assert.equal(out[2].anchor.target, 'elsewhere')
  })

  it('clones a composite offset and rewired', () => {
    const members = [
      { id: 'rect-0', type: 'rect', x: 10, y: 10, width: 5, height: 5 },
      {
        id: 'value-0',
        type: 'value',
        x: 12,
        y: 12,
        anchor: { target: 'rect-0', offset_x: 0, offset_y: 0 },
      },
    ]
    const copy = cloneComposite(members, ['rect-0', 'value-0'], 20, 20)
    assert.deepEqual(
      copy.map((e) => [e.id, e.x, e.y, e.anchor?.target]),
      [
        ['rect-1', 30, 30, undefined],
        ['value-1', 12, 12, 'rect-1'],
      ],
    )
  })
})

describe('scaleComposite', () => {
  const apply = (members, updates) =>
    members.map((el) => ({ ...el, ...updates[el.id] }))

  it('scales a preset as one widget, anchored text included', () => {
    const { elements } = buildComposite('gauge_value', {
      scene: { height: 2160 },
    })
    const scaled = apply(elements, scaleComposite(elements, 2))
    const [dial, readout, unit] = scaled
    const [dial0, readout0, unit0] = elements
    assert.equal(dial.x, dial0.x, 'the origin member stays put')
    assert.equal(dial.width, dial0.width * 2)
    assert.equal(dial.arc_width, dial0.arc_width * 2)
    assert.equal(dial.needle_width, 0)
    assert.equal(readout.font_size, readout0.font_size * 2)
    assert.equal(unit.anchor.offset_y, unit0.anchor.offset_y * 2)
    assert.equal(unit.anchor.target, dial.id)
  })

  it('scales free members about the composite origin', () => {
    const u = scaleComposite(
      [
        { id: 'r', type: 'rect', x: 100, y: 200, width: 50, height: 30 },
        { id: 'i', type: 'image', x: 140, y: 180, width: 10, height: 10 },
      ],
      2,
    )
    assert.deepEqual(u.r, { x: 100, y: 220, width: 100, height: 60 })
    assert.deepEqual(u.i, { x: 180, y: 180, width: 20, height: 20 })
  })

  it('makes inherited text sizes explicit before scaling them', () => {
    const label = { id: 'l', type: 'label', text: 'HI', x: 0, y: 0 }
    assert.equal(scaleComposite([label], 2, 30).l.font_size, 60)
    assert.equal(scaleComposite([label], 2).l.font_size, 64)
  })

  it('scales nested plot geometry and leaves fractions alone', () => {
    const plot = {
      id: 'p',
      type: 'plot',
      value: 'course',
      x: 0,
      y: 0,
      width: 200,
      height: 100,
      margin: 0.1,
      line: { width: 1.5, color: '#fff' },
      point: { weight: 80, edge_width: 2 },
      markers: [{ id: 'm', distance: 5, width: 12 }],
    }
    const u = scaleComposite([plot], 1.5).p
    assert.deepEqual(u.line, { width: 2.25, color: '#fff' })
    assert.deepEqual(u.point, { weight: 120, edge_width: 3 })
    assert.deepEqual(u.markers, [{ id: 'm', distance: 5, width: 18 }])
    assert.equal(u.margin, undefined)
  })

  it('re-applying from the same snapshot never drifts', () => {
    const { elements } = buildComposite('stat_card', {
      scene: { height: 2160 },
    })
    // A typed "1" on the way to "120": tiny, then back to identity.
    apply(elements, scaleComposite(elements, 0.01))
    const back = apply(elements, scaleComposite(elements, 1))
    assert.deepEqual(back, elements)
  })

  it('ignores a non-positive factor', () => {
    assert.deepEqual(
      scaleComposite([{ id: 'r', type: 'rect', x: 0, y: 0 }], 0),
      {},
    )
  })
})

describe('compositeSizeRef', () => {
  it('uses the largest box member width', () => {
    assert.deepEqual(
      compositeSizeRef([
        { type: 'rect', width: 40, height: 40 },
        { type: 'rect', width: 460, height: 280 },
        { type: 'value', font_size: 236 },
      ]),
      { kind: 'width', value: 460 },
    )
  })
  it('falls back to the largest effective text size', () => {
    assert.deepEqual(
      compositeSizeRef(
        [{ type: 'value', font_size: 80 }, { type: 'label' }],
        96,
      ),
      { kind: 'font', value: 96 },
    )
    assert.equal(compositeSizeRef([]), null)
  })
})
