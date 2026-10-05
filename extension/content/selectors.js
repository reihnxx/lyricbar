// Every Spotify Web Player DOM hook LyricBar relies on lives here, so a
// Spotify UI change is a one-file fix. Verified against open.spotify.com, 2026-10.
globalThis.LYRICBAR_SELECTORS = Object.freeze({
  widget: '[data-testid="now-playing-widget"]',
  title: '[data-testid="now-playing-widget"] [data-testid="context-item-info-title"]',
  artist: '[data-testid="now-playing-widget"] [data-testid="context-item-info-artist"]',
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
