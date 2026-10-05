// LyricBar core: receives playback from the Spotify tab, resolves lyrics,
// tracks the active line and broadcasts everything to local frontends.
// Frontends (and the popup) can send commands back: nudge timing, try the
// next lyrics match, hide lyrics for a song, retry the lookup.
import { LyricSync } from '../lib/sync.js';
import { LyricCache } from '../lib/cache.js';
import { Broadcaster } from '../lib/transport.js';
import { findLrclibOptions } from '../lib/providers/lrclib.js';
import { artHash, fromColorLyrics } from '../lib/providers/spotify.js';
import { EMPTY, Overrides } from '../lib/overrides.js';
import { DEFAULTS, loadSettings, onSettingsChanged } from '../lib/settings.js';

const VERSION = chrome.runtime.getManifest().version;
const CLIENT_ID = `LyricBar/${VERSION} (https://github.com/reihnxx/lyricbar)`;
const MAX_SONG_OFFSET_MS = 10000;
const RETRY_DELAYS_MS = [5000, 15000, 45000, 120000];

let settings = { ...DEFAULTS };
const cache = new LyricCache();
const overrides = new Overrides();

/** @type {null | {key:string, title:string, artist:string, primaryArtist:string, album:string, durationMs:number, artUrl:string, trackId?:string}} */
let track = null;
/** LRCLIB options for the track; undefined while the lookup runs. */
let lrclibOptions;
/** Lyrics captured from the Spotify page (opt-in provider). */
let spotifyOption = null;
/** Per-song user choices. */
let override = { ...EMPTY };
/** 'network' when the lookup failed and is being retried. */
let error = null;
/** The lyrics option currently shown (null = none). */
let current = null;
/** @type {null | {isPlaying:boolean, positionMs:number, ts:number}} */
let state = null;
let lastLine = null;
let ownerPort = null;
let seq = 0;
let retryTimer = null;
let retryCount = 0;

const sync = new LyricSync((payload) => {
  lastLine = payload;
  broadcast({ type: 'line', ...payload });
});

const hub = new Broadcaster({ snapshot, onCommand: runCommand });
/** In-browser displays (floating mini window) connected via runtime ports. */
const displayPorts = new Set();

/** Send to every display: local apps over WebSocket and in-browser windows. */
function broadcast(msg) {
  hub.send(msg);
  for (const p of displayPorts) {
    try {
      p.postMessage(msg);
    } catch {
      displayPorts.delete(p);
    }
  }
}

function allOptions() {
  return [...(spotifyOption ? [spotifyOption] : []), ...(lrclibOptions ?? [])];
}

function isLoading() {
  return lrclibOptions === undefined && !spotifyOption && !error;
}

function trackMessage() {
  const options = allOptions();
  return {
    type: 'track',
    id: track.trackId ?? null,
    title: track.title,
    artist: track.artist,
    album: track.album,
    durationMs: track.durationMs,
    loading: isLoading(),
    source: current?.source ?? null,
    synced: current?.synced ?? false,
    instrumental: Boolean(current?.instrumental),
    lines: current?.lines ?? [],
    offsetMs: override.offsetMs,
    match: { index: current ? options.indexOf(current) : -1, count: options.length, label: current?.label ?? null },
    hidden: override.hidden,
    error,
  };
}

function snapshot() {
  const out = [{ type: 'hello', v: 1, client: 'extension', version: VERSION }];
  if (track) out.push(trackMessage());
  if (state) out.push({ type: 'state', ...state });
  if (lastLine) out.push({ type: 'line', ...lastLine });
  return out;
}

/** Re-pick the shown option and push everything to frontends + the sync engine. */
function update() {
  if (!track) return;
  const options = allOptions();
  const next = override.hidden ? null : options.find((o) => o.key === override.match) ?? options[0] ?? null;
  const changed = next !== current;
  current = next;
  if (changed) lastLine = null;
  broadcast(trackMessage());
  sync.offsetMs = settings.offsetMs + override.offsetMs;
  if (changed) sync.setLines(current?.lines ?? [], track.durationMs);
  else sync.tick();
}

async function loadLyrics(t, s) {
  const stale = () => s !== seq;
  if (settings.spotifyProvider) {
    const fromSpotify = await cache.get(`spotify:${t.key}`);
    if (stale()) return;
    if (fromSpotify) {
      spotifyOption = fromSpotify;
      update();
    }
  }

  let options = await cache.get(`lrclib:${t.key}`);
  if (stale()) return;
  if (options === undefined) {
    try {
      options = await findLrclibOptions(t, { clientId: CLIENT_ID });
    } catch (err) {
      if (stale()) return;
      console.warn('[LyricBar] LRCLIB lookup failed:', err);
      error = 'network';
      update();
      scheduleRetry(t, s);
      return;
    }
    await cache.set(`lrclib:${t.key}`, options);
    if (stale()) return;
  }
  error = null;
  retryCount = 0;
  lrclibOptions = options;
  update();
}

function scheduleRetry(t, s) {
  clearTimeout(retryTimer);
  const delay = RETRY_DELAYS_MS[Math.min(retryCount++, RETRY_DELAYS_MS.length - 1)];
  retryTimer = setTimeout(() => {
    if (s === seq) loadLyrics(t, s);
  }, delay);
}

