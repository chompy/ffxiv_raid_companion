# FFXIV Raid Companion

A single-file companion for raid pulls. Open `index.html` in any modern browser — no server, no build step. Everything (timeline images and your tracker script) is stored in the browser's localStorage on that machine.

- **Timer** with a large readout and next-mechanic countdown
- **Timeline**: attach an image to each mechanic timestamp; the active one is shown full-screen while running
- **Mechanic tracker**: a small panel driven by *your own Lua script*, which can show any text you want based on raid time and gamepad input

## Using it

**Gamepad (control button = Xbox Guide/Home, index 16 in this setup):**

| Input | Effect |
|---|---|
| Single press | Triggers the mechanic tracker (`gamepadInput`), starts a stopped timer |
| Double press (< 0.4 s) | Stops and resets the timer; clears the timeline image and tracker lines |

Only the control button is listened to — every other controller button belongs to FFXIV and is ignored, so in-game inputs can never trigger the app. Browsers only deliver gamepad input while this tab has focus, so keep it visible (e.g. on a second monitor) during pulls. Mouse/keyboard fallback: the Start/Reset button or Space bar toggles the timer.

**Timeline builder:** click/drop/paste an image, type its time (`1:30`, `90`, `12:05` all work), press Add. Click a thumbnail to preview it; click its time to edit. **Export** downloads the whole timeline as `.json`; dropping that file back onto the window replaces the current timeline.

Configuration constants live at the top of `index.html`: `RESET_BUTTON_INDEX`, `DOUBLE_PRESS_MS`, `TRACKER_LINES`.

## Writing a mechanic tracker Lua script

Drop any `.lua` file anywhere on the window to load it as the tracker script. The last successfully loaded script is remembered and reloaded automatically next time you open the app.

### Lifecycle

1. **Load** — the file is compiled; if compilation fails, an alert shows the exact Lua error and your previous script stays active (loading is atomic).
2. **Setup** — top-level code runs exactly once: declare locals, tables, helper functions.
3. **Frames** — while the timer *runs*, your global function `onFrame(time, gamepadInput)` is called ~10 times per second. While stopped it is never called.
4. **Errors** — if `onFrame` raises an error, the script halts and the message appears in red in the panel's status line; drop a new `.lua` file to recover.

Two behaviors are worth knowing:

- **Reset clears the *display* but not your Lua state.** Locals survive across resets, so detect a reset yourself by noticing time going backwards (see below) if you want a clean slate per run.
- **There are no timers or coroutines-of-time** — everything must be derived from the `time` argument each frame.

### The contract

```lua
-- called ~10x/sec while the timer runs
function onFrame(time, gamepadInput)
    -- time:        current raid timer in seconds (float, e.g. 83.45)
    -- gamepadInput: true only on the frame where a Guide press was detected
end
```

Available functions your script can call:

| Function | Meaning |
|---|---|
| `setLine(i, text)` | Set tracker line `i` (1 = top … 6 = bottom). Indices outside 1–6 are ignored. |
| `clearLines()` | Wipe all six lines. |
| `print(...)` | Works — writes to the browser's devtools console, handy for debugging (not shown in the app UI). |

**Lua environment:** a full Lua 5.3 core runs inside the page — `string`, `table`, `math`, `bit32`, `utf8`, `coroutine`, and most of `os` (`os.time`, `os.date`, `os.difftime`, `os.clock`). What does *not* exist in a browser: file I/O (`io.open`, …), `require`/`loadfile`, and the process-related `os.*` functions (`exit`, `getenv`, `execute`, …). Stick to pure computation plus the two display functions above.

### Patterns that work well

**Auto-clearing flash** — there are no timers, so schedule against `time`:

```lua
local flashUntil = -1
function onFrame(t, input)
    if input then flashUntil = t + 3 end          -- show for the next 3 seconds
    setLine(1, t < flashUntil and ">>> MECHANIC <<<" or "")
end
```

**Reset detection** — time going backwards means the player hit double-press:

```lua
local lastT = -1
function onFrame(t)
    if t < lastT then myCounter = 0 end           -- re-init per run
    lastT = t
end
```

**Countdowns and formatting:**

```lua
setLine(2, string.format("next add-on in %d s", math.ceil(nextAt - t)))
```

Keep lines short: the panel is monospace text at a fixed width. Six lines are yours to arrange however you like — a common layout is big alert on line 1, details below, persistent info (timer/phase) on the bottom lines.

### Examples

Working scripts in `samples/` — drag one onto the window and press Guide:

| File | Shows |
|---|---|
| `samples/mechanic_test.lua` | The absolute minimum: a "MECHANIC NOW" line while a button pulse is fresh, plus a 1 Hz clock on the bottom line. Good first script to read. |
| `samples/trigger_flash.lua` | Guide press = big flash for 3 s + press counter; demonstrates reset detection and time-based expiry. |
| `samples/phase_tracker.lua` | Editable table of phase timestamps; shows current phase name and a countdown to the next one. Copy it and fill in your own pull's times. |

A complete minimal script, if you want to start from scratch:

```lua
function onFrame(t, input)
    setLine(1, input and "MECHANIC NOW" or "")
    setLine(6, string.format("t = %.0f", t))
end
```

## Files

| File | What it is |
|---|---|
| `index.html` | The entire app (UI + bundled Lua 5.3 interpreter). Double-click to run. |
| `samples/*.lua` | Ready-to-drop tracker scripts, also useful as documentation. |
