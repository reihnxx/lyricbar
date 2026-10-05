// Runs in the page's own JS world (MAIN). Only does anything when the user
// enables the experimental Spotify provider: it then passes along the lyrics
// response the Web Player itself downloads for its Now Playing view.
// No extra requests are made and no tokens/cookies are read or forwarded.
(() => {
  if (window.__lyricbarHooked) return;
  window.__lyricbarHooked = true;

  const LYRICS_URL = /\/color-lyrics\/v2\/track\/([A-Za-z0-9]+)(?:\/image\/([^?]+))?/;
  let enabled = false;

  window.addEventListener('message', (event) => {
    if (event.source !== window || event.origin !== location.origin) return;
    const data = event.data;
    if (data?.source === 'lyricbar-content' && data.type === 'config') enabled = Boolean(data.spotifyProvider);
  });

  function inspect(url, response) {
    if (!enabled || !response.ok) return;
    const match = LYRICS_URL.exec(url || '');
    if (!match) return;
    response
      .clone()
      .json()
      .then((body) => {
        window.postMessage(
          {
            source: 'lyricbar-main',
            type: 'spotify-lyrics',
            trackId: match[1],
            image: match[2] ? decodeURIComponent(match[2]) : null,
            body,
          },
          location.origin,
        );
      })
      .catch(() => {});
  }

  const originalFetch = window.fetch;
  window.fetch = function fetch(input, init) {
    const url = input instanceof Request ? input.url : String(input);
    const pending = originalFetch.call(this, input, init);
    pending.then((res) => inspect(url, res)).catch(() => {});
    return pending;
  };
})();
