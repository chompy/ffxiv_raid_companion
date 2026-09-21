// Tests for bundled/dmu-p4-debuffs.lua using real DMU P4 log snippets plus synthetic lines.
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { LuaManager } from '../src/luaEngine.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const code = readFileSync(path.join(here, '..', 'bundled', 'dmu-p4-debuffs.lua'), 'utf8');

// Group the scene's text ops into visual rows (each table row has a unique y).
// Cells are { text, color } sorted by x so highlight colors can be asserted.
function tableRows(mgr) {
  const ops = mgr.scenes()[0].scene.filter((o) => o.type === 'text');
  const byY = new Map();
  for (const op of ops) {
    if (!byY.has(op.y)) byY.set(op.y, []);
    byY.get(op.y).push({ text: op.text, color: op.color, x: op.x });
  }
  return [...byY.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, cells]) => cells.sort((p, q) => p.x - q.x));
}

// Exact cell match: labels like "Inferno" also appear embedded in the casts line.
function rowWith(rows, label) {
  return rows.find((r) => r.some((c) => c.text === label)) ?? null;
}

function hasVerdict(row, verdict) {
  return row !== null && row.some((c) => c.text === verdict);
}

// Replays the whole snippet, running frames periodically like the live app does so
// unknown mechanics get their per-frame tell re-check.
function replay(mgr, file) {
  const lines = readFileSync(file, 'utf8').split('\n').map((l) => l.trim()).filter(Boolean);
  for (let i = 0; i < lines.length; i++) {
    mgr.onLogLine(lines[i]);
    if (i % 25 === 0) mgr.frame(1 / 60);
  }
  mgr.frame(1 / 60);
}

const fixture = (name) => path.join(here, 'fixtures', name);

// --- Real-log replays -----------------------------------------------------------
// Each pull below is a snippet of consumed line types cut from a full session log:
// three Grand Cross rounds plus one Tsunami and one Inferno round, real/fake tells
// mixed. Minda Silva (the default primary player) is in the party for both.

