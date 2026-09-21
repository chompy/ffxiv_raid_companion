-- DMU Phase 4 real/fake debuff tracker (Kefka / Neo Exdeath / Chaos).
--
-- Before each big move the acting boss holds status "Unknown_808" whose param
-- encodes the reality of that move's debuffs:
--   p=1119/1121 -> FAKE,  p=1120/1122 -> REAL.
-- Two kinds of rows:
--   GLOBAL (Cursed Shriek / Inferno / Tsunami): affect everyone, so the table
--   follows the LATEST round — captured from any player's apply line or the
--   boss casting; "you" markers show which are on you specifically.
--   PERSONAL (Compressed Water / Forked Lightning / Acceleration Bomb): only
--   matter to whoever carries them, so each row is pinned to YOUR debuff when
--   it lands and a later round cannot overwrite it while yours is still up.
-- If no fresh (<20s) tell is active when something triggers it stays ??? and
-- is re-checked every frame until one shows up (mirrors dmu-p4-debuff-helper).

-- Under the table, all six resolution windows get their own huge line; a window
-- with nothing resolved yet is drawn blank and dimmed. Windows 1 and 4 show
-- STACK when you hold no debuff in that wave — an empty wave means stack:
--   1st: short-timer water/lightning/bomb   2nd: short Cursed Shriek   3rd: Inferno
--   4th: long-timer water/lightning/bomb    5th: long Cursed Shriek    6th: Tsunami
-- Words come from the per-status reality maps below. The two personal waves are
-- told apart by expiry clustering: the party's debuffs always resolve at the same
-- moment (durations differ per player, expiries align), so the earlier cluster is
-- the short wave and the later one the long wave.

local TELL_STATUS = "808"
local FRESH_TELL_MS = 20000

-- The table only appears while mechanics are happening and stays up this long after
-- the last related line (tells, debuff applies/removals, boss casts) before clearing.
local CLEAR_MS = 120000

-- Shared visual language across the example scripts — keep these in sync.
local C_TITLE  = "#ffffff"
local C_LABEL  = "#5a627e"
local C_NAME   = "#d0d0e0"
local C_BRIGHT = "#e8ecf8"
local C_INFO   = "#9fd0ff"
local C_ACCENT = "#ffd24c"
local C_REAL   = "#7dff9e"
local C_FAKE   = "#ff8f8f"
local C_WARN   = "#ffd27f"
local C_DIMMED = "#6a6a80"

-- Identity defaults. A ChangePrimaryPlayer line (type 2: "2|ts|<charID>|<name>",
-- emitted by IINACT on zone change) overrides these while the log is streaming;
-- if no such line ever arrives we just track the default player below.
local MY_NAME = "Minda Silva"
local MY_ID   = "10020C04"

