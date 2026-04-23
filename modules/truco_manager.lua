local M = {}

local LEVELS = {
    {name="Truco",     points=3},
    {name="Retruco",   points=6},
    {name="Vale Nove", points=9},
    {name="Vale Doze", points=12},
}

function M.init()
    return {
        level = 0,
        pending = false,
        called_by = nil,
        hand_points = 1,
        original_turn = nil,
    }
end

function M.can_call(truco, by, player_turn, hand_over)
    if hand_over then return false end
    if truco.pending then return false end
    if truco.level >= 4 then return false end
    if truco.level > 0 then return false end  -- after acceptance, no more escalation
    if truco.called_by == by then return false end
    if by == "player" and not player_turn then return false end
    return true
end

-- Returns level_name, pending_points
function M.call(truco, by)
    if truco.level == 0 then truco.original_turn = by end
    if truco.level > 0 then truco.hand_points = LEVELS[truco.level].points end
    truco.level = truco.level + 1
    truco.pending = true
    truco.called_by = by
    return LEVELS[truco.level].name, LEVELS[truco.level].points
end

function M.accept(truco)
    truco.hand_points = LEVELS[truco.level].points
    truco.pending = false
    return truco.hand_points
end

-- Returns winner_is_cpu (bool), points awarded
function M.run(truco, who_ran)
    truco.pending = false
    local winner_is_cpu = (who_ran == "player")
    return winner_is_cpu, truco.hand_points
end

function M.level_name(level)
    if level == 0 then return "1 pt" end
    return LEVELS[level].name .. " (" .. LEVELS[level].points .. " pts)"
end

function M.pending_points(truco)
    return LEVELS[truco.level] and LEVELS[truco.level].points or 1
end

return M