function testMixedPullLatestFake() {
  // Rounds: GC#1 REAL, Tsunami REAL, GC#2 REAL, Inferno FAKE, GC#3 FAKE.
  const mgr = new LuaManager(() => [1280, 720]);
  assert.equal(mgr.add('dmu-p4-debuffs.lua', code).ok, true, 'script should load');
  replay(mgr, fixture('p4_mixed_latest_fake.log'));

  const rows = tableRows(mgr);

  // Shriek rows are stamped per CLASS by the apply lines: the short class landed in
  // GC#1's round (REAL tell active), the long class in GC#2's round (also REAL).
  // Inferno stayed [FAKE] even though its Entropy debuffs landed AFTER Chaos's tell
  // had lifted — the cast stamped it while the tell was still fresh, and a late apply
  // must not downgrade an already-resolved round to unknown.
  assert.ok(hasVerdict(rowWith(rows, 'Cursed Shriek (Short)'), '[REAL]'), `csShort [REAL]: ${JSON.stringify(rowWith(rows, 'Cursed Shriek (Short)'))}`);
  assert.ok(hasVerdict(rowWith(rows, 'Cursed Shriek (Long)'), '[REAL]'), `csLong [REAL]: ${JSON.stringify(rowWith(rows, 'Cursed Shriek (Long)'))}`);
  assert.ok(hasVerdict(rowWith(rows, 'Inferno'), '[FAKE]'), `inferno [FAKE]: ${JSON.stringify(rowWith(rows, 'Inferno'))}`);
  assert.ok(hasVerdict(rowWith(rows, 'Tsunami'), '[REAL]'), `tsunami [REAL]: ${JSON.stringify(rowWith(rows, 'Tsunami'))}`);

  // Personal rows pin to YOUR debuff's round: Minda's Compressed Water came from GC#2
  // (REAL) and her Acceleration Bomb from GC#1 (REAL), so both stay [REAL] even though
  // the final shriek rounds were FAKE. She holds water, not lightning.
  const cwflRow = rowWith(rows, 'Compressed Water');
  assert.ok(hasVerdict(cwflRow, '[REAL]'), `cw/fl row [REAL]: ${JSON.stringify(cwflRow)}`);
  assert.equal(cwflRow.find((c) => c.text === 'Compressed Water').color, '#ffd27f', 'water highlighted for Minda');
  assert.equal(cwflRow.find((c) => c.text.startsWith('/ Forked Lightning')).color, '#6a6a80', 'lightning dimmed');
  assert.ok(hasVerdict(rowWith(rows, 'Acceleration Bomb'), '[REAL]'), `ab [REAL]: ${JSON.stringify(rowWith(rows, 'Acceleration Bomb'))}`);

  // "you" markers: her 60s shriek is the Short class; she carries Entropy + Dynamic Fluid.
  assert.ok(rowWith(rows, 'Cursed Shriek (Short)').some((c) => c.text === 'you'), '"you" on shriek Short');
  assert.ok(!rowWith(rows, 'Cursed Shriek (Long)').some((c) => c.text === 'you'), 'no "you" on shriek Long');
  assert.ok(rowWith(rows, 'Inferno').some((c) => c.text === 'you'), '"you" on Inferno (has Entropy)');
  assert.ok(rowWith(rows, 'Tsunami').some((c) => c.text === 'you'), '"you" on Tsunami (has Dynamic Fluid)');

  // Cast tracking saw all three big moves; at the end only Neo Exdeath's GC#3 FAKE tell
  // is still active — Chaos's Inferno tell was removed before the snippet ends.
  const castLine = rows.find((r) => r[0].text.startsWith('last casts:'));
  assert.ok(castLine, 'cast line drawn');
  for (const name of ['Grand Cross', 'Inferno', 'Tsunami']) {
    assert.ok(castLine.some((c) => c.text.includes(name)), `last casts includes ${name}: ${JSON.stringify(castLine)}`);
  }

  const tellLine = rows.find((r) => r[0].text.startsWith('boss tells:'));
  assert.ok(tellLine, 'tell line drawn');
  assert.ok(tellLine.some((c) => c.text.includes('Neo Exdeath fake p=1121')), `NE fake tell shown: ${JSON.stringify(tellLine)}`);
  assert.ok(!tellLine.some((c) => c.text.includes('Chaos')), `chaos tell removed: ${JSON.stringify(tellLine)}`);

  // Wave classification (slots 1/4) needs real wall-clock spacing between the two
  // bursts; this harness delivers everything in milliseconds so both waves' expiries
  // collapse to four distinct values and her debuffs stay unclassifiable — windows
  // 1/4 render inactive. The global rows still resolve their words.
  assert.deepEqual(
    slotLines(mgr).map(({ text, color }) => ({ text, color })),
    [
      { text: '1 -', color: '#6a6a80' },                 // personal wave unknown
      { text: '2 - LOOK OUT', color: '#ffd24c' },        // csShort REAL
      { text: '3 - IN', color: '#ffd24c' },              // inferno FAKE
      { text: '4 -', color: '#6a6a80' },                 // personal wave unknown
      { text: '5 - LOOK OUT', color: '#ffd24c' },        // csLong REAL
      { text: '6 - IN', color: '#ffd24c' },              // tsunami REAL
    ],
    `pull-1 slots under compressed replay time: ${JSON.stringify(slotLines(mgr))}`);
}

