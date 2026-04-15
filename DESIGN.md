# Design System — Cyclemetry

## Product Context
- **What this is:** macOS desktop app for creating professional cycling telemetry video overlays from GPX data
- **Who it's for:** Data-focused cyclists who post ride videos to YouTube — they care about their power numbers and want overlays that look intentional, not cluttered
- **Space/industry:** Sports performance tools, video production, cycling software
- **Project type:** Desktop creative tool (Tauri + React)

## Aesthetic Direction
- **Direction:** Industrial Precision
- **Decoration level:** Minimal — typography and spacing do all the work
- **Mood:** The UI disappears. Dark, spare, cockpit-like. Every element earns its place. The overlay output is the product; the editor is the instrument panel that produces it.

## Typography
- **UI/Headers:** Geist Sans — clean, technical, purpose-built for interfaces. Replaces system-ui which has no character.
- **Data Values:** Geist Mono — tabular-nums for speed, power, HR, cadence, elevation in the control panel. Treats numbers as instrument readings, not form fields.
- **Loading:** `geist` npm package (self-hosted) or Google Fonts `family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500;600`
- **Scale:**
  - Display: 40–56px / 700 / -2.5% tracking
  - Heading: 24px / 600 / -1.5% tracking
  - Label: 13px / 500 / +1% tracking
  - Body: 14px / 400 / normal
  - Data mono: 16–40px / 500–600 / -1% tracking / tabular-nums
  - Meta mono: 11–13px / 400 / normal

## Color
- **Approach:** Restrained — color is rare and purposeful. When the accent appears, it means something.
- **Background:** `#09090B` — Zinc 950, slightly warmer than pure black. Better for long editing sessions.
- **Surface:** `#18181B` — Zinc 900, panels and cards
- **Surface 2:** `#1F1F23` — hover states, nested surfaces
- **Border:** `#27272A` — Zinc 800, primary dividers
- **Border 2:** `#3F3F46` — Zinc 700, secondary / interactive borders
- **Dim:** `#52525B` — icon defaults, tertiary text
- **Muted:** `#A1A1AA` — secondary text, labels, placeholders
- **Primary text:** `#FAFAFA`
- **Accent:** `#DC143C` — Crimson. Used only for: active element states, primary CTAs, the section dot indicators. Not for errors. Not scattered.
- **Accent dim:** `#7F0A22` — hover/pressed accent backgrounds
- **Success:** `#22C55E` — saved state, render complete
- **Warning:** `#F59E0B` — modified state, unsaved changes
- **Error:** `#EF4444` — distinct from accent red, for actual error states only
- **Dark mode:** App is dark-only. No light mode needed — this is a video editing context.

## Spacing
- **Base unit:** 8px
- **Density:** Comfortable — not cramped (you're reading data, not scanning prose)
- **Scale:** 2(2px) 4(4px) 6(6px) 8(8px) 12(12px) 16(16px) 24(24px) 32(32px) 48(48px) 64(64px)

## Layout
- **Approach:** Grid-disciplined — functional, predictable
- **Primary layout:** Two-panel: fixed-width control panel (280px) left, preview canvas right
- **Max content width:** 1440px
- **Border radius:**
  - `--r-sm: 6px` — inputs, data fields, small elements. Tight = precise tool, not consumer app.
  - `--r-md: 10px` — cards, element list items, dropdowns
  - `--r-lg: 14px` — modals, the app window chrome, panels

## Motion
- **Approach:** Minimal-functional — only transitions that aid comprehension
- **Easing:** enter: ease-out / exit: ease-in / move: ease-in-out
- **Duration:** micro: 80ms / short: 150ms / medium: 250ms
- **No:** entrance animations, scroll-driven effects, decorative motion

## Decisions Log
| Date       | Decision                     | Rationale |
|------------|------------------------------|-----------|
| 2026-04-08 | Geist Sans + Geist Mono      | System-ui has no character; mono for data values makes readings feel like instruments |
| 2026-04-08 | Crimson #DC143C as sole accent | More distinctive than red-500, cycling/racing heritage, used sparingly |
| 2026-04-08 | 6px border radius on data elements | High radius reads "consumer toy" on tool UIs; tighter corners signal precision |
| 2026-04-08 | Dark-only, no light mode      | Video editing context — always dark |
| 2026-04-08 | Industrial Precision aesthetic | The overlay is the product; the editor should disappear |
