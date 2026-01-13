<div align="center" style="text-align: center;">
  <img src="/app/public/logo192.png" style="width: 64px; border-radius: 12px;">
  <h1>Cyclemetry</h1>
  <p>
    <b>Create stunning telemetry video overlays from GPX data.</b>
  </p>
</div>

![The_Tremola_by Safa_Brian](https://github.com/walkersutton/cyclemetry/assets/25811783/71aa4902-dd29-453f-b4a5-a87ddabd2437)

## ✨ Features

- **Route Tracking**: Real-time position on the map.
- **Elevation Profiles**: Dynamic grade and altitude visualization.
- **Rich Metrics**: Speed, Power, Heart Rate, Cadence, Gradient, and Temperature.
- **Customizable Overlays**: Flexible designer to match your video style.

![demo](https://github.com/user-attachments/assets/7e578b89-070b-4709-b016-075fcc364b13)

## 🚀 Installation

Download the latest version for macOS from **[GitHub Releases](https://github.com/walkersutton/cyclemetry/releases)**.

Currently supported:
- **macOS** (Apple Silicon & Intel) via `.dmg`

## 🛠️ Development

### Prerequisites

- [Node.js](https://nodejs.org/) & [pnpm](https://pnpm.io/)
- [Python 3.10+](https://www.python.org/) & [uv](https://docs.astral.sh/uv/)
- [Rust](https://www.rust-lang.org/)

### Setup

```bash
# Install dependencies
pnpm install
```

### Running Locally

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

## Videos Made With Cyclemetry

| [![Testing Cyclemetry By Paolo Tagliaferri](https://img.youtube.com/vi/JmavtEU6Vvo/0.jpg)](https://www.youtube.com/watch?v=JmavtEU6Vvo) | [![Descent into Rincon by Walker Sutton](https://img.youtube.com/vi/i2vdPIfIswc/0.jpg)](https://www.youtube.com/watch?v=i2vdPIfIswc) |
| --- | --- |
| [![Stunt Descent by Walker Sutton](https://img.youtube.com/vi/96_nwEF-Bfc/0.jpg)](https://www.youtube.com/watch?v=96_nwEF-Bfc) | [![Seward Park Crit by Walker Sutton](https://img.youtube.com/vi/gKugPA0xGhw/0.jpg)](https://www.youtube.com/watch?v=gKugPA0xGhw) |
| [![Çamköy Tırmanışı ve Yağmurda Sürüş Disiplini by Berkay DEDEOĞLU](https://img.youtube.com/vi/mIcd7nUfpWU/0.jpg)](https://youtu.be/mIcd7nUfpWU?si=aqM1VSgaBr6MmCGa&t=1249) | |

## [Alternative Tools](https://alternativeto.net/software/garmin-virb-edit/)

- [DashWare](http://www.dashware.net/) (only available on Windows)
- [Garmin VIRB Edit](https://www.garmin.com/en-US/p/573412)
- [GoPro Telemetry Extractor](https://goprotelemetryextractor.com/) ($150/$300? - fuck that)

## 📦 Releasing

```bash
git tag v0.2.0
git push origin v0.2.0
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