function testMixedPullLatestReal() {
  // Rounds: GC#1 REAL, Tsunami REAL, GC#2 FAKE, Inferno FAKE, GC#3 REAL.
  const mgr = new LuaManager(() => [1280, 720]);
  assert.equal(mgr.add('dmu-p4-debuffs.lua', code).ok, true, 'script should load (pull 2)');
  replay(mgr, fixture('p4_mixed_latest_real.log'));

  const rows = tableRows(mgr);

  // Shriek rows are stamped per CLASS by the apply lines: short landed in GC#1's
  // round (REAL tell active), long in GC#2's round (FAKE tell active).
  assert.ok(hasVerdict(rowWith(rows, 'Cursed Shriek (Short)'), '[REAL]'), `csShort [REAL]: ${JSON.stringify(rowWith(rows, 'Cursed Shriek (Short)'))}`);
  assert.ok(hasVerdict(rowWith(rows, 'Cursed Shriek (Long)'), '[FAKE]'), `csLong [FAKE]: ${JSON.stringify(rowWith(rows, 'Cursed Shriek (Long)'))}`);
  assert.ok(hasVerdict(rowWith(rows, 'Inferno'), '[FAKE]'), `inferno [FAKE]: ${JSON.stringify(rowWith(rows, 'Inferno'))}`);
  assert.ok(hasVerdict(rowWith(rows, 'Tsunami'), '[REAL]'), `tsunami [REAL]: ${JSON.stringify(rowWith(rows, 'Tsunami'))}`);

  // Personal rows are SPLIT here: her Compressed Water landed in GC#2's FAKE round while
  // her Acceleration Bomb came from GC#1's REAL round. She holds water, not lightning.
  const cwflRow = rowWith(rows, 'Compressed Water');
  assert.ok(hasVerdict(cwflRow, '[FAKE]'), `cw/fl row [FAKE]: ${JSON.stringify(cwflRow)}`);
  assert.equal(cwflRow.find((c) => c.text === 'Compressed Water').color, '#ffd27f', 'water highlighted for Minda');
  assert.equal(cwflRow.find((c) => c.text.startsWith('/ Forked Lightning')).color, '#6a6a80', 'lightning dimmed');
  assert.ok(hasVerdict(rowWith(rows, 'Acceleration Bomb'), '[REAL]'), `ab [REAL]: ${JSON.stringify(rowWith(rows, 'Acceleration Bomb'))}`);

  // "you" markers: she carries Entropy + Dynamic Fluid but no Cursed Shriek this pull.
  assert.ok(!rowWith(rows, 'Cursed Shriek (Short)').some((c) => c.text === 'you'), 'no "you" on shriek Short');
  assert.ok(!rowWith(rows, 'Cursed Shriek (Long)').some((c) => c.text === 'you'), 'no "you" on shriek Long');
  assert.ok(rowWith(rows, 'Inferno').some((c) => c.text === 'you'), '"you" on Inferno (has Entropy)');
  assert.ok(rowWith(rows, 'Tsunami').some((c) => c.text === 'you'), '"you" on Tsunami (has Dynamic Fluid)');

  const castLine = rows.find((r) => r[0].text.startsWith('last casts:'));
  assert.ok(castLine, 'cast line drawn (pull 2)');
  for (const name of ['Grand Cross', 'Inferno', 'Tsunami']) {
    assert.ok(castLine.some((c) => c.text.includes(name)), `last casts includes ${name}: ${JSON.stringify(castLine)}`);
  }

  // GC#3's REAL tell is still active at the end of the snippet; Chaos's was removed.
  const tellLine = rows.find((r) => r[0].text.startsWith('boss tells:'));
  assert.ok(tellLine, 'tell line drawn (pull 2)');
  assert.ok(tellLine.some((c) => c.text.includes('Neo Exdeath real p=1122')), `NE real tell shown: ${JSON.stringify(tellLine)}`);
  assert.ok(!tellLine.some((c) => c.text.includes('Chaos')), `chaos tell removed: ${JSON.stringify(tellLine)}`);

  // Same compressed-time caveat as pull 1: her debuffs stay unclassifiable, so
  // windows 1/4 render inactive; the global rows all resolve.
  assert.deepEqual(
    slotLines(mgr).map(({ text, color }) => ({ text, color })),
    [
      { text: '1 -', color: '#6a6a80' },            // personal wave unknown
      { text: '2 - LOOK OUT', color: '#ffd24c' },   // csShort REAL
      { text: '3 - IN', color: '#ffd24c' },         // inferno FAKE
      { text: '4 -', color: '#6a6a80' },            // personal wave unknown
      { text: '5 - LOOK IN', color: '#ffd24c' },    // csLong FAKE
      { text: '6 - IN', color: '#ffd24c' },         // tsunami REAL
    ],
    `pull-2 slots under compressed replay time: ${JSON.stringify(slotLines(mgr))}`);
}

