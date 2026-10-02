# FFXIV Raid Companion

A web-based raid companion for *Final Fantasy XIV* that renders live combat
information on a big canvas, driven by Lua scripts. Combat data comes from the
[IINACT](https://github.com/marzent/IINACT) network-log plugin over its
websocket stream; captured log files can also be replayed offline at up to 8x
speed.

Live: <https://chompy.github.io/ffxiv_raid_companion/>

## AI Disclosure
This entire application was built using agentic AI. I used a local model, Qwen 3.8 27B, with OpenCode.

## What it does

- Streams IINACT network logs (OverlayPlugin websocket protocol) and feeds every
  line to the loaded Lua scripts in real time.
- Tracks combat state (start / wipe / victory, elapsed timer, zone, player name).
- Renders one shared `<canvas>` owned by Lua scripts: each script builds a scene
  of draw operations per frame; multiple scripts compose on the same canvas, and
  any script can take the whole canvas over for its phase.
- Ships with built-in trackers for Dancing Mad (Ultimate) (DMU):

| Script | What it shows |
| --- | --- |
| `bundled/dmu-p2-forsaken.lua` | P2 Forsaken marker waves: your icon + IN/OUT group from the closest player, past/future End cast, synthetic set 8. |
| `bundled/dmu-p3-limit-cut.lua` | P3 limit cut stand table from clone cast positions (mirrored north / rotation direction). |
| `bundled/dmu-p3-blackhole.lua` | P3 "Accretion" black hole targets drawn as huge lines, your line highlighted. |
| `bundled/dmu-p4-debuffs.lua` | P4 real/fake debuff table plus the six resolution windows (stack/spread tells), including late-P4 Mana Charge/Release thunder/blizzard outcomes on the Tsunami line. |
| `bundled/dmu-p5-celestriad.lua` | P5 Celestriad: your initial elemental resistance debuff as one huge word — FIRE / LIGHTNING / ICE, or NONE if you're one of the two clean players. Mid-mechanic element rotations are ignored. |

- Custom scripts can be dropped in from the sidebar at runtime; they are
  persisted in `localStorage` and restored on reload. Built-ins can be toggled
  but not removed.
- Replay mode: load a captured log file (e.g. an IINACT export) and replay it
  through the exact same pipeline as live data, for offline testing of scripts.

## Technology

| Piece | Choice | Notes |
| --- | --- | --- |
| Build tooling | [Vite](https://vite.dev/) 6 | Dev server + production build; `bundled/*.lua` are inlined into the JS bundle via Vite's `?raw` imports. |
| App code | Vanilla ES modules (JavaScript) | No framework. UI is a small sidebar (`index.html` + `src/styles.css`) and one canvas (`src/main.js`). |
| Scripting engine | [fengari](https://github.com/forhappy/fengari) | Lua 5.3 compiled to pure JavaScript, so the same scripts run in the browser and under Node (tests). Each script gets an isolated Lua state; the host API is exposed as globals (`src/luaEngine.js`). Vite patches fengari's `typeof process` probes so it always takes its browser branches. |
| Data source | IINACT websocket (`ws://127.0.0.1:10501/ws`) | OverlayPlugin protocol: the client subscribes to `LogLine`, then receives one JSON message per pipe-delimited network log line (`src/wsClient.js`). |
| Log parsing | `src/logParser.js` | Pipe-delimited lines, ISO-8601 timestamps; line-type constants follow the cactbot LogGuide numbering. |
| Tests | Node's built-in test runner (`node --test`) | Unit tests per tracker plus a replay check that replays real captured logs end to end (`npm test`). |
| Deployment | GitHub Actions (`.github/workflows/deploy.yml`) | Push to `main` → `npm ci && npm test && npm run build` → `dist/` force-pushed as the whole `gh-pages` branch. Served by GitHub Pages under `/ffxiv_raid_companion/`. |

## Setup

Prerequisites: Node.js 20+ and npm. For live data you also need the IINACT
Dalamud plugin installed in-game on your game machine (it embeds the FFXIV ACT
plugin and serves its websocket natively).

```sh
npm install      # or: npm ci
npm run dev      # dev server on http://localhost:5173 (host-bound, LAN-reachable)
```

### Connecting to a live log

IINACT listens for OverlayPlugin-websocket clients. The app's default URL is
`ws://127.0.0.1:10501/ws`. Open the app and press **Connect**. The client auto-reconnects with a
backoff if the stream drops.

### Replaying a captured log (no game required)

Use the sidebar's replay controls: pick an IINACT export file, choose a speed
(0.5x–8x), and press **Replay**. Lines are timestamp-sorted and fed through the
same pipeline as live data — this is how the tracker tests exercise real pulls.

### Scripts

- **Custom scripts**: sidebar → *Load Lua script* (any `.lua` file). Loaded code
  is stored in `localStorage`; remove it with the ✕ on its list entry. Compile
  errors are shown inline and broken custom scripts are not retried on reload.
- **Built-ins**: always present, toggleable per session via their checkboxes.

### Tests & build

```sh
npm test         # unit tests for every tracker + real-log replay checks
npm run build    # production bundle into dist/ (what Pages serves)
npm run preview  # serve the built bundle locally
```

## Lua scripting API

Scripts are plain Lua 5.3 files with no entry point: define any of the callback
globals below and call the host globals to draw. Everything runs in an isolated
Lua state per script file — scripts cannot see each other's locals, and a
runtime error in one is recorded (shown in the sidebar) without killing the
others.

### Callbacks (define these)

```lua
function onLogLine(raw)      -- every pipe-delimited log line, as a string
function onChangeZone(name)  -- zone changed; `name` is the zone name
function onCombatStart()     -- combat began (first landed hit after idle / zone change)
function onCombatEnd(result, elapsedMs)  -- result: 'defeat' or 'victory'
function onFrame(dtSeconds)  -- every animation frame (~60 Hz); dt clamped to 0.25s
```

- `onLogLine` receives the **raw** line (`"21|<ts>|..."`) — parse it yourself;
  see [log line format](#log-line-format).
- `onFrame` is where you render. The scene list persists until you clear it, so
  the usual pattern is to call `clearCanvas()` first and redraw only what has
  changed (or everything — scenes are cheap op lists, not immediate-mode calls).
- Callbacks that aren't defined are simply skipped; a script with no callbacks
  but state + `onFrame` is fine.

### Host functions (call these)

```lua
clearCanvas()                      -- drop the current frame's scene ops
drawText(text, x, y [, size] [, color])   -- monospace text; defaults: 24px, #ffffff
drawImage(src, x, y [, w, h])      -- URL (absolute or page-relative); cached
drawRectangle(x, y, w, h [, fill]) -- filled rectangle; default #ffffff
takeoverCanvas(bool)               -- while true, ONLY this script's scene is drawn

now()            -> number   -- wall-clock seconds (float), for timing logic
canvasWidth()    -> number   -- live CSS-pixel canvas size, read at call time
canvasHeight()   -> number
```

Colors are any CSS color string (`'#ffd24c'`, `'rgba(16, 20, 32, 0.78)'`).
Coordinates are top-left origin in CSS pixels; `drawText` positions by the text
baseline's left edge — bundled scripts center with
`cx - #text * size * 0.62 / 2` (monospace advance ≈ 0.62 × size).

**Canvas takeover**: while a script has `takeoverCanvas(true)` set, other
scripts keep receiving callbacks and updating state but their scenes are not
drawn until the takeover is released — use it for displays that should own the
whole canvas during one phase (see `dmu-p3-blackhole.lua`).

### Minimal example

```lua
local running = false
local startAt = 0

function onCombatStart()
    running = true
    startAt = now()
end

function onFrame(dt)
    clearCanvas()
    local text, color = 'idle', '#8a93b2'
    if running then
        text = string.format('%d:%04.1f', (now() - startAt) / 60,
                             (now() - startAt) % 60)
        color = '#4cd07d'
    end
    local size = 28
    drawText(text, (canvasWidth() - #text * size * 0.62) / 2, 52, size, color)
end
```

See `examples/combat-timer.lua` and `examples/zone-banner.lua` for more, and the
bundled trackers for production-strength patterns (latches, fade windows,
takeover).

### Log line format

Lines are pipe-delimited: `<type>|<ISO-8601 timestamp>|<payload...>`. Split on
`|`; after splitting, field 1 is the type and field 2 the timestamp (Lua is
1-based). Line-type numbering follows FFXIV ACT / cactbot conventions; the types
bundled scripts rely on:

| Type | Meaning | Payload highlights (field index after split) |
| --- | --- | --- |
| `0`  | Log message | f3 = subcode (`"0029"` = damage text). |
| `1`  | Zone change | f3 zone id, f4 zone name. Also fires the app's `onChangeZone`. |
| `2`  | Primary player (on zone entry) | f3 char id (hex), f4 char name — bundled scripts use this to learn "you". |
| `20` | Cast start | f3/f4 caster id/name, f5 action hex, f6 action name, f7/f8 target id/name. |
| `21` | Ability landed | Same first 8 fields as `20`, then damage/position payload. |
| `26` / `30` | Status applied / removed | f3 status hex, f4 status **name**, f5 duration, f6/f7 source id/name, f8/f9 target id/name, f10 param (e.g. the P4 reality tell). Match by name where possible — patch notes shift hex ids. |
| `27` | Marker / assignment | f3/f4 target id/name, f7 marker id; trailing field is a line uid (dedupe redelivered copies on it). |
| `261` | Entity state | f3 = `Add`/`Change`, f4 entity id, then `Key|Value` pairs (`Name`, `PosX`, `PosY`, ...); `Change` lines are **partial** — merge per key. Trailing field is a line uid. Only player-ish ids (8 hex digits not starting with `40`) are players; `40xxxxxx` are arena NPCs. |

Timestamps are ISO-8601 in the game machine's local time (e.g.
`2026-09-28T13:53:48.8640000-04:00`). For timing logic prefer `now()` over
parsing timestamps — log lines can arrive out of order after gaps, and the app's
replay mode re-sorts them anyway.

### Lua caveats (fengari-specific)

The engine is fengari's pure-JS **Lua 5.3**, not PUC Lua:

- No `math.atan2` — use `math.atan(y, x)` (two-argument form).
- The pattern matcher does **not** backtrack greedy quantifiers the way PUC Lua
  does (`gmatch('(.*|)')` consumes to the *last* separator). For splitting on a
  literal delimiter, loop with plain string search instead:

  ```lua
  local function split(s)
      local out, start = {}, 1
      while true do
          local p = s:find('|', start, true)   -- plain find, not patterns
          if not p then break end
          table.insert(out, s:sub(start, p - 1))
          start = p + 1
      end
      table.insert(out, s:sub(start))
      return out
  end
  ```

- Errors thrown from within a callback are caught and recorded per script (the
  sidebar shows the first one); they do not take down other scripts.
