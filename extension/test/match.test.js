import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalize, similarity, splitArtists, scoreRecord } from '../lib/match.js';
import { Overrides } from '../lib/overrides.js';

test('normalize drops accents, brackets, punctuation and decorations', () => {
  assert.equal(normalize('Café Déjà-Vu (Live) - Remastered 2009'), 'cafe deja vu');
  assert.equal(normalize('Rock & Roll!'), 'rock and roll');
});

test('similarity: equal, contained, partial, unrelated', () => {
  assert.equal(similarity('Placeholder Song', 'placeholder song'), 1);
  assert.equal(similarity('The Example Band', 'Example Band'), 0.9);
  assert.ok(similarity('Blue Morning Light', 'Blue Evening Light') > 0.5);
  assert.equal(similarity('Alpha', 'Omega'), 0);
});

test('splitArtists handles common separators', () => {
  assert.deepEqual(splitArtists('A, B & C feat. D'), ['A', 'B', 'C', 'D']);
});

test('scoreRecord accepts the same song, rejects others', () => {
  const track = { title: 'Placeholder Song', artist: 'Some Band, Guest', durationMs: 200000 };
  assert.equal(scoreRecord(track, { trackName: 'Placeholder Song', artistName: 'Some Band', duration: 202 }).ok, true);
  assert.equal(scoreRecord(track, { trackName: 'Placeholder Song', artistName: 'Guest', duration: 200 }).ok, true);
  assert.equal(scoreRecord(track, { trackName: 'Placeholder Song', artistName: 'Some Band', duration: 230 }).ok, false);
  assert.equal(scoreRecord(track, { trackName: 'Placeholder Song', artistName: 'Unrelated Choir', duration: 200 }).ok, false);
  assert.equal(scoreRecord(track, { trackName: 'Different Words', artistName: 'Some Band', duration: 200 }).ok, false);
});

test('Overrides store per-song values, drop empty ones and persist', async () => {
  const data = {};
  const storage = { get: async (k) => ({ [k]: data[k] }), set: async (o) => Object.assign(data, o) };
  const o = new Overrides(storage);
  assert.deepEqual(await o.get('song'), { offsetMs: 0, match: null, hidden: false });
  await o.set('song', { offsetMs: 500, match: 'lrclib:2', hidden: false });
  const reloaded = new Overrides(storage);
  assert.deepEqual(await reloaded.get('song'), { offsetMs: 500, match: 'lrclib:2', hidden: false });
  await reloaded.set('song', { offsetMs: 0, match: null, hidden: false });
  assert.deepEqual(data['lyricbar.overrides'], []);
});
