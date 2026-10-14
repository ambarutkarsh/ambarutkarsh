#!/usr/bin/env bash
# Sets up two Harvey instances on this machine: ~/harvey-retentionos and ~/harvey-class.
# Usage: bash install.sh   (run from this folder; safe to re-run)
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"

for product in retentionos class; do
  dest="$HOME/harvey-$product"
  if [ ! -d "$dest" ]; then
    git clone https://github.com/ethanplusai/harvey.git "$dest"
  fi
  cp "$HERE/$product/harvey.yaml" "$dest/harvey.yaml"
  cp "$HERE/$product/skills/"*.md "$dest/skills/"
  [ -f "$dest/.env" ] || cp "$dest/.env.example" "$dest/.env"
  if [ ! -d "$dest/.venv" ]; then
    python3 -m venv "$dest/.venv"
    "$dest/.venv/bin/pip" install -q -e "$dest"
    "$dest/.venv/bin/python" -m playwright install chromium
  fi
  echo "Ready: $dest"
done

cat <<'MSG'

Next:
  1. Fill in the TODO lines in each harvey.yaml and your keys in each .env
  2. cd ~/harvey-retentionos && source .venv/bin/activate && harvey gmail auth && harvey run
  3. cd ~/harvey-class       && source .venv/bin/activate && harvey gmail auth && harvey run
  Dashboards: harvey dashboard --port 5555 (RetentionOS), harvey dashboard --port 5556 (Class)
MSG
