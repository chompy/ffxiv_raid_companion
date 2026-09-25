// Tests for bundled/dmu-p2-forsaken.lua.
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { LuaManager } from '../src/luaEngine.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const code = readFileSync(path.join(here, '..', 'bundled', 'dmu-p2-forsaken.lua'), 'utf8');

// Real raid composition from a P2 pull: two groups of four alternate after the
// full-party wave. Group A (Abnar/Cora/Torn/Zephyra) gets several waves in a row;
// Minda Silva is in group B and receives NO marker during those — her display must
// keep her last icon while the set counter keeps climbing.
// Ids are 8 hex digits like real player entity ids (the script filters on that).
const GROUP_A = [
  ['100A0101', 'Abnar Fae'],
  ['100A0202', 'Cora Fenix'],
  ['100A0303', 'Torn Amo'],
  ['100A0404', 'Zephyra Hana'],
];
const GROUP_B = [
  ['100B0101', 'Erynd Altansarr'],
  ['100B0202', 'Hendrick Sands'],
  ['10020C04', 'Minda Silva'],
  ['100B0303', 'Vittorio Dravorn'],
];

// Type-27 marker assignment lines: field 3 target id, field 4 target name,
// field 7 marker id, trailing uid (redelivery dedupe key).
function markerLine(targetId, targetName, markerId, uid) {
  return `27|2026-09-19T19:49:57.4210000-04:00|${targetId}|${targetName}|6AB0BD91|0000|${markerId}|${targetId}|0000|0000|${uid}`;
}

// Type-21 ability lines: field 6 is the action name.
function castLine(name) {
  return `21|2026-09-19T19:49:59.7810000-04:00|40010B4D|Kefka|BAD2|${name}|40010B4D|Kefka`;
}

function sceneTexts(mgr) {
  return mgr.scenes()[0].scene.filter((op) => op.type === 'text').map((op) => op.text);
}

// Real waves land ~10s apart (within-wave lines share a tick). Shrink the new-set
// gap and sleep between waves so set detection runs on time, like in combat — the
// duplicate-target rule alone cannot see transitions between disjoint groups.
const fastCode = code.replace('local NEW_SET_GAP_MS = 5000', 'local NEW_SET_GAP_MS = 30');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

{
  const mgr = new LuaManager(() => [1280, 720]);
  assert.equal(mgr.add('dmu-p2-forsaken.lua', fastCode).ok, true, 'script should load');

  // Nothing latched yet: canvas stays empty.
  mgr.frame(1 / 60);
  assert.deepEqual(sceneTexts(mgr), []);

  // Set 1 marks all eight players; icons MIX within the wave (real pull data).
  // Minda gets 02CC = SPREAD, others carry different ids.
  const set1Ids = { 'Abnar Fae': '02CB', 'Cora Fenix': '02CD', 'Torn Amo': '02CB', 'Zephyra Hana': '02CC', 'Erynd Altansarr': '02CD', 'Hendrick Sands': '02CD', 'Minda Silva': '02CC', 'Vittorio Dravorn': '02CC' };
  let n = 0;
  for (const [id, name] of [...GROUP_A, ...GROUP_B]) {
    mgr.onLogLine(markerLine(id, name, set1Ids[name], `uid-a-${++n}`));
  }
  mgr.frame(1 / 60);
  let texts = sceneTexts(mgr);
  assert.ok(texts.includes('1 SPREAD'), `your marker from the full wave shown, got: ${texts.join(', ')}`);

  // A redelivered copy of the same line (same uid) must not start a fake second set.
  mgr.onLogLine(markerLine('10020C04', 'Minda Silva', '02CC', 'uid-a-7'));
  mgr.frame(1 / 60);
  texts = sceneTexts(mgr);
  assert.ok(texts.includes('1 SPREAD'), `redelivery deduped, got: ${texts.join(', ')}`);
  assert.ok(!texts.some((t) => /^2 /.test(t)), 'no second set from redelivery');

  // Kefka's End cast latches; a later cast replaces it.
  mgr.onLogLine(castLine("Past's End"));
  mgr.frame(1 / 60);
  assert.ok(sceneTexts(mgr).includes('PAST'), 'past latch shown');
  mgr.onLogLine(castLine("Future's End"));
  mgr.frame(1 / 60);
  texts = sceneTexts(mgr);
  assert.ok(texts.includes('FUTURE') && !texts.includes('PAST'), `future replaces past, got: ${texts.join(', ')}`);

  // Sets 2 and 3 target only group A — Minda is NOT marked. The counter climbs but
  // her icon must stay SPREAD (the bug this test guards against).
  for (let wave = 2; wave <= 3; wave++) {
    await sleep(60); // ~10s between real waves
    n = 0;
    for (const [id, name] of GROUP_A) {
      mgr.onLogLine(markerLine(id, name, '02CD', `uid-g${wave}-${++n}`));
    }
    mgr.frame(1 / 60);
    texts = sceneTexts(mgr);
    assert.ok(texts.includes(`${wave} SPREAD`), `set ${wave} skips you — marker kept, got: ${texts.join(', ')}`);
    assert.ok(!texts.some((t) => /^4 /.test(t)), 'no extra set mid-wave');
  }

  // Set 4 marks group B — a DISJOINT group no duplicate rule can see; only the
  // inter-wave gap starts this set. Minda receives a NEW icon (02CD = CONE).
  await sleep(60);
  n = 0;
  for (const [id, name] of GROUP_B) {
    mgr.onLogLine(markerLine(id, name, '02CD', `uid-c-${++n}`));
  }
  mgr.frame(1 / 60);
  texts = sceneTexts(mgr);
  assert.ok(texts.includes('4 CONE'), `your new icon shown when you are marked, got: ${texts.join(', ')}`);

  // Untracked marker ids (other mechanics' traffic) are ignored.
  mgr.onLogLine(markerLine('10020C04', 'Minda Silva', '0150', 'uid-x-0'));
  mgr.frame(1 / 60);
  assert.ok(sceneTexts(mgr).includes('4 CONE'), 'unknown marker id ignored');

  // The display is a latch: it keeps the last values until a combat boundary.
  for (let i = 0; i < 4; i++) mgr.frame(1 / 60);
  assert.ok(sceneTexts(mgr).includes('4 CONE') && sceneTexts(mgr).includes('FUTURE'), 'latch persists across frames');

  // Re-pull in the same zone resets everything.
  mgr.onCombatStart();
  mgr.frame(1 / 60);
  assert.deepEqual(sceneTexts(mgr), [], 'cleared after combat start');
}

