#!/usr/bin/env node
// Pretends to be the browser extension so you can test (or develop) a
// frontend without Spotify. Lines below are invented placeholder text.
//
//   node scripts/mock-sender.mjs [ws://127.0.0.1:8974] [scenario flags]
//
//   --long        include a line wider than the Touch Bar
//   --unsynced    lyrics without real timing (synced:false)
//   --no-lyrics   song with no lyrics found
//   --error       lyrics service unreachable
//   --hidden      lyrics hidden for this song by the user
//   --paused      playback paused on line 2
//
// Commands sent back by the frontend (timing nudges, next match, hide,
// retry) are applied and logged, like the real extension would.
const url = process.argv.find((a) => a.startsWith('ws')) ?? 'ws://127.0.0.1:8974';
const flag = (name) => process.argv.includes(`--${name}`);

const text = [
  'This is LyricBar test line one',
  'Each line arrives on time from the extension',
  '♪',
  flag('long')
    ? 'Here is a deliberately very long line that is much wider than the Touch Bar so the view has to scroll it smoothly to the end'
    : 'Short line',
  'Last placeholder line, then it loops',
];
const STEP = 2500;
const lines = text.map((t, i) => ({ t: 1000 + i * STEP, text: t }));
const durationMs = 1000 + text.length * STEP;

// Two fake candidates so "try next match" has something to switch to.
const options = flag('no-lyrics') || flag('error') ? [] : [
  { key: 'lrclib:1', label: 'Placeholder Song — Mock Artist', lines },
  { key: 'lrclib:2', label: 'Placeholder Song (Alt) — Mock Artist', lines: lines.map((l) => ({ ...l, text: `[alt] ${l.text}` })) },
];
const song = { offsetMs: 0, choice: 0, hidden: flag('hidden') };

const ws = new WebSocket(url);
const send = (msg) => ws.send(JSON.stringify(msg));

function current() {
  return song.hidden ? null : options[song.choice] ?? null;
}

function sendTrack() {
  const opt = current();
  send({
    type: 'track', id: null, title: 'Placeholder Song', artist: 'Mock Artist', album: 'Test', durationMs,
    loading: false,
    source: opt ? 'lrclib' : null,
    synced: opt ? !flag('unsynced') : false,
    instrumental: false,
    lines: opt?.lines ?? [],
    offsetMs: song.offsetMs,
    match: { index: opt ? song.choice : -1, count: options.length, label: opt?.label ?? null },
    hidden: song.hidden,
    error: flag('error') ? 'network' : null,
  });
}

let start = Date.now();
let index = -2;
let paused = false;
let pausedAt = 0;

function tick() {
  let pos = paused ? pausedAt : Date.now() - start + song.offsetMs;
  if (!paused && pos >= durationMs) {
    start = Date.now();
    pos = 0;
    send({ type: 'state', isPlaying: true, positionMs: 0, ts: start });
  }
  if (flag('paused') && !paused && index === 1) {
    paused = true;
    pausedAt = pos;
    send({ type: 'state', isPlaying: false, positionMs: pos, ts: Date.now() });
    console.log('paused');
  }
  const ls = current()?.lines ?? [];
  const i = ls.findLastIndex((l) => l.t <= pos);
  if (i === index || !ls.length) return;
  index = i;
  const line = ls[i];
  send({ type: 'line', index: i, text: line?.text ?? null, next: ls[i + 1]?.text ?? null, startMs: line?.t ?? 0, endMs: ls[i + 1]?.t ?? null });
  console.log(`line ${i}: ${line?.text ?? '(before first line)'}`);
}

ws.addEventListener('open', () => {
  console.log(`connected to ${url} — Ctrl+C to stop`);
  send({ type: 'hello', v: 1, client: 'mock-sender', version: '0.2.0' });
  start = Date.now();
  sendTrack();
  send({ type: 'state', isPlaying: true, positionMs: 0, ts: start });
  setInterval(tick, 50);
});

ws.addEventListener('message', (event) => {
  const msg = JSON.parse(event.data);
  if (msg.type !== 'command') return;
  console.log('command:', msg.action, msg.deltaMs ?? '');
  if (msg.action === 'offset') song.offsetMs += msg.deltaMs;
  if (msg.action === 'offset-reset') song.offsetMs = 0;
  if (msg.action === 'next-match' && options.length) { song.choice = (song.choice + 1) % options.length; song.hidden = false; }
  if (msg.action === 'toggle-hidden') song.hidden = !song.hidden;
  index = -2;
  sendTrack();
});

ws.addEventListener('close', () => { console.log('disconnected'); process.exit(0); });
ws.addEventListener('error', () => { console.error(`can't reach ${url} — is LyricBar.app running?`); process.exit(1); });
process.on('SIGINT', () => { send({ type: 'clear' }); setTimeout(() => process.exit(0), 100); });
