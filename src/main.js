import './styles.css';
import { parseLogLine, LineType } from './logParser.js';
import { CombatTimer, TimerState, formatElapsed } from './combatTimer.js';
import { IinactClient } from './wsClient.js';
import { createSeqGapTracker } from './seqGap.js';
import { LuaManager } from './luaEngine.js';
import p4DebuffsCode from '../bundled/dmu-p4-debuffs.lua?raw';
import limitCutCode from '../bundled/dmu-p3-limit-cut.lua?raw';
import blackholeCode from '../bundled/dmu-p3-blackhole.lua?raw';

// Scripts shipped with the app: always available, cannot be deleted, only toggled.
const BUILTIN_SCRIPTS = [
  { name: 'dmu-p4-debuffs.lua', code: p4DebuffsCode },
  { name: 'dmu-p3-limit-cut.lua', code: limitCutCode },
  { name: 'dmu-p3-blackhole.lua', code: blackholeCode },
];

const timer = new CombatTimer();

// --- Canvas (owned by Lua scripts) -----------------------------------------
const canvas = document.getElementById('draw-canvas');
const ctx = canvas.getContext('2d');

function cssCanvasSize() {
  const rect = canvas.parentElement.getBoundingClientRect();
  return [rect.width, rect.height];
}

const luaManager = new LuaManager(cssCanvasSize);

// --- DOM refs -----------------------------------------------------------
const playerNameEl = document.getElementById('player-name');
const zoneNameEl = document.getElementById('zone-name');
const combatTimeEl = document.getElementById('combat-time');
const combatStateEl = document.getElementById('combat-state');
const appEl = document.getElementById('app');
const sidebarToggle = document.getElementById('sidebar-toggle');

// Player name persists across reloads: the type-02 line only arrives on zone
// entry, so a refresh mid-session would otherwise leave the bar showing "—".
const PLAYER_KEY = 'ffxiv-raid-viewer-player-name';
function setPlayerName(name) {
  playerNameEl.textContent = name;
  try {
    localStorage.setItem(PLAYER_KEY, name);
  } catch { /* private mode — just don't persist */ }
}
try {
  const storedPlayer = localStorage.getItem(PLAYER_KEY);
  if (storedPlayer) playerNameEl.textContent = storedPlayer;
} catch { /* no storage */ }
const connStatusEl = document.getElementById('conn-status');
const msgCountEl = document.getElementById('msg-count');
const wsUrlInput = document.getElementById('ws-url');
const connectBtn = document.getElementById('connect-btn');

const logFileInput = document.getElementById('log-file');
const fileLabel = document.getElementById('file-label');
const replaySpeedSel = document.getElementById('replay-speed');
const replayBtn = document.getElementById('replay-btn');
const replayStatusEl = document.getElementById('replay-status');
const eventList = document.getElementById('event-list');

const luaFileInput = document.getElementById('lua-file');
const scriptList = document.getElementById('script-list');
const luaErrorEl = document.getElementById('lua-error');

// --- Combat timer display ------------------------------------------------
const STATE_LABELS = {
  [TimerState.Idle]: 'Idle',
  [TimerState.Combat]: 'In Combat',
  [TimerState.Defeated]: 'Wiped',
  [TimerState.Victory]: 'Victory',
};

function renderTimer() {
  combatTimeEl.textContent = formatElapsed(timer.elapsedMs());
  combatStateEl.textContent = STATE_LABELS[timer.state] ?? timer.state;
  combatStateEl.dataset.state = timer.state;
}

// --- Event log -----------------------------------------------------------
function addEvent(text) {
  const li = document.createElement('li');
  const stamp = new Date().toLocaleTimeString();
  li.innerHTML = `<span class="stamp">${stamp}</span> ${text}`;
  eventList.prepend(li);
  while (eventList.children.length > 50) eventList.lastChild.remove();
}

// --- Log line pipeline ---------------------------------------------------
// Pipeline shared by live websocket lines and replayed file lines.
const checkSeqGap = createSeqGapTracker();