// --- resolution slots -----------------------------------------------------------
// All six resolution windows render as huge lines under the table, always; a window
// with nothing resolved draws blank and dimmed (C_DIMMED). Windows 1/4 show STACK
// when you hold nothing in that wave. A personal word needs wave classification,
// which needs both of the party's waves observed — one other-player apply on the
// opposite wave is enough to pin it down. Expected lines are [text, active] pairs.
const A = (t) => [t, true];
const I = (t) => [t, false];
function slotLines(mgr) {
  const ops = mgr.scenes()[0].scene.filter((o) => o.type === 'text');
  return ops.filter((o) => o.size >= 24).sort((a, b) => a.y - b.y)
    .map((o) => ({ text: o.text, color: o.color, size: o.size, x: o.x }));
}

const tellNE = (p) => `26|2026-09-17T21:00:00.0000000-04:00|808|Unknown_808|9999.00|E0000000||400250AA|Neo Exdeath|${p}|188300||tellne`;
const tellChaos = (p) => `26|2026-09-17T21:00:00.0000000-04:00|808|Unknown_808|9999.00|E0000000||400250AB|Chaos|${p}|188300||tellch`;
const applyTo = (id, name, status, label, dur) => `26|2026-09-17T21:00:01.0000000-04:00|${status}|${label}|${dur}.00|E0000000||${id}|${name}|00|204515||aaaa`;
const applyToMe = (status, label, dur) => applyTo('10020C04', 'Minda Silva', status, label, dur);
const removeMine = (status, name) => `30|2026-09-17T21:00:05.0000000-04:00|${status}|${name}|0.00|E0000000||10020C04|Minda Silva||||gone`;

function freshMgr() {
  const m = new LuaManager(() => [1280, 720]);
  assert.equal(m.add('dmu-p4-debuffs.lua', code).ok, true);
  return m;
}

