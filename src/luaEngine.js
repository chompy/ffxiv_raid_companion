// Lua script engine built on fengari (Lua 5.3, pure JS).
//
// Note: fengari is Lua 5.3 — no math.atan2 (use math.atan(y, x)). Its pattern
// matcher also does not backtrack greedy quantifiers the way PUC Lua does (e.g.
// gmatch('(.*|)') consumes to the LAST separator); prefer string.find(s, sep,
// start, true) loops over gmatch for splitting in scripts.
//
// Scripts are loaded into isolated states and communicate with the app two ways:
//   - Host API globals they call: clearCanvas(), drawText(), drawImage(),
//     drawRectangle(), now(), canvasWidth(), canvasHeight(). Drawing calls push
//     ops into a per-script scene list; main.js replays every scene onto the
//     <canvas> once per animation frame.
//   - takeoverCanvas(bool): while true, ONLY this script's scene is replayed —
//     other scripts keep running (their scenes update) but are not drawn until
//     it is released. For displays that should own the whole canvas for a phase.
//   - Callback globals they may define: onLogLine(raw), onChangeZone(name),
//     onCombatStart(), onCombatEnd(result, elapsedMs), onFrame(dtSeconds).
//   - Optional config(): called once at load time; may return a table with
//     { name = "Display Name" } (sidebar label, replaces the file name) and/or
//     { priority = <number> } (draw order — higher runs later, so it renders on
//     top of lower-priority scripts; default 0). Both optional.

import fengari from 'fengari';

const { lua, lauxlib, lualib } = fengari;

function jsToLuaString(s) {
  return fengari.to_luastring(String(s));
}

function pushJsValue(L, value) {
  if (typeof value === 'number') lua.lua_pushnumber(L, value);
  else if (typeof value === 'boolean') lua.lua_pushboolean(L, value);
  else if (value === null || value === undefined) lua.lua_pushnil(L);
  else {
    const ls = jsToLuaString(value);
    lua.lua_pushlstring(L, ls, ls.length);
  }
}

function readString(L, idx) {
  return fengari.to_jsstring(lauxlib.luaL_checkstring(L, idx));
}

// luaL_optstring returns a luaString (Uint8Array) even for the default; convert.
function readOptionalString(L, idx, def) {
  return fengari.to_jsstring(lauxlib.luaL_optstring(L, idx, def));
}

export class LuaScript {
  constructor(name, code, getCanvasSize) {
    this.name = name;
    // Display label defaults to the file name; an optional config() may override.
    this.displayName = name;
    // Draw order: higher priority runs later in scenes(), so it renders on top.
    this.priority = 0;
    this.scene = [];
    this.lastError = null;
    this.takeover = false;
    this._getCanvasSize = getCanvasSize;

    const L = lauxlib.luaL_newstate();
    lualib.luaL_openlibs(L);
    this.L = L;

    this._registerHostApi();

    // Load user code. Compile/runtime errors are thrown to the caller so the
    // manager can report them in the UI instead of loading a broken script.
    const rc = lauxlib.luaL_dostring(L, jsToLuaString(code));
    if (rc !== 0) {
      const msg = lua.lua_isstring(L, -1)
        ? fengari.to_jsstring(lauxlib.luaL_tolstring(L, -1))
        : `load failed (code ${rc})`;
      lua.lua_pop(L, 1);
      throw new Error(msg.trim());
    }

    // Optional config(): read display name / draw priority. A missing or broken
    // config is non-fatal — the script just keeps its defaults.
    this._readConfig();
  }

  _readConfig() {
    const L = this.L;
    lua.lua_getglobal(L, jsToLuaString('config'));
    if (!lua.lua_isfunction(L, -1)) {
      lua.lua_pop(L, 1);
      return;
    }
    // Call config() expecting one return value (the options table).
    const rc = lua.lua_pcall(L, 0, 1, 0);
    if (rc !== 0 || !lua.lua_istable(L, -1)) {
      lua.lua_settop(L, 0);
      return;
    }
    const tidx = lua.lua_gettop(L); // absolute index of the table on the stack

    const nameVal = this._tableValue(tidx, 'name');
    if (typeof nameVal === 'string' && nameVal !== '') this.displayName = nameVal;

    const prioVal = this._tableValue(tidx, 'priority');
    if (typeof prioVal === 'number' && Number.isFinite(prioVal)) this.priority = prioVal;

    lua.lua_settop(L, 0);
  }

  // Returns table[tidx][key] as a JS string or number (null if absent / other type).
  _tableValue(tidx, key) {
    const L = this.L;
    const kb = jsToLuaString(key);
    lua.lua_pushlstring(L, kb, kb.length);
    lua.lua_gettable(L, tidx); // pops the key, pushes the value (or nil)
    let out = null;
    if (lua.lua_isnumber(L, -1)) out = lua.lua_tonumber(L, -1);
    else if (lua.lua_isstring(L, -1)) out = fengari.to_jsstring(lauxlib.luaL_tolstring(L, -1));
    lua.lua_pop(L, 1);
    return out;
  }

