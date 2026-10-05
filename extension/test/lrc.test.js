import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseLrc, spreadPlainLyrics, normalizeLines } from '../lib/lrc.js';

// Fixtures are invented placeholder lines, not real song lyrics.
test('parses basic timestamps with 2- and 3-digit fractions', () => {
  const lines = parseLrc('[00:01.50] alpha\n[00:03.250]beta\n[01:02] gamma');
  assert.deepEqual(lines, [
    { t: 1500, text: 'alpha' },
    { t: 3250, text: 'beta' },
    { t: 62000, text: 'gamma' },
  ]);
});

test('expands multiple time tags on one line and sorts', () => {
  const lines = parseLrc('[00:10.00][00:02.00]chorus\n[00:05.00]verse');
  assert.deepEqual(lines.map((l) => l.t), [2000, 5000, 10000]);
  assert.equal(lines[0].text, 'chorus');
});

test('skips metadata, applies [offset:], marks empty lines instrumental', () => {
  const lines = parseLrc('[ti:Placeholder]\n[offset:500]\n[00:02.00]one\n[00:04.00]\n[00:05.00]\n[00:08.00]two');
  assert.deepEqual(lines, [
    { t: 1500, text: 'one' },
    { t: 3500, text: '♪' },
    { t: 7500, text: 'two' },
  ]);
});

test('ignores rows without time tags and handles CRLF', () => {
  assert.deepEqual(parseLrc('garbage\r\n[00:01.00]ok\r\n'), [{ t: 1000, text: 'ok' }]);
  assert.deepEqual(parseLrc(''), []);
});

test('spreads plain lyrics across the duration', () => {
  const lines = spreadPlainLyrics('a\n\nb\nc\nd', 40000);
  assert.deepEqual(lines.map((l) => l.t), [0, 10000, 20000, 30000]);
  assert.deepEqual(spreadPlainLyrics('', 1000), []);
});

test('normalizeLines drops invalid times', () => {
  assert.deepEqual(normalizeLines([{ t: NaN, text: 'x' }, { t: 1.4, text: ' y ' }]), [{ t: 1, text: 'y' }]);
});
