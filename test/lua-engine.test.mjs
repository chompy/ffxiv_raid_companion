// Unit tests for the fengari-based Lua script engine (no DOM required).
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { LuaManager } from '../src/luaEngine.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const examplesDir = path.join(here, '..', 'examples');

// --- Loading ---------------------------------------------------------------
const mgr = new LuaManager(() => [800, 600]);

let res = mgr.add('bad.lua', 'error("compile fail")');
assert.equal(res.ok, false);
assert.match(res.error, /compile fail/);
assert.equal(mgr.size, 0, 'failed script is not loaded');

res = mgr.add('draw.lua', `
function onChangeZone(name)
    clearCanvas()
    drawText('zone:' .. name, 10, 20)
end
function onFrame(dt)
    drawRectangle(0, 0, 5, 6, '#ff0000')
end
`);
assert.equal(res.ok, true);
const drawId = res.id;

// --- Callbacks and scene accumulation ---------------------------------------
mgr.onLogLine('21|ts|noise'); // no onLogLine defined: must not throw
mgr.onChangeZone('The Roost');
let scenes = mgr.scenes();
assert.deepEqual(scenes[0].scene, [
  { type: 'text', text: 'zone:The Roost', x: 10, y: 20, size: 24, color: '#ffffff' },
]);

mgr.frame(0.016);
scenes = mgr.scenes();
assert.deepEqual(scenes[0].scene[1], { type: 'rect', x: 0, y: 0, w: 5, h: 6, fill: '#ff0000' });

// clearCanvas resets the scene for that script only.
res = mgr.add('second.lua', `
function onFrame(dt) drawText('b', 1, 2) end
`);
mgr.frame(0.016);
scenes = mgr.scenes();
assert.equal(scenes[0].name, 'draw.lua');
assert.equal(scenes[1].scene.length, 1, 'second script has its own scene');

// --- Host API ----------------------------------------------------------------
res = mgr.add('api.lua', `
local t = now()
assert(type(t) == 'number' and t > 1e9, 'now() should be epoch seconds')
assert(canvasWidth() == 800, 'canvasWidth from injected getter')
assert(canvasHeight() == 600, 'canvasHeight from injected getter')
drawImage('assets/foo.png', 3, 4)
`);
assert.equal(res.ok, true, `api.lua load failed: ${res.error ?? ''}`);
mgr.frame(0.016); // drawImage ran at load time; nothing to dispatch, just no crash

// --- Error isolation -----------------------------------------------------------
res = mgr.add('boom.lua', 'function onFrame(dt) error("kaboom") end');
assert.equal(res.ok, true);
const boomId = res.id;

mgr.frame(0.016); // boom errors, others still run
let scripts = mgr.scripts();
const boom = scripts.find((s) => s.name === 'boom.lua');
assert.match(boom.lastError, /kaboom/);
const draw = scripts.find((s) => s.name === 'draw.lua');
assert.equal(draw.lastError, null, 'healthy script unaffected by neighbour error');

// Bad argument types surface as Lua errors, not JS crashes. (Numbers are
// coerced to strings by fengari's checklstring; nil is a genuine type error.)
res = mgr.add('badargs.lua', 'function onFrame(dt) drawText(nil, 0, 0) end');
mgr.frame(0.016);
scripts = mgr.scripts();
assert.match(scripts.find((s) => s.name === 'badargs.lua').lastError, /string expected/);

// --- Removal -------------------------------------------------------------------
mgr.remove(drawId);
assert.equal(mgr.size, 4); // second, api, boom, badargs remain
assert.ok(!mgr.scenes().some((s) => s.name === 'draw.lua'));

mgr.clear();
assert.equal(mgr.size, 0);

// --- Enable / disable ------------------------------------------------------------
// Disabled scripts receive no callbacks at all, so their state stays frozen;
// re-enabling resumes exactly where it left off.
const tMgr = new LuaManager(() => [800, 600]);
const tRes = tMgr.add('toggle.lua', `
local n = 0
function onFrame(dt)
    n = n + 1
    clearCanvas()
    drawText('n=' .. n, 0, 0)
end
`);
assert.equal(tRes.ok, true);
tMgr.frame(0.016);
assert.equal(tMgr.scenes()[0].scene[0].text, 'n=1');

tMgr.setEnabled(tRes.id, false);
tMgr.frame(0.016);
tMgr.frame(0.016);
assert.ok(!tMgr.scenes().some((s) => s.name === 'toggle.lua'), 'disabled script contributes no scene');
assert.equal(tMgr.scripts()[0].enabled, false);

tMgr.setEnabled(tRes.id, true);
tMgr.frame(0.016);
const tScene = tMgr.scenes().find((s) => s.name === 'toggle.lua').scene;
assert.equal(tScene[0].text, 'n=2', 'callbacks were skipped while disabled');

// --- Optional config(): display name + draw priority ------------------------------
// A script may define `function config() return { ... } end`. Both fields are optional;
// missing/invalid values fall back to defaults (name = file name, priority = 0).

const cMgr = new LuaManager(() => [800, 600]);

// No config at all: displayName is the file name and priority is 0.
let cRes = cMgr.add('plain.lua', 'function onFrame(dt) drawText("p", 0, 0) end');
assert.equal(cRes.ok, true);
assert.equal(cRes.displayName, 'plain.lua', 'no config -> display name is file name');
assert.equal(cRes.priority, 0, 'no config -> priority defaults to 0');

