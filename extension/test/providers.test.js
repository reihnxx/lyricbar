import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanTitle, rankRecords, fromRecord, findLrclibOptions, fetchLrclib } from '../lib/providers/lrclib.js';
import { artHash, fromColorLyrics } from '../lib/providers/spotify.js';

// All names and lines below are invented placeholders.
const TRACK = { title: 'Placeholder Song - Remastered 2011', artist: 'Some Band, Guest', primaryArtist: 'Some Band', album: 'Demo Album', durationMs: 200400 };
const rec = (id, extra) => ({ id, trackName: 'Placeholder Song', artistName: 'Some Band', duration: 200, ...extra });

test('cleanTitle strips remaster / feat decorations', () => {
  assert.equal(cleanTitle('Placeholder Song - Remastered 2011'), 'Placeholder Song');
  assert.equal(cleanTitle('Placeholder Song (feat. Someone)'), 'Placeholder Song');
  assert.equal(cleanTitle('Plain'), 'Plain');
});

test('rankRecords drops other songs and prefers synced + closest duration', () => {
  const ranked = rankRecords(TRACK, [
    rec(1, { duration: 260, syncedLyrics: '[00:01.00]x' }), // wrong length
    rec(2, { duration: 201, plainLyrics: 'x' }),
    rec(3, { duration: 199, syncedLyrics: '[00:01.00]x' }),
    rec(4, { trackName: 'Totally Different', syncedLyrics: '[00:01.00]x' }), // wrong title
    rec(5, { artistName: 'Someone Else', syncedLyrics: '[00:01.00]x' }), // wrong artist
  ]);
  assert.deepEqual(ranked.map((r) => r.id), [3, 2]);
});

test('fromRecord handles synced, plain, instrumental and empty', () => {
  const synced = fromRecord(rec(7, { syncedLyrics: '[00:01.00]hi' }));
  assert.equal(synced.synced, true);
  assert.equal(synced.key, 'lrclib:7');
  assert.equal(fromRecord({ plainLyrics: 'a\nb' }, 10000).synced, false);
  assert.equal(fromRecord({ instrumental: true }).instrumental, true);
  assert.equal(fromRecord({}), null);
  assert.equal(fromRecord(null), null);
});

function mockFetch(routes) {
  const calls = [];
  const fn = async (url, init) => {
    const u = new URL(url);
    calls.push({ url: u, init });
    const body = routes[u.pathname]?.(u.searchParams);
    if (body === undefined) return { ok: false, status: 404, json: async () => ({}) };
    return { ok: true, status: 200, json: async () => body };
  };
  fn.calls = calls;
  return fn;
}

test('exact /get hit is used without searching', async () => {
  const fetch = mockFetch({ '/api/get': () => rec(1, { syncedLyrics: '[00:01.00]hello' }) });
  const options = await findLrclibOptions(TRACK, { fetch });
  assert.equal(options.length, 1);
  assert.equal(fetch.calls.length, 1);
  const q = fetch.calls[0].url.searchParams;
  assert.equal(q.get('artist_name'), 'Some Band');
  assert.equal(q.get('duration'), '200');
  assert.ok(fetch.calls[0].init.headers['Lrclib-Client']);
});

test('search fallbacks broaden until a match, rejecting wrong songs', async () => {
  const fetch = mockFetch({
    '/api/search': (q) =>
      q.get('q')
        ? [rec(9, { syncedLyrics: '[00:02.00]found' }), rec(10, { trackName: 'Another Tune', syncedLyrics: '[00:01.00]no' })]
        : [rec(11, { artistName: 'Cover Band', syncedLyrics: '[00:01.00]no' })],
  });
  const options = await findLrclibOptions(TRACK, { fetch });
  assert.deepEqual(options.map((o) => o.key), ['lrclib:9']);
  assert.deepEqual(fetch.calls.map((c) => c.url.pathname), ['/api/get', '/api/search', '/api/search', '/api/search']);
});

test('multiple candidates are returned synced-first for "try next match"', async () => {
  const fetch = mockFetch({
    '/api/search': () => [rec(1, { plainLyrics: 'a' }), rec(2, { duration: 202, syncedLyrics: '[00:01.00]b' }), rec(3, { duration: 200, syncedLyrics: '[00:01.00]c' })],
  });
  const options = await findLrclibOptions({ ...TRACK, album: '' }, { fetch });
  assert.deepEqual(options.map((o) => o.key), ['lrclib:3', 'lrclib:2', 'lrclib:1']);
});

test('fetchLrclib returns null when nothing matches and throws on server errors', async () => {
  assert.equal(await fetchLrclib(TRACK, { fetch: mockFetch({ '/api/search': () => [] }) }), null);
  const broken = async () => ({ ok: false, status: 500 });
  await assert.rejects(fetchLrclib(TRACK, { fetch: broken }), /HTTP 500/);
});

test('artHash matches the same cover across sizes', () => {
  const small = 'https://i.scdn.co/image/ab67616d00001e02aaaabbbbccccddddeeeeffff';
  const large = 'https://i.scdn.co/image/ab67616d0000b273aaaabbbbccccddddeeeeffff';
  assert.equal(artHash(small), artHash(large));
  assert.equal(artHash('nope'), null);
});

test('fromColorLyrics parses synced and unsynced responses', () => {
  const synced = fromColorLyrics({ lyrics: { syncType: 'LINE_SYNCED', lines: [{ startTimeMs: '1200', words: 'one' }, { startTimeMs: '500', words: '' }] } }, 10000);
  assert.deepEqual(synced.lines, [{ t: 500, text: '♪' }, { t: 1200, text: 'one' }]);
  assert.equal(synced.key, 'spotify');
  const plain = fromColorLyrics({ lyrics: { syncType: 'UNSYNCED', lines: [{ startTimeMs: '0', words: 'a' }, { startTimeMs: '0', words: 'b' }] } }, 10000);
  assert.equal(plain.synced, false);
  assert.equal(fromColorLyrics({}, 0), null);
});
