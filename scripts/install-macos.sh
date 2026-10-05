#!/usr/bin/env bash
# One-line installer for LyricBar on macOS:
#   curl -fsSL https://raw.githubusercontent.com/reihnxx/lyricbar/main/scripts/install-macos.sh | bash
# Downloads the latest release, puts LyricBar.app in /Applications (or
# ~/Applications), and opens it. Files downloaded with curl are not
# quarantined, so there is no "unidentified developer" prompt.
set -euo pipefail

URL="https://github.com/reihnxx/lyricbar/releases/latest/download/LyricBar-macos.zip"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo "♪ Downloading LyricBar…"
curl -fL --progress-bar "$URL" -o "$TMP/LyricBar.zip"
ditto -x -k "$TMP/LyricBar.zip" "$TMP"

DEST="/Applications"
if [[ ! -w "$DEST" ]]; then
  DEST="$HOME/Applications"
  mkdir -p "$DEST"
fi

pkill -x LyricBar 2>/dev/null || true
rm -rf "$DEST/LyricBar.app"
mv "$TMP/LyricBar.app" "$DEST/"
xattr -dr com.apple.quarantine "$DEST/LyricBar.app" 2>/dev/null || true

open "$DEST/LyricBar.app"
echo "✓ LyricBar installed in $DEST and running — look for ♪ in your menu bar."
echo "  Next: add the browser extension → https://github.com/reihnxx/lyricbar#readme"
