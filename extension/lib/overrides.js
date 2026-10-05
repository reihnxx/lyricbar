// Per-song user choices (timing nudge, chosen lyrics match, hidden), kept in
// chrome.storage.local so they survive restarts. Capped to the most recent songs.

const STORAGE_KEY = 'lyricbar.overrides';
const MAX_SONGS = 500;

export const EMPTY = Object.freeze({ offsetMs: 0, match: null, hidden: false });

export function isEmpty(o) {
  return !o.offsetMs && !o.match && !o.hidden;
}

export class Overrides {
  /** @param {chrome.storage.StorageArea | null} [storage] */
  constructor(storage = globalThis.chrome?.storage?.local ?? null) {
    this.storage = storage;
    /** @type {Map<string, {offsetMs:number, match:string|null, hidden:boolean}>} */
    this.map = new Map();
    this.loaded = this.load();
  }

  async load() {
    try {
      const data = await this.storage?.get(STORAGE_KEY);
      for (const [k, v] of data?.[STORAGE_KEY] ?? []) this.map.set(k, v);
    } catch {
      // memory only
    }
  }

  async get(songKey) {
    await this.loaded;
    return { ...EMPTY, ...this.map.get(songKey) };
  }

  async set(songKey, value) {
    await this.loaded;
    this.map.delete(songKey);
    if (!isEmpty(value)) this.map.set(songKey, { ...value });
    while (this.map.size > MAX_SONGS) this.map.delete(this.map.keys().next().value);
    try {
      await this.storage?.set({ [STORAGE_KEY]: [...this.map] });
    } catch {
      // ignore
    }
  }
}
