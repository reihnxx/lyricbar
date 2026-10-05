// User settings (chrome.storage.sync) with defaults.

export const DEFAULTS = Object.freeze({
  endpoints: ['ws://127.0.0.1:8974'],
  spotifyProvider: false,
  offsetMs: 0,
});

export async function loadSettings() {
  const stored = await chrome.storage.sync.get(Object.keys(DEFAULTS));
  return { ...DEFAULTS, ...stored };
}

export function saveSettings(patch) {
  return chrome.storage.sync.set(patch);
}

/** Calls `fn(settings)` whenever settings change. */
export function onSettingsChanged(fn) {
  chrome.storage.onChanged.addListener(async (_changes, area) => {
    if (area === 'sync') fn(await loadSettings());
  });
}