function handleRawLine(rawLine) {
  const parsed = parseLogLine(rawLine);
  if (parsed) deliverLine(parsed, rawLine);
}

function deliverLine(parsed, rawLine) {
  // A jump in the ability counter means cast lines never arrived — log with
  // the line's own timestamp so it can be located in the captured file. Runs
  // for replay too: a gap there means the capture itself dropped lines.
  const gap = checkSeqGap(parsed);
  if (gap) {
    const when = new Date(gap.timestampMs).toISOString();
    if (gap.kind === 'base-reset') {
      console.info(`[gap] ${when} action-seq base reset +${gap.jump} (combat start)`);
    } else {
      // A full limit-cut round is 8 casts; bigger jumps are almost certainly a
      // real stream gap, small ones can be counter noise in the capture.
      const msg = `${when} action-seq +${gap.jump} (${gap.from.toString(16)} -> ${gap.to.toString(16)}) — ~${gap.jump} cast line(s) missing`;
      if (gap.jump >= 8) console.warn('[gap]', msg);
      else console.info('[gap]', msg);
    }
  }

  const event = timer.handleLine(parsed);
  if (event) {
    if (event.kind === 'start') {
      addEvent('Combat started');
      luaManager.onCombatStart();
    } else if (event.kind === 'end') {
      const label = event.result === 'defeat' ? 'Wiped' : 'Victory';
      addEvent(`Combat ended — ${label} (${formatElapsed(event.elapsedMs)})`);
      luaManager.onCombatEnd(event.result, event.elapsedMs);
    } else if (event.kind === 'zone-reset') {
      addEvent('Combat reset — zone change');
    }
  }

  if (parsed.type === LineType.ChangeZone) {
    const zoneName = parsed.fields[1];
    if (zoneName) {
      zoneNameEl.textContent = zoneName;
      luaManager.onChangeZone(zoneName);
    }
  } else if (parsed.type === LineType.PlayerName) {
    const playerName = parsed.fields[1];
    if (playerName) setPlayerName(playerName);
  }

  luaManager.onLogLine(rawLine);
}

const client = new IinactClient({
  onLogLine: handleRawLine,
  onMessageCount: (count) => {
    msgCountEl.textContent = count ? `${count.toLocaleString()} lines` : '';
  },
  onState: (state) => {
    connStatusEl.dataset.state = state;
    connStatusEl.textContent = state[0].toUpperCase() + state.slice(1);
    connectBtn.textContent = client.connected ? 'Disconnect' : 'Connect';
  },
});

// --- Canvas rendering ------------------------------------------------------
const imageCache = new Map();

function applyOp(op) {
  if (op.type === 'text') {
    ctx.font = `${op.size}px monospace`;
    ctx.fillStyle = op.color;
    ctx.fillText(op.text, op.x, op.y);
  } else if (op.type === 'rect') {
    ctx.fillStyle = op.fill;
    ctx.fillRect(op.x, op.y, op.w, op.h);
  } else if (op.type === 'image') {
    let img = imageCache.get(op.src);
    if (!img) {
      img = new Image();
      img.src = op.src;
      imageCache.set(op.src, img);
    }
    if (img.complete && img.naturalWidth > 0) {
      if (op.w !== null && op.h !== null) ctx.drawImage(img, op.x, op.y, op.w, op.h);
      else ctx.drawImage(img, op.x, op.y);
    }
  }
}

function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = Math.max(1, Math.floor(rect.width * dpr));
  canvas.height = Math.max(1, Math.floor(rect.height * dpr));
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function drawCanvas() {
  const [w, h] = cssCanvasSize();
  ctx.clearRect(0, 0, w, h);

  for (const { scene } of luaManager.scenes()) {
    for (const op of scene) applyOp(op);
  }

  // Placeholder while no Lua scripts are loaded.
  if (luaManager.size === 0 && timer.running) {
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#cfd8ff';
    ctx.font = '28px monospace';
    ctx.fillText(formatElapsed(timer.elapsedMs()), 16, h - 16);
    ctx.restore();
  }
}