// Per-status reality maps: water/lightning are opposites, inferno/tsunami are
// opposites; bomb and shriek resolve the same for both classes. Each case puts
// Minda's debuff in a known wave (30s = short, 69/75s = long) via an opposite-wave apply.
function testSlotMaps() {
  const OTHER_SHORT = () => applyTo('100F612E', 'Mr Toxic', '15AA', 'Acceleration Bomb', 30);
  const OTHER_LONG = () => applyTo('100F612E', 'Mr Toxic', '15A8', 'Forked Lightning', 75);
  // All six windows are always drawn. Windows 1 and 4 carry her word in the wave she
  // holds and STACK in the empty one; shriek/Chaos cases hold no personal debuff at
  // all, so both of those default to STACK as well. Everything unresolved is blank.
  const cases = [
    ['ne', '460', '15A9', 'Compressed Water', 30, OTHER_LONG,
      [A('1 - STACK'), I('2 -'), I('3 -'), A('4 - STACK'), I('5 -'), I('6 -')]],  // water REAL short
    ['ne', '461', '15A9', 'Compressed Water', 30, OTHER_LONG,
      [A('1 - SPREAD'), I('2 -'), I('3 -'), A('4 - STACK'), I('5 -'), I('6 -')]], // water FAKE short
    ['ne', '460', '15A8', 'Forked Lightning', 75, OTHER_SHORT,
      [A('1 - STACK'), I('2 -'), I('3 -'), A('4 - SPREAD'), I('5 -'), I('6 -')]], // lightning REAL long
    ['ne', '461', '15A8', 'Forked Lightning', 30, OTHER_LONG,
      [A('1 - STACK'), I('2 -'), I('3 -'), A('4 - STACK'), I('5 -'), I('6 -')]],  // lightning FAKE short
    ['ne', '460', '15AA', 'Acceleration Bomb', 75, OTHER_SHORT,
      [A('1 - STACK'), I('2 -'), I('3 -'), A('4 - STOP'), I('5 -'), I('6 -')]],   // bomb REAL long
    ['ne', '461', '15AA', 'Acceleration Bomb', 30, OTHER_LONG,
      [A('1 - MOVE'), I('2 -'), I('3 -'), A('4 - STACK'), I('5 -'), I('6 -')]],   // bomb FAKE short
    ['ne', '460', '15A7', 'Cursed Shriek', 60, null,
      [A('1 - STACK'), A('2 - LOOK OUT'), I('3 -'), A('4 - STACK'), I('5 -'), I('6 -')]], // shriek REAL (short)
    ['ne', '461', '15A7', 'Cursed Shriek', 69, null,
      [A('1 - STACK'), I('2 -'), I('3 -'), A('4 - STACK'), A('5 - LOOK IN'), I('6 -')]], // shriek FAKE (long)
    ['chaos', '460', '15AB', 'Entropy', 45, null,
      [A('1 - STACK'), I('2 -'), A('3 - OUT'), A('4 - STACK'), I('5 -'), I('6 -')]],     // inferno REAL
    ['chaos', '461', '15AB', 'Entropy', 45, null,
      [A('1 - STACK'), I('2 -'), A('3 - IN'), A('4 - STACK'), I('5 -'), I('6 -')]],      // inferno FAKE
    ['chaos', '460', '15AC', 'Dynamic Fluid', 84, null,
      [A('1 - STACK'), I('2 -'), I('3 -'), A('4 - STACK'), I('5 -'), A('6 - IN')]],      // tsunami REAL (opposite of inferno)
    ['chaos', '461', '15AC', 'Dynamic Fluid', 84, null,
      [A('1 - STACK'), I('2 -'), I('3 -'), A('4 - STACK'), I('5 -'), A('6 - OUT')]],     // tsunami FAKE
  ];
  for (const [boss, p, status, label, dur, otherApply, expected] of cases) {
    const m = freshMgr();
    m.onLogLine(boss === 'ne' ? tellNE(p) : tellChaos(p));
    if (otherApply) m.onLogLine(otherApply());
    m.onLogLine(applyToMe(status, label, dur));
    m.frame(1 / 60);
    const lines = slotLines(m);
    assert.deepEqual(
      lines.map((l) => [l.text, l.color === '#ffd24c']), // active=accent, inactive=dimmed gray
      expected, `${label} (${boss}, p=${p}): ${JSON.stringify(lines)}`);
    for (const l of lines) {
      if (l.color !== '#ffd24c') assert.equal(l.color, '#6a6a80', `inactive slot line dimmed: ${l.text}`);
      // Nothing may run off the canvas edge (same advance width the renderer assumes).
      const right = l.x + l.text.length * l.size * 0.62;
      assert.ok(l.x >= 0 && right <= 1280, `slot line fits on canvas: ${l.text} x=${l.x} right=${right}`);
    }
    // Every window shares the same left edge so the numbers line up.
    assert.equal(new Set(lines.map((l) => l.x)).size, 1, `shared left edge for ${label}: ${JSON.stringify(lines)}`);
  }
}

testSlotMaps();

// The exact scenario from the spec: Minda holds a short FAKE bomb, a long REAL
// water and a long FAKE shriek; globally the short shriek is REAL and both Chaos
// rounds are REAL. All six windows resolve at once.
function testUserExample() {
  const m = freshMgr();
  // FAKE round: her short-timer bomb + long shriek land under it, plus one other
  // player's short-wave debuff so the wave split is observable.
  m.onLogLine(tellNE('461'));
  m.onLogLine(applyToMe('15AA', 'Acceleration Bomb', 30));
  m.onLogLine(applyTo('100F612E', 'Mr Toxic', '15A9', 'Compressed Water', 30));
  m.onLogLine(applyToMe('15A7', 'Cursed Shriek', 69));
  // REAL round: her long-timer water + another player's long-wave debuff; the
  // short shriek is REAL globally (on someone else).
  m.onLogLine(tellNE('460'));
  m.onLogLine(applyToMe('15A9', 'Compressed Water', 75));
  m.onLogLine(applyTo('100F612E', 'Mr Toxic', '15AA', 'Acceleration Bomb', 75));
  m.onLogLine(applyTo('AAAA0001', 'Someone Else', '15A7', 'Cursed Shriek', 60));
  // Both Chaos rounds are REAL.
  m.onLogLine(tellChaos('460'));
  m.onLogLine(applyToMe('15AB', 'Entropy', 45));
  m.onLogLine(applyToMe('15AC', 'Dynamic Fluid', 84));
  m.frame(1 / 60);

  assert.deepEqual(slotLines(m).map((l) => l.text), [
    '1 - MOVE',       // her FAKE bomb, short wave
    '2 - LOOK OUT',   // short shriek REAL
    '3 - OUT',        // inferno REAL
    '4 - STACK',      // her REAL water, long wave (real water = stack)
    '5 - LOOK IN',    // long shriek FAKE
    '6 - IN',         // tsunami REAL
  ]);
}

