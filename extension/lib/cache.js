// Small LRU cache for fetched lyrics, mirrored into chrome.storage.session
// (when available) so a restarted service worker doesn't refetch.

const STORAGE_KEY = 'lyricbar.cache';

export class LyricCache {
  /** @param {number} max @param {chrome.storage.StorageArea | null} [storage] */
  constructor(max = 50, storage = globalThis.chrome?.storage?.session ?? null) {
    this.max = max;
    this.storage = storage;
    /** @type {Map<string, any>} */
    this.map = new Map();
    this.loaded = this.storage ? this.load() : Promise.resolve();
  }

  async load() {
    try {
      const data = await this.storage.get(STORAGE_KEY);
      for (const [k, v] of data?.[STORAGE_KEY] ?? []) this.map.set(k, v);
    } catch {
      // storage unavailable — memory only
    }
  }

  async get(key) {
    await this.loaded;
    if (!this.map.has(key)) return undefined;
    const value = this.map.get(key);
    this.map.delete(key);
    this.map.set(key, value);
    return value;
  }

  async set(key, value) {
    await this.loaded;
    this.map.delete(key);
    this.map.set(key, value);
    while (this.map.size > this.max) this.map.delete(this.map.keys().next().value);
    this.persist();
  }

  async delete(key) {
    await this.loaded;
    if (this.map.delete(key)) this.persist();
  }

  persist() {
    this.storage?.set({ [STORAGE_KEY]: [...this.map] }).catch(() => {});
  }
}
