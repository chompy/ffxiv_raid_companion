-- Fades a zone-name banner at the bottom of the canvas on each zone change.
local text = nil
local alpha = 0

function onChangeZone(zoneName)
    text = zoneName
    alpha = 1
end

function onFrame(dt)
    if not text or alpha <= 0 then
        return
    end
    clearCanvas()
    local w, h = canvasWidth(), canvasHeight()
    local size = 34
    drawText(text, (w - #text * size * 0.62) / 2, h - 48, size,
        string.format('rgba(176, 196, 255, %.3f)', alpha))
    alpha = math.max(0, alpha - dt / 4)
end
