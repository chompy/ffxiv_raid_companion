// Tests for bundled/limit-cut.lua using real NetworkAbility lines from a Kefka session.
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { LuaManager } from '../src/luaEngine.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const code = readFileSync(path.join(here, '..', 'bundled', 'limit-cut.lua'), 'utf8');

// Real "Ultima Blaster" clone casts (action BAE4) from logs/Network_30300_20260914.log.
// These lines carry NO movement events, so the tracker falls back to the caster pair
// embedded at NF-14/NF-13: cast A's clone sits at (120,100) = E; mirrored across
// (100,100) that is W → new north W. Cast B's clone sits at (114.14,85.86) = NE, which
// is 45° counter-clockwise of E → the clones run CCW and players rotate CW.
const CAST_A = '21|2026-09-14T21:22:52.6060000-04:00|4001694D|Kefka|BAE4|Ultima Blaster|10020C04|Minda Silva|750003|38C84001|E80E|B7D0000|1B|BAE48000|0|0|0|0|0|0|0|0|0|0|204515|204515|5450|10000|||83.62|108.02|0.00|2.59|9415000|9415000|10000|10000|||120.00|100.00|0.00|-1.35|0000D535|0|1|00||01|BAE4|BAE4|1.800|48D7|a9f539e856b9b0a3';
const CAST_B = '21|2026-09-14T21:22:52.8290000-04:00|4001694C|Kefka|BAE4|Ultima Blaster|100D83F9|Stranjer Danger|750003|183D4001|E80E|B7D0000|1B|BAE48000|0|0|0|0|0|0|0|0|0|0|226428|226428|10000|10000|||92.97|117.75|0.00|-2.89|9415000|9415000|10000|10000|||114.14|85.86|-0.00|-0.59|0000D537|0|1|00||01|BAE4|BAE4|1.800|6823|fa6382143f99f4cd';
// An unrelated ability cast (Soulsow) must be ignored.
const UNRELATED = '21|2026-09-14T21:12:53.9220000-04:00|1003AAEE|Enri Haze|5F43|Soulsow|1003AAEE|Enri Haze|F|A228000|0|0|0|0|0|0|0|0|0|0|0|0|0|0|218611|218611|10000|10000|||100.60|114.79|0.00|3.14|218611|218611|10000|10000|||100.60|114.79|0.00|3.14|0000C694|0|1|00||01|5F43|5F43|0.600|FFFE|4c14b1613c7eee52';

function sceneTexts(mgr) {
  return mgr.scenes()[0].scene.filter((op) => op.type === 'text').map((op) => op.text);
}

const mgr = new LuaManager(() => [1280, 720]);
const res = mgr.add('limit-cut.lua', code);
assert.equal(res.ok, true, `script should load: ${res.error ?? ''}`);

// Before any cast: canvas stays empty.
mgr.frame(1 / 60);
assert.deepEqual(sceneTexts(mgr), []);

// First clone (embedded pair = E) → new north W + waymark D, rotation still pending.
mgr.onLogLine(CAST_A);
mgr.frame(1 / 60);
let texts = sceneTexts(mgr);
assert.ok(texts.includes('D (W)'), `new north shown as waymark + direction, got: ${texts.join(', ')}`);
assert.ok(texts.includes('waiting for second clone...'));
assert.ok(texts.includes('clones seen: 1'));

// Second clone (NE, counter-clockwise of E) → players rotate clockwise.
mgr.onLogLine(CAST_B);
mgr.frame(1 / 60);
texts = sceneTexts(mgr);
assert.ok(texts.includes('Rotate CW'), `rotation shown, got: ${texts.join(', ')}`);
assert.ok(!texts.includes('Rotate CCW'));
assert.ok(texts.includes('clones seen: 2'));

// Stand list: players stand in the GAPS between waymarks, walking from new north (W = 'D')
// in rotation order. CW → player 1 takes the first gap clockwise of 'D'.
assert.ok(texts.includes('1 -> D1'), `stand list drawn, got: ${texts.join(', ')}`);
assert.ok(texts.includes('5 -> B3'));
assert.ok(texts.includes('8 -> 4D'), 'last player wraps back around the ring');

// Duplicate delivery of the same cast (same caster id) is ignored.
mgr.onLogLine(CAST_A);
mgr.frame(1 / 60);
assert.ok(sceneTexts(mgr).includes('clones seen: 2'), 'dedupe by caster id');

// The AoE twin line type (22) of the same cast shares caster + sequence and must not count.
const CAST_A_AOE = CAST_A.replace(/^21\|/, '22|');
mgr.onLogLine(CAST_A_AOE);
mgr.frame(1 / 60);
assert.ok(sceneTexts(mgr).includes('clones seen: 2'), 'AoE twin of same cast deduped by caster+sequence');

// A single entity recasting (different sequence) IS a new data point, but an identical
// position must not change the resolved rotation or stand table.
const CAST_A_RECAST = CAST_A.replace('0000D535', '9999EFFF');
mgr.onLogLine(CAST_A_RECAST);
mgr.frame(1 / 60);
let texts2 = sceneTexts(mgr);
assert.ok(texts2.includes('clones seen: 3'), 'recast by same entity counts as new data point');
assert.ok(texts2.includes('Rotate CW'), 'rotation unchanged after recast');
assert.ok(texts2.includes('1 -> D1') && texts2.includes('8 -> 4D'), 'stand list unchanged after recast');

