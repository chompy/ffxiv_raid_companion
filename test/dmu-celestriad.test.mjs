// Tests for bundled/dmu-p5-celestriad.lua using the user's real 2026-10-02 pull
// (Minda got FIRE) plus synthetic lines.
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { LuaManager } from '../src/luaEngine.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const code = readFileSync(path.join(here, '..', 'bundled', 'dmu-p5-celestriad.lua'), 'utf8');
const fixture = (name) => path.join(here, 'fixtures', name);

// The one big word is the only text op at size >= 24 other than the dimmed "?"
// pending placeholder; the title renders at 16.
function bigWord(mgr) {
  const ops = mgr.scenes()[0].scene.filter((o) => o.type === 'text' && o.size >= 24 && o.text !== '?');
  assert.ok(ops.length <= 1, `at most one big word: ${JSON.stringify(ops)}`);
  return ops[0] ?? null;
}

function hasTitle(mgr, namePart) {
  const ops = mgr.scenes()[0].scene.filter((o) => o.type === 'text');
  return ops.some((o) => o.text.startsWith('DMU P5 - Celestriad') && o.text.includes(namePart));
}

// Replays the snippet, running frames periodically like the live app does.
function replay(mgr, file) {
  const lines = readFileSync(file, 'utf8').split('\n').map((l) => l.trim()).filter(Boolean);
  for (let i = 0; i < lines.length; i++) {
    mgr.onLogLine(lines[i]);
    if (i % 5 === 0) mgr.frame(1 / 60);
  }
  mgr.frame(1 / 60);
}

function freshMgr(src = code) {
  const m = new LuaManager(() => [1280, 720]);
  assert.equal(m.add('dmu-p5-celestriad.lua', src).ok, true, 'script should load');
  return m;
}

// --- real-log replay ------------------------------------------------------------
// The user's actual pull cut from Network_30301_20261002.log: Celestriad cast start,
// land, the six initial applies (Minda = Fire), then two rotation waves that re-apply
// different elements to everyone — including LIGHTNING on Minda and a first debuff on
// Waka Wakado, one of the clean pair. Only the initial wave may be shown.

function testRealPullFire() {
  const mgr = freshMgr();
  replay(mgr, fixture('p5_celestriad.log'));
  const word = bigWord(mgr);
  assert.equal(word.text, 'FIRE', `Minda's initial element: ${JSON.stringify(word)}`);
  assert.equal(word.color, '#ffd24c', 'element drawn in accent gold');
  assert.ok(hasTitle(mgr, 'Minda Silva'), 'title shows tracked player');
}

// Same pull, but tracking Waka Wakado (a clean pair member who DOES get a debuff —
// Lightning — during the rotation). His word must be NONE from the completed initial
// wave, not the rotated-in element.
function testRealPullCleanPair() {
  const mgr = freshMgr();
  mgr.onLogLine('2|2026-10-02T16:40:00.0000000-04:00|100A613C|Waka Wakado');
  replay(mgr, fixture('p5_celestriad.log'));
  const word = bigWord(mgr);
  assert.equal(word.text, 'NONE', `clean pair member shows NONE: ${JSON.stringify(word)}`);
  assert.equal(word.color, '#7dff9e', 'NONE drawn green (safe)');
  assert.ok(hasTitle(mgr, 'Waka Wakado'), 'title follows the primary player switch');
}

testRealPullFire();
testRealPullCleanPair();

// --- synthetic cases ------------------------------------------------------------
const cast = `20|2026-10-02T17:00:00.0000000-04:00|40007F6E|Kefka|BB42|Celestriad|40007F6E|Kefka|5.000|99.99|99.99|-0.01|3.14|aaaa`;
const land = `21|2026-10-02T17:00:05.0000000-04:00|40007F6E|Kefka|BB42|Celestriad|40007F6E|Kefka|1B|BBBB8000|0|0|0|0|0|0|0|0|0|0|0|0|0|0|44|44|0|10000|||99.99|99.99|-0.01|3.14|44|44|0|10000|||99.99|99.99|0.00|0.00|00006B10|0|1|00||01|BB42|BB42|5.000|FFFF|bbbb`;
const apply = (id, name, status) => `26|2026-10-02T17:00:05.0000000-04:00|${status}|Resistance Down II|20.00|E0000000||${id}|${name}|00|204515||cccc`;

