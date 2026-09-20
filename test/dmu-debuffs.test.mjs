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

  // Global rows follow the LATEST round: GC#3's FAKE cast overwrote the REAL shriek
  // rounds. Inferno stayed [FAKE] even though its Entropy debuffs landed AFTER Chaos's
  // tell had lifted — the cast stamped it while the tell was still fresh, and a late
  // apply must not downgrade an already-resolved round to unknown.
  assert.ok(hasVerdict(rowWith(rows, 'Cursed Shriek (Short)'), '[FAKE]'), `csShort [FAKE]: ${JSON.stringify(rowWith(rows, 'Cursed Shriek (Short)'))}`);
  assert.ok(hasVerdict(rowWith(rows, 'Cursed Shriek (Long)'), '[FAKE]'), `csLong [FAKE]: ${JSON.stringify(rowWith(rows, 'Cursed Shriek (Long)'))}`);
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
}

function testMixedPullLatestReal() {
  // Rounds: GC#1 REAL, Tsunami REAL, GC#2 FAKE, Inferno FAKE, GC#3 REAL.
  const mgr = new LuaManager(() => [1280, 720]);
  assert.equal(mgr.add('dmu-p4-debuffs.lua', code).ok, true, 'script should load (pull 2)');
  replay(mgr, fixture('p4_mixed_latest_real.log'));

  const rows = tableRows(mgr);

  // Globals follow the LATEST round: GC#3's REAL cast overwrote GC#2's FAKE one.
  assert.ok(hasVerdict(rowWith(rows, 'Cursed Shriek (Short)'), '[REAL]'), `csShort [REAL]: ${JSON.stringify(rowWith(rows, 'Cursed Shriek (Short)'))}`);
  assert.ok(hasVerdict(rowWith(rows, 'Cursed Shriek (Long)'), '[REAL]'), `csLong [REAL]: ${JSON.stringify(rowWith(rows, 'Cursed Shriek (Long)'))}`);
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
}

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