// Zone change also resets.
{
  const mgr = new LuaManager(() => [1280, 720]);
  assert.equal(mgr.add('dmu-p2-forsaken.lua', code).ok, true);
  mgr.onLogLine(markerLine('10020C04', 'Minda Silva', '02CB', 'uid-z-0'));
  mgr.frame(1 / 60);
  assert.ok(sceneTexts(mgr).includes('1 STACK'));
  mgr.onChangeZone('The Lavender Beds');
  mgr.frame(1 / 60);
  assert.deepEqual(sceneTexts(mgr), [], 'cleared after zone change');
}

// Identity override: a type-2 line switches who "you" is mid-stream.
{
  const mgr = new LuaManager(() => [1280, 720]);
  assert.equal(mgr.add('dmu-p2-forsaken.lua', code).ok, true);
  // Default identity (Minda): a wave marking only Abnar latches no own marker.
  mgr.onLogLine(markerLine('100A01', 'Abnar Fae', '02CB', 'uid-id-1'));
  mgr.frame(1 / 60);
  assert.deepEqual(sceneTexts(mgr).filter((t) => !/^DMU/.test(t)), ['waiting...', 'waiting...'], 'no self marker yet');

  mgr.onLogLine('2|2026-09-19T19:50:00.0000000-04:00|100A01|Abnar Fae');
  mgr.frame(1 / 60); // identity alone does not latch a marker

  // Abnar is re-marked (fresh uid): that starts set 2 AND latches his new icon.
  mgr.onLogLine(markerLine('100A01', 'Abnar Fae', '02CC', 'uid-id-2'));
  mgr.frame(1 / 60);
  assert.ok(sceneTexts(mgr).includes('2 SPREAD'), `post-switch identity tracked, got: ${sceneTexts(mgr).join(', ')}`);
}

// Gap rule: with a shrunken gap, a marker line for an UNMARKED target arriving late
// still starts a new set (covers dropped lines from the previous wave). Identity is
// Torn Amo so his late mark shows up on the display.
{
  const mgr = new LuaManager(() => [1280, 720]);
  assert.equal(mgr.add('dmu-p2-forsaken.lua', code.replace('local NEW_SET_GAP_MS = 5000', 'local NEW_SET_GAP_MS = 30')).ok, true);
  mgr.onLogLine('2|2026-09-19T19:50:00.0000000-04:00|100A03|Torn Amo');
  mgr.onLogLine(markerLine('100A01', 'Abnar Fae', '02CB', 'uid-g-0'));
  mgr.onLogLine(markerLine('100A02', 'Cora Fenix', '02CD', 'uid-g-1'));
  mgr.frame(1 / 60);
  assert.ok(sceneTexts(mgr).includes('waiting...'), 'you are not in wave 1 — no own marker yet');

  await new Promise((r) => setTimeout(r, 60)); // exceed the shrunken gap
  mgr.onLogLine(markerLine('100A03', 'Torn Amo', '02CC', 'uid-g-2')); // fresh target, no overlap
  mgr.frame(1 / 60);
  const texts = sceneTexts(mgr);
  assert.ok(texts.includes('2 SPREAD'), `gap rule starts set 2 and latches your marker: ${texts.join(', ')}`);
}