// --- Replay mode (offline testing with a captured log file) --------------
let replaySession = 0;
let loadedLogText = null;
let replaying = false;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function setReplaying(value) {
  replaying = value;
  replayBtn.textContent = value ? 'Stop' : 'Replay';
}

async function runReplay(fileText) {
  const session = ++replaySession;
  client.disconnect(); // replay and live are mutually exclusive
  setReplaying(true);

  const lines = [];
  for (const raw of fileText.split('\n')) {
    if (!raw.trim()) continue;
    const parsed = parseLogLine(raw);
    if (parsed && !Number.isNaN(parsed.timestampMs)) lines.push({ parsed, raw });
  }
  lines.sort((a, b) => a.parsed.timestampMs - b.parsed.timestampMs);

  replayStatusEl.textContent = `${lines.length.toLocaleString()} lines`;
  addEvent(`Replay started (${lines.length.toLocaleString()} lines)`);

  let prevTs = null;
  for (const { parsed, raw } of lines) {
    if (session !== replaySession) return; // cancelled

    const speed = Number(replaySpeedSel.value) || 1;
    if (prevTs !== null) {
      const delay = Math.max(0, (parsed.timestampMs - prevTs) / speed);
      if (delay > 0) await sleep(delay);
      if (session !== replaySession) return;
    }
    prevTs = parsed.timestampMs;

    deliverLine(parsed, raw);
  }

  // Only the still-current session may touch shared UI state.
  if (session === replaySession) {
    setReplaying(false);
    replayStatusEl.textContent = 'done';
    addEvent('Replay finished');
  }
}

// --- Persisted script state (localStorage) -----------------------------------
const SCRIPTS_STORAGE_KEY = 'ffxiv-raid-viewer-lua-scripts';

// Shape v2: { custom: {name: code}, enabled: {name: bool} }. Legacy v1 stored a
// flat name -> code map; migrate it by dropping saved copies of scripts that are
// now bundled (keeping both would load the same tracker twice).
function readStoredState() {
  const fresh = () => ({ custom: new Map(), enabled: new Map() });
  let parsed = null;
  try {
    const raw = localStorage.getItem(SCRIPTS_STORAGE_KEY);
    if (raw) parsed = JSON.parse(raw);
  } catch { /* corrupted storage — start fresh */ }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return fresh();

  const state = fresh();
  if (typeof parsed.custom === 'object' && parsed.custom !== null) {
    for (const [name, code] of Object.entries(parsed.custom)) {
      if (typeof code === 'string') state.custom.set(name, code);
    }
    if (parsed.enabled && typeof parsed.enabled === 'object') {
      for (const [name, on] of Object.entries(parsed.enabled)) {
        if (typeof on === 'boolean') state.enabled.set(name, on);
      }
    }
    return state;
  }

  const builtinNames = new Set(BUILTIN_SCRIPTS.map((s) => s.name));
  for (const [name, code] of Object.entries(parsed)) {
    if (typeof code === 'string' && !builtinNames.has(name)) state.custom.set(name, code);
  }
  return state;
}

const scriptState = readStoredState();

function persistScriptState() {
  try {
    localStorage.setItem(SCRIPTS_STORAGE_KEY, JSON.stringify({
      custom: Object.fromEntries(scriptState.custom),
      enabled: Object.fromEntries(scriptState.enabled),
    }));
  } catch (err) {
    addEvent(`Could not save scripts to localStorage: ${err.message}`);
  }
}

// --- Lua script manager UI -------------------------------------------------
// Section labels: "Built-In" is always present; "Custom" appears only while at
// least one custom script exists. Custom items are slotted in just above the
// Built-In divider so live-added scripts land in the same place as on reload.
const builtinDivider = document.createElement('li');
builtinDivider.className = 'script-section';
builtinDivider.textContent = 'Built-in';
let customDivider = null;

