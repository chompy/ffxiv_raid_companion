// Tests for bundled/dmu-p3-blackhole.lua using real Accretion apply lines from a DMU session.
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { LuaManager } from '../src/luaEngine.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const code = readFileSync(path.join(here, '..', 'bundled', 'dmu-p3-blackhole.lua'), 'utf8');
const limitCutCode = readFileSync(path.join(here, '..', 'bundled', 'dmu-p3-limit-cut.lua'), 'utf8');

// Real "Accretion" apply lines (status 644, 14s) from logs/Network_30300_20260917.log.
const APPLY_A = '26|2026-09-17T15:25:32.1180000-04:00|644|Accretion|14.00|E0000000||10046B01|Elemione Hirota|00|205207||ecd625704014c84e';
const APPLY_B = '26|2026-09-17T15:25:32.1210000-04:00|644|Accretion|14.00|E0000000||10020C04|Minda Silva|00|205207||abcd1234ef567890';
// A different status apply must be ignored.
const UNRELATED = '26|2026-09-17T15:25:32.1300000-04:00|15A7|Cursed Shriek|69.00|E0000000||AAAA0001|Someone Else|00|204515||cafe0001';

// The oversized name lines (title is 16px; everything the mechanic draws is >= 24).
function bigLines(mgr) {
  return mgr.scenes()[0].scene.filter((op) => op.type === 'text' && op.size >= 24);
}

const mgr = new LuaManager(() => [1280, 720]);
assert.equal(mgr.add('dmu-p3-blackhole.lua', code).ok, true);

mgr.frame(1 / 60);
assert.deepEqual(bigLines(mgr), [], 'nothing drawn before any apply');

// First holder: name shown huge, second slot waits dimmed.
mgr.onLogLine(APPLY_A);
mgr.frame(1 / 60);
let big = bigLines(mgr);
assert.equal(big.length, 2, `two rows after first apply: ${JSON.stringify(big.map((o) => o.text))}`);
assert.ok(big.some((op) => op.text === 'Elemione Hirota' && op.color === '#e8ecf8'), 'first holder drawn bright');
assert.ok(big.some((op) => op.text === 'waiting...' && op.color === '#6a6a80'), 'second slot waiting dimmed');

// Second holder: the current player's line is highlighted in accent gold with a [YOU] tag.
mgr.onLogLine(APPLY_B);
mgr.frame(1 / 60);
big = bigLines(mgr);
assert.ok(big.some((op) => op.text === 'Minda Silva  [YOU]' && op.color === '#ffd24c'), `you highlighted: ${JSON.stringify(big.map((o) => o.text))}`);
assert.ok(big.some((op) => op.text === 'Elemione Hirota' && op.color === '#e8ecf8'));

// Redelivered identical line must not add a third row.
mgr.onLogLine(APPLY_A);
mgr.frame(1 / 60);
assert.equal(bigLines(mgr).length, 2, 'redelivery deduped by carrier id');

// Unrelated status applies are ignored.
mgr.onLogLine(UNRELATED);
mgr.frame(1 / 60);
assert.equal(bigLines(mgr).length, 2);

// A new pair replaces the old one (second black hole in the same pull).
const APPLY_C = '26|2026-09-17T15:28:32.1180000-04:00|644|Accretion|14.00|E0000000||BBBB0001|Coco Bongo|00|205207||1111aaaa2222bbbb';
const APPLY_D = '26|2026-09-17T15:28:32.1210000-04:00|644|Accretion|14.00|E0000000||BBBB0002|Dodo Rongo|00|205207||3333cccc4444dddd';
mgr.onLogLine(APPLY_C);
mgr.frame(1 / 60);
let texts = bigLines(mgr).map((op) => op.text);
assert.ok(texts.includes('Coco Bongo') && !texts.includes('Elemione Hirota'), `new pair starts fresh: ${JSON.stringify(texts)}`);
mgr.onLogLine(APPLY_D);
mgr.frame(1 / 60);
texts = bigLines(mgr).map((op) => op.text);
assert.ok(texts.includes('Coco Bongo') && texts.includes('Dodo Rongo'), `full new pair: ${JSON.stringify(texts)}`);

// Type-2 identity line overrides who "you" is.
const idMgr = new LuaManager(() => [1280, 720]);
assert.equal(idMgr.add('dmu-p3-blackhole.lua', code).ok, true);
idMgr.onLogLine('2|2026-09-17T15:20:00.0000000-04:00|BBBB0001|Coco Bongo|deadbeef');
idMgr.onLogLine(APPLY_C);
idMgr.frame(1 / 60);
big = bigLines(idMgr);
assert.ok(big.some((op) => op.text === 'Coco Bongo  [YOU]' && op.color === '#ffd24c'), `identity override: ${JSON.stringify(big.map((o) => o.text))}`);