// Fade: ~CLEAR_MS after the last Forsaken activity (marker line or End cast) the
// display clears so P3 limit cut gets the canvas back; a new marker wave reactivates
// it from set 1.
{
  const mgr = new LuaManager(() => [1280, 720]);
  assert.equal(mgr.add('dmu-p2-forsaken.lua', code.replace('local CLEAR_MS = 30000', 'local CLEAR_MS = 50')).ok, true);
  mgr.onLogLine(markerLine('10020C04', 'Minda Silva', '02CB', 'uid-f-0'));
  mgr.frame(1 / 60);
  assert.ok(sceneTexts(mgr).includes('1 STACK'), 'latched before fade');

  await new Promise((r) => setTimeout(r, 90)); // exceed the shrunken clear window
  mgr.frame(1 / 60);
  assert.deepEqual(sceneTexts(mgr), [], 'display fades after CLEAR_MS of quiet');

  // A later marker wave (next cycle / next pull in-zone) starts fresh.
  mgr.onLogLine(markerLine('10020C04', 'Minda Silva', '02CC', 'uid-f-1'));
  mgr.frame(1 / 60);
  assert.ok(sceneTexts(mgr).includes('1 SPREAD'), `reactivates from set 1, got: ${sceneTexts(mgr).join(', ')}`);

  // An End cast also counts as activity and keeps the display alive.
  await new Promise((r) => setTimeout(r, 60));
  mgr.onLogLine(castLine("Past's End")); // resets the fade clock
  await new Promise((r) => setTimeout(r, 30));
  mgr.frame(1 / 60);
  assert.ok(sceneTexts(mgr).includes('PAST'), `cast refreshes the fade window, got: ${sceneTexts(mgr).join(', ')}`);
}

// IINACT entity state lines (code 261): Add snapshots / Change updates as key|value
// pairs; field 4 is the id, trailing uid. PosX/PosY feed the closest-player lookup.
function posLine(id, name, x, y) {
  return `261|2026-09-19T19:49:40.0000000-04:00|Add|${id}|Name|${name}|PosX|${x}|PosY|${y}|Type|1|deadbeef00000001`;
}

// Real-pull geometry from the 2026-09-19 DMU log (arena coords): Vittorio stands
// ~2.8m next to Minda; everyone else is farther away, so he must win the lookup.
const POSITIONS = [
  ['100A0101', 'Abnar Fae', 97.6399, 96.8979],
  ['100A0202', 'Cora Fenix', 104.9668, 108.5984],
  ['100A0303', 'Torn Amo', 105.2867, 106.0138],
  ['100A0404', 'Zephyra Hana', 97.0625, 99.8092],
  ['100B0101', 'Erynd Altansarr', 105.5840, 101.0017],
  ['100B0202', 'Hendrick Sands', 107.4868, 99.2599],
  ['10020C04', 'Minda Silva', 93.5834, 103.4361],
  ['100B0303', 'Vittorio Dravorn', 96.3607, 103.3798],
];

// Shrink the synthetic-set-8 delay along with the new-set gap for test timing.
const groupCode = code
  .replace('local NEW_SET_GAP_MS = 5000', 'local NEW_SET_GAP_MS = 30')
  .replace('local EIGHT_DELAY_MS = 10000', 'local EIGHT_DELAY_MS = 80');

