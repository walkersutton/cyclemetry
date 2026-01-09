<div align="center" style="text-align: center;">
  <img src="/app/public/logo192.png" style="width: 64px; border-radius: 12px;">
  <h1>Cyclemetry</h1>
  <p>
    <b>Create stunning telemetry video overlays from GPX data.</b>
  </p>
</div>

![The_Tremola_by Safa_Brian](https://github.com/walkersutton/cyclemetry/assets/25811783/71aa4902-dd29-453f-b4a5-a87ddabd2437)

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) & [pnpm](https://pnpm.io/)
- [Python 3.10+](https://www.python.org/) & [uv](https://docs.astral.sh/uv/)
- [Rust](https://www.rust-lang.org/) (for building the Tauri app)

### Setup

```bash
# Install root dependencies
pnpm install

# Install frontend dependencies
cd app && pnpm install

# Setup backend
cd ../backend
uv sync
```

### Development

We use a port-less development workflow using Unix domain sockets in production to eliminate port conflicts.

```bash
# Run both frontend & backend concurrently (Development Mode - TCP)
pnpm dev
```

### Testing Production (Unix Socket Mode)

To verify the port-less Unix domain socket communication locally:

```bash
# Build sidecar and run in socket mode
pnpm buildtest
```

## ✨ Features

- **Route Tracking**: Real-time position on the map.
- **Elevation Profiles**: Dynamic grade and altitude visualization.
- **Rich Metrics**: Speed, Power, Heart Rate, Cadence, Gradient, and Temperature.
- **Customizable Overlays**: Flexible designer to match your video style.

## 📦 Releasing

To create a new release and generate the `.dmg`:

```bash
git tag v0.2.0
git push origin v0.2.0
```

This triggers GitHub Actions to build the sidecar, package the Tauri app, and publish to [GitHub Releases](https://github.com/walkersutton/cyclemetry/releases).

## 🛠 Project Structure

- `app/`: React + Vite frontend (Tailwind CSS, Lucide Icons).
- `backend/`: Python Flask server (waitress, moviepy, pillow) - handled via Unix sockets.
- `src-tauri/`: Rust layer proxying IPC between frontend and backend.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
