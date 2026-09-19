-- Draws the current fight timer at the top-center of the canvas.
local running = false
local startAt = 0
local finalElapsed = nil
local resultLabel = ''
local resultColor = '#8a93b2'

function onCombatStart()
    running = true
    startAt = now()
end

function onCombatEnd(result, elapsedMs)
    running = false
    finalElapsed = elapsedMs / 1000
    if result == 'defeat' then
        resultLabel = 'WIPE'
        resultColor = '#ff5c5c'
    else
        resultLabel = 'KILL'
        resultColor = '#ffd24c'
    end
end

local function fmt(sec)
    sec = math.max(0, sec or 0)
    local m = math.floor(sec / 60)
    local s = sec - m * 60
    return string.format('%d:%04.1f', m, s)
end

function onFrame(dt)
    clearCanvas()
    local w = canvasWidth()

    local text
    local color
    if running then
        text = fmt(now() - startAt)
        color = '#4cd07d'
    elseif finalElapsed ~= nil then
        text = resultLabel .. '  ' .. fmt(finalElapsed)
        color = resultColor
    else
        text = 'idle'
        color = '#8a93b2'
    end

    local size = 28
    local boxW = math.max(160, #text * size * 0.62 + 40)
    drawRectangle((w - boxW) / 2, 16, boxW, 52, 'rgba(16, 20, 32, 0.78)')
    drawText(text, (w - #text * size * 0.62) / 2, 16 + 36, size, color)
end
