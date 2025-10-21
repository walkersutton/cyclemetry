<div align="center" style="text-align: center;">
  <img src="https://i.imgur.com/O7GvHXd.png"/ style="width: 69px;">
  <h1>cyclemetry</h1>
  <p>
    <b>cyclemetry is a tool for creating telemetry video overlays</b>
  </p>
</div>

![The_Tremola_by Safa_Brian](https://github.com/walkersutton/cyclemetry/assets/25811783/71aa4902-dd29-453f-b4a5-a87ddabd2437)

## Setup

### Prerequisites

- [Docker](https://www.docker.com/products/docker-desktop/)
- [Make](https://www.gnu.org/software/make/make.html)

```bash
$ git clone
$ cd cyclemetry
$ make dev
$ open http://localhost:3000
```

## Features

<img src="https://github.com/user-attachments/assets/8a811981-7933-4bed-b833-c511df373fe0" width="500">

- Route tracking
- Elevation profiles
- Metrics
  - Speed
  - Power
  - Heart rate
  - Cadence
  - Elevation
  - Gradient
- Check out the [community templates](https://github.com/walkersutton/cyclemetry/tree/main/templates) to see what Cyclemetry is capable of

## Videos Made With Cyclemetry

| [![Testing Cyclemetry By Paolo Tagliaferri](https://img.youtube.com/vi/JmavtEU6Vvo/0.jpg)](https://www.youtube.com/watch?v=JmavtEU6Vvo) | [![Descent into Rincon by Walker Sutton](https://img.youtube.com/vi/i2vdPIfIswc/0.jpg)](https://www.youtube.com/watch?v=i2vdPIfIswc) |
| --- | --- |
| [![Stunt Descent by Walker Sutton](https://img.youtube.com/vi/96_nwEF-Bfc/0.jpg)](https://www.youtube.com/watch?v=96_nwEF-Bfc) | [![Seward Park Crit by Walker Sutton](https://img.youtube.com/vi/gKugPA0xGhw/0.jpg)](https://www.youtube.com/watch?v=gKugPA0xGhw) |

## [Alternative Tools](https://alternativeto.net/software/garmin-virb-edit/)

- [DashWare](http://www.dashware.net/) (only available on Windows)
- [Garmin VIRB Edit](https://www.garmin.com/en-US/p/573412)
- [GoPro Telemetry Extractor](https://goprotelemetryextractor.com/) ($150/$300? - fuck that)


## Development

### Makefile Commands

```bash
$ make format       # Format all code
$ make lint         # Run linters
$ make check        # Run all checks
$ make dev          # Start with hot-reload
$ make logs         # View all logs
$ make down         # Stop everything
$ make clean        # Remove all containers/volumes
$ make restart      # Restart services
```

## Contributors

- All contributions are welcome
