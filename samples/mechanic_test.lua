local last = -1
function onFrame(t, input)
    if t >= last + 1 then setLine(6, string.format("t=%.1f", t)); last = t end
    if input then setLine(1, "MECHANIC NOW") else setLine(1, "") end
end
