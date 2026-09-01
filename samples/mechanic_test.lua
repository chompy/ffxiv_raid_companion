local last = -1
function onFrame()
    local t = getTime()
    if t >= last + 1 then setLine(6, string.format("t=%.1f", t)); last = t end
    if hasControlInput() then setLine(1, "MECHANIC NOW") else setLine(1, "") end
end