// Unrelated ability lines are ignored.
mgr.onLogLine(UNRELATED);
mgr.frame(1 / 60);
assert.ok(sceneTexts(mgr).includes('clones seen: 3'));

// Zone change resets the tracker and clears the display.
mgr.onChangeZone('The Lavender Beds');
mgr.frame(1 / 60);
assert.deepEqual(sceneTexts(mgr), [], 'cleared after zone change');

// --- CCW case reproducing a real raid macro example ----------------------------
// Ground truth from the team's in-game macro for new north '2' (NE) + CCW:
//   1 -> A2, 2 -> 1A, 3 -> D1, 4 -> 4D, 5 -> C4, 6 -> 3C, 7 -> B3, 8 -> 2B
function cloneLine(caster, seq, x, z) {
  const f = CAST_A.split('|'); // reuse the real NF=55 layout
  f[2] = caster;        // field 3: caster id (dedupe key part)
  f[44] = seq;          // field 45: global sequence
  f[40] = String(x);    // field 41: embedded caster X (NF-14) — no movement events here
  f[41] = String(z);    // field 42: embedded caster Z (NF-13)
  return f.join('|');
}

const ccwMgr = new LuaManager(() => [1280, 720]);
assert.equal(ccwMgr.add('limit-cut.lua', code).ok, true);
// First clone at (88,112): mirror is (112,88) → exactly NE. Second at (85,100), +45° CCW of it.
ccwMgr.onLogLine(cloneLine('AAAA0001', 'SEQA', 88, 112));
ccwMgr.onLogLine(cloneLine('AAAA0002', 'SEQB', 85, 100));
ccwMgr.frame(1 / 60);
texts = sceneTexts(ccwMgr);
assert.ok(texts.includes('Rotate CCW'), `got: ${texts.join(', ')}`);
for (const expected of ['1 -> A2', '2 -> 1A', '3 -> D1', '4 -> 4D', '5 -> C4', '6 -> 3C', '7 -> B3', '8 -> 2B']) {
  assert.ok(texts.includes(expected), `missing "${expected}", got: ${texts.join(', ')}`);
}

// --- early resolution: near-center positions used to be rejected -----------------
// Players standing close to the arena center must not starve the tracker; the first
// two usable lines (even at d < 10) should already produce north + rotation + table.
function blasterLine(caster, x, z) {
  const f = CAST_A.split('|'); // NF=55 layout
  f[2] = caster;
  f[40] = String(x); // field 41: embedded caster X (NF-14) — no movement events here
  f[41] = String(z); // field 42: embedded caster Z (NF-13)
  return f.join('|');
}

const earlyMgr = new LuaManager(() => [1280, 720]);
assert.equal(earlyMgr.add('limit-cut.lua', code).ok, true);
// d ≈ 4.5 and d ≈ 6.9 — both inside the old MIN_CLONE_DIST=10 rejection band.
earlyMgr.onLogLine(blasterLine('BBBB0001', 97, 103));
earlyMgr.frame(1 / 60);
let early = sceneTexts(earlyMgr);
assert.ok(early.includes('NEW NORTH'), `new north drawn from near-center line: ${early.join(', ')}`);
assert.ok(early.includes('waiting for second clone...'));

  earlyMgr.onLogLine(blasterLine('BBBB0002', 93, 106));
  earlyMgr.frame(1 / 60);
  early = sceneTexts(earlyMgr);
  assert.ok(early.some((t) => t === 'Rotate CW' || t === 'Rotate CCW'), `rotation resolved from near-center lines: ${early.join(', ')}`);
  assert.ok(early.includes('stand between'), 'full stand table shown after only two usable lines');

// --- full-log replays (movement events are the position source) ----------------
function replayLog(logName) {
  const m = new LuaManager(() => [1280, 720]);
  assert.equal(m.add('limit-cut.lua', code).ok, true);
  for (const line of readFileSync(path.join(here, 'fixtures', logName), 'utf8').split('\n')) {
    if (line) m.onLogLine(line);
  }
  m.frame(1 / 60);
  return sceneTexts(m);
}

// p3_lc_w_cw.log: complete pull, clones fire CCW from E → new north W, players CW.
let replay = replayLog('p3_lc_w_cw.log');
assert.ok(replay.includes('Rotate CW'), `w_cw rotation: ${replay.join(', ')}`);
assert.ok(replay.includes('1 -> D1'), `w_cw stand list (W anchor): ${replay.join(', ')}`);

// p3_lc_sw_cw.log: log starts MID-pull — the first cast's clone has no position data
// anywhere in the file. The unpositioned-prefix shift must still land on SW + CW.
replay = replayLog('p3_lc_sw_cw.log');
assert.ok(replay.includes('Rotate CW'), `sw_cw rotation: ${replay.join(', ')}`);
assert.ok(replay.includes('1 -> 4D'), `sw_cw stand list (SW anchor): ${replay.join(', ')}`);

// p3_lc_big_pull.log: one full pull from a multi-session log — both sub-phases
// (BAE3 AoE then BAE4 single-target), some embedded pairs are placeholders or stale,
// so the movement-event positions must drive resolution. Ground truth SE + CCW.
replay = replayLog('p3_lc_big_pull.log');
assert.ok(replay.includes('Rotate CCW'), `big pull rotation: ${replay.join(', ')}`);
assert.ok(replay.includes('1 -> B3'), `big pull stand list (SE anchor): ${replay.join(', ')}`);

console.log('limit-cut tests passed');