function testNoneByCount() {
  // Six distinct players debuffed, Minda among none of them -> NONE the moment the
  // wave completes (no timeout wait needed).
  const m = freshMgr();
  m.onLogLine(cast);
  m.frame(1 / 60);
  assert.equal(bigWord(m), null, 'nothing big while the wave is still pending');
  const ops = m.scenes()[0].scene.filter((o) => o.type === 'text');
  assert.ok(ops.some((o) => o.text === '?'), 'dimmed placeholder while resolving');

  m.onLogLine(land);
  m.onLogLine(apply('10030AAB', 'Summer Chan', 'B57'));
  m.onLogLine(apply('1004EEC3', 'Cia Leighder', 'BB6'));
  m.onLogLine(apply('1005FE0D', 'Wrcked Zx', 'B56'));
  m.onLogLine(apply('10059579', "Tetra Q'", 'B57'));
  m.onLogLine(apply('100C1E45', 'Ami Han', 'BB6'));
  m.frame(1 / 60);
  assert.equal(bigWord(m), null, 'five of six assigned: still pending');

  m.onLogLine(apply('100DA4F2', 'Wakaba Nogi', 'B56')); // sixth distinct player completes the wave
  m.frame(1 / 60);
  const word = bigWord(m);
  assert.equal(word.text, 'NONE');
  assert.equal(word.color, '#7dff9e');
}

function testNoFalseTriggerWithoutCast() {
  // An earlier phase applies Lightning Resistance Down II (same status BB6) on its own
  // schedule. With no Celestriad cast seen, none of it may draw anything — including a
  // debuff sitting directly on the tracked player.
  const m = freshMgr();
  m.onLogLine(apply('10020C04', 'Minda Silva', 'BB6'));
  m.frame(1 / 60);
  assert.equal(m.scenes()[0].scene.length, 0, 'no Celestriad cast -> nothing drawn');

  // Once the real cast arrives the tracker arms and her NEXT (initial-wave) element wins.
  m.onLogLine(cast);
  m.onLogLine(land);
  m.onLogLine(apply('10020C04', 'Minda Silva', 'B56'));
  m.frame(1 / 60);
  assert.equal(bigWord(m).text, 'FIRE');
}

function testRotationIgnored() {
  // A mid-mechanic rotation re-apply (different element, later timestamp) must not
  // overwrite the initial assignment — even for a player who was clean at first.
  const m = freshMgr();
  m.onLogLine(cast);
  m.onLogLine(land);
  m.onLogLine(apply('10030AAB', 'Summer Chan', 'B57'));
  m.onLogLine(apply('1004EEC3', 'Cia Leighder', 'BB6'));
  m.onLogLine(apply('1005FE0D', 'Wrcked Zx', 'B56'));
  m.onLogLine(apply('10059579', "Tetra Q'", 'B57'));
  m.onLogLine(apply('100C1E45', 'Ami Han', 'BB6'));
  m.frame(1 / 60);
  assert.equal(bigWord(m), null, 'five of six assigned: still pending');

  m.onLogLine(apply('100DA4F2', 'Wakaba Nogi', 'B56')); // sixth completes the wave; Minda clean
  m.frame(1 / 60);
  assert.equal(bigWord(m).text, 'NONE', 'clean before rotation');

  // Rotation: the clean player gets Lightning and Minda's Fire rotates to someone else.
  const rot = (id, name, status) => `26|2026-10-02T17:00:15.0000000-04:00|${status}|Resistance Down II|20.00|E0000000||${id}|${name}|00|204515||dddd`;
  m.onLogLine(rot('100A613C', 'Waka Wakado', 'BB6'));
  m.frame(1 / 60);
  assert.equal(bigWord(m).text, 'NONE', 'rotation debuff on a clean player changes nothing');
}

function testCombatStartReset() {
  const m = freshMgr();
  m.onLogLine(cast);
  m.onLogLine(land);
  m.onLogLine(apply('10020C04', 'Minda Silva', 'B56'));
  m.frame(1 / 60);
  assert.equal(bigWord(m).text, 'FIRE');

  // A re-pull in the same zone fires onCombatStart (never onChangeZone).
  m.onCombatStart();
  m.frame(1 / 60);
  assert.equal(m.scenes()[0].scene.length, 0, 'cleared on combat start (same-zone re-pull)');

  // A defeat/victory end clears it too.
  m.onLogLine(cast);
  m.onLogLine(land);
  m.onLogLine(apply('10020C04', 'Minda Silva', 'B56'));
  m.frame(1 / 60);
  assert.equal(bigWord(m).text, 'FIRE');
  m.onCombatEnd('defeat', 123456);
  m.frame(1 / 60);
  assert.equal(m.scenes()[0].scene.length, 0, 'cleared on combat end');
}

async function testTimeoutFallback() {
  // No apply lines ever arrive (interrupted cast or dropped lines): the shrunken arm
  // window lapses and the display finalizes to NONE rather than waiting forever.
  const m = freshMgr(code.replace('local ARM_WINDOW_MS = 8000', 'local ARM_WINDOW_MS = 40'));
  m.onLogLine(cast);
  m.frame(1 / 60);
  assert.equal(bigWord(m), null, 'pending before the window lapses');
  await new Promise((resolve) => setTimeout(resolve, 90)); // outlast the shrunken window
  m.frame(1 / 60);
  assert.equal(bigWord(m).text, 'NONE', 'window lapse finalizes NONE');
}

testNoneByCount();
testNoFalseTriggerWithoutCast();
testRotationIgnored();
testCombatStartReset();
await testTimeoutFallback();

console.log('dmu-celestriad tests passed');