// config() with both fields.
cRes = cMgr.add('hero.lua', `
function config()
    return { name = "Hero Tracker", priority = 5 }
end
function onFrame(dt) drawText("h", 0, 0) end
`);
assert.equal(cRes.ok, true);
assert.equal(cRes.displayName, 'Hero Tracker', 'config name overrides display label');
assert.equal(cRes.priority, 5, 'config priority read');

// config() with only a name (priority stays 0), and only a priority (name stays file).
cRes = cMgr.add('named.lua', `function config() return { name = "Just A Name" } end`);
assert.equal(cRes.displayName, 'Just A Name');
assert.equal(cRes.priority, 0, 'no priority in config -> 0');

cRes = cMgr.add('prio.lua', `function config() return { priority = -3 } end`);
assert.equal(cRes.displayName, 'prio.lua', 'no name in config -> file name');
assert.equal(cRes.priority, -3, 'negative priority allowed (draws first)');

// Draw order: scenes() is sorted by priority ascending, so the highest-priority
// script comes LAST and renders on top. Load order here is deliberately scrambled
// relative to priority to prove sorting happens.
cMgr.frame(0.016);
const cScenes = cMgr.scenes();
assert.deepEqual(cScenes.map((s) => s.name), ['prio.lua', 'plain.lua', 'named.lua', 'hero.lua'],
  `priority order (low->high): ${JSON.stringify(cScenes.map((s) => s.name))}`);

// Equal priorities keep load order (stable sort).
const sMgr = new LuaManager(() => [800, 600]);
sMgr.add('a.lua', `function config() return { priority = 2 } end`);
sMgr.add('b.lua', `function config() return { priority = 2 } end`);
sMgr.add('c.lua', `function config() return { priority = 1 } end`);
assert.deepEqual(sMgr.scenes().map((x) => x.name), ['c.lua', 'a.lua', 'b.lua'],
  'ties keep load order');

// A broken or non-table config is ignored: script loads, defaults apply.
const bMgr = new LuaManager(() => [800, 600]);
let bRes = bMgr.add('badcfg1.lua', `function config() return "not a table" end`);
assert.equal(bRes.ok, true, 'non-table config still loads');
assert.equal(bRes.displayName, 'badcfg1.lua');
assert.equal(bRes.priority, 0);

bRes = bMgr.add('badcfg2.lua', `function config() return { name = 42, priority = "high" } end`);
assert.equal(bRes.ok, true);
assert.equal(bRes.displayName, 'badcfg2.lua', 'non-string name ignored');
assert.equal(bRes.priority, 0, 'non-number priority ignored');

bRes = bMgr.add('badcfg3.lua', `function config() error("boom") end`);
assert.equal(bRes.ok, true, 'throwing config does not fail the load');
assert.equal(bRes.displayName, 'badcfg3.lua');
assert.equal(bRes.priority, 0);

// The display name is what a UI would show; scripts() still reports the file name as identity.
assert.ok(cMgr.scripts().some((s) => s.name === 'hero.lua'), 'scripts() keeps file-name identity');

// Bundled trackers: each declares its sidebar label and a phase-ordered priority, so
// later phases render over any lingering earlier display (P3 black hole > limit cut).
const bundledConfigs = [
  ['dmu-p2-forsaken.lua', 'P2 Forsaken', 10],
  ['dmu-p3-limit-cut.lua', 'P3 Limit Cut', 20],
  ['dmu-p3-blackhole.lua', 'P3 Black Hole', 21],
  ['dmu-p4-debuffs.lua', 'P4 Debuffs', 30],
  ['dmu-p5-celestriad.lua', 'P5 Celestriad', 40],
];
const bundledDir = path.join(here, '..', 'bundled');
for (const [file, displayName, priority] of bundledConfigs) {
  const bCode = readFileSync(path.join(bundledDir, file), 'utf8');
  const bRes = new LuaManager(() => [1280, 720]).add(file, bCode);
  assert.equal(bRes.ok, true, `${file} should load: ${bRes.error ?? ''}`);
  assert.equal(bRes.displayName, displayName, `${file} display name`);
  assert.equal(bRes.priority, priority, `${file} draw priority`);
}

// --- Example scripts load and behave ---------------------------------------------
for (const name of ['combat-timer.lua', 'zone-banner.lua']) {
  const code = readFileSync(path.join(examplesDir, name), 'utf8');
  const exMgr = new LuaManager(() => [1280, 720]);
  const r = exMgr.add(name, code);
  assert.equal(r.ok, true, `${name} should load: ${r.error ?? ''}`);

  if (name === 'combat-timer.lua') {
    exMgr.onCombatStart();
    exMgr.frame(1 / 60);
    const scene = exMgr.scenes()[0].scene;
    assert.ok(scene.some((op) => op.type === 'rect'), 'timer box drawn');
    assert.match(scene.find((op) => op.type === 'text').text, /^\d+:\d{2}\.\d$/);

    exMgr.onCombatEnd('defeat', 150_000);
    exMgr.frame(1 / 60);
    const text = exMgr.scenes()[0].scene.find((op) => op.type === 'text').text;
    assert.match(text, /^WIPE\s+2:30\.0$/);
  } else {
    exMgr.onChangeZone('The Roost');
    exMgr.frame(1 / 60);
    const scene = exMgr.scenes()[0].scene;
    assert.equal(scene.length, 1);
    assert.equal(scene[0].text, 'The Roost');
    // First frame still renders at full alpha (decrement happens after draw).
    assert.match(scene[0].color, /^rgba\(176, 196, 255, [01]\.\d{3}\)$/);
  }
}

console.log('lua-engine tests passed');
