// Floating lyrics view, shared by the always-on-top Picture-in-Picture window
// (opened from the Spotify tab) and ui/mini.html (fallback window).
// Classic script: defines globalThis.LyricBarMini.
(() => {
  const STYLE = `
    :root { color-scheme: dark; }
    html, body { margin: 0; height: 100%; background: #121212; overflow: hidden; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Ubuntu, "Noto Sans", sans-serif; color: #fff; }
    .lb { box-sizing: border-box; height: 100%; display: flex; flex-direction: column; justify-content: center;
          gap: 4px; padding: 10px 16px 12px; position: relative; text-align: center; user-select: none; }
    .lb-top { display: flex; align-items: center; gap: 8px; font-size: 12px; color: #a7a7a7; min-height: 16px; }
    .lb-title { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-align: left; }
    .lb-badge { flex: none; font-weight: 600; color: #a7a7a7; }
    .lb-badge.flash { color: #1ed760; }
    .lb-line { font-weight: 700; line-height: 1.2; font-size: clamp(16px, 5.4vw, 44px);
               display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
               transition: opacity .18s ease; }
    .lb-line.info { color: #b3b3b3; font-weight: 600; font-size: clamp(14px, 4vw, 30px); }
    .lb-line.fade { opacity: 0; }
    .lb-next { color: #8a8a8a; font-size: clamp(12px, 3.2vw, 24px); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-height: 1.2em; }
    .lb-bar { position: absolute; left: 0; right: 0; bottom: 0; display: flex; gap: 6px; justify-content: center; align-items: center;
              padding: 6px; background: linear-gradient(transparent, rgba(0,0,0,.85) 40%); opacity: 0; transition: opacity .15s; }
    .lb:hover .lb-bar, .lb:focus-within .lb-bar { opacity: 1; }
    .lb-bar button { font: inherit; font-size: 12px; color: #fff; background: #2a2a2a; border: 0; border-radius: 99px;
                     padding: 5px 10px; cursor: pointer; }
    .lb-bar button:hover:not(:disabled) { background: #3a3a3a; }
    .lb-bar button:disabled { opacity: .4; cursor: default; }
    .lb-offset { font-size: 12px; color: #b3b3b3; min-width: 52px; font-variant-numeric: tabular-nums; }
    .lb-extra { display: contents; }
  `;

  function formatOffset(ms) {
    const s = (ms || 0) / 1000;
    return `${s > 0 ? '+' : s < 0 ? '−' : '±'}${Math.abs(s).toFixed(1)} s`;
  }

  /** What to show for the current model — mirrors the macOS app's states. */
  function displayFor({ track, line, state }) {
    if (!track) return { title: 'LyricBar', primary: 'Play something on Spotify', next: '', style: 'info', badge: null };
    const paused = state?.isPlaying === false;
    const base = { title: `♪ ${track.title} — ${track.artist}`, badge: paused ? '⏸ paused' : null };
    const hasLyrics = (track.lines?.length ?? 0) > 0;
    if (track.hidden) return { ...base, primary: 'Lyrics hidden for this song', next: '', style: 'info' };
    if (hasLyrics && line && line.index >= 0 && line.text != null) {
      const badge = paused ? '⏸ paused' : track.synced === false ? '≈ unsynced' : null;
      return { ...base, primary: line.text, next: line.next ?? '', style: 'lyric', badge };
    }
    if (track.loading) return { ...base, primary: 'Looking up lyrics…', next: '', style: 'info' };
    if (track.error === 'network') return { ...base, primary: "Can't reach the lyrics service", next: 'retrying…', style: 'info' };
    if (track.instrumental) return { ...base, primary: 'Instrumental', next: '', style: 'info' };
    if (!hasLyrics) return { ...base, primary: 'No lyrics found', next: '', style: 'info' };
    return { ...base, primary: '♪', next: line?.next ?? '', style: 'info' }; // before the first line
  }

  /**
   * Builds the view inside `doc` and returns { update(msg), model }.
   * @param {Document} doc
   * @param {(cmd: {action: string, deltaMs?: number}) => void} send
   * @param {object} [initialModel]
   */
  function mount(doc, send, initialModel) {
    const model = { track: null, line: null, state: null, ...initialModel };
    const el = (tag, cls, text) => {
      const node = doc.createElement(tag);
      if (cls) node.className = cls;
      if (text) node.textContent = text;
      return node;
    };
    const root = el('div', 'lb');
    const top = el('div', 'lb-top');
    const title = el('span', 'lb-title');
    const badge = el('span', 'lb-badge');
    top.append(title, badge);
    const lineEl = el('div', 'lb-line');
    const nextEl = el('div', 'lb-next');
    const bar = el('div', 'lb-bar');
    const button = (label, tip, action, extra) => {
      const b = el('button', '', label);
      b.title = tip;
      b.addEventListener('click', () => send({ action, ...extra }));
      return b;
    };
    const later = button('◀ Later', 'Lyrics too early? Show them 0.5 s later', 'offset', { deltaMs: -500 });
    const offset = el('span', 'lb-offset');
    offset.title = 'Timing for this song (+ = lyrics earlier)';
    const earlier = button('Earlier ▶', 'Lyrics too late? Show them 0.5 s earlier', 'offset', { deltaMs: 500 });
    const nextMatch = button('Wrong lyrics?', 'Try the next lyrics match', 'next-match');
    const hide = button('Hide', 'Hide lyrics for this song', 'toggle-hidden');
    const extra = el('span', 'lb-extra');
    bar.append(later, offset, earlier, nextMatch, hide, extra);
    root.append(top, lineEl, nextEl, bar);
    doc.body.append(root);

    let flashText = null;
    let flashTimer = null;
    let shown = null;

    function flash(text) {
      flashText = text;
      clearTimeout(flashTimer);
      flashTimer = setTimeout(() => {
        flashText = null;
        render();
      }, 1600);
    }

    function render() {
      const d = displayFor(model);
      title.textContent = d.title;
      badge.textContent = flashText ?? d.badge ?? '';
      badge.classList.toggle('flash', Boolean(flashText));
      if (d.primary !== shown) {
        const first = shown === null;
        shown = d.primary;
        lineEl.classList.add('fade');
        setTimeout(() => {
          lineEl.textContent = d.primary;
          lineEl.classList.toggle('info', d.style === 'info');
          lineEl.classList.remove('fade');
        }, first ? 0 : 90);
      }
      nextEl.textContent = d.next;

      const t = model.track;
      bar.hidden = !t;
      offset.textContent = formatOffset(t?.offsetMs);
      const canTime = Boolean(t && !t.hidden && t.lines?.length);
      later.disabled = earlier.disabled = !canTime;
      const count = t?.match?.count ?? 0;
      nextMatch.disabled = count < 2;
      nextMatch.textContent = count > 1 ? `Wrong lyrics? (${t.match.index + 1}/${count})` : 'Wrong lyrics?';
      hide.textContent = t?.hidden ? 'Show' : 'Hide';
    }

    function update(msg) {
      switch (msg?.type) {
        case 'track': {
          const prev = model.track;
          if (!prev || prev.title !== msg.title || prev.artist !== msg.artist) model.line = null;
          else if ((prev.offsetMs ?? 0) !== (msg.offsetMs ?? 0)) flash(`timing ${formatOffset(msg.offsetMs)}`);
          else if (prev.match?.index !== msg.match?.index && msg.match?.count > 1) flash(`match ${msg.match.index + 1}/${msg.match.count}`);
          model.track = msg;
          break;
        }
        case 'state':
          model.state = msg;
          break;
        case 'line':
          model.line = msg;
          break;
        case 'clear':
          model.track = model.line = model.state = null;
          break;
        default:
          return;
      }
      render();
    }

    render();
    return { update, model, root, extra };
  }

  globalThis.LyricBarMini = Object.freeze({ STYLE, displayFor, mount, formatOffset });
})();
