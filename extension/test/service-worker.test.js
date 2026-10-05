// Integration test: loads the real service worker with fake chrome/WebSocket/fetch
// and drives it like the Spotify tab and a frontend would. Placeholder data only.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';

const memStorage = () => {
  const data = {};
  return { get: async (k) => ({ [k]: data[k] }), set: async (o) => void Object.assign(data, o) };
};
const listeners = { connect: [], message: [] };
globalThis.chrome = {
  runtime: {
    getManifest: () => ({ version: 'test' }),
    onConnect: { addListener: (f) => listeners.connect.push(f) },
    onMessage: { addListener: (f) => listeners.message.push(f) },
  },
  storage: { sync: { get: async () => ({}), set: async () => {} }, session: memStorage(), local: memStorage(), onChanged: { addListener() {} } },
};

const frontends = [];
globalThis.WebSocket = class FakeWebSocket {
  constructor(url) {
    this.url = url;
    this.readyState = 1;
    this.sent = [];
    frontends.push(this);
    queueMicrotask(() => this.onopen?.());
  }
  send(data) { this.sent.push(JSON.parse(data)); }
  close() {}
};

let lrclibMode = 'ok';
globalThis.fetch = async (url) => {
  if (lrclibMode === 'down') throw new TypeError('fetch failed');
  const u = new URL(url);
  const rec = (id, words) => ({ id, trackName: 'Placeholder Song', artistName: 'Mock Artist', duration: 120, syncedLyrics: `[00:01.00]${words}\n[00:03.00]${words} two` });
  if (u.pathname === '/api/get') return { ok: false, status: 404 };
  return { ok: true, status: 200, json: async () => (lrclibMode === 'none' ? [] : [rec(1, 'first take'), rec(2, 'second take')]) };
};

const settle = () => new Promise((r) => setTimeout(r, 30));
const frontend = () => frontends[0];
const lastOf = (type) => frontend().sent.filter((m) => m.type === type).at(-1);
const command = (msg) => new Promise((reply) => listeners.message[0]({ type: 'command', ...msg }, null, reply));

let port;
function play(title) {
  port.emit({
    type: 'playback',
    track: { key: `${title}|Mock Artist|120`, title, artist: 'Mock Artist', primaryArtist: 'Mock Artist', album: '', durationMs: 120000, artUrl: '' },
    state: { isPlaying: true, positionMs: 1500, ts: Date.now() },
  });
}

before(async () => {
  await import('../background/service-worker.js');
  await settle();
  const msgListeners = [];
  port = { name: 'spotify-tab', onMessage: { addListener: (f) => msgListeners.push(f) }, onDisconnect: { addListener() {} }, emit: (m) => msgListeners.forEach((f) => f(m)) };
  listeners.connect[0](port);
});

test('finds lyrics, announces them and emits the active line', async () => {
  play('Placeholder Song');
  await settle();
  const track = lastOf('track');
  assert.equal(track.loading, false);
  assert.equal(track.source, 'lrclib');
  assert.deepEqual(track.match, { index: 0, count: 2, label: 'Placeholder Song — Mock Artist' });
  assert.equal(lastOf('line').text, 'first take');
});

test('timing nudges are applied and reported', async () => {
  await command({ action: 'offset', deltaMs: 1500 }); // 1.5 s + 1.5 s → past 3 s
  assert.equal(lastOf('track').offsetMs, 1500);
  assert.equal(lastOf('line').text, 'first take two');
  await command({ action: 'offset-reset' });
  assert.equal(lastOf('track').offsetMs, 0);
});

test('a frontend can switch to the next match over the WebSocket', async () => {
  frontend().onmessage({ data: JSON.stringify({ type: 'command', action: 'next-match' }) });
  await settle();
  assert.equal(lastOf('track').match.index, 1);
  assert.equal(lastOf('line').text, 'second take');
});

test('hiding lyrics for a song clears lines, and is remembered', async () => {
  await command({ action: 'toggle-hidden' });
  assert.equal(lastOf('track').hidden, true);
  assert.deepEqual(lastOf('track').lines, []);
  play('Other Song');
  await settle();
  play('Placeholder Song');
  await settle();
  assert.equal(lastOf('track').hidden, true);
  await command({ action: 'toggle-hidden' });
  assert.equal(lastOf('track').match.index, 1, 'chosen match is remembered too');
});

test('no lyrics found is reported as such', async () => {
  lrclibMode = 'none';
  play('Unknown Song');
  await settle();
  const track = lastOf('track');
  assert.equal(track.loading, false);
  assert.equal(track.source, null);
  assert.equal(track.error, null);
  assert.equal(track.match.count, 0);
});

test('network failure reports an error, then retry recovers', async () => {
  lrclibMode = 'down';
  play('Flaky Song');
  await settle();
  assert.equal(lastOf('track').error, 'network');
  assert.equal(lastOf('track').loading, false);
  lrclibMode = 'ok';
  await command({ action: 'retry' });
  await settle();
  assert.equal(lastOf('track').error, null);
  assert.equal(lastOf('track').source, 'lrclib');
});
