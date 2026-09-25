-- DMU Phase 2 Forsaken tracker.
--
-- Latches two facts and shows them as large centered lines:
--   line 1: "<set number> <marker name>" — the current marker wave plus YOUR last
--           head marker, e.g. "3 SPREAD". The first set marks all eight players;
--           later sets mark only one group of four, so most waves skip you — your
--           marker then stays at whatever it was (players in a wave can each carry
--           different icons, so the wave's icon is not yours). The counter still
--           increments on every new marker wave.
--   line 2: "PAST" or "FUTURE" — Kefka's most recent Past's End / Future's End cast.
--
-- Marker assignment lines are type 27 with the marker id in field 7:
--   "27|ts|<targetId>|<targetName>|...|<markerId>|...|<uid>"
-- Only the three Forsaken marker ids (02CB/02CC/02CD) are tracked; other marker
-- traffic is ignored. A new set begins when a player who already holds this wave's
-- markers gets marked again, or when a marker line arrives much later than the last
-- one (covers dropped lines). Redelivered copies of the same line share its trailing
-- uid and are deduped so they cannot fake a new set.
-- The cast is an ordinary ability line (type 21) matched by action name in field 6.
--
-- The display latches its values, then fades ~30s after the LAST Forsaken activity
-- (marker line or End cast) — i.e. shortly after the cycle's final marker wave — so
-- it is gone before P3 limit cut takes the canvas. It also resets on combat end /
-- zone change / re-pull, and a new marker wave reactivates it from scratch.

local C_TITLE  = '#ffffff'
local C_BRIGHT = '#e8ecf8'
local C_ACCENT = '#ffd24c'
local C_DIMMED = '#6a6a80'
local TITLE_SIZE = 16

-- PLACEHOLDER marker names — update these to the real icon names.
local MARKER_NAMES = {
  ['02CB'] = 'STACK',
  ['02CC'] = 'SPREAD',
  ['02CD'] = 'CONE',
}

-- Identity defaults. A ChangePrimaryPlayer line (type 2: "2|ts|<charID>|<name>",
-- emitted by IINACT on zone change) overrides these while the log is streaming;
-- if no such line ever arrives we just track the default player below.
local MY_NAME = 'Minda Silva'
local MY_ID   = '10020C04'

local PAST_CAST_NAME   = "Past's End"
local FUTURE_CAST_NAME = "Future's End"

-- Markers inside one wave land in the same tick; a line arriving this long after
-- the previous marker starts a new set even if none of its targets are marked yet.
local NEW_SET_GAP_MS = 5000

-- Fade window: waves are ~10s apart, so anything quiet for this long is past the
-- cycle's final wave (P3 is starting). Anchored on the last marker line or End cast.
local CLEAR_MS = 30000

local SEEN_UID_CAP = 8192

-- --- state -----------------------------------------------------------------
local setNumber    = 0      -- marker waves seen this combat
local setTargets   = {}     -- targetId -> true for the current wave
local myMarkerId   = nil    -- YOUR most recent marker id (persists across sets that skip you)
local lastCast     = nil    -- 'PAST' | 'FUTURE' (Kefka's latest End cast)
local lastMarkerMs = nil    -- marker lines only: feeds the new-set gap rule. Casts
                            -- land ~1s before each wave and must NOT shorten that gap.
local lastActivityMs = nil  -- markers AND casts: feeds the fade window
local seenUids     = {}
local seenUidCount = 0

local function nowMs() return math.floor(now() * 1000 + 0.5) end

local function resetAll()
  setNumber    = 0
  setTargets   = {}
  myMarkerId   = nil
  lastCast     = nil
  lastMarkerMs = nil
  lastActivityMs = nil
  seenUids     = {}
  seenUidCount = 0
end

-- --- log input ---------------------------------------------------------------
-- Split on '|'. Plain string.find (not patterns): fengari's pattern matcher does not
-- backtrack greedy matches the way PUC Lua does, so gmatch-based splits are unreliable.
local function split(s)
  local out = {}
  local start = 1
  while true do
    local p = s:find('|', start, true)
    if not p then break end
    table.insert(out, s:sub(start, p - 1))
    start = p + 1
  end
  table.insert(out, s:sub(start))
  return out
end

local function parsePrimaryPlayer(raw)
  local f = split(raw)
  -- IINACT line type 2: "2|ts|<charID hex>|<charName>", emitted on zone change.
  if #f < 4 or f[1] ~= '2' then return end
  if (f[3] or '') ~= '' and (f[4] or '') ~= '' then
    MY_ID, MY_NAME = f[3], f[4]
  end
end

function onLogLine(raw)
  parsePrimaryPlayer(raw)
  local f = split(raw)
  if #f < 7 then return end

  -- Kefka's End casts (type 21; action name is field 6).
  if f[1] == '21' then
    if f[6] == FUTURE_CAST_NAME then lastCast = 'FUTURE'; lastActivityMs = nowMs()
    elseif f[6] == PAST_CAST_NAME then lastCast = 'PAST'; lastActivityMs = nowMs() end
    return
  end

  -- Marker assignments (type 27; marker id is field 7).
  if f[1] ~= '27' then return end
  local markerId = f[7]
  if MARKER_NAMES[markerId] == nil then return end
  local targetId = f[3]
  if (targetId or '') == '' then return end

  -- Dedupe redelivered copies of the same line by its trailing uid.
  local uid = f[#f]
  if uid ~= '' then
    if seenUids[uid] then return end
    seenUids[uid] = true
    seenUidCount = seenUidCount + 1
    if seenUidCount > SEEN_UID_CAP then seenUids = {}; seenUidCount = 0 end
  end

  local tMs = nowMs()
  local gapStartsSet = lastMarkerMs ~= nil and (tMs - lastMarkerMs) > NEW_SET_GAP_MS
  if setNumber == 0 or setTargets[targetId] or gapStartsSet then
    setNumber = setNumber + 1
    setTargets = {}
  end
  setTargets[targetId] = true
  -- Only lines targeting you change YOUR marker; sets that skip you leave it alone.
  if targetId == MY_ID or f[4] == MY_NAME then myMarkerId = markerId end
  lastMarkerMs = tMs
  lastActivityMs = tMs
end

onChangeZone  = function(_zone) resetAll() end
onCombatEnd   = function(_result, _elapsedMs) resetAll() end
-- A re-pull in the same zone fires this (never onChangeZone); start clean.
onCombatStart = function() resetAll() end

-- --- display -------------------------------------------------------------------
local function centerText(cx, text, size)
  return cx - #text * size * 0.62 / 2
end

function onFrame(dt)
  clearCanvas()
  if setNumber == 0 and lastCast == nil then return end -- nothing latched yet

  -- The cycle is over: quiet for CLEAR_MS means P3 has started — stop rendering so
  -- the limit-cut display (and anything else) gets the canvas back.
  local tMs = nowMs()
  if lastActivityMs ~= nil and (tMs - lastActivityMs) > CLEAR_MS then resetAll(); return end

  local w, h = canvasWidth(), canvasHeight()

  local line1, line2 = 'waiting...', 'waiting...'
  if myMarkerId ~= nil and setNumber > 0 then
    line1 = tostring(setNumber) .. ' ' .. (MARKER_NAMES[myMarkerId] or '?')
  end
  if lastCast ~= nil then line2 = lastCast end

  -- Fill the width for the longest line; share the leftover height across lines.
  local longest = math.max(#line1, #line2)
  local lineSize = math.floor(w * 0.94 / (longest * 0.62))
  local perLine = math.floor((h - TITLE_SIZE - 18) / (2 * 1.35))
  if perLine < lineSize then lineSize = perLine end
  if lineSize < 24 then lineSize = 24 end
  local pitch = math.floor(lineSize * 1.35)

  local panelH = TITLE_SIZE + 6 + 2 * pitch
  local y = math.max(26, math.floor((h - panelH) / 2))
  local title = 'DMU P2 - Forsaken (you: ' .. MY_NAME .. ')'
  drawText(title, centerText(w / 2, title, TITLE_SIZE), y, TITLE_SIZE, C_TITLE); y = y + TITLE_SIZE + 6

  drawText(line1, centerText(w / 2, line1, lineSize), y + 16 + math.floor(lineSize * 0.9),
    lineSize, myMarkerId ~= nil and C_BRIGHT or C_DIMMED)
  drawText(line2, centerText(w / 2, line2, lineSize), y + 16 + pitch + math.floor(lineSize * 0.9),
    lineSize, lastCast ~= nil and C_ACCENT or C_DIMMED)
end