testUserExample();

// A resolved debuff drops its line on removal; with only one wave observed the
// personal slots stay hidden rather than guess, and with no tells nothing draws.
function testSlotRemovalAndAmbiguity() {
  const m = freshMgr();
  // One REAL round; she holds a water in the short wave and a bomb in the long one.
  m.onLogLine(tellNE('460'));
  m.onLogLine(applyToMe('15A9', 'Compressed Water', 30));
  m.onLogLine(applyTo('100F612E', 'Mr Toxic', '15AA', 'Acceleration Bomb', 30));
  m.onLogLine(applyToMe('15AA', 'Acceleration Bomb', 75));
  m.onLogLine(applyTo('100F612E', 'Mr Toxic', '15A8', 'Forked Lightning', 75));
  const proj = (mgr) => slotLines(mgr).map((l) => [l.text, l.color === '#ffd24c']);
  m.frame(1 / 60);
  assert.deepEqual(proj(m), [
    A('1 - STACK'), // her REAL water, short wave
    I('2 -'),
    I('3 -'),
    A('4 - STOP'),  // her REAL bomb, long wave
    I('5 -'),
    I('6 -'),
  ]);

  // Resolving her bomb (own removal line): the 4th window becomes a plain stack.
  m.onLogLine(removeMine('15AA', 'Acceleration Bomb'));
  m.frame(1 / 60);
  assert.deepEqual(proj(m), [A('1 - STACK'), I('2 -'), I('3 -'), A('4 - STACK'), I('5 -'), I('6 -')]);

  // Everyone on the same timer -> one expiry cluster -> wave unknown. Her debuff is
  // unclassifiable, so no word AND no default stack may be guessed: both windows
  // render inactive.
  const bare = freshMgr();
  bare.onLogLine(tellNE('460'));
  bare.onLogLine(applyToMe('15A9', 'Compressed Water', 30));
  bare.onLogLine(applyTo('100F612E', 'Mr Toxic', '15AA', 'Acceleration Bomb', 30));
  bare.frame(1 / 60);
  assert.deepEqual(proj(bare), [I('1 -'), I('2 -'), I('3 -'), I('4 -'), I('5 -'), I('6 -')],
    'single observed wave -> personal windows stay inactive');

  // No tell at all: nothing is resolved, so every window stays inactive.
  const none = freshMgr();
  none.onLogLine(applyToMe('15A9', 'Compressed Water', 30));
  none.frame(1 / 60);
  assert.deepEqual(proj(none), [I('1 -'), I('2 -'), I('3 -'), I('4 -'), I('5 -'), I('6 -')],
    'no tells -> all windows inactive');
}

testSlotRemovalAndAmbiguity();

testMixedPullLatestFake();
testMixedPullLatestReal();

