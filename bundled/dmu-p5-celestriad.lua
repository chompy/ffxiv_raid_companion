-- DMU Phase 5 Celestriad element tracker (Kefka).
--
-- Kefka's "Celestriad" cast (BB42) assigns six of the eight players one of Fire /
-- Ice / Lightning Resistance Down II; two players get none. Only the INITIAL
-- assignment matters: elements rotate as the mechanic plays out, and those later
-- re-applies must not change what is shown. Displays YOUR element big —
-- FIRE / LIGHTNING / ICE, or NONE if you are one of the clean ones.

local CELESTRIAD_ACTION = "BB42" -- cast start AND land carry this action hex

-- Element per status; hex first, display name as a fallback in case a patch
-- renumbers them. (An earlier phase also applies Lightning Resistance Down II —
-- same status BB6 — so these lines are only ever read while Celestriad is armed.)
local STATUS_ELEMENT = {
  B56 = "FIRE",      ["Fire Resistance Down II"] = "FIRE",
  B57 = "ICE",       ["Ice Resistance Down II"] = "ICE",
  BB6 = "LIGHTNING", ["Lightning Resistance Down II"] = "LIGHTNING",
}

-- All six initial applies land in the same instant as the ability, so once six
-- distinct players are assigned the wave is complete and anyone left out is clean.
local EXPECTED_DEBUFFED = 6
-- Safety net: if a line is dropped and the count never reaches six, finalize
-- anyway this long after the cast (the applies always land at or just after it).
local ARM_WINDOW_MS = 8000

-- Shared visual language across the example scripts — keep these in sync.
local C_TITLE  = "#ffffff"
local C_BRIGHT = "#e8ecf8"
local C_ACCENT = "#ffd24c"
local C_REAL   = "#7dff9e"
local C_DIMMED = "#6a6a80"

-- Identity defaults. A ChangePrimaryPlayer line (type 2: "2|ts|<charID>|<name>",
-- emitted by IINACT on zone change) overrides these while the log is streaming;
-- if no such line ever arrives we just track the default player below.
local MY_NAME = "Minda Silva"
local MY_ID   = "10020C04"

local armedAtMs = nil -- when Celestriad's cast was first seen (nil = not in mechanic)
local assignments = {} -- playerId -> element of their FIRST apply only
local mineElement = nil -- your resolved word: FIRE / LIGHTNING / ICE / NONE

function resetAll()
  armedAtMs = nil
  assignments = {}
  mineElement = nil
end

-- onCombatStart covers the case where a fight ends without a defeat/victory line we
-- see (stream hiccup): every new pull starts from clean state regardless.
onChangeZone    = function(_zone) resetAll() end
onCombatEnd     = function(_result, _elapsedMs) resetAll() end
onCombatStart   = function() resetAll() end

local function nowMs() return math.floor(now() * 1000 + 0.5) end

-- NOTE: Lua's gmatch("[^|]+") silently DROPS empty fields between "||",
-- shifting every later index. Split on literal "|" preserving empties.
local function splitLine(raw)
  local parts, start = {}, 1
  while true do
    local i = raw:find("|", start, true)
    if not i then break end
    parts[#parts+1] = raw:sub(start, i - 1)
    start = i + 1
  end
  parts[#parts+1] = raw:sub(start)
  return parts
end

local function parsePrimaryPlayer(raw)
  local f = splitLine(raw)
  -- IINACT line type 2: "2|ts|<charID hex>|<charName>", emitted on zone change.
  if #f < 4 or f[1] ~= "2" then return end
  if (f[3] or "") ~= "" and (f[4] or "") ~= "" then
    MY_ID, MY_NAME = f[3], f[4]
  end
end

local function isMe(id, name)
  return id == MY_ID or name == MY_NAME
end

-- Celestriad's cast line arms the tracker. A second round later in the fight re-arms
-- once we are past the window; the land line (21) arriving ~5s after the cast start
-- (20) must NOT clear assignments that already landed with it.
local function parseCast(raw)
  local f = splitLine(raw)
  if #f < 6 or (f[1] ~= "20" and f[1] ~= "21") then return end
  if (f[5] or ""):upper() ~= CELESTRIAD_ACTION then return end
  if not armedAtMs or nowMs() - armedAtMs > ARM_WINDOW_MS then
    armedAtMs = nowMs()
    assignments = {}
    mineElement = nil
  end
end

local function parseDebuff(raw)
  local f = splitLine(raw)
  if #f < 9 or f[1] ~= "26" then return end
  local element = STATUS_ELEMENT[(f[3] or ""):upper()] or STATUS_ELEMENT[f[4]]
  if not element then return end
  -- Only the initial wave counts: outside the arm window this is either an earlier
  -- phase's Lightning Resistance Down II or a mid-mechanic rotation re-apply.
  if not armedAtMs or nowMs() - armedAtMs > ARM_WINDOW_MS then return end

  local targetId, targetName = f[8], f[9]
  if isMe(targetId, targetName) and mineElement == nil then
    mineElement = element -- your initial assignment resolves the display immediately
  end
  if not assignments[targetId] then assignments[targetId] = element end
end

onLogLine = function(raw)
  local line = raw or ""
  parsePrimaryPlayer(line)
  parseCast(line)
  parseDebuff(line)
end

local TITLE_SIZE = 16
local PENDING_SIZE = 48

-- Monospace advance width used by the renderer.
local function centerText(cx, text, size)
  return cx - #text * size * 0.62 / 2
end

onFrame = function(_dt)
  clearCanvas()
  if armedAtMs == nil then return end

  local t = nowMs()
  -- You got no element: the word is NONE once the wave has completed (six distinct
  -- players assigned) or the arm window lapsed without your apply line arriving.
  if mineElement == nil then
    local n = 0
    for _ in pairs(assignments) do n = n + 1 end
    if n >= EXPECTED_DEBUFFED or t - armedAtMs > ARM_WINDOW_MS then
      mineElement = "NONE"
    end
  end

  local w, h = canvasWidth(), canvasHeight()
  local title = "DMU P5 - Celestriad (you: " .. MY_NAME .. ")"
  drawText(title, centerText(w / 2, title, TITLE_SIZE), math.max(26, 10 + TITLE_SIZE), TITLE_SIZE, C_TITLE)

  if mineElement then
    -- One huge centered word; sized to fit the width (longest is LIGHTNING).
    local size = math.floor(w * 0.9 / (#mineElement * 0.62))
    if size > h * 0.75 then size = math.floor(h * 0.75) end
    -- NONE means you are clean — green so it reads as "you're safe" at a glance.
    local color = mineElement == "NONE" and C_REAL or C_ACCENT
    drawText(mineElement, centerText(w / 2, mineElement, size), math.floor(h / 2 + size * 0.35), size, color)
  else
    -- Still resolving: a dimmed placeholder so the tracker is visibly waiting.
    drawText("?", centerText(w / 2, "?", PENDING_SIZE), math.floor(h / 2 + PENDING_SIZE * 0.35), PENDING_SIZE, C_DIMMED)
  end
end
