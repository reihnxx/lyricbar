# Contributing

Thanks for helping! LyricBar is intentionally small: a dependency-free browser
extension that does the work, and tiny native "frontends" that display it.

## Dev setup

```sh
npm test                       # extension unit + integration tests (Node ≥ 22, no install needed)
scripts/build-macos.sh         # dist/LyricBar.app, .zip and .dmg (Xcode CLT is enough)
scripts/package-extension.sh   # dist/LyricBar-extension.zip (also what the web stores take)
node scripts/mock-sender.mjs   # feed placeholder lines to a running frontend (--no-lyrics, --unsynced, …)
```

Releasing: bump the version in `extension/manifest.json`, `package.json` and
`apps/macos/Resources/Info.plist`, then push a tag (`git tag v0.2.0 && git push --tags`).
The Release workflow attaches `LyricBar.dmg`, `LyricBar-macos.zip` and
`LyricBar-extension.zip`; the README's download links always point at the latest release.

Load the extension: `brave://extensions` (or `chrome://extensions`) → enable
**Developer mode** → **Load unpacked** → pick the `extension/` folder. After
editing extension files, press the reload ↻ button on the extension card and
reload the Spotify tab.

## Spotify changed its UI and LyricBar stopped working?

All DOM hooks live in [`extension/content/selectors.js`](extension/content/selectors.js).
Open DevTools on open.spotify.com, find the new `data-testid`s, update that file.

## Adding a new display (Dock, Windows, Linux, …)

1. Read [`docs/PROTOCOL.md`](docs/PROTOCOL.md) — it's short.
2. Start a WebSocket server on `127.0.0.1:<port>` and render the `line`
   messages (or `track` + `state` if you want to sync yourself).
3. Test with `node scripts/mock-sender.mjs ws://127.0.0.1:<port>`.
4. Put it under `apps/<platform>/` with its own README and a build script.
5. Add the port to the extension's endpoint list, or propose a new default.

Ideas we'd love: macOS Dock tile, Windows taskbar thumbnail / Game Bar widget,
GNOME/KDE panel applets, Waybar/Polybar module, OBS overlay, Firefox port of
the extension, a Spotify desktop-app source (AppleScript / MPRIS / SMTC).

## Ground rules

- **Never commit lyrics.** Tests use invented placeholder lines.
- Keep the extension dependency-free and build-step-free.
- Keep frontends light: render only on change, no polling loops.
- Conventional commit messages are appreciated (`feat:`, `fix:`, `docs:` …).