  _registerHostApi() {
    const L = this.L;
    const setGlobal = (name, fn) => {
      lua.lua_pushcfunction(L, fn);
      lua.lua_setglobal(L, jsToLuaString(name));
    };

    setGlobal('clearCanvas', () => {
      this.scene.length = 0;
      return 0;
    });

    setGlobal('drawText', (L) => {
      const text = readString(L, 1);
      const x = lauxlib.luaL_checknumber(L, 2);
      const y = lauxlib.luaL_checknumber(L, 3);
      const size = lauxlib.luaL_optnumber(L, 4, 24);
      const color = readOptionalString(L, 5, '#ffffff');
      this.scene.push({ type: 'text', text, x, y, size, color });
      return 0;
    });

    setGlobal('drawImage', (L) => {
      const src = readString(L, 1);
      const x = lauxlib.luaL_checknumber(L, 2);
      const y = lauxlib.luaL_checknumber(L, 3);
      // Omitted args are out-of-stack (type NONE), not nil; check the top.
      const w = lua.lua_gettop(L) >= 4 && !lua.lua_isnil(L, 4) ? lauxlib.luaL_checknumber(L, 4) : null;
      const h = lua.lua_gettop(L) >= 5 && !lua.lua_isnil(L, 5) ? lauxlib.luaL_checknumber(L, 5) : null;
      this.scene.push({ type: 'image', src, x, y, w, h });
      return 0;
    });

    setGlobal('drawRectangle', (L) => {
      const x = lauxlib.luaL_checknumber(L, 1);
      const y = lauxlib.luaL_checknumber(L, 2);
      const w = lauxlib.luaL_checknumber(L, 3);
      const h = lauxlib.luaL_checknumber(L, 4);
      const fill = readOptionalString(L, 5, '#ffffff');
      this.scene.push({ type: 'rect', x, y, w, h, fill });
      return 0;
    });

    setGlobal('now', () => {
      lua.lua_pushnumber(L, Date.now() / 1000);
      return 1;
    });
    // Canvas size is read live at call time via a closure over the getter.
    setGlobal('canvasWidth', () => {
      lua.lua_pushnumber(L, this._getCanvasSize()[0]);
      return 1;
    });

    setGlobal('canvasHeight', () => {
      lua.lua_pushnumber(L, this._getCanvasSize()[1]);
      return 1;
    });

    // Omitted arg is out-of-stack (type NONE), not nil — treat as false.
    // (This fengari build has no luaL_checkboolean.)
    setGlobal('takeoverCanvas', (L) => {
      this.takeover = lua.lua_gettop(L) >= 1 && Boolean(lua.lua_toboolean(L, 1));
      return 0;
    });
  }

  /** Invoke one of the script's callback globals with args; records errors. */
  _call(name, args) {
    const L = this.L;
    lua.lua_getglobal(L, jsToLuaString(name));
    if (!lua.lua_isfunction(L, -1)) {
      lua.lua_pop(L, 1);
      return;
    }
    for (const arg of args) pushJsValue(L, arg);
    const rc = lua.lua_pcall(L, args.length, 0, 0);
    if (rc !== 0) {
      this.lastError = lua.lua_isstring(L, -1)
        ? fengari.to_jsstring(lauxlib.luaL_tolstring(L, -1))
        : `error code ${rc}`;
    }
    lua.lua_settop(L, 0);
  }

  dispose() {
    this.L = null;
    this.takeover = false;
    this.scene.length = 0;
  }
}

export class LuaManager {
  constructor(getCanvasSize = () => [0, 0]) {
    this._scripts = [];
    this._getCanvasSize = getCanvasSize;
    this._nextId = 1;
  }

  /** @returns {{ok:true,id:number,displayName:string,priority:number} | {ok:false,error:string}} */
  add(name, code) {
    try {
      const script = new LuaScript(name, code, this._getCanvasSize);
      const id = this._nextId++;
      this._scripts.push({ id, script, enabled: true });
      return { ok: true, id, displayName: script.displayName, priority: script.priority };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  /** Disabled scripts receive no callbacks and contribute no scene. */
  setEnabled(id, enabled) {
    const entry = this._scripts.find((s) => s.id === id);
    if (entry) entry.enabled = Boolean(enabled);
  }

  remove(id) {
    const entry = this._scripts.find((s) => s.id === id);
    if (!entry) return;
    entry.script.dispose();
    this._scripts = this._scripts.filter((s) => s.id !== id);
  }

  clear() {
    for (const { script } of this._scripts) script.dispose();
    this._scripts.length = 0;
  }

  get size() {
    return this._scripts.length;
  }

  /** @returns {{id:number,name:string,enabled:boolean,lastError:(string|null)}[]} */
  scripts() {
    return this._scripts.map(({ id, script, enabled }) => ({
      id, name: script.name, enabled, lastError: script.lastError,
    }));
  }

  /** Scenes of the enabled scripts, for the renderer to replay in order.
   *  Ordered by config() priority ascending (stable — ties keep load order), so a
   *  higher-priority script draws last and renders on top of lower ones. While one
   *  of them holds a canvas takeover, only its scene is returned — the others keep
   *  running but stay off the display until it is released. */
  scenes() {
    const list = this._scripts.filter(({ enabled }) => enabled);
    for (const entry of list) {
      if (entry.script.takeover) return [{ name: entry.script.name, scene: entry.script.scene }];
    }
    return [...list]
      .sort((a, b) => a.script.priority - b.script.priority)
      .map(({ script }) => ({ name: script.name, scene: script.scene }));
  }

  onLogLine(raw) {
    for (const { script, enabled } of this._scripts) if (enabled) script._call('onLogLine', [raw]);
  }

  onChangeZone(zoneName) {
    for (const { script, enabled } of this._scripts) if (enabled) script._call('onChangeZone', [zoneName]);
  }

  onCombatStart() {
    for (const { script, enabled } of this._scripts) if (enabled) script._call('onCombatStart', []);
  }

  onCombatEnd(result, elapsedMs) {
    for (const { script, enabled } of this._scripts) if (enabled) script._call('onCombatEnd', [result, elapsedMs]);
  }

  frame(dtSeconds) {
    for (const { script, enabled } of this._scripts) if (enabled) script._call('onFrame', [dtSeconds]);
  }
}