// IN/OUT groups: closest player shares Minda's icon (SPREAD) -> OUT for sets 1-3,
// the swap lands with set 4, and ~EIGHT_DELAY after set 7 the counter advances to a
// synthetic set 8 and swaps back.
{
  const mgr = new LuaManager(() => [1280, 720]);
  assert.equal(mgr.add('dmu-p2-forsaken.lua', groupCode).ok, true);

  for (const [id, name, x, y] of POSITIONS) mgr.onLogLine(posLine(id, name, x, y));

  const set1Ids = { 'Abnar Fae': '02CB', 'Cora Fenix': '02CD', 'Torn Amo': '02CB', 'Zephyra Hana': '02CC', 'Erynd Altansarr': '02CD', 'Hendrick Sands': '02CD', 'Minda Silva': '02CC', 'Vittorio Dravorn': '02CC' };
  let n = 0;
  for (const [id, name] of [...GROUP_A, ...GROUP_B]) {
    mgr.onLogLine(markerLine(id, name, set1Ids[name], `uid-grp-${++n}`));
  }
  mgr.frame(1 / 60);
  let texts = sceneTexts(mgr);
  assert.ok(texts.includes('1 SPREAD OUT'), `closest player shares your icon -> OUT, got: ${texts.join(', ')}`);

  for (let wave = 2; wave <= 3; wave++) {
    await sleep(60); // ~10s between real waves
    n = 0;
    for (const [id, name] of GROUP_A) {
      mgr.onLogLine(markerLine(id, name, '02CD', `uid-grp${wave}-${++n}`));
    }
    mgr.frame(1 / 60);
    texts = sceneTexts(mgr);
    assert.ok(texts.includes(`${wave} SPREAD OUT`), `group holds through your skip-waves: ${texts.join(', ')}`);
  }

  // Set 4 marks group B — the swap lands with it, and Minda receives CONE.
  await sleep(60);
  n = 0;
  for (const [id, name] of GROUP_B) {
    mgr.onLogLine(markerLine(id, name, '02CD', `uid-grpc-${++n}`));
  }
  mgr.frame(1 / 60);
  texts = sceneTexts(mgr);
  assert.ok(texts.includes('4 CONE IN'), `set 4 swaps the group, got: ${texts.join(', ')}`);

  // Sets 5-7 keep the swapped group; set 6 re-marks Minda (STACK), set 7 skips her.
  const lateWaves = { 5: [GROUP_A, '02CC'], 6: [GROUP_B, '02CB'], 7: [GROUP_A, '02CD'] };
  for (const wave of [5, 6, 7]) {
    await sleep(60);
    n = 0;
    const [who, icon] = lateWaves[wave];
    for (const [id, name] of who) {
      mgr.onLogLine(markerLine(id, name, icon, `uid-grp${wave}-${++n}`));
    }
    mgr.frame(1 / 60);
  }
  texts = sceneTexts(mgr);
  assert.ok(texts.includes('7 STACK IN'), `swapped group persists to the final wave: ${texts.join(', ')}`);

  // ~EIGHT_DELAY after set 7's last marker: counter advances to 8 and swaps back.
  await sleep(100);
  mgr.frame(1 / 60);
  texts = sceneTexts(mgr);
  assert.ok(texts.includes('8 STACK OUT'), `synthetic set 8 swaps again, got: ${texts.join(', ')}`);
}

// Different icons with the closest player -> IN (and the set-4 swap flips it to OUT).
{
  const mgr = new LuaManager(() => [1280, 720]);
  assert.equal(mgr.add('dmu-p2-forsaken.lua', groupCode).ok, true);

  for (const [id, name, x, y] of POSITIONS) mgr.onLogLine(posLine(id, name, x, y));

  // This pull Vittorio carries STACK while Minda has SPREAD.
  const set1Ids = { 'Abnar Fae': '02CB', 'Cora Fenix': '02CD', 'Torn Amo': '02CB', 'Zephyra Hana': '02CC', 'Erynd Altansarr': '02CD', 'Hendrick Sands': '02CD', 'Minda Silva': '02CC', 'Vittorio Dravorn': '02CB' };
  let n = 0;
  for (const [id, name] of [...GROUP_A, ...GROUP_B]) {
    mgr.onLogLine(markerLine(id, name, set1Ids[name], `uid-grp2-${++n}`));
  }
  mgr.frame(1 / 60);
  let texts = sceneTexts(mgr);
  assert.ok(texts.includes('1 SPREAD IN'), `closest player differs -> IN, got: ${texts.join(', ')}`);

  for (let wave = 2; wave <= 4; wave++) {
    await sleep(60);
    n = 0;
    const who = wave === 4 ? GROUP_B : GROUP_A;
    for (const [id, name] of who) {
      mgr.onLogLine(markerLine(id, name, '02CD', `uid-grp2-${wave}-${++n}`));
    }
    mgr.frame(1 / 60);
  }
  texts = sceneTexts(mgr);
  assert.ok(texts.includes('4 CONE OUT'), `set-4 swap flips IN to OUT, got: ${texts.join(', ')}`);
}

// The two latched lines are drawn large (>= 40px at the test canvas size), not tiny.
{
  const mgr = new LuaManager(() => [1280, 720]);
  assert.equal(mgr.add('dmu-p2-forsaken.lua', code).ok, true);
  mgr.onLogLine(markerLine('10020C04', 'Minda Silva', '02CB', 'uid-s-0'));
  mgr.onLogLine(castLine("Future's End"));
  mgr.frame(1 / 60);
  const big = mgr.scenes()[0].scene.filter((op) => op.type === 'text' && op.size >= 40).map((op) => op.text);
  assert.ok(big.includes('1 STACK') && big.includes('FUTURE'), `latched lines drawn large, got: ${big.join(', ')}`);
}

console.log('forsaken tests passed');
