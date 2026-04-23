local CardStrength = require "modules.card_strength"

local M = {}

-- Returns winner player_id (1 or 2) or nil for tie
function M.get_trick_winner(card1, player1_id, card2, player2_id, manilha_value)
    local result = CardStrength.compare(card1, card2, manilha_value)
    if result == 1 then return player1_id
    elseif result == 2 then return player2_id
    else return nil
    end
end

-- tricks = [{winner=id|nil, ...}]
-- Returns winner player_id or nil (tie = no points)
function M.get_hand_winner(tricks)
    local wins = {[1]=0, [2]=0}
    local first_winner = nil
    for _, trick in ipairs(tricks) do
        if trick.winner then
            wins[trick.winner] = wins[trick.winner] + 1
            if not first_winner then first_winner = trick.winner end
            if wins[trick.winner] >= 2 then return trick.winner end
        end
    end
    if wins[1] > wins[2] then return 1
    elseif wins[2] > wins[1] then return 2
    elseif wins[1] == 0 and wins[2] == 0 then return nil
    else return first_winner
    end
end

function M.is_hand_over(tricks, p1_tricks, p2_tricks)
    if p1_tricks >= 2 or p2_tricks >= 2 then return true end
    if #tricks >= 3 then return true end
    return false
end

return M
