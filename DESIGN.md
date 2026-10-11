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
- **Background:** `#000000` — solid black canvas. Panels float on it; the black shows through the 8px gaps between zones.
- **Panel:** `#121212` — one rounded panel per zone (header, sidebars, center canvas)
- **Panel 2:** `#1C1C1C` — filled controls (inputs, selects, chips) and row hover states
- **Panel 3:** `#242424` — nested surfaces, control hover, slider tracks
- **Hairline:** `rgba(255,255,255,0.06)` — internal dividers *within* a panel only. Zones are separated by gaps, never borders. Controls are filled, not outlined.
- **Dim:** `#6F6F6F` — icon defaults, tertiary text
- **Muted:** `#A7A7A7` — secondary text, labels, placeholders
- **Primary text:** `#FAFAFA`
- **Accent:** `#DC143C` — Crimson. Used only for: active element states, primary CTAs (Render is solid crimson with a soft glow), selected rows. Not for errors. Not scattered.
- **Accent hover:** `#F04060` — hover state for solid-crimson buttons and links
- **Accent dim:** `#7F0A22` — pressed accent backgrounds
- **Success:** `#22C55E` — saved state, render complete
- **Warning:** `#F5B544` — modified state, unsaved changes
- **Error:** `#EF4444` — distinct from accent red, for actual error states only
- **Dark mode:** App is dark-only. No light mode needed — this is a video editing context.

## Spacing
- **Base unit:** 8px
- **Density:** Comfortable — not cramped (you're reading data, not scanning prose)
- **Scale:** 2(2px) 4(4px) 6(6px) 8(8px) 12(12px) 16(16px) 24(24px) 32(32px) 48(48px) 64(64px)

## Layout
- **Approach:** Floating panels ("Faithful Spotify") — the app frame is solid black with 8px padding; each zone (header 52px, left sidebar 284px, center canvas, right panel 292px) is its own `#121212` panel with 10px radius, separated by 8px gaps. No borders between zones.
- **Max content width:** 1440px
- **Border radius:**
  - `--r-sm: 6px` — inputs, data fields, small elements. Tight = precise tool, not consumer app.
  - `--r-ctl: 8px` — header chips/buttons
  - `--r-md: 10px` — zone panels, cards, dropdowns
  - `--r-lg: 14px` — modals

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
| 2026-07-10 | "Faithful Spotify" shell redesign | Solid `#000` canvas with `#121212` panels floating on 8px gaps replaces bordered zones; controls are filled (`#1C1C1C`), not outlined; Render CTA is solid crimson with glow; soft crimson wash behind the preview. From claude.ai/design project "Cyclemetry Redesign" (option 1a). |
| 2026-10-11 | Drop the crimson canvas wash | The area behind the preview is the plain panel color; the red-to-black glow distracted from the overlay being edited |