function setTrack(next) {
  track = next;
  const s = ++seq;
  clearTimeout(retryTimer);
  retryCount = 0;
  lrclibOptions = undefined;
  spotifyOption = null;
  error = null;
  current = null;
  lastLine = null;
  override = { ...EMPTY };
  sync.setLines([], next.durationMs);
  broadcast(trackMessage());
  overrides.get(next.key).then((saved) => {
    if (s !== seq) return;
    override = saved;
    update();
    loadLyrics(next, s);
  });
}

function clearAll() {
  track = null;
  lrclibOptions = undefined;
  spotifyOption = null;
  error = null;
  current = null;
  state = null;
  lastLine = null;
  seq++;
  clearTimeout(retryTimer);
  sync.reset();
  broadcast({ type: 'clear' });
}

function onPlayback(msg) {
  if (!msg.track) return clearAll();
  if (!track || msg.track.key !== track.key) setTrack(msg.track);
  state = msg.state;
  broadcast({ type: 'state', ...state });
  sync.setState(state);
}

async function onSpotifyLyrics(msg) {
  if (!settings.spotifyProvider || !track) return;
  // The response embeds the album-art URL; only accept it for the art on screen.
  const hash = artHash(msg.image);
  if (!hash || hash !== artHash(track.artUrl)) return;
  const result = fromColorLyrics(msg.body, track.durationMs);
  if (!result) return;
  if (msg.trackId) track.trackId = msg.trackId;
  await cache.set(`spotify:${track.key}`, result);
  spotifyOption = result;
  update();
}

/**
 * Commands from frontends (WebSocket) or the popup:
 *   { action: 'offset', deltaMs }   nudge this song's timing (+ = earlier)
 *   { action: 'offset-reset' }
 *   { action: 'next-match' }        show the next lyrics candidate
 *   { action: 'toggle-hidden' }     hide/show lyrics for this song
 *   { action: 'retry' }             forget cached result and look up again
 */
async function runCommand(cmd) {
  if (!track || !cmd) return;
  const t = track;
  switch (cmd.action) {
    case 'offset': {
      const next = override.offsetMs + (Number(cmd.deltaMs) || 0);
      override.offsetMs = Math.max(-MAX_SONG_OFFSET_MS, Math.min(MAX_SONG_OFFSET_MS, next));
      break;
    }
    case 'offset-reset':
      override.offsetMs = 0;
      break;
    case 'next-match': {
      const options = allOptions();
      override.hidden = false;
      if (options.length) {
        const i = current ? options.indexOf(current) : -1;
        override.match = options[(i + 1) % options.length].key;
      }
      break;
    }
    case 'toggle-hidden':
      override.hidden = !override.hidden;
      break;
    case 'retry':
      await cache.delete(`lrclib:${t.key}`);
      if (t !== track) return;
      clearTimeout(retryTimer);
      retryCount = 0;
      lrclibOptions = undefined;
      error = null;
      update();
      loadLyrics(t, seq);
      return;
    default:
      return;
  }
  await overrides.set(t.key, override);
  if (t === track) update();
}

chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'display') {
    displayPorts.add(port);
    for (const msg of snapshot()) port.postMessage(msg);
    port.onMessage.addListener((msg) => {
      if (msg?.type === 'command') runCommand(msg);
    });
    port.onDisconnect.addListener(() => displayPorts.delete(port));
    return;
  }
  if (port.name !== 'spotify-tab') return;
  hub.wake();
  port.onMessage.addListener((msg) => {
    ownerPort = port;
    if (msg.type === 'playback') onPlayback(msg);
    else if (msg.type === 'spotify-lyrics') onSpotifyLyrics(msg);
  });
  port.onDisconnect.addListener(() => {
    if (port === ownerPort) {
      ownerPort = null;
      clearAll();
    }
  });
});

chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
  if (msg?.type === 'open-mini') {
    // Fallback floating window (a small normal window) for browsers without
    // Document Picture-in-Picture; it can pin itself on top from inside.
    chrome.windows.create({ url: chrome.runtime.getURL('ui/mini.html'), type: 'popup', width: 480, height: 190 });
    return;
  }
  if (msg?.type === 'command') {
    runCommand(msg).then(() => reply(true));
    return true;
  }
  if (msg?.type !== 'status') return;
  const options = allOptions();
  reply({
    endpoints: hub.status(),
    track: track && { title: track.title, artist: track.artist },
    loading: isLoading(),
    error,
    source: current?.source ?? null,
    synced: current?.synced ?? false,
    instrumental: Boolean(current?.instrumental),
    lineCount: current?.lines?.length ?? 0,
    line: lastLine,
    isPlaying: state?.isPlaying ?? false,
    offsetMs: override.offsetMs,
    hidden: override.hidden,
    match: { index: current ? options.indexOf(current) : -1, count: options.length, label: current?.label ?? null },
  });
});

function applySettings(next) {
  const spotifyTurnedOn = next.spotifyProvider && !settings.spotifyProvider;
  settings = next;
  hub.setEndpoints(settings.endpoints);
  if (!settings.spotifyProvider && spotifyOption) spotifyOption = null;
  update();
  if (spotifyTurnedOn && track) loadLyrics(track, seq);
}

loadSettings().then(applySettings);
onSettingsChanged(applySettings);
