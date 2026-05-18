# TODOS

## Later

- [ ] **Enumerate system fonts in the font pickers.** Skia's `FontMgr::default()`
  (CoreText on macOS) already resolves installed system fonts by name via the
  `match_family_style` fallback in `load_typeface` — they're just not listed.
  Add system font families to `backend_list_fonts` (`count_families()` /
  `family_name(i)`) and show them as a separate "System" group in the Select.
  Tradeoff: system fonts are keyed by family name (not filename like
  bundled/custom), so templates referencing them aren't portable to machines
  without that font (silently falls back). Group them in the UI so the
  portability distinction is clear.

- [ ] **Aspect-ratio template variants.** Non-16:9 output now retargets the
  canvas and uniformly height-scales the authored template, so elements
  authored for 16:9 can fall off the sides on portrait/square (accepted for
  now). Future: let community templates ship per-aspect-ratio layout variants
  (e.g. 16:9 / 9:16 / 1:1) and pick the closest variant for the chosen output.
