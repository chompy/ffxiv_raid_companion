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
