# Publishing to the Chrome Web Store / Edge Add-ons

A store listing turns installation into one click ("Add to Brave/Chrome") and
gives automatic updates. Brave, Arc, Opera and Vivaldi install from the Chrome
Web Store too.

1. Register as a developer (Chrome Web Store: one-time US$5; Edge Add-ons: free).
2. Run `scripts/package-extension.sh` and upload `dist/LyricBar-extension.zip`.
3. Use the texts below. Screenshots: `docs/images/floating-lyrics.png`,
   `touchbar-lyrics.png`, `extension-popup.png` (store wants 1280×800 or 640×400 —
   place them on a plain background).
4. After approval, add the store link to both READMEs (top of "Install").

## Listing

**Name:** LyricBar — Spotify lyrics on your Touch Bar & a floating window

**Summary (≤132 chars):** Synced lyrics for the Spotify Web Player in an always-on-top window, or on your MacBook Touch Bar.

**Description (EN):**
LyricBar shows time-synced lyrics for whatever you play on open.spotify.com.
• Floating lyrics window that stays above all your windows (Windows, macOS, Linux)
• MacBook Touch Bar and menu bar display with the free LyricBar Mac app
• Fix lyrics per song: shift timing, try another match, or hide them
• No login, no API keys, no tracking. Open source (MIT).
Lyrics come from LRCLIB, a free community database.

**Deskripsi (ID):**
LyricBar menampilkan lirik tersinkron untuk lagu yang kamu putar di open.spotify.com.
• Jendela lirik melayang yang selalu di atas (Windows, macOS, Linux)
• Tampil di Touch Bar dan menu bar MacBook dengan app Mac LyricBar (gratis)
• Perbaiki lirik per lagu: geser timing, coba versi lain, atau sembunyikan
• Tanpa login, tanpa API key, tanpa pelacakan. Open source (MIT).
Lirik berasal dari LRCLIB, database lirik komunitas yang gratis.

**Category:** Entertainment

## Permission justifications

| Permission | Why |
|---|---|
| `storage` | Remember settings and per-song choices (timing offset, chosen lyrics, hidden). |
| Host `open.spotify.com` | Read the song title/artist/position from the Web Player and add the floating-lyrics button. |
| Host `lrclib.net` | Look up lyrics for the current song. |

**Single purpose:** Show synced lyrics for the song playing in the Spotify Web Player.

**Data use:** Song title, artist, album and duration are sent to lrclib.net to find
lyrics. Nothing else leaves the computer; no personal data is collected or sold.
Displays on the same computer receive lyrics via ws://127.0.0.1.
