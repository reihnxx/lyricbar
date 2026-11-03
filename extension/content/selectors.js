// Every Spotify Web Player DOM hook LyricBar relies on lives here, so a
// Spotify UI change is a one-file fix. Verified against open.spotify.com, 2026-11 (widget renamed to "-v2" then; old names kept as fallback).
globalThis.LYRICBAR_SELECTORS = Object.freeze({
  widget: '[data-testid="now-playing-widget-v2"], [data-testid="now-playing-widget"]',
  // v2: the title is the album link (the only link outside the byline);
  // the byline holds the artist links.
  title:
    '[data-testid="now-playing-widget-v2"] a[href^="/album/"], [data-testid="now-playing-widget-v2"] a[href^="/show/"], ' +
    '[data-testid="now-playing-widget"] [data-testid="context-item-info-title"]',
  artist:
    '[data-testid="now-playing-widget-v2-byline"] a[href^="/artist/"], ' +
    '[data-testid="now-playing-widget"] [data-testid="context-item-info-artist"]',
  position: '[data-testid="playback-position"]',
  duration: '[data-testid="playback-duration"]',
  // <input type=range> whose `max` is the exact track duration in ms.
  // (Its `value` is rounded to `step`, so don't use it for position.)
  progressInput: '[data-testid="playback-progressbar"] input[type="range"]',
  // Carries `--progress-bar-transform: <percent>%` — the position the bar is
  // animating *towards* over `--progress-bar-duration` ms.
  progressBar: '[data-testid="playback-progressbar"] [data-testid="progress-bar"]',
  playPause: '[data-testid="control-button-playpause"]',
  // LyricBar's floating-lyrics button is inserted right before this
  // (first match wins): the "Lyrics" button, else the queue button.
  buttonAnchor: ['[data-testid="lyrics-button"]', '[data-testid="control-button-queue"]'],
});
