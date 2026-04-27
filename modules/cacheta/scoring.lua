local M = {}

M.STARTING_SCORE = 10

-- winner_id wins with `cards_used` cards (9 or 10)
-- Opponents each lose points:  9 cards → -1,  10 cards → -2
function M.apply_win(state, winner_id, cards_used)
    local penalty = (cards_used == 10) and 2 or 1
    for _, p in ipairs(state.players) do
        if p.id ~= winner_id then
            p.score = p.score - penalty
        end
    end
end

-- Returns id of the match winner (last player with score > 0), or nil
function M.check_match_winner(state)
    local alive = {}
    for _, p in ipairs(state.players) do
        if p.score > 0 then table.insert(alive, p) end
    end
    if #alive == 1 then return alive[1].id end
    -- Edge case: everyone at 0 or below (shouldn't happen in 2p, but handle)
    if #alive == 0 then return 1 end
    return nil
end

return M
