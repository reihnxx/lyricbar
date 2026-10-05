// Runs in the open.spotify.com tab (isolated world). Reads what is playing
// from the Web Player DOM and streams it to the service worker. Works for
// local playback and for Spotify Connect (playing on phone/desktop) alike.
(() => {
  const S = globalThis.LYRICBAR_SELECTORS;
  const POLL_MS = 250;
  const RESYNC_MS = 10000; // also keeps the service worker alive
  const SEEK_TOLERANCE_MS = 1200;
  const MOVING_WINDOW_MS = 1600; // the bar updates every ~1000ms while playing
  const PLAYING_LABEL = /pause|jeda|pausa|一時停止|暂停|暫停|일시정지|пауза/i;
  const PAUSED_LABEL = /play|putar|reproduc|lecture|abspielen|wiedergabe|riproduci|再生|播放|재생|воспроизв/i;

  const $ = (sel) => document.querySelector(sel);

  let port = null;
  let dead = false;
  let timer = null;
  let spotifyProvider = false;

  let barEl = null;
  let barObserver = null;
  /** Latest progress-bar update: { targetMs, transitionMs, at } */
  let barSample = null;
  let lastMovementAt = 0;

  let pendingKey = null; // debounce: a new track must be seen twice
  let sentTrackKey = null;
  let sentState = null;
  let sentAt = 0;
  let missingSince = 0;

  function parseClock(text) {
    const parts = (text || '').trim().split(':').map(Number);
    if (!parts.length || parts.some(Number.isNaN)) return null;
    return parts.reduce((acc, n) => acc * 60 + n, 0) * 1000;
  }

  function readBar() {
    const style = barEl?.getAttribute('style') || '';
    const pct = /--progress-bar-transform:\s*([\d.]+)%/.exec(style);
    const dur = /--progress-bar-duration:\s*(\d+)ms/.exec(style);
    return pct ? { pct: parseFloat(pct[1]), transitionMs: dur ? Number(dur[1]) : 0 } : null;
  }

  function onBarMutation() {
    const bar = readBar();
    const durationMs = Number($(S.progressInput)?.max) || 0;
    if (!bar || !durationMs) return;
    const targetMs = (bar.pct / 100) * durationMs;
    if (!barSample || Math.abs(targetMs - barSample.targetMs) > 1) lastMovementAt = Date.now();
    barSample = { targetMs, transitionMs: bar.transitionMs, at: Date.now() };
  }

  function watchBar() {
    const el = $(S.progressBar);
    if (el === barEl) return;
    barObserver?.disconnect();
    barEl = el;
    barSample = null;
    if (!el) return;
    barObserver = new MutationObserver(onBarMutation);
    barObserver.observe(el, { attributes: true, attributeFilter: ['style'] });
    onBarMutation();
  }

  function readTrack() {
    const md = navigator.mediaSession?.metadata;
    const title = ($(S.title)?.textContent || md?.title || '').trim();
    if (!title) return null;
    const domArtists = [...new Set([...document.querySelectorAll(S.artist)].map((e) => e.textContent.trim()))].filter(Boolean);
    const artist = (md?.artist || domArtists.join(', ')).trim();
    const durationMs = Number($(S.progressInput)?.max) || parseClock($(S.duration)?.textContent) || 0;
    return {
      key: `${title}␟${artist}␟${Math.round(durationMs / 1000)}`,
      title,
      artist,
      primaryArtist: domArtists[0] || artist.split(',')[0].trim(),
      album: (md?.album || '').trim(),
      durationMs,
      artUrl: md?.artwork?.[0]?.src || '',
    };
  }

  function readIsPlaying(now) {
    const label = $(S.playPause)?.getAttribute('aria-label') || '';
    if (PLAYING_LABEL.test(label)) return true;
    if (PAUSED_LABEL.test(label)) return false;
    return now - lastMovementAt < MOVING_WINDOW_MS;
  }

  function readState(now) {
    const isPlaying = readIsPlaying(now);
    if (barSample) {
      // The bar animates towards `targetMs`; the real position at the moment of
      // the update was `targetMs - transitionMs`.
      return { isPlaying, positionMs: Math.max(0, barSample.targetMs - barSample.transitionMs), ts: barSample.at };
    }
    const pos = parseClock($(S.position)?.textContent);
    return pos === null ? null : { isPlaying, positionMs: pos + 500, ts: now };
  }

  function predicted(state, now) {
    return state.positionMs + (state.isPlaying ? now - state.ts : 0);
  }

  function send(msg) {
    if (dead) return;
    if (!port) connect();
    try {
      port?.postMessage(msg);
    } catch {
      port = null;
    }
  }

  function poll() {
    if (dead) return;
    if (!chrome.runtime?.id) return shutdown(); // extension reloaded/removed
    const now = Date.now();
    watchBar();

    const track = readTrack();
    if (!track) {
      if (sentTrackKey && !missingSince) missingSince = now;
      if (sentTrackKey && now - missingSince > 2000) {
        send({ type: 'playback', track: null });
        sentTrackKey = null;
        sentState = null;
      }
      return;
    }
    missingSince = 0;

    if (track.key !== sentTrackKey) {
      if (pendingKey !== track.key) {
        pendingKey = track.key;
        return;
      }
    }
    pendingKey = null;

    const state = readState(now);
    if (!state) return;
    const changed =
      track.key !== sentTrackKey ||
      !sentState ||
      state.isPlaying !== sentState.isPlaying ||
      Math.abs(predicted(state, now) - predicted(sentState, now)) > SEEK_TOLERANCE_MS ||
      now - sentAt > RESYNC_MS;
    if (!changed) return;

    send({ type: 'playback', track, state });
    sentTrackKey = track.key;
    sentState = state;
    sentAt = now;
  }

  function connect() {
    try {
      port = chrome.runtime.connect({ name: 'spotify-tab' });
    } catch {
      return shutdown();
    }
    port.onDisconnect.addListener(() => {
      port = null;
      // Service worker restarted: resend everything on the next poll.
      sentTrackKey = null;
      sentState = null;
    });
  }

  function shutdown() {
    dead = true;
    barObserver?.disconnect();
    clearInterval(timer);
  }

  // --- Spotify provider bridge (opt-in) -----------------------------------
  function pushConfigToPage() {
    window.postMessage({ source: 'lyricbar-content', type: 'config', spotifyProvider }, location.origin);
  }

  window.addEventListener('message', (event) => {
    if (event.source !== window || event.origin !== location.origin) return;
    const data = event.data;
    if (data?.source !== 'lyricbar-main' || data.type !== 'spotify-lyrics' || !spotifyProvider) return;
    send({ type: 'spotify-lyrics', trackId: data.trackId, image: data.image, body: data.body });
  });

  chrome.storage.sync.get('spotifyProvider').then((s) => {
    spotifyProvider = Boolean(s.spotifyProvider);
    pushConfigToPage();
  });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && 'spotifyProvider' in changes) {
      spotifyProvider = Boolean(changes.spotifyProvider.newValue);
      pushConfigToPage();
    }
  });

  // --- Floating lyrics window (works on every OS) -------------------------
  // Opened from a ♪ button injected into Spotify's player bar. Uses Document
  // Picture-in-Picture (always on top); falls back to a normal small window.
  const BUTTON_ID = 'lyricbar-float-button';
  let pipWindow = null;

  function ensureButton() {
    if (document.getElementById(BUTTON_ID)) return;
    const anchor = S.buttonAnchor.map((sel) => $(sel)).find(Boolean);
    if (!anchor?.parentElement) return;
    const button = document.createElement('button');
    button.id = BUTTON_ID;
    button.type = 'button';
    button.title = 'LyricBar — floating lyrics (always on top)';
    button.setAttribute('aria-label', 'LyricBar floating lyrics');
    button.style.cssText =
      'all:unset;display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;' +
      'border-radius:50%;cursor:pointer;color:#b3b3b3;transition:color .15s, transform .15s;flex:none';
    button.innerHTML =
      '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M9 15.5V9.2l5-1.2v6"/><circle cx="7.6" cy="15.5" r="1.4"/><circle cx="12.6" cy="14" r="1.4"/></svg>';
    button.addEventListener('mouseenter', () => (button.style.color = '#fff'));
    button.addEventListener('mouseleave', () => (button.style.color = pipWindow ? '#1ed760' : '#b3b3b3'));
    button.addEventListener('click', () => (pipWindow ? pipWindow.close() : openFloating()));
    anchor.parentElement.insertBefore(button, anchor);
  }

  function setButtonActive(active) {
    const button = document.getElementById(BUTTON_ID);
    if (button) button.style.color = active ? '#1ed760' : '#b3b3b3';
  }

  async function openFloating() {
    if (!('documentPictureInPicture' in window)) {
      chrome.runtime.sendMessage({ type: 'open-mini' });
      return;
    }
    try {
      pipWindow = await documentPictureInPicture.requestWindow({ width: 480, height: 160 });
    } catch (err) {
      console.warn('[LyricBar] Picture-in-Picture unavailable, opening a window instead:', err);
      chrome.runtime.sendMessage({ type: 'open-mini' });
      return;
    }
    const doc = pipWindow.document;
    doc.title = 'LyricBar';
    const style = doc.createElement('style');
    style.textContent = globalThis.LyricBarMini.STYLE;
    doc.head.append(style);

    let displayPort = null;
    const view = globalThis.LyricBarMini.mount(doc, (cmd) => displayPort?.postMessage({ type: 'command', ...cmd }));
    const attach = () => {
      if (!pipWindow || dead) return;
      displayPort = chrome.runtime.connect({ name: 'display' });
      displayPort.onMessage.addListener(view.update);
      displayPort.onDisconnect.addListener(() => {
        displayPort = null;
        setTimeout(attach, 500); // service worker restarted
      });
    };
    attach();
    setButtonActive(true);
    pipWindow.addEventListener('pagehide', () => {
      pipWindow = null;
      displayPort?.disconnect();
      setButtonActive(false);
    });
  }

  // The popup's "Open floating lyrics" asks this tab to show where the button is.
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.type !== 'highlight-float-button') return;
    const button = document.getElementById(BUTTON_ID);
    if (!button) return;
    button.animate([{ transform: 'scale(1)', color: '#b3b3b3' }, { transform: 'scale(1.5)', color: '#1ed760' }, { transform: 'scale(1)', color: '#b3b3b3' }], { duration: 700, iterations: 3 });
  });

  connect();
  timer = setInterval(() => {
    poll();
    ensureButton();
  }, POLL_MS);
})();
