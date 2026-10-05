#!/usr/bin/env bash
# Packs the browser extension into dist/LyricBar-extension.zip. Unzipping it
# gives a "LyricBar-extension" folder to pick in "Load unpacked"; the same zip
# can be uploaded to the Chrome Web Store / Edge Add-ons.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIST="$ROOT/dist"
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT

mkdir -p "$DIST" "$STAGE/LyricBar-extension"
rsync -a --exclude test --exclude '.DS_Store' "$ROOT/extension/" "$STAGE/LyricBar-extension/"
rm -f "$DIST/LyricBar-extension.zip"
(cd "$STAGE" && zip -qr "$DIST/LyricBar-extension.zip" LyricBar-extension)
echo "✓ $DIST/LyricBar-extension.zip"
