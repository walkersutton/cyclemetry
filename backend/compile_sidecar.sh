#!/bin/bash
set -e

# Detect target architecture
ARCH=$(uname -m)
if [ "$ARCH" == "arm64" ]; then
  TRIPLE="aarch64-apple-darwin"
else
  TRIPLE="x86_64-apple-darwin"
fi

echo "Building for $TRIPLE..."

# Clean dist
rm -rf dist build

# Run PyInstaller via uv if available
if command -v uv &> /dev/null; then
    echo "Using uv..."
    uv run pyinstaller --clean --onefile --name cyclemetry-server --add-data "demo.gpxinit:." --add-data "frames:frames" --add-data "fonts:fonts" app.py
else
    echo "uv not found, assuming environment is set up..."
    pyinstaller --clean --onefile --name cyclemetry-server --add-data "demo.gpxinit:." --add-data "frames:frames" --add-data "fonts:fonts" app.py
fi

# Create binaries dir in src-tauri
mkdir -p ../src-tauri/binaries

# Move binary
mv dist/cyclemetry-server ../src-tauri/binaries/cyclemetry-server-$TRIPLE

echo "Done. Binary located at src-tauri/binaries/cyclemetry-server-$TRIPLE"