// --- cross-phase false positive -------------------------------------------------
// Other phases reuse the ability NAMES: Kefka casts "Inferno" (BAF4) and
// "Tsunami" (BAF5). Only P4's action hexes cast by Chaos / Neo Exdeath count.
const xMgr = new LuaManager(() => [1280, 720]);
assert.equal(xMgr.add('dmu-p4-debuffs.lua', code).ok, true);
xMgr.onLogLine('21|2026-09-14T21:21:53.3740000-04:00|40016803|Kefka|BAF4|Inferno|E0000000||0|0|0|0|0|0|0|0|0|0|0|0|0|0|0|0|||||||||||44|44|0|10000|||117.32|90.00|-0.00|-0.00|0000D352|0|0|00||01|BAF4|BAF4|1.100|7FFF|138400e8224f3810');
xMgr.onLogLine('21|2026-09-14T21:22:20.3990000-04:00|40016804|Kefka|BAF5|Tsunami|100F612E|Mr Toxic|650003|E9E54001|E80E|B7D0000|1B|BAF58000|0|0|0|0|0|0|0|0|0|0|205177|205177|8300|10000|||117.06|105.56|-0.00|1.12|44|44|0|10000|||109.90|109.90|0.00|0.00|0000D449|0|1|00||01|BAF5|BAF5|1.100|7FFF|b5ec3e8e9db67d17');
xMgr.frame(1 / 60);
// No P4 mechanic has happened, so nothing is drawn at all (not even an empty table).
assert.equal(tableRows(xMgr).length, 0, "Kefka's cross-phase casts must not show the tracker");

// The real P4 cast (Chaos, BB1E) still stamps.
xMgr.onLogLine('21|2026-09-14T23:46:02.3890000-04:00|400250AB|Chaos|BB1E|Inferno|400250AB|Chaos|5F10|8080000|1B|BB1E8000|0|0|0|0|0|0|0|0|0|0|0|0|37552669|37552669|10000|10000||');
xMgr.frame(1 / 60);
let xRows = tableRows(xMgr);
const xCastLine2 = xRows.find((r) => r[0].text.startsWith('last casts:'));
assert.ok(xCastLine2.some((c) => c.text.includes('Inferno')), `P4 Chaos cast listed: ${JSON.stringify(xCastLine2)}`);

// --- ChangePrimaryPlayer identity ----------------------------------------------
const idMgr = new LuaManager(() => [1280, 720]);
assert.equal(idMgr.add('dmu-p4-debuffs.lua', code).ok, true);

// No primary player yet: default (Minda Silva) is tracked. A 69s shriek on her marks Long.
idMgr.onLogLine('26|2026-09-16T22:30:00.0000000-04:00|15A7|Cursed Shriek|69.00|E0000000||10020C04|Minda Silva|00|204515||aaaa0001');
idMgr.frame(1 / 60);
let idRows = tableRows(idMgr);
assert.ok(rowWith(idRows, 'you: Minda Silva') !== null || idRows.some((r) => r[0].text.includes('Minda Silva')),
  'default player shown in header');
assert.ok(rowWith(idRows, 'Cursed Shriek (Long)').some((c) => c.text === 'you'), '"you" on Long shriek for default player');

// A ChangePrimaryPlayer line (type 2: id|name) switches whose debuffs are marked.
idMgr.onLogLine('2|2026-09-16T22:30:05.0000000-04:00|100F612E|Mr Toxic');

// A 60s shriek on the new primary player now marks Short...
idMgr.onLogLine('26|2026-09-16T22:30:06.0000000-04:00|15A7|Cursed Shriek|60.00|E0000000||100F612E|Mr Toxic|00|204515||bbbb0001');
// ...while the same status on the old default player is ignored.
idMgr.onLogLine('26|2026-09-16T22:30:06.1000000-04:00|15A7|Cursed Shriek|69.00|E0000000||10020C04|Minda Silva|00|204515||bbbb0002');
idMgr.frame(1 / 60);
idRows = tableRows(idMgr);
assert.ok(idRows.some((r) => r[0].text.includes('Mr Toxic')), 'primary player shown after switch');
assert.ok(rowWith(idRows, 'Cursed Shriek (Short)').some((c) => c.text === 'you'), '"you" on Short shriek for new primary');
assert.ok(!rowWith(idRows, 'Cursed Shriek (Long)').some((c) => c.text === 'you'), 'no "you" left on Long shriek');