function makeScriptItem(id, name, { builtin = false, enabled = true } = {}) {
  const li = document.createElement('li');
  li.dataset.scriptId = String(id);
  if (builtin) li.dataset.builtin = 'true';

  const toggle = document.createElement('input');
  toggle.type = 'checkbox';
  toggle.className = 'script-toggle';
  toggle.checked = enabled;
  toggle.title = builtin ? 'Built-in script — enable or disable' : 'Enable or disable script';
  toggle.addEventListener('change', () => {
    luaManager.setEnabled(id, toggle.checked);
    scriptState.enabled.set(name, toggle.checked);
    persistScriptState();
    li.classList.toggle('script-disabled', !toggle.checked);
  });

  const label = document.createElement('span');
  label.className = 'script-name';
  label.textContent = name;

  li.append(toggle, label);

  if (!builtin) {
    const btn = document.createElement('button');
    btn.className = 'script-remove';
    btn.title = 'Remove script';
    btn.textContent = '\u2715';
    btn.addEventListener('click', () => {
      luaManager.remove(id);
      li.remove();
      if (!luaManager.scripts().some((e) => e.name === name)) {
        scriptState.custom.delete(name);
        scriptState.enabled.delete(name);
        persistScriptState();
      }
      dropCustomDividerIfEmpty();
      addEvent(`Script removed: ${name}`);
    });
    li.appendChild(btn);
  }

  if (!enabled) {
    luaManager.setEnabled(id, false);
    li.classList.add('script-disabled');
  }
  return li;
}

function dropCustomDividerIfEmpty() {
  const hasCustom = [...scriptList.querySelectorAll('li[data-script-id]')]
    .some((el) => !el.dataset.builtin);
  if (!hasCustom && customDivider) {
    customDivider.remove();
    customDivider = null;
  }
}

// Slots a custom script item into the Custom block above the Built-In divider,
// creating the "Custom" label on first use.
function placeCustomItem(li) {
  if (!customDivider) {
    customDivider = document.createElement('li');
    customDivider.className = 'script-section';
    customDivider.textContent = 'Custom';
    builtinDivider.before(customDivider);
  }
  builtinDivider.before(li);
}

function syncLuaErrors() {
  let firstError = null;
  for (const entry of luaManager.scripts()) {
    const li = scriptList.querySelector(`li[data-script-id="${entry.id}"]`);
    if (!li) continue;
    li.classList.toggle('script-error', Boolean(entry.lastError));
    if (entry.lastError && !firstError) firstError = entry;
  }
  if (firstError) {
    luaErrorEl.hidden = false;
    luaErrorEl.textContent = `${firstError.name}: ${firstError.lastError}`;
  } else {
    luaErrorEl.hidden = true;
    luaErrorEl.textContent = '';
  }
}

const builtinNames = new Set(BUILTIN_SCRIPTS.map((s) => s.name));

luaFileInput.addEventListener('change', async () => {
  for (const file of [...(luaFileInput.files ?? [])]) {
    if (builtinNames.has(file.name)) {
      luaErrorEl.hidden = false;
      luaErrorEl.textContent = `${file.name} ships with the app — toggle it in the list below`;
      continue;
    }
    const code = await file.text();
    const result = luaManager.add(file.name, code);
    if (result.ok) {
      scriptState.custom.set(file.name, code);
      persistScriptState();
      placeCustomItem(makeScriptItem(result.id, file.name));
      addEvent(`Script loaded: ${file.name}`);
    } else {
      luaErrorEl.hidden = false;
      luaErrorEl.textContent = `${file.name}: ${result.error}`;
      addEvent(`Script failed to load: ${file.name}`);
    }
  }
  luaFileInput.value = ''; // allow re-adding the same file
});

