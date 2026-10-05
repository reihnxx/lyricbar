import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// mini-render.js is a classic script (shared by a content script and a page).
const context = vm.createContext({});
vm.runInContext(readFileSync(new URL('../content/mini-render.js', import.meta.url), 'utf8'), context);
const { displayFor, formatOffset } = context.LyricBarMini;

const track = (extra) => ({ title: 'Placeholder Song', artist: 'Mock Artist', lines: [{ t: 0, text: 'one' }], synced: true, ...extra });

test('shows the active line, next line and status badges', () => {
  const line = { index: 0, text: 'one', next: 'two' };
  assert.equal(displayFor({ track: track(), line, state: { isPlaying: true } }).primary, 'one');
  assert.equal(displayFor({ track: track(), line, state: { isPlaying: true } }).next, 'two');
  assert.equal(displayFor({ track: track({ synced: false }), line, state: { isPlaying: true } }).badge, '≈ unsynced');
  assert.equal(displayFor({ track: track(), line, state: { isPlaying: false } }).badge, '⏸ paused');
});

test('explains every no-lyrics state', () => {
  const none = { lines: [] };
  assert.equal(displayFor({ track: null }).primary, 'Play something on Spotify');
  assert.equal(displayFor({ track: track({ ...none, loading: true }) }).primary, 'Looking up lyrics…');
  assert.equal(displayFor({ track: track({ ...none, error: 'network' }) }).primary, "Can't reach the lyrics service");
  assert.equal(displayFor({ track: track({ ...none, instrumental: true }) }).primary, 'Instrumental');
  assert.equal(displayFor({ track: track(none) }).primary, 'No lyrics found');
  assert.equal(displayFor({ track: track({ hidden: true }) }).primary, 'Lyrics hidden for this song');
});

test('formatOffset', () => {
  assert.equal(formatOffset(500), '+0.5 s');
  assert.equal(formatOffset(-1500), '−1.5 s');
  assert.equal(formatOffset(0), '±0.0 s');
});
