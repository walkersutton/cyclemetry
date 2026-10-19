# TODOS

## Bugs (P0)

- [x] **Pre-existing test failure: `render::frame::tests::layer_order_honors_explicit_ids_then_array_order`**: verified passing on main (stale entry); hardened template deserialization for floating point numbers across coordinates and dimensions so float inputs do not trigger serde parse failures.

## Later

- [ ] **Finalize the donation backend for the Fund the App page.** `website/content/fund.json` currently points `donateUrl` at `https://github.com/sponsors/walkersutton` as a **placeholder**. GitHub Sponsors can't be tied to a repo — it targets an account — so to make donations read as "Cyclemetry" not "Walker Sutton" we'd need a `cyclemetry` GitHub org (heavier; org goals are monthly-subscription oriented). Leaning toward **Ko-fi** (`ko-fi.com/cyclemetry`) instead: branded page, built-in one-time goal bar, low fees. Once chosen: update `donateUrl` in `fund.json`, and update the `raised`/`supporters`/`lastUpdated` totals by hand as donations arrive. The page renders its own $99/year progress graphic from that JSON, so the platform only needs to accept money under the Cyclemetry name.

- [x] **Move overlay trim ears to the bottom timeline.** The left sidebar already has draggable handles for `scene.start` / `scene.end`; move or duplicate that interaction on the bottom playback timeline so users can trim the overlay window where they scrub. The ears should bracket the overlay window within the full activity range, similar to the distance-reference dot, and keep the sidebar inputs in sync.

- [ ] **Aspect-ratio template variants.** Non-16:9 output now retargets the
  canvas and uniformly height-scales the authored template, so elements
  authored for 16:9 can fall off the sides on portrait/square (accepted for
  now). Future: let community templates ship per-aspect-ratio layout variants
  (e.g. 16:9 / 9:16 / 1:1) and pick the closest variant for the chosen output.

- [x] **Composite elements.** A "composite" is a first-class UI concept that wraps a `scene.editor.groups` group behind a simpler interface. The user sees one thing (e.g. "Speed gauge") instead of the 2–3 raw elements that make it up.
  - **Architecture (decided 2026-06): composites are built on the anchor primitive, not a new Rust element type.** Anchoring is the mechanism — `anchor: { target, point, self_point, offset_x, offset_y }` on label/value/rect/image pins an element to a point on a box element (plot/meter/gauge/rect/image), resolved by `Template::resolve_anchors()` before every render/preview/measure, with `vertical_align` keeping text optically centered as values change per frame. A composite is then just authoring sugar: a group whose members ship with anchors pre-wired. This avoids a combinatorial set of bespoke Rust composite variants and makes "expand" nearly a no-op (it already IS elements).
  - **Done:** the anchor primitive — schema + Rust resolve pre-pass, vertical text alignment, WYSIWYG support (dragging a target floats anchored followers live; dragging an anchored element commits to its offset; detach/delete bakes resolved x/y), Anchor section in the properties panel with per-point text-alignment presets.
  - **Done:** `composite: true` on `scene.editor.groups[n]` (no other on-disk change); logic in `app/src/lib/composites.js`. Add menu → Composites: Gauge with value, Bar with value, Stat card (anchors pre-wired, sized for the scene, dial/bar range seeded from the activity). A composite lists as one row and selects atomically (canvas click, marquee, shift-click); copy/paste and delete act on the whole widget. Compact panel (`CompositeProperties.svelte`): name, metric (retargets readouts, unit labels, captions naming the metric, stale units/suffixes/ranges), caption text, color scheme (one swatch per distinct color, `$vars` selectable), size (edits the main box's width — or the largest text size for text-only composites — and scales every part about the origin, mirroring Rust's `Element::scale` field list), position, Expand to elements, delete. Plain groups get "Convert to composite". Single-widget bundled groups (≥2 elements, one metric) are flagged.
  - **Not yet:** canvas corner-drag on a composite's box member still resizes only that element (use the panel's Size); a unit picker in the composite panel (Expand to set one).

- [ ] **Drop `natural_width`/`natural_height` from image elements.** These are captured at insert time and persisted, but are derivable from the image file at load time. Remove from the schema and resolve dimensions lazily in the Rust renderer via `imagesize` or equivalent. Currently present in aaron (1 image) and jeff (4 images).

- [ ] **Element properties audit.**
  - [x] Course maps: hid irrelevant fill and point label controls in UI and ignored them in chart renderer (PR #57).
  - [ ] Full pass for other element types:
    1. **Basic vs. advanced categorization**: verify properties are in the correct bucket (basic vs. advanced).
    2. **Per-element property sets**: remove properties that do not apply to specific element types.
    3. **Text properties on non-text elements**: remove text controls (font, italic, text_align, etc.) for elements that do not render text.