// --- new-wave gap: a repeated carrier after the gap starts a fresh pair ---------
const waveMgr = new LuaManager(() => [1280, 720]);
assert.equal(waveMgr.add('dmu-p3-blackhole.lua', code.replace('local NEW_WAVE_GAP_MS = 30000', 'local NEW_WAVE_GAP_MS = 50')).ok, true);
waveMgr.onLogLine(APPLY_A);
waveMgr.onLogLine(APPLY_B);
await new Promise((resolve) => setTimeout(resolve, 90)); // outlast the shrunken wave gap
// The next wave reuses carrier A: without the gap rule its stale entry would swallow it.
waveMgr.onLogLine(APPLY_A);
waveMgr.frame(1 / 60);
texts = bigLines(waveMgr).map((op) => op.text);
assert.ok(texts.includes('Elemione Hirota') && !texts.includes('Minda Silva'), `repeat carrier starts a new pair: ${JSON.stringify(texts)}`);

// --- Canvas takeover: while the black hole is fresh, limit cut goes off display --
// Real "Ultima Blaster" casts from a Kefka session (same lines as limit-cut.test.mjs).
const CAST_A = '21|2026-09-14T21:22:52.6060000-04:00|4001694D|Kefka|BAE4|Ultima Blaster|10020C04|Minda Silva|750003|38C84001|E80E|B7D0000|1B|BAE48000|0|0|0|0|0|0|0|0|0|204515|204515|5450|10000|||83.62|108.02|0.00|2.59|9415000|9415000|10000|10000|||120.00|100.00|0.00|-1.35|0000D535|0|1|00||01|BAE4|BAE4|1.800|48D7|a9f539e856b9b0a3';
const CAST_B = '21|2026-09-14T21:22:52.8290000-04:00|4001694C|Kefka|BAE4|Ultima Blaster|100D83F9|Stranjer Danger|750003|183D4001|E80E|B7D0000|1B|BAE48000|0|0|0|0|0|0|0|0|0|226428|226428|10000|10000|||92.97|117.75|0.00|-2.89|9415000|9415000|10000|10000|||114.14|85.86|-0.00|-0.59|0000D537|0|1|00||01|BAE4|BAE4|1.800|6823|fa6382143f99f4cd';

const dual = new LuaManager(() => [1280, 720]);
assert.equal(dual.add('dmu-p3-limit-cut.lua', limitCutCode).ok, true);
assert.equal(dual.add('dmu-p3-blackhole.lua', code).ok, true);
dual.onLogLine(CAST_A);
dual.onLogLine(CAST_B);
dual.frame(1 / 60);
let scenes = dual.scenes();
assert.equal(scenes.length, 2, 'both scripts visible while black hole idle');
assert.ok(scenes.some(({ scene }) => scene.some((op) => op.type === 'text' && op.text.includes('Rotate CW'))), 'limit-cut table up');

dual.onLogLine(APPLY_A);
dual.onLogLine(APPLY_B);
dual.frame(1 / 60);
scenes = dual.scenes();
assert.equal(scenes.length, 1, `takeover hides the other scripts: ${JSON.stringify(scenes.map((s) => s.name))}`);
assert.ok(scenes[0].scene.some((op) => op.text === 'Minda Silva  [YOU]'), 'black hole display owns the canvas');

// Combat start (re-pull) releases the takeover and clears both trackers.
dual.onCombatStart();
dual.frame(1 / 60);
scenes = dual.scenes();
assert.equal(scenes.length, 2, 'takeover released on combat start');
assert.ok(!scenes.some(({ scene }) => scene.some((op) => op.type === 'text' && (op.text.includes('[YOU]') || op.text.includes('Rotate')))), 'both trackers cleared on combat start');

// --- idle auto-clear ------------------------------------------------------------
const clearMgr = new LuaManager(() => [1280, 720]);
assert.equal(clearMgr.add('dmu-p3-blackhole.lua', code.replace('local CLEAR_MS = 120000', 'local CLEAR_MS = 60')).ok, true);
clearMgr.onLogLine(APPLY_A);
clearMgr.frame(1 / 60);
assert.ok(bigLines(clearMgr).length > 0, 'shown while fresh');
await new Promise((resolve) => setTimeout(resolve, 90)); // outlast the shrunken clear window
clearMgr.frame(1 / 60);
assert.equal(bigLines(clearMgr).length, 0, 'cleared after idle window elapses');

console.log('blackhole tests passed');
