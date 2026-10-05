#!/usr/bin/env bash
# Builds dist/LyricBar.app (and dist/LyricBar-macos.zip).
# Works with just the Xcode Command Line Tools — full Xcode is not required.
#   UNIVERSAL=1 scripts/build-macos.sh   → arm64 + x86_64 binary
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PKG="$ROOT/apps/macos"
DIST="$ROOT/dist"
APP="$DIST/LyricBar.app"

cd "$PKG"
if [[ "${UNIVERSAL:-0}" == "1" ]]; then
  echo "→ building arm64 + x86_64"
  swift build -c release --triple arm64-apple-macosx11.0
  swift build -c release --triple x86_64-apple-macosx11.0
  BIN_ARM="$(swift build -c release --triple arm64-apple-macosx11.0 --show-bin-path)/LyricBar"
  BIN_X86="$(swift build -c release --triple x86_64-apple-macosx11.0 --show-bin-path)/LyricBar"
  mkdir -p "$DIST"
  lipo -create "$BIN_ARM" "$BIN_X86" -output "$DIST/LyricBar.bin"
else
  echo "→ building $(uname -m)"
  swift build -c release
  mkdir -p "$DIST"
  cp "$(swift build -c release --show-bin-path)/LyricBar" "$DIST/LyricBar.bin"
fi

echo "→ assembling $APP"
rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"
mv "$DIST/LyricBar.bin" "$APP/Contents/MacOS/LyricBar"
cp "$PKG/Resources/Info.plist" "$APP/Contents/Info.plist"
cp "$PKG/Resources/AppIcon.icns" "$APP/Contents/Resources/AppIcon.icns"

# Ad-hoc signature: enough to run locally. Releases downloaded from the
# internet still need right-click → Open the first time (not notarized).
codesign --force --sign - --timestamp=none "$APP"

(cd "$DIST" && rm -f LyricBar-macos.zip && ditto -c -k --keepParent LyricBar.app LyricBar-macos.zip)

# Drag-to-Applications disk image for non-technical users.
STAGE="$(mktemp -d)"
cp -R "$APP" "$STAGE/"
ln -s /Applications "$STAGE/Applications"
rm -f "$DIST/LyricBar.dmg"
hdiutil create -quiet -volname "LyricBar" -srcfolder "$STAGE" -ov -format UDZO "$DIST/LyricBar.dmg"
rm -rf "$STAGE"

echo "✓ $APP"
echo "✓ $DIST/LyricBar-macos.zip"
echo "✓ $DIST/LyricBar.dmg"
