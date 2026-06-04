#!/usr/bin/env bash
# Build script for macOS and Linux
# Run from the data-streamliner/ directory: bash desktop/build.sh

set -e

echo "=== Data Streamliner Desktop Build ==="
echo ""

# 1. Build the React frontend
echo ">>> Building React frontend (desktop mode)..."
cd frontend
npm ci
BUILD_TARGET=desktop npm run build
cd ..

# Copy React build output into backend/static so PyInstaller bundles it
echo ">>> Copying frontend build to backend/static..."
rm -rf backend/static
cp -r frontend/dist backend/static

# 2. Install Python dependencies (desktop subset — no psycopg2, no redis)
echo ">>> Installing Python dependencies..."
cd backend
pip install --upgrade pip
pip install -r requirements-desktop.txt
pip install pyinstaller
cd ..

# 3. Run PyInstaller
echo ">>> Running PyInstaller..."
pyinstaller desktop/DataStreamliner.spec --distpath dist/desktop --workpath build/pyinstaller --clean

echo ""
echo "=== Build complete ==="
echo "Output: dist/desktop/DataStreamliner  (Linux binary)"
echo "        dist/desktop/DataStreamliner.app  (macOS bundle)"
