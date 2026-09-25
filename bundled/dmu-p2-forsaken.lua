-- DMU Phase 2 Forsaken tracker.
--
-- Latches three facts and shows them as large centered lines:
--   line 1: "<set number> <marker name> <IN|OUT>" — the current marker wave plus YOUR
--           last head marker, e.g. "3 SPREAD OUT". The first set marks all eight
--           players; later sets mark only one group of four, so most waves skip you —
--           your marker then stays at whatever it was (players in a wave can each carry
--           different icons, so the wave's icon is not yours). The counter still
--           increments on every new marker wave.
--   group:  when the FIRST wave lands, the player standing closest to you (positions
--           come from IINACT entity state lines, code 261) is compared against your
--           icon: same icon -> OUT, different -> IN. The groups swap when set 4 goes
--           out and again ~EIGHT_DELAY_MS after set 7 — the counter then advances to a
--           synthetic set 8 for the final mechanic of the cycle.
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

-- The cycle's last real marker wave is set 7; the mechanic it sets up lands ~10s
-- later with no new markers. Advance the counter to a synthetic set 8 and swap the
-- groups at that point.
local EIGHT_DELAY_MS = 10000

-- Entity state lines stream every few seconds per player in combat; anything older
-- than this is stale (pre-pull positioning, other engagements) and excluded from the
-- closest-player lookup.
local POS_FRESH_MS = 20000

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

-- Positions from entity state lines: id -> { x=, y=, t=<ms of last sample> }.
local positions    = {}
local myGroup      = nil    -- 'IN' | 'OUT', assigned from the closest-player compare
local nearestId    = nil    -- pinned when the first marker wave lands
local wave1Markers = {}     -- id -> marker id for the first wave (the compare source)
local advancedTo8  = false  -- synthetic set 8 fires once per combat

local function nowMs() return math.floor(now() * 1000 + 0.5) end

local function flip(g) return g == 'IN' and 'OUT' or 'IN' end

-- The player (other than you) with the freshest position nearest to yours, or nil if
-- your own position is unknown/stale.
local function pickNearest()
  local me = positions[MY_ID]
  if me == nil or me.x == nil or me.y == nil then return nil end
  local tMs = nowMs()
  local bestId, bestD2 = nil, nil
  for id, p in pairs(positions) do
    if id ~= MY_ID and p.x ~= nil and p.y ~= nil and (tMs - p.t) <= POS_FRESH_MS then
      local dx = p.x - me.x
      local dy = p.y - me.y
      local d2 = dx * dx + dy * dy
      if bestD2 == nil or d2 < bestD2 then bestId, bestD2 = id, d2 end
    end
  end
  return bestId
end

local function resetAll()
  setNumber      = 0
  setTargets     = {}
  myMarkerId     = nil
  lastCast       = nil
  lastMarkerMs   = nil
  lastActivityMs = nil
  seenUids       = {}
  seenUidCount   = 0
  positions      = {}
  myGroup        = nil
  nearestId      = nil
  wave1Markers   = {}
  advancedTo8    = false
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

-- Assign IN/OUT by comparing YOUR icon with the closest player's first-wave icon.
-- If that player never got a wave-1 mark (should not happen — wave 1 marks everyone),
-- fall back to any other marked player once set 2 is underway.
local function tryResolveGroup()
  if myGroup ~= nil or myMarkerId == nil or nearestId == nil then return end
  local theirs = wave1Markers[nearestId]
  if theirs == nil and setNumber >= 2 then
    for id, m in pairs(wave1Markers) do
      if id ~= MY_ID then theirs = m break end
    end
  end
  if theirs ~= nil then myGroup = (theirs == myMarkerId) and 'OUT' or 'IN' end
end

function onLogLine(raw)
  parsePrimaryPlayer(raw)
  local f = split(raw)
  if #f < 7 then return end

  -- Entity state lines (code 261): "Add" snapshots and partial "Change" updates as
  -- key|value pairs; the trailing field is a line uid. Only player-ish ids are kept,
  -- so arena NPCs can never win the closest-player lookup.
  if f[1] == '261' and (f[3] == 'Add' or f[3] == 'Change') then
    local id = f[4]
    if id ~= nil and #id == 8 and id:sub(1, 2) ~= '40' then
      local p = positions[id]
      if p == nil then p = {}; positions[id] = p end
      for i = 5, #f - 1, 2 do
        if f[i] == 'PosX' or f[i] == 'PosY' then
          local v = tonumber(f[i + 1])
          if v ~= nil then
            if f[i] == 'PosX' then p.x = v else p.y = v end
            p.t = nowMs()
          end
        end
      end
    end
    return
  end

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
    -- The first wave defines the groups: pin down who is standing next to you now,
    -- while positions are still from pre-pull positioning.
    if setNumber == 1 then nearestId = pickNearest() end
    -- Set 4 goes out with the roles swapped.
    if setNumber == 4 and myGroup ~= nil then myGroup = flip(myGroup) end
  end
  setTargets[targetId] = true
  -- Only lines targeting you change YOUR marker; sets that skip you leave it alone.
  if targetId == MY_ID or f[4] == MY_NAME then myMarkerId = markerId end
  -- Record first-wave icons for the closest-player compare (it resolves once both
  -- sides' marks have landed, which may be a few lines apart).
  if setNumber == 1 then wave1Markers[targetId] = markerId end
  tryResolveGroup()
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

  local tMs = nowMs()

  -- The cycle's last real wave is set 7; ~EIGHT_DELAY_MS after it the counter advances
  -- to a synthetic set 8 and the groups swap one final time.
  if not advancedTo8 and setNumber == 7 then
    if lastMarkerMs ~= nil and (tMs - lastMarkerMs) >= EIGHT_DELAY_MS then
      advancedTo8 = true
      setNumber = 8
      if myGroup ~= nil then myGroup = flip(myGroup) end
    end
  end

  -- The cycle is over: quiet for CLEAR_MS means P3 has started — stop rendering so
  -- the limit-cut display (and anything else) gets the canvas back.
  if lastActivityMs ~= nil and (tMs - lastActivityMs) > CLEAR_MS then resetAll(); return end

  local w, h = canvasWidth(), canvasHeight()

  local line1, line2 = 'waiting...', 'waiting...'
  if myMarkerId ~= nil and setNumber > 0 then
    local suffix = ''
    if myGroup ~= nil then suffix = ' ' .. myGroup end
    line1 = tostring(setNumber) .. ' ' .. (MARKER_NAMES[myMarkerId] or '?') .. suffix
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