-- Boss entity ids differ between sessions, so tells are matched by NAME.
-- (Chaos's effect sub-entities share the name "Chaos".)
local BOSS_NAMES = { ["Neo Exdeath"] = true, ["Chaos"] = true }

-- GLOBAL rows: any player's apply line stamps the table; Cursed Shriek comes in
-- a 60s class ("Short") and a 69s class ("Long"), so its key depends on duration.
local STATUS_MECH = {
  ["15A7"] = { boss="Neo Exdeath", mech=function(dur) return dur < 65 and "csShort" or "csLong" end }, -- Cursed Shriek
  ["15AB"] = { boss="Chaos",       mech="inferno" }, -- Entropy (Inferno's debuff)
  ["15AC"] = { boss="Chaos",       mech="tsunami" }, -- Dynamic Fluid (Tsunami's debuff)
}

-- PERSONAL rows: pinned to your own debuff when it lands.
local STATUS_PERSONAL = {
  ["15A8"] = { boss="Neo Exdeath", row="cwfl" }, -- Forked Lightning
  ["15A9"] = { boss="Neo Exdeath", row="cwfl" }, -- Compressed Water
  ["15AA"] = { boss="Neo Exdeath", row="ab" },   -- Acceleration Bomb
}

local MECH_BOSSES = { csShort="Neo Exdeath", csLong="Neo Exdeath", inferno="Chaos", tsunami="Chaos" }

-- Chaos casts stamp their global mechanic even if apply lines never arrive (e.g. a
-- snippet cut before they do). Matched on ACTION HEX + caster name: other phases
-- reuse these ability names (Kefka has his own "Inferno" BAF4 / "Tsunami" BAF5), so
-- the display name alone is ambiguous. Grand Cross stamps NO shriek rows: each round
-- applies only ONE shriek class, and which one is revealed by the apply lines'
-- durations — a cast cannot say. (GC casts are still recorded for the footer.)
local CASTS = {
  BB14 = { boss="Neo Exdeath", keys={} }, -- Grand Cross
  BB1E = { boss="Chaos",       keys={ "inferno" } },           -- Inferno
  BB20 = { boss="Chaos",       keys={ "inferno" } },           -- Inferno (sub-entity caster)
  BB1F = { boss="Chaos",       keys={ "tsunami" } },           -- Tsunami
  BB21 = { boss="Chaos",       keys={ "tsunami" } },           -- Tsunami (sub-entity caster)
}

local mechs      = {} -- mechKey -> { reality=, tellParam=, atMs= } (latest round, global rows)
local personal   = {} -- statusHex -> { boss=, appliedAtMs=, reality=, tellParam= } (your cwfl/ab debuffs)
local mine       = {} -- statusHex -> { durationS=, appliedAtMs= } ("you" markers only)
local tells    = {} -- bossName -> { param=, atMs= } (currently held tell)
local priorTells = {} -- bossName -> { param=, endedAtMs= } (tell already active when the log started)
local tellSeen   = {} -- bossName -> true once any of its tell lines was observed this session
local casts      = {} -- cast name -> last seen ms
local personalWaves = {} -- { at=, expire= } for every observed cwfl/ab apply (any carrier)
local lastActivityMs = nil -- when the newest mechanic-related line was seen (nil = nothing to show)

function resetAll()
  mechs = {}
  personal = {}
  mine = {}
  tells = {}
  priorTells = {}
  tellSeen = {}
  casts = {}
  personalWaves = {}
  lastActivityMs = nil
end

onChangeZone = function(_zone) resetAll() end
onCombatEnd  = function(_result, _elapsedMs) resetAll() end

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

local function realityOfParam(p)
  if p == 1119 or p == 1121 then return "fake" end
  if p == 1120 or p == 1122 then return "real" end
  return nil
end

-- Reality of the boss tell relevant at refMs: a fresh currently-held tell, or a
-- pre-log tell that was still active at refMs. Returns (reality|nil, param|nil).
local function tellReality(boss, refMs)
  local t = tells[boss]
  if t and nowMs() - t.atMs <= FRESH_TELL_MS then
    return realityOfParam(t.param), t.param
  end
  local p = priorTells[boss]
  if p and refMs < p.endedAtMs then
    return realityOfParam(p.param), p.param
  end
  return nil, nil
end

local function parseTell(raw)
  local f = splitLine(raw)
  if #f < 10 or (f[1] ~= "26" and f[1] ~= "30") then return end
  if (f[3] or ""):upper() ~= TELL_STATUS then return end
  -- tell layout: f[8]=boss id, f[9]=name, f[10]=param. Match by NAME: boss entity
  -- ids differ between sessions.
  local bossName = f[9]
  if not BOSS_NAMES[bossName] then return end
  local param = tonumber((f[10] or ""), 16)
  lastActivityMs = nowMs() -- a tell landing or lifting is part of the mechanic sequence
  if f[1] == "30" then
    if tells[bossName] then
      tells[bossName] = nil
    elseif not tellSeen[bossName] and param then
      -- Log started mid-combat: this boss was already holding a tell whose add line
      -- we never saw. Remember it as active-until-now so mechanics that triggered
      -- before this removal can still be attributed to it.
      priorTells[bossName] = { param=param, endedAtMs=nowMs() }
    end
  else
    if param then tells[bossName] = { param=param, atMs=nowMs() } end
  end
  tellSeen[bossName] = true
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

-- Every carrier's cwfl/bomb apply lands here: the party's debuffs resolve in two
-- simultaneous waves and these records are what reveal where the waves split.
local function notePersonalWave(durS, appliedAtMs)
  if not durS or durS <= 0 then return end
  personalWaves[#personalWaves+1] = { at=appliedAtMs, expire=appliedAtMs + math.floor(durS * 1000 + 0.5) }
  if #personalWaves > 256 then table.remove(personalWaves, 1) end
end

local function parseDebuff(raw)
  local f = splitLine(raw)
  if #f < 9 or (f[1] ~= "26" and f[1] ~= "30") then return end
  local status = (f[3] or ""):upper()
  local info, personalInfo = STATUS_MECH[status], STATUS_PERSONAL[status]
  if not info and not personalInfo then return end
  lastActivityMs = nowMs() -- applies AND removals keep the table up until it resolves

  -- Both line 26 apply and line 30 remove carry the target at f[8]/f[9].
  local targetId, targetName = f[8], f[9]

  if f[1] == "30" then
    -- Only clear markers for YOUR removal: other players' copies of the same
    -- status expire on their own schedule.
    if isMe(targetId, targetName) then
      mine[status] = nil
      personal[status] = nil
    end
    return
  end

  local dur = tonumber(f[5]) or 0
  local appliedAtMs = nowMs()

  if info then
    -- Global: any player's apply line informs the table (latest round wins).
    local mechKey = type(info.mech) == "function" and info.mech(dur) or info.mech
    local r, p = tellReality(info.boss, appliedAtMs)
    -- Never downgrade an already-resolved round to unknown: applies can land
    -- after the boss's tell has lifted, but the cast may have stamped it while
    -- the tell was still fresh.
    if r or not mechs[mechKey] then
      mechs[mechKey] = { reality=r, tellParam=p, atMs=appliedAtMs }
    end
    if isMe(targetId, targetName) then
      mine[status] = { durationS=dur, appliedAtMs=appliedAtMs }
    end
  else
    -- Personal: ANY carrier's apply informs wave timing (see waveClass), and YOUR
    -- debuff pins its own reality the moment it lands; a later round cannot
    -- overwrite it while yours is still up.
    notePersonalWave(dur, appliedAtMs)
    if isMe(targetId, targetName) then
      local r, p = tellReality(personalInfo.boss, appliedAtMs)
      personal[status] = { status=status, boss=personalInfo.boss, row=personalInfo.row, durationS=dur,
                           appliedAtMs=appliedAtMs, reality=r, tellParam=p }
      mine[status] = { durationS=dur, appliedAtMs=appliedAtMs }
    end
  end
end

-- Latest personal entry for a cwfl/ab row (you may hold both water and
-- lightning; the most recently applied one reflects the newest round).
local function personalEntry(row)
  local best
  for _, ent in pairs(personal) do
    if ent.row == row and (not best or ent.appliedAtMs >= best.appliedAtMs) then
      best = ent
    end
  end
  return best
end

-- Resolution words per STATUS and reality. Water and lightning are opposites, as
-- are inferno and tsunami; bomb and shriek are the same for both classes.
local CWFL_WORDS  = { ["15A9"] = { real="STACK", fake="SPREAD" }, -- Compressed Water
                      ["15A8"] = { real="SPREAD", fake="STACK" } } -- Forked Lightning
local AB_WORDS    = { ["15AA"] = { real="STOP",  fake="MOVE" } }   -- Acceleration Bomb
local SHRIEK_WORD = { real="LOOK OUT", fake="LOOK IN" }            -- Cursed Shriek (both classes)
local CHAOS_WORDS = { inferno={ real="OUT", fake="IN" }, tsunami={ real="IN", fake="OUT" } }

-- Which resolution wave does this expiry belong to? Candidates are the party's
-- applies near this entry's own apply time (other pulls' waves never mix in). The
-- expiries form exactly two tight clusters — everyone resolves at the same moment,
-- short-timer debuffs first; anything else is too ambiguous to guess.
local function waveClass(expireAt, appliedAtMs)
  local cands = {}
  for _, e in ipairs(personalWaves) do
    if math.abs(e.at - appliedAtMs) <= 90000 then cands[#cands+1] = e.expire end
  end
  table.sort(cands)
  local starts, i = {}, 1
  while i <= #cands do
    local j = i
    while j < #cands and cands[j+1] - cands[i] <= 5000 do j = j + 1 end
    starts[#starts+1] = cands[i]
    i = j + 1
  end
  if #starts ~= 2 then return nil end
  local boundary = (starts[1] + starts[2]) / 2
  return expireAt <= boundary and "short" or "long"
end

-- The six resolution windows, always all six, in fixed order; entries without a
-- resolved word come back inactive and render dimmed/blank. Windows 1 and 4 get
-- STACK when you hold nothing that resolves there — an empty wave means stack.
-- Your water/lightning/bomb words chain with "+" inside their wave. While any of
-- your debuffs is still unclassifiable (one wave unseen) the defaults are withheld
-- — we cannot know which window yours would land in, so both render inactive.
local function resolutionSlots()
  local shortParts, longParts, unresolved = {}, {}, 0
  for _, ent in pairs(personal) do
    local map = (ent.row == "ab") and AB_WORDS[ent.status] or CWFL_WORDS[ent.status]
    local w = ent.reality and map and map[ent.reality]
    if not w then unresolved = unresolved + 1 else
      local expireAt = ent.appliedAtMs + math.floor(ent.durationS * 1000 + 0.5)
      local cls = waveClass(expireAt, ent.appliedAtMs)
      if cls == "short" then shortParts[#shortParts+1] = w
      elseif cls == "long" then longParts[#longParts+1] = w
      else unresolved = unresolved + 1 end
    end
  end
  table.sort(shortParts) -- pairs() order is arbitrary; keep the line deterministic
  table.sort(longParts)

  local words = {}
  if #shortParts > 0 then words[1] = table.concat(shortParts, " + ")
  elseif unresolved == 0 then words[1] = "STACK" end
  local sm = mechs.csShort
  if sm and sm.reality then words[2] = SHRIEK_WORD[sm.reality] end
  local im = mechs.inferno
  if im and im.reality then words[3] = CHAOS_WORDS.inferno[im.reality] end
  if #longParts > 0 then words[4] = table.concat(longParts, " + ")
  elseif unresolved == 0 then words[4] = "STACK" end
  local lm = mechs.csLong
  if lm and lm.reality then words[5] = SHRIEK_WORD[lm.reality] end
  local tm = mechs.tsunami
  if tm and tm.reality then words[6] = CHAOS_WORDS.tsunami[tm.reality] end

  local out = {}
  for i = 1, 6 do
    if words[i] then out[i] = { text = i .. " - " .. words[i], active = true }
    else out[i] = { text = i .. " -", active = false } end
  end
  return out
end

local function parseCast(raw)
  local f = splitLine(raw)
  if #f < 6 or (f[1] ~= "20" and f[1] ~= "21") then return end
  -- cast layout: f[3]=caster id, f[4]=name, f[5]=action hex, f[6]=ability name.
  local spec = CASTS[(f[5] or ""):upper()]
  if not spec or (f[4] or "") ~= spec.boss then return end
  lastActivityMs = nowMs()
  casts[f[6]] = nowMs()
  for _, key in ipairs(spec.keys) do
    local r, p = tellReality(spec.boss, nowMs())
    -- Never downgrade an already-resolved round to unknown.
    if r or not mechs[key] then
      mechs[key] = { reality=r, tellParam=p, atMs=nowMs() }
    end
  end
end

onLogLine = function(raw)
  local line = raw or ""
  parsePrimaryPlayer(line)
  parseTell(line)
  parseDebuff(line)
  parseCast(line)
end

local ROWS = { "cwfl", "ab", "csShort", "csLong", "inferno", "tsunami" }
local LABELS = {
  cwfl="Compressed Water / Forked Lightning",
  ab="Acceleration Bomb",
  csShort="Cursed Shriek (Short)",
  csLong="Cursed Shriek (Long)",
  inferno="Inferno",
  tsunami="Tsunami",
}

local SIZE = 14
local TITLE_SIZE = 16
local CHAR_W = SIZE * 0.62 -- monospace advance width used by the renderer
local ROW_H = 20
local FOOTER_LINE_H = 16

-- Column offsets from the panel's left edge (name column start) and its total width,
-- so the whole block can be centered in the viewer area.
local VERDICT_OFF = 336
local YOU_OFF     = 422
local PANEL_W     = 470

local function centerText(cx, text, size)
  return cx - #text * size * 0.62 / 2
end

local function verdictText(m)
  if not m then return "-", C_LABEL end
  if m.reality == "real" then return "[REAL]", C_REAL end
  if m.reality == "fake" then return "[FAKE]", C_FAKE end
  return "[???]", C_WARN
end

onFrame = function(_dt)
  local tMs = nowMs()
  for boss, t in pairs(tells) do
    if t.atMs + FRESH_TELL_MS < tMs then tells[boss] = nil end
  end
  -- Unknown mechanics keep re-checking against fresh / pre-log tells.
  for key, m in pairs(mechs) do
    if m.reality == nil then
      local r, p = tellReality(MECH_BOSSES[key], m.atMs)
      if r then m.reality, m.tellParam = r, p end
    end
  end
  for status, ent in pairs(personal) do
    if ent.reality == nil then
      local r, p = tellReality(ent.boss, ent.appliedAtMs)
      if r then ent.reality, ent.tellParam = r, p end
    end
    -- Expired well past duration and no removal line seen.
    if ent.appliedAtMs + math.floor(ent.durationS * 1000 + 0.5) < tMs - 10000 then
      personal[status] = nil
    end
  end
  for status, d in pairs(mine) do
    if d.appliedAtMs + math.floor(d.durationS * 1000 + 0.5) < tMs - 10000 then
      mine[status] = nil -- expired well past duration and no removal line seen
    end
  end

  clearCanvas()

  -- Nothing to show until a mechanic happens; once quiet for CLEAR_MS the whole
  -- round is considered resolved and clears out.
  if lastActivityMs == nil then return end
  if tMs - lastActivityMs > CLEAR_MS then resetAll(); return end

  local w, h = canvasWidth(), canvasHeight()
  local nameX = math.floor(w / 2 - PANEL_W / 2)

  -- Center the whole block (table + resolution lines) in the viewer area, but keep
  -- it clear of the top edge: fillText treats y as the baseline.
  local title = "DMU P4 - debuff tracker (you: " .. MY_NAME .. ")"
  local topH = TITLE_SIZE + 6 + #ROWS * ROW_H + 4 + FOOTER_LINE_H * 2
  local slots = resolutionSlots()
  local lineSize, pitch, leftX = 0, 0, 0
  if #slots > 0 then
    -- Fill the width for the longest line; share the leftover height across lines.
    local longest = 0
    for _, s in ipairs(slots) do
      if #s.text > longest then longest = #s.text end
    end
    lineSize = math.floor(w * 0.94 / (longest * 0.62))
    local perLine = math.floor((h - topH - 18) / (#slots * 1.35))
    if perLine < lineSize then lineSize = perLine end
    if lineSize < 24 then lineSize = 24 end
    pitch = math.floor(lineSize * 1.35)
    -- Left-align every line on the block's left edge so the window numbers stack up.
    leftX = math.floor(w / 2 - (longest * lineSize * 0.62) / 2)
  end
  local panelH = topH + (#slots > 0 and #slots * pitch or 0)
  local y = math.max(26, math.floor((h - panelH) / 2))
  drawText(title, centerText(w / 2, title, TITLE_SIZE), y, TITLE_SIZE, C_TITLE); y = y + TITLE_SIZE + 6

  for _, key in ipairs(ROWS) do
    if key == "cwfl" then
      -- Highlight whichever of the two statuses is on you.
      local a, b = "Compressed Water", "/ Forked Lightning"
      local mineA, mineB = mine["15A9"] ~= nil, mine["15A8"] ~= nil
      drawText(a, nameX, y, SIZE, mineA and C_WARN or (mineB and C_DIMMED or C_NAME))
      drawText(b, nameX + #a * CHAR_W, y, SIZE, mineB and C_WARN or (mineA and C_DIMMED or C_NAME))
    else
      drawText(LABELS[key], nameX, y, SIZE, C_NAME)
    end
    -- cwfl/ab rows show the reality pinned to YOUR debuff; global rows show
    -- the latest round.
    local m = (key == "cwfl" or key == "ab") and personalEntry(key) or mechs[key]
    local v, vc = verdictText(m)
    drawText(v, nameX + VERDICT_OFF, y, SIZE, vc)

    -- "you" indicator: which shriek class is on you + Chaos debuffs.
    local you = false
    if key == "csShort" then you = mine["15A7"] ~= nil and (mine["15A7"].durationS or 0) < 65 end
    if key == "csLong"  then you = mine["15A7"] ~= nil and (mine["15A7"].durationS or 0) >= 65 end
    if key == "inferno" then you = mine["15AB"] ~= nil end
    if key == "tsunami" then you = mine["15AC"] ~= nil end
    if you then drawText("you", nameX + YOU_OFF, y, SIZE, C_WARN) end

    y = y + ROW_H
  end
  y = y + 4

  local castList = {}
  for name in pairs(casts) do castList[#castList+1] = name end
  table.sort(castList)
  drawText("last casts: " .. (next(castList) and table.concat(castList, ", ") or "-"), nameX, y, 13, C_INFO)
  y = y + FOOTER_LINE_H

  local tellParts = {}
  for boss, t in pairs(tells) do
    tellParts[#tellParts+1] = boss .. " " .. tostring(realityOfParam(t.param)) .. " p=" .. t.param
  end
  table.sort(tellParts)
  drawText("boss tells: " .. (next(tellParts) and table.concat(tellParts, ", ") or "-"), nameX, y, 13, C_INFO)

  -- One huge line per resolution window — hard to miss at a glance. All lines
  -- share the same left edge; windows with nothing to resolve stay dimmed.
  for i, s in ipairs(slots) do
    drawText(s.text, leftX, y + 16 + (i - 1) * pitch + math.floor(lineSize * 0.9), lineSize,
      s.active and C_ACCENT or C_DIMMED)
  end
end
