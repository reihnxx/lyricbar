import { loadSettings, saveSettings } from '../lib/settings.js';

const el = (id) => document.getElementById(id);
el('version').textContent = `v${chrome.runtime.getManifest().version}`;

async function refresh() {
  let status;
  try {
    status = await chrome.runtime.sendMessage({ type: 'status' });
  } catch {
    return;
  }
  if (!status) return;

  el('song').hidden = !status.track;
  if (status.track) {
    el('track').textContent = `${status.track.title} — ${status.track.artist}`;
    el('meta').textContent = `${status.isPlaying ? '▶︎' : '⏸'} ${describe(status)}`;
    el('meta').classList.toggle('warn', Boolean(status.error) || (!status.loading && !status.source));
    el('line').textContent = status.line?.text ?? '';

    const s = status.offsetMs / 1000;
    el('offset').textContent = `${s > 0 ? '+' : s < 0 ? '−' : '±'}${Math.abs(s).toFixed(1)} s`;
    el('reset').disabled = status.offsetMs === 0;
    const { index, count } = status.match;
    el('next-match').disabled = count < 2 && !status.hidden;
    el('next-match').textContent = count > 1 ? `Wrong lyrics? Try next match (${index + 1}/${count})` : 'Wrong lyrics? Try next match';
    el('toggle-hidden').textContent = status.hidden ? 'Show lyrics' : 'Hide lyrics';
    el('retry').disabled = status.loading;
  } else {
    el('track').textContent = 'Nothing playing';
    el('meta').textContent = 'Open open.spotify.com and play something.';
    el('line').textContent = '';
  }

  const list = el('endpoints');
  list.replaceChildren(
    ...status.endpoints.map((ep) => {
      const li = document.createElement('li');
      const dot = document.createElement('span');
      dot.className = `dot ${ep.status}`;
      const text = document.createElement('span');
      text.textContent = `${ep.url} — ${ep.status === 'waiting' ? 'not running' : ep.status}`;
      li.append(dot, text);
      return li;
    }),
  );
}

function describe(status) {
  if (status.loading) return 'looking up lyrics…';
  if (status.hidden) return 'lyrics hidden for this song';
  if (status.error) return 'lyrics service unreachable — retrying…';
  if (!status.source) return 'no lyrics found';
  if (status.instrumental) return 'instrumental';
  const source = status.source === 'spotify' ? 'Spotify' : 'LRCLIB';
  return `${source} · ${status.synced ? 'synced' : 'unsynced (timing estimated)'} · ${status.lineCount} lines`;
}

function command(action, extra = {}) {
  chrome.runtime.sendMessage({ type: 'command', action, ...extra }).then(refresh, () => {});
}

// Picture-in-Picture needs a click inside the Spotify tab, so bring that tab
// forward and point at LyricBar's button in the player bar.
async function showFloating() {
  const [tab] = await chrome.tabs.query({ url: 'https://open.spotify.com/*' });
  if (!tab) {
    chrome.tabs.create({ url: 'https://open.spotify.com/' });
    return;
  }
  await chrome.windows.update(tab.windowId, { focused: true });
  await chrome.tabs.update(tab.id, { active: true });
  chrome.tabs.sendMessage(tab.id, { type: 'highlight-float-button' }).catch(() => {});
  window.close();
}

let savedTimer;
function flashSaved() {
  el('saved').textContent = 'Saved';
  clearTimeout(savedTimer);
  savedTimer = setTimeout(() => (el('saved').textContent = ''), 1200);
}

async function init() {
  const settings = await loadSettings();
  el('spotifyProvider').checked = settings.spotifyProvider;
  el('offsetMs').value = settings.offsetMs;
  el('endpoints-input').value = settings.endpoints.join('\n');

  el('spotifyProvider').addEventListener('change', (e) => saveSettings({ spotifyProvider: e.target.checked }).then(flashSaved));
  el('offsetMs').addEventListener('change', (e) => saveSettings({ offsetMs: Number(e.target.value) || 0 }).then(flashSaved));
  el('endpoints-input').addEventListener('change', (e) => {
    const endpoints = e.target.value.split('\n').map((s) => s.trim()).filter((s) => /^wss?:\/\//.test(s));
    saveSettings({ endpoints }).then(flashSaved);
  });

  el('float').addEventListener('click', showFloating);
  el('float-window').addEventListener('click', () => chrome.runtime.sendMessage({ type: 'open-mini' }));

  el('earlier').addEventListener('click', () => command('offset', { deltaMs: 500 }));
  el('later').addEventListener('click', () => command('offset', { deltaMs: -500 }));
  el('reset').addEventListener('click', () => command('offset-reset'));
  el('next-match').addEventListener('click', () => command('next-match'));
  el('toggle-hidden').addEventListener('click', () => command('toggle-hidden'));
  el('retry').addEventListener('click', () => command('retry'));

  refresh();
  setInterval(refresh, 500);
}

init();
