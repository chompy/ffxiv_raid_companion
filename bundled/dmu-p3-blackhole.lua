-- DMU Phase 3 black hole tracker ("Accretion" debuff).
--
-- Right after limit cut resolves, Kefka slams a black hole onto exactly two players
-- (status "Accretion", ~14s). Their names are drawn as two huge lines in the same
-- oversized style as the P4 tracker's resolution windows; YOUR line is highlighted
-- in accent gold with a [YOU] tag.
--
-- The apply line is a plain status-apply (line 26):
--   "26|ts|<statusId>|Accretion|<dur>|E0000000||<targetId>|<targetName>|.."
-- Matched by status NAME so a patch shifting the hex id cannot starve the tracker.
-- Identity follows the P4 tracker: defaults below, overridden by type-2 lines.
--
-- This display lands while the limit-cut table is still up, so while there is anything
-- fresh to show the script holds a canvas takeover (takeoverCanvas): other scripts'
-- scenes keep updating but are not drawn until this one clears.

-- Shared visual language across the example scripts — keep these in sync.
local C_TITLE  = '#ffffff'
local C_LABEL  = '#5a627e'
local C_NAME   = '#d0d0e0'
local C_BRIGHT = '#e8ecf8'
local C_INFO   = '#9fd0ff'
local C_ACCENT = '#ffd24c'
local C_REAL   = '#7dff9e'
local C_FAKE   = '#ff8f8f'
local C_WARN   = '#ffd27f'
local C_DIMMED = '#6a6a80'

local ACCRETION_NAME = 'Accretion'
local TITLE_SIZE = 16

-- Stays up this long after the last apply line before clearing (same window as P4).
local CLEAR_MS = 120000

-- Applies inside one wave land within milliseconds of each other; separate waves are
-- minutes apart. A gap longer than this starts a new pair even if it reuses a carrier.
local NEW_WAVE_GAP_MS = 30000

-- Identity defaults. A ChangePrimaryPlayer line (type 2: "2|ts|<charID>|<name>",
-- emitted by IINACT on zone change) overrides these while the log is streaming;
-- if no such line ever arrives we just track the default player below.
local MY_NAME = 'Minda Silva'
local MY_ID   = '10020C04'

-- --- state -----------------------------------------------------------------
local holders = {} -- targetId -> { name=, atMs= } (the black hole pair)
local order   = {} -- targetIds in apply order; max 2
local lastActivityMs = nil

local function nowMs() return math.floor(now() * 1000 + 0.5) end

local function clearHolders()
  holders = {}
  order = {}
end

local function resetAll()
  clearHolders()
  lastActivityMs = nil
  takeoverCanvas(false)
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

local function isMe(id, name)
  return id == MY_ID or name == MY_NAME
end

function onLogLine(raw)
  parsePrimaryPlayer(raw)
  local f = split(raw)
  if #f < 9 then return end
  if f[1] ~= '26' or f[4] ~= ACCRETION_NAME then return end
  local id, name = f[8], f[9]
  if (id == '') or (name == '') then return end

  local tMs = nowMs()
  if lastActivityMs and (tMs - lastActivityMs) > NEW_WAVE_GAP_MS then clearHolders() end
  if holders[id] then
    holders[id].atMs = tMs -- re-apply on the same carrier: refresh only
  else
    if #order >= 2 then clearHolders() end -- a new pair starts; the old one is over
    order[#order + 1] = id
    holders[id] = { name = name, atMs = tMs }
  end
  lastActivityMs = tMs
  takeoverCanvas(true)
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
  if lastActivityMs == nil then return end
  local tMs = nowMs()
  if tMs - lastActivityMs > CLEAR_MS then resetAll(); return end

  local w, h = canvasWidth(), canvasHeight()

  -- Two rows: the pair in apply order; a not-yet-seen slot waits dimmed.
  local rows = {}
  for i = 1, 2 do
    local id = order[i]
    if id and holders[id] then
      local mine = isMe(id, holders[id].name)
      rows[#rows + 1] = { text = holders[id].name .. (mine and '  [YOU]' or ''), color = mine and C_ACCENT or C_BRIGHT }
    else
      rows[#rows + 1] = { text = 'waiting...', color = C_DIMMED }
    end
  end

  -- Fill the width for the longest line; share the leftover height across lines.
  local longest = 0
  for _, r in ipairs(rows) do
    if #r.text > longest then longest = #r.text end
  end
  local lineSize = math.floor(w * 0.94 / (longest * 0.62))
  local perLine = math.floor((h - TITLE_SIZE - 18) / (2 * 1.35))
  if perLine < lineSize then lineSize = perLine end
  if lineSize < 24 then lineSize = 24 end
  local pitch = math.floor(lineSize * 1.35)
  -- Left-align both lines on the block's left edge, centered as a whole (P4 style).
  local leftX = math.floor(w / 2 - (longest * lineSize * 0.62) / 2)

  local panelH = TITLE_SIZE + 6 + 2 * pitch
  local y = math.max(26, math.floor((h - panelH) / 2))
  local title = 'DMU P3 - black hole tracker (you: ' .. MY_NAME .. ')'
  drawText(title, centerText(w / 2, title, TITLE_SIZE), y, TITLE_SIZE, C_TITLE); y = y + TITLE_SIZE + 6

  for i, r in ipairs(rows) do
    drawText(r.text, leftX, y + 16 + (i - 1) * pitch + math.floor(lineSize * 0.9), lineSize, r.color)
  end
end
