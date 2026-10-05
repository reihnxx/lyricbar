import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lineIndexAt, positionAt, linePayload, LyricSync } from '../lib/sync.js';

const LINES = [
  { t: 1000, text: 'first' },
  { t: 3000, text: 'second' },
  { t: 6000, text: 'third' },
];

test('lineIndexAt finds the active line', () => {
  assert.equal(lineIndexAt(LINES, 0), -1);
  assert.equal(lineIndexAt(LINES, 1000), 0);
  assert.equal(lineIndexAt(LINES, 2999), 0);
  assert.equal(lineIndexAt(LINES, 3000), 1);
  assert.equal(lineIndexAt(LINES, 99999), 2);
  assert.equal(lineIndexAt([], 5), -1);
});

test('positionAt interpolates only while playing and clamps', () => {
  assert.equal(positionAt({ isPlaying: true, positionMs: 1000, ts: 0 }, 500), 1500);
  assert.equal(positionAt({ isPlaying: false, positionMs: 1000, ts: 0 }, 500), 1000);
  assert.equal(positionAt({ isPlaying: true, positionMs: 1000, ts: 0 }, 9000, 5000), 5000);
});

test('linePayload includes next line and boundaries', () => {
  assert.deepEqual(linePayload(LINES, 1), { index: 1, text: 'second', next: 'third', startMs: 3000, endMs: 6000 });
  assert.deepEqual(linePayload(LINES, -1), { index: -1, text: null, next: 'first', startMs: 0, endMs: 1000 });
  assert.deepEqual(linePayload(LINES, 2), { index: 2, text: 'third', next: null, startMs: 6000, endMs: null });
});

function fakeClock() {
  let now = 0;
  const timers = [];
  return {
    now: () => now,
    setTimer: (fn, ms) => { const id = timers.length; timers.push({ fn, at: now + ms, done: false }); return id; },
    clearTimer: (id) => { if (timers[id]) timers[id].done = true; },
    advance(ms) {
      const end = now + ms;
      for (;;) {
        const due = timers.filter((t) => !t.done && t.at <= end).sort((a, b) => a.at - b.at)[0];
        if (!due) break;
        now = due.at;
        due.done = true;
        due.fn();
      }
      now = end;
    },
  };
}

test('LyricSync emits each line once, at the right time', () => {
  const clock = fakeClock();
  const seen = [];
  const sync = new LyricSync((p) => seen.push([clock.now(), p.index]), clock);
  sync.setLines(LINES, 10000);
  sync.setState({ isPlaying: true, positionMs: 0, ts: 0 });
  clock.advance(7000);
  assert.deepEqual(seen.map(([, i]) => i), [-1, 0, 1, 2]);
  assert.ok(seen[1][0] >= 1000 && seen[1][0] < 1050);
  assert.ok(seen[3][0] >= 6000 && seen[3][0] < 6050);
});

test('LyricSync handles pause, seek and offset', () => {
  const clock = fakeClock();
  const seen = [];
  const sync = new LyricSync((p) => seen.push(p.index), clock);
  sync.setLines(LINES, 10000);
  sync.setState({ isPlaying: false, positionMs: 1500, ts: 0 });
  clock.advance(10000);
  assert.deepEqual(seen, [0]); // paused: nothing advances
  sync.setState({ isPlaying: true, positionMs: 6500, ts: clock.now() }); // seek forward
  assert.deepEqual(seen, [0, 2]);
  sync.setState({ isPlaying: false, positionMs: 2500, ts: clock.now() });
  sync.setOffset(600); // lyrics 600ms earlier → 3100 → line 1
  assert.deepEqual(seen, [0, 2, 0, 1]);
});
