
function stickToIndex(x, y)
    if x > .5 and y > .5 then
        return 4
    elseif x > .5 and y < -.5 then
        return 2
    elseif x < -.5 and y > .5 then
        return 6
    elseif x < -.5 and y < -.5 then
        return 8
    elseif x > .8 then
        return 3
    elseif x < -.8 then
        return 7
    elseif y > .8 then
        return 5
    elseif y < -.8 then
        return 1
    end

end

function onFrame()
    local x, y = getStickInput(1)
    setLine(1, stickToIndex(x, y))
end
