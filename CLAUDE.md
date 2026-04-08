# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Cyclemetry is a desktop app for creating video overlays with cycling telemetry data (speed, power, heart rate, elevation, etc.) from GPX files. Built with Tauri 2 (Rust shell) wrapping a React frontend and Python/Flask backend.

## Commands

All commands run from the repo root via pnpm.

```bash
# Development
pnpm dev              # Run frontend + backend concurrently (TCP mode)
pnpm dev:backend      # Flask backend only: cd backend && uv run app.py
pnpm dev:frontend     # React frontend only

# Build
pnpm build            # Full Tauri distribution build
pnpm build:sidecar    # Compile Python backend with PyInstaller (macOS aarch64)
pnpm buildtest        # Build sidecar + run in Unix socket mode

# Code quality
pnpm lint             # ESLint (frontend) + Ruff (backend)
pnpm format           # Prettier (frontend) + Ruff format (backend)
```

Backend uses `uv` as the Python package manager. Frontend uses `pnpm` with ESLint + Prettier.

## Architecture

Three-tier desktop app with two IPC modes:

```
React Frontend (Vite/app/)
        │
        │ Tauri IPC commands
        ↓
Tauri Runtime (src-tauri/ — Rust)
        │
        │ TCP (dev) or Unix socket /tmp/cyclemetry.sock (production)
        ↓
Flask Backend (backend/ — Python)
```

**Development mode (TCP):** Vite dev server on port 5173, Flask on localhost. Tauri proxies frontend requests to the Flask server.

**Production mode (Unix socket):** Flask runs as a PyInstaller-compiled binary sidecar bundled inside the Tauri app. Communication over `/tmp/cyclemetry.sock` (no port conflicts).

## Key Files

- `src-tauri/src/lib.rs` — All Tauri command handlers (`backend_render`, `backend_demo`, `backend_load_gpx`, `backend_upload`, etc.)
- `backend/app.py` — Flask routes, render orchestration, progress tracking
- `backend/scene.py` — Frame-by-frame video scene composition
- `backend/activity.py` — GPX parsing and telemetry data extraction
- `backend/constant.py` — All configurable paths (`WRITE_DIR`, `FRAMES_DIR`, `DOWNLOADS_DIR`, etc.)
- `app/src/store/useStore.js` — Zustand store with all frontend state and localStorage persistence
- `app/src/api/backend.js` — Frontend API client (calls Tauri commands)
- `app/src/components/ControlPanel.jsx` — Primary editor UI

## Template System

Overlay configuration is JSON-based. Two locations:
- **Bundled templates**: `backend/templates/` (shipped with app)
- **User templates**: `{WRITE_DIR}/templates/` (user-created, persisted locally)

Templates define scene timing, metric label positions/styles, and visual properties.

## Path Resolution

`backend/constant.py` controls all output paths. When running from source (`__file__` is a `.py`), paths resolve relative to the repo. When bundled (PyInstaller), paths use `sys._MEIPASS` for read-only assets and `/tmp/cyclemetry/` for writable output. Final videos land in `~/Downloads/Cyclemetry/`.

## Notes

- macOS only (aarch64 + x86_64 via universal dmg)
- FFmpeg binary is bundled in `backend/ffmpeg` — not a system dependency
- Backend does lazy imports of numpy/scipy/matplotlib to reduce startup time
- Render progress is tracked via global state dict in `app.py`; poll with `backend_progress` Tauri command
- Frontend uses `isUpdatingFromConfig` flag to prevent circular Zustand state updates when syncing timeline slider with config editor
