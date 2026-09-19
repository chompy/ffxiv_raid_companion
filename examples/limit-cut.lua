-- Kefka P3 limit cut tracker, ported from DMUP4DebuffHelper/P3LimitCutTracker.cs.
--
-- The Kefka clones cast "Ultima Blaster" (action BAE3 = 47843 in current logs; older
-- sessions used BAE4), one per consecutive octagon spot, counter-clockwise. Mirroring
-- the first clone across the arena center gives the new north; the second distinct
-- positioned clone fixes the direction players rotate (opposite to the clones). The
-- full stand table is shown as soon as both are known — after two usable casts, not eight.
--
-- C# reads caster positions from the live object table; in a log replay the movement
-- events (271 fixed layout / 261 key=value) ARE that object-table history and are exact.
-- The pair embedded in the ability line at NF-14/NF-13 is also the caster's position but
-- can be a center placeholder for some casts, so it only serves as fallback. NF-24/NF-23
-- is the TARGET player's position — never usable here (it once produced a wrong north
-- from where two players happened to stand). If the log starts mid-sequence, each
-- unpositioned cast before the first positioned one shifts the inferred start spot 45°
-- further along the firing order.
local PREVIEW_ACTIONS = { BAE3 = true, BAE4 = true } -- "Ultima Blaster" hex ids across patches
local PREVIEW_NAME = 'Ultima Blaster'                -- fallback if the id shifts in a patch
local CENTER_X, CENTER_Z = 100.0, 100.0
-- The positions embedded in these lines are not on a fixed ring, so the sanity
-- bounds stay loose: rejecting early lines starves resolution (the table only
-- appears once two usable lines have arrived).
local MIN_POS_DIST = 3.0    -- closer to center than this and the angle is mostly noise
local MAX_POS_DIST = 60.0   -- outside the arena entirely; treat as garbage
local MIN_WAYMARK_DIST = 8.0
local MAX_MARKER_ANGLE_DEG = 30.0
-- Seconds the display stays up after the last cast (matches the P4 tracker's idle clear).
local DISPLAY_FRESHNESS = 120.0
local STALE_SEQUENCE_AGE = 60.0  -- a cast this long after the previous starts a new sequence

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

-- DMU waymark preset, same as the C# original.
local WAYMARKS = {
    { label = 'A', x = 100, z = 88 },
    { label = 'B', x = 112, z = 100 },
    { label = 'C', x = 100, z = 112 },
    { label = 'D', x = 88, z = 100 },
    { label = '1', x = 94, z = 94 },
    { label = '2', x = 106, z = 94 },
    { label = '3', x = 106, z = 106 },
    { label = '4', x = 94, z = 106 },
}

local DIRS = { 'N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW' }

-- Waymark standing spots in the same clockwise-from-north order as DIRS:
-- A=N, 2=NE, B=E, 3=SE, C=S, 4=SW, D=W, 1=NW.
local SPOTS_BY_DIR = { 'A', '2', 'B', '3', 'C', '4', 'D', '1' }

-- --- state -----------------------------------------------------------------
local firstX, firstZ -- first positioned clone (nil until seen)
local secondSeen     -- rotation resolved once the second distinct clone casts
local lastSeen       -- now() of the last accepted cast
local newNorthLabel = ''
local markerLabel = ''
local rotation = nil -- 'CW' | 'CCW'
local anchorIdx = 0  -- 1-based index into DIRS/SPOTS_BY_DIR of the new-north spot
local cloneCount = 0
local seenKeys = {}
local posOf = {}            -- entity id -> {x, z} from movement events (the object table)
local missingBeforeFirst = 0 -- unpositioned casts before the first positioned one

-- --- math (ports of the C# statics) ----------------------------------------
local function distFromCenter(x, z)
    local dx, dz = x - CENTER_X, z - CENTER_Z
    return math.sqrt(dx * dx + dz * dz)
end

local function distXZ(ax, az, bx, bz)
    local dx, dz = ax - bx, az - bz
    return math.sqrt(dx * dx + dz * dz)
end

-- Degrees clockwise from north (north = -Z). Lua 5.3 has no math.atan2; use atan(y, x).
local function angleFromNorth(x, z)
    local deg = math.atan(x - CENTER_X, -(z - CENTER_Z)) * 180 / math.pi
    if deg < 0 then deg = deg + 360 end
    return deg
end

-- Wrap to (-180, 180].
local function normDeg(d)
    return d - 360 * math.floor((d + 180) / 360)
end

local function dirIndex(angle)
    return (math.floor((angle + 22.5) / 45) % 8) + 1 -- 1-based into DIRS
end

local function markerForAngle(northAngle)
    local bestDiff = math.huge
    local bestLabel = nil
    for _, m in ipairs(WAYMARKS) do
        if distFromCenter(m.x, m.z) >= MIN_WAYMARK_DIST then
            local diff = math.abs(normDeg(angleFromNorth(m.x, m.z) - northAngle))
            if diff < bestDiff then
                bestDiff = diff
                bestLabel = m.label
            end
        end
    end
    if not bestLabel or bestDiff > MAX_MARKER_ANGLE_DEG then return nil end
    return bestLabel
end

local function reset()
    firstX, firstZ = nil, nil
    secondSeen = false
    lastSeen = nil
    newNorthLabel = ''
    markerLabel = ''
    rotation = nil
    anchorIdx = 0
    cloneCount = 0
    seenKeys = {}
    posOf = {}
    missingBeforeFirst = 0
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

-- Movement events rebuild the object table C# reads. 271 has a fixed layout (id at F3,
-- X/Z at F7/F8); 261 is key=value pairs after "Change|<id>".
local function rememberPosition(raw)
    local f = split(raw)
    if #f < 9 then return end
    if f[1] == '271' then
        local x, z = tonumber(f[7]), tonumber(f[8])
        if f[3] and x and z and (math.abs(x) > 0.001 or math.abs(z) > 0.001) then
            posOf[f[3]] = { x, z }
        end
    elseif f[1] == '261' and f[3] == 'Change' and f[4] then
        local x, z
        for i = 1, #f - 1 do
            if f[i] == 'PosX' then
                x = tonumber(f[i + 1])
            elseif f[i] == 'PosY' then
                z = tonumber(f[i + 1])
            end
        end
        if x and z and (math.abs(x) > 0.001 or math.abs(z) > 0.001) then
            posOf[f[4]] = { x, z }
        end
    end
end

function onLogLine(raw)
    local pipePos = raw:find('|', 1, true)
    if not pipePos then return end
    local code = raw:sub(1, pipePos - 1)
    if code == '261' or code == '271' then
        rememberPosition(raw)
        return
    end

    -- Ability lines only (21 single-target, 22 AoE share the same layout).
    if code ~= '21' and code ~= '22' then return end

    local f = split(raw)
    local nf = #f
    if nf < 30 then return end
    if not (PREVIEW_ACTIONS[f[5]] or f[6] == PREVIEW_NAME) then return end

    local t = now()
    if lastSeen and (t - lastSeen) > STALE_SEQUENCE_AGE then reset() end

    -- Dedupe by caster + global sequence: an entity may legitimately cast several
    -- times (teleporting between spots), but a redelivered line repeats both.
    local key = f[3] .. ':' .. f[nf - 10]
    if seenKeys[key] then return end
    seenKeys[key] = true

    -- Caster position: movement events first (exact ring points), else the pair embedded
    -- in the line at NF-14/NF-13, which can be a center placeholder for some casts.
    local mv = posOf[f[3]]
    local x, z
    if mv then
        x, z = mv[1], mv[2]
    else
        x, z = tonumber(f[nf - 14]), tonumber(f[nf - 13])
    end

    local positioned = false
    if x and z then
        local d = distFromCenter(x, z)
        positioned = d >= MIN_POS_DIST and d <= MAX_POS_DIST
    end
    if not positioned then
        -- No usable position. Before the first positioned cast this means the sequence
        -- started earlier than we can see (log began mid-pull); each such cast shifts
        -- the inferred start spot one octagon slot further along the firing order.
        if firstX == nil then missingBeforeFirst = missingBeforeFirst + 1 end
        return
    end

    lastSeen = t
    cloneCount = cloneCount + 1

    if firstX == nil then
        firstX, firstZ = x, z
        -- Mirror across the center is a 180° turn; each unseen earlier cast adds 45°.
        local northAngle = (angleFromNorth(x, z) + 45 * missingBeforeFirst + 180) % 360
        anchorIdx = dirIndex(northAngle)
        newNorthLabel = DIRS[anchorIdx]
        markerLabel = markerForAngle(northAngle) or ''
        return
    end

    if secondSeen then return end
    -- A different data point is enough to fix the rotation; players can stand close
    -- together, so keep this bar low. Only latch once the angle delta clears the
    -- 1° noise guard — a near-aligned pair must not poison the sequence (it used to
    -- wedge the display on "waiting for second clone" forever).
    if distXZ(x, z, firstX, firstZ) < 1.0 then return end
    local delta = normDeg(angleFromNorth(x, z) - angleFromNorth(firstX, firstZ))
    if math.abs(delta) >= 1.0 then
        secondSeen = true
        -- Players rotate opposite the clone sequence after facing new north.
        rotation = delta > 0 and 'CCW' or 'CW'
    end
end

function onChangeZone()
    reset()
end

-- --- display -------------------------------------------------------------------
local function centerText(cx, text, size)
    return cx - #text * size * 0.62 / 2
end

-- Player n (1..8) stands in a GAP between two adjacent waymarks. Walk around the ring
-- starting at the new-north marker IN THE ROTATION DIRECTION; player 1 takes the first
-- gap crossed, player 2 the next, ... The new-north marker always sits between players 8 and 1.
local function gapForPlayer(n)
    local step = (rotation == 'CW') and 1 or -1
    local m = anchorIdx - 1 -- 0-based new-north spot index
    local firstGap = (step > 0) and m or (m - 1)
    local k = (firstGap + (n - 1) * step) % 8
    return SPOTS_BY_DIR[k + 1] .. SPOTS_BY_DIR[(k + 1) % 8 + 1]
end

function onFrame(dt)
    clearCanvas()
    local t = now()
    if not lastSeen or (t - lastSeen) > DISPLAY_FRESHNESS then return end

    local w, h = canvasWidth(), canvasHeight()

    -- Shared header style with the P4 tracker: centered title at the top.
    local header = 'DMU P3 - limit cut tracker'
    drawText(header, centerText(w / 2, header, 16), 26, 16, C_TITLE)

    -- Compass rose: waymark with compass direction in parentheses around the ring,
    -- new north highlighted.
    local ccx = math.min(w * 0.30, 420)
    local ccy = h / 2
    local r = math.max(70, math.min(150, h * 0.30))

    drawRectangle(ccx - 4, ccy - 4, 8, 8, C_NAME)
    for i = 1, 8 do
        local a = (i - 1) * 45
        local px = ccx + r * math.sin(math.rad(a))
        local py = ccy - r * math.cos(math.rad(a))
        local label = SPOTS_BY_DIR[i] .. ' (' .. DIRS[i] .. ')'
        if DIRS[i] == newNorthLabel then
            drawText(label, centerText(px, label, 40), py + 14, 40, C_ACCENT)
        else
            drawText(label, centerText(px, label, 22), py + 8, 22, C_LABEL)
        end
    end

    -- Readout panel (left-aligned).
    local x0 = math.max(ccx + r + 48, w * 0.52)
    local y0 = ccy - r
    drawText('NEW NORTH', x0, y0 + 30, 22, C_LABEL)
    -- Waymark first (what the raid calls out), compass direction in parentheses.
    local northText = newNorthLabel
    if markerLabel ~= '' then
        northText = markerLabel .. ' (' .. newNorthLabel .. ')'
    end
    drawText(northText, x0, y0 + 100, 64, C_ACCENT)

    local rotY = y0 + 158
    if rotation == nil then
        drawText('waiting for second clone...', x0, rotY, 24, C_LABEL)
    else
        drawText(rotation == 'CCW' and 'Rotate CCW' or 'Rotate CW', x0, rotY, 28, C_BRIGHT)

        -- Stand list: player N stands in the gap between two waymarks ("N -> XY"),
        -- matching the raid macros. Two columns of four to stay compact.
        local listY = y0 + 200
        drawText('stand between', x0, listY, 16, C_LABEL)
        for i = 1, 8 do
            local col = (i <= 4) and x0 or (x0 + 104)
            local row = ((i - 1) % 4)
            drawText(i .. ' -> ' .. gapForPlayer(i), col, listY + 26 + row * 25, 18, C_BRIGHT)
        end
    end

    -- Footer in the same style as the P4 tracker's info lines.
    drawText('clones seen: ' .. cloneCount, x0, y0 + (rotation and 330 or 196), 13, C_INFO)
end