// Custom scripts first (list order), then the built-ins below a section divider.
(function restoreScripts() {
  // The Built-In divider goes in before any items so placeCustomItem can slot
  // custom entries above it while restoring.
  scriptList.appendChild(builtinDivider);

  let restored = 0;
  for (const [name, code] of [...scriptState.custom]) {
    const result = luaManager.add(name, code);
    if (result.ok) {
      placeCustomItem(makeScriptItem(result.id, name, { enabled: scriptState.enabled.get(name) ?? true }));
      restored++;
    } else {
      scriptState.custom.delete(name); // don't retry a broken script on every reload
    }
  }

  for (const builtin of BUILTIN_SCRIPTS) {
    const result = luaManager.add(builtin.name, builtin.code);
    if (!result.ok) {
      luaErrorEl.hidden = false;
      luaErrorEl.textContent = `${builtin.name}: ${result.error}`;
      continue; // bundled scripts must compile — surface the error instead of hiding it
    }
    scriptList.appendChild(makeScriptItem(result.id, builtin.name, { builtin: true, enabled: scriptState.enabled.get(builtin.name) ?? true }));
  }

  persistScriptState();
  if (restored > 0) addEvent(`Restored ${restored} custom script(s) from localStorage`);
})();

// --- Wiring ----------------------------------------------------------------
connectBtn.addEventListener('click', () => {
  replaySession++; // cancel any running replay
  setReplaying(false);
  if (client.connected) {
    client.disconnect();
    return;
  }
  replayStatusEl.textContent = '';
  client.connect(wsUrlInput.value.trim());
});

logFileInput.addEventListener('change', async () => {
  const file = logFileInput.files?.[0];
  if (!file) return;
  fileLabel.textContent = `${file.name} (${(file.size / 1e6).toFixed(1)} MB)`;
  replayBtn.disabled = false;
  loadedLogText = await file.text();
});

replayBtn.addEventListener('click', () => {
  if (replaying) {
    replaySession++;
    setReplaying(false);
    replayStatusEl.textContent = 'stopped';
    return;
  }
  if (loadedLogText) void runReplay(loadedLogText);
});

// --- Boot ------------------------------------------------------------------

let lastFrameTs = null;
let errorSyncDueAt = 0;

// Keep the timer ticking, feed scripts their per-frame callback, and repaint.
function frame(ts) {
  const dt = lastFrameTs === null ? 0 : Math.min(0.25, (ts - lastFrameTs) / 1000);
  lastFrameTs = ts;

  renderTimer();
  luaManager.frame(dt);
  if (ts >= errorSyncDueAt) {
    syncLuaErrors();
    errorSyncDueAt = ts + 1000; // errors don't need per-frame polling
  }
  drawCanvas();
  requestAnimationFrame(frame);
}

// A ResizeObserver (rather than a window resize listener) so the canvas
// re-fits when the sidebar collapses, not just when the browser resizes.
new ResizeObserver(resizeCanvas).observe(canvas.parentElement);
resizeCanvas();

// --- Sidebar collapse ------------------------------------------------------

const SIDEBAR_KEY = 'ffxiv-raid-viewer-sidebar-collapsed';

function setSidebarCollapsed(collapsed) {
  appEl.classList.toggle('sidebar-collapsed', collapsed);
  sidebarToggle.textContent = collapsed ? '\u25B6' : '\u25C0'; // ▶ / ◀
  sidebarToggle.title = collapsed ? 'Expand sidebar' : 'Collapse sidebar';
  sidebarToggle.setAttribute('aria-expanded', String(!collapsed));
  try {
    localStorage.setItem(SIDEBAR_KEY, collapsed ? '1' : '0');
  } catch { /* private mode — state just won't persist */ }
}

sidebarToggle.addEventListener('click', () => {
  setSidebarCollapsed(!appEl.classList.contains('sidebar-collapsed'));
});

let storedCollapsed = false;
try {
  storedCollapsed = localStorage.getItem(SIDEBAR_KEY) === '1';
} catch { /* no storage */ }
setSidebarCollapsed(storedCollapsed);

renderTimer();
requestAnimationFrame(frame);
