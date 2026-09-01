local isReset = false

function onReset()
    isReset = true
end

function onFrame()
    setLine(1, "WAS RESET: " .. tostring(isReset))
end