// --- synthetic REAL case --------------------------------------------------------
const realMgr = new LuaManager(() => [1280, 720]);
assert.equal(realMgr.add('dmu-p4-debuffs.lua', code).ok, true);

realMgr.onLogLine('26|2026-09-14T23:50:00.0000000-04:00|808|Unknown_808|9999.00|E0000000||400250AA|Neo Exdeath|460|188300||deadbeef');
realMgr.frame(1 / 60);
assert.ok(tableRows(realMgr).some((r) => r.some((c) => c.text.includes('Neo Exdeath real p=1120'))), 'REAL tell tracked');

// Name match (unknown entity id, correct name) still counts as "on you".
realMgr.onLogLine('26|2026-09-14T23:50:01.0000000-04:00|15A7|Cursed Shriek|69.00|E0000000||99999999|Minda Silva|00|204515||cafe0001');
realMgr.frame(1 / 60);
let rt = tableRows(realMgr);
const realLongRow = rowWith(rt, 'Cursed Shriek (Long)');
assert.ok(hasVerdict(realLongRow, '[REAL]'), `shriek Long [REAL]: ${JSON.stringify(realLongRow)}`);
assert.ok(realLongRow.some((c) => c.text === 'you'), '"you" on shriek Long');

// Tell removal + debuff removal: the mechanic fact persists but the "you" marker clears.
realMgr.onLogLine('30|2026-09-14T23:50:02.0000000-04:00|808|Unknown_808|0.00|E0000000||400250AA|Neo Exdeath|460|188300||deadbeef22');

// A DIFFERENT player's removal of the same status must not clear YOUR marker —
// each player's copy expires on its own schedule.
realMgr.onLogLine('30|2026-09-14T23:50:02.2000000-04:00|15A7|Cursed Shriek|0.00|E0000000||AAAA0001|Someone Else||||cafe000a');
realMgr.frame(1 / 60);
rt = tableRows(realMgr);
assert.ok(rowWith(rt, 'Cursed Shriek (Long)').some((c) => c.text === 'you'), "other player's removal keeps your marker");

// YOUR OWN removal line clears it. Remove lines carry the target at f[8]/f[9], like applies.
realMgr.onLogLine('30|2026-09-14T23:50:02.5000000-04:00|15A7|Cursed Shriek|0.00|E0000000||99999999|Minda Silva||||cafe0002');
realMgr.frame(1 / 60);
rt = tableRows(realMgr);
const clearedLongRow = rowWith(rt, 'Cursed Shriek (Long)');
assert.ok(hasVerdict(clearedLongRow, '[REAL]'), 'mechanic reality persists after removal');
assert.ok(!clearedLongRow.some((c) => c.text === 'you'), '"you" marker cleared on own removal');

// Zone change resets everything — with no activity left, nothing is drawn.
realMgr.onChangeZone('Somewhere Else');
realMgr.frame(1 / 60);
assert.equal(tableRows(realMgr).length, 0, 'cleared after zone change');

// --- idle auto-clear ------------------------------------------------------------
// The table stays up for CLEAR_MS (2 min) after the last mechanic line, then clears.
const clearMgr = new LuaManager(() => [1280, 720]);
assert.equal(clearMgr.add('dmu-p4-debuffs.lua', code.replace('local CLEAR_MS = 120000', 'local CLEAR_MS = 60')).ok, true);
clearMgr.onLogLine('26|2026-09-14T23:50:00.0000000-04:00|808|Unknown_808|9999.00|E0000000||400250AA|Neo Exdeath|460|188300||deadbeef');
clearMgr.frame(1 / 60);
assert.ok(tableRows(clearMgr).some((r) => r.some((c) => c.text.includes('Neo Exdeath real p=1120'))), 'tracker shown while mechanic active');
await new Promise((resolve) => setTimeout(resolve, 90)); // outlast the shrunken clear window
clearMgr.frame(1 / 60);
assert.equal(tableRows(clearMgr).length, 0, 'cleared after idle window elapses');

console.log('dmu-debuffs tests passed');
