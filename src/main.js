import './styles.css';
import { parseLogLine, LineType } from './logParser.js';
import { CombatTimer, TimerState, formatElapsed } from './combatTimer.js';
import { IinactClient } from './wsClient.js';
import { LuaManager } from './luaEngine.js';

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
const combatTimeEl = document.getElementById('combat-time');
const combatStateEl = document.getElementById('combat-state');
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
function handleRawLine(rawLine) {
  const parsed = parseLogLine(rawLine);
  if (parsed) deliverLine(parsed, rawLine);
}

function deliverLine(parsed, rawLine) {
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
    if (zoneName) luaManager.onChangeZone(zoneName);
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

// --- Persisted Lua scripts (localStorage) ----------------------------------
const SCRIPTS_STORAGE_KEY = 'ffxiv-raid-viewer-lua-scripts';

function readStoredScripts() {
  try {
    const raw = localStorage.getItem(SCRIPTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return new Map(Object.entries(parsed));
      }
    }
  } catch { /* corrupted storage — start fresh */ }
  return new Map();
}

const storedScripts = readStoredScripts();

function persistStoredScripts() {
  try {
    localStorage.setItem(SCRIPTS_STORAGE_KEY, JSON.stringify(Object.fromEntries(storedScripts)));
  } catch (err) {
    addEvent(`Could not save scripts to localStorage: ${err.message}`);
  }
}

// --- Lua script manager UI -------------------------------------------------
function addScriptItem(id, name) {
  const li = document.createElement('li');
  li.dataset.scriptId = String(id);

  const label = document.createElement('span');
  label.className = 'script-name';
  label.textContent = name;

  const btn = document.createElement('button');
  btn.className = 'script-remove';
  btn.title = 'Remove script';
  btn.textContent = '\u2715';
  btn.addEventListener('click', () => {
    luaManager.remove(id);
    li.remove();
    if (!luaManager.scripts().some((e) => e.name === name)) {
      storedScripts.delete(name);
      persistStoredScripts();
    }
    addEvent(`Script removed: ${name}`);
  });

  li.append(label, btn);
  scriptList.appendChild(li);
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

luaFileInput.addEventListener('change', async () => {
  for (const file of [...(luaFileInput.files ?? [])]) {
    const code = await file.text();
    const result = luaManager.add(file.name, code);
    if (result.ok) {
      storedScripts.set(file.name, code);
      persistStoredScripts();
      addScriptItem(result.id, file.name);
      addEvent(`Script loaded: ${file.name}`);
    } else {
      luaErrorEl.hidden = false;
      luaErrorEl.textContent = `${file.name}: ${result.error}`;
      addEvent(`Script failed to load: ${file.name}`);
    }
  }
  luaFileInput.value = ''; // allow re-adding the same file
});

(function restoreStoredScripts() {
  if (storedScripts.size === 0) return;
  let restored = 0;
  for (const [name, code] of [...storedScripts]) {
    const result = luaManager.add(name, code);
    if (result.ok) {
      addScriptItem(result.id, name);
      restored++;
    } else {
      storedScripts.delete(name); // don't retry a broken script on every reload
    }
  }
  persistStoredScripts();
  if (restored > 0) addEvent(`Restored ${restored} script(s) from localStorage`);
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

window.addEventListener('resize', resizeCanvas);
resizeCanvas();
renderTimer();
requestAnimationFrame(frame);
