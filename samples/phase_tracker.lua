-- Phase tracker: shows the current phase and counts down to the next one.
-- Edit the table below with your own pull's timestamps (seconds, or use
-- string.format-friendly numbers like 150 for "2:30").
local phases = {
    {   0, "Opening / first mechanic" },
    {  90, "Phase 1 mechanics" },
    { 240, "Mid-pull breather" },
    { 300, "Phase 2 - enrage race" },
}

function onFrame()
    local t = getTime()
    local cur = phases[1]
    for i = 2, #phases do
        if phases[i][1] <= t then cur = phases[i] end
    end
    setLine(3, "PHASE: " .. cur[2])

    local nextPhase
    for i = 1, #phases do
        if phases[i][1] > t then nextPhase = phases[i]; break end
    end
    if nextPhase then
        setLine(4, string.format("next in %d s -> %s", math.ceil(nextPhase[1] - t), nextPhase[2]))
    else
        setLine(4, "final phase")
    end
end
