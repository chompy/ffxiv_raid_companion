-- Trigger flash: every Guide press lights up a big "MECHANIC" line for 3
-- seconds and counts presses since the last timer reset.
local presses = 0
local flashUntil = -1
local lastT = -1

function onFrame(t, input)
    if t < lastT then            -- time went backwards -> the timer was reset: fresh start
        presses = 0
        flashUntil = -1
    end
    lastT = t

    if input then                -- Guide button was pressed since the last call
        presses = presses + 1
        flashUntil = t + 3
        setLine(2, "trigger #" .. presses)
    end

    if t < flashUntil then
        setLine(1, ">>> MECHANIC <<<")
    else
        setLine(1, "")           -- auto-clear once the flash has expired
    end
end
