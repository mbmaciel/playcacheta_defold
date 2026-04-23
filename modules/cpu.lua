local CardStrength = require "modules.card_strength"

local M = {}

local function assess_hand(hand, manilha_value)
    if #hand == 0 then return 0, 0 end
    local total, max_str = 0, 0
    for _, card in ipairs(hand) do
        local s = CardStrength.get_strength(card, manilha_value)
        total = total + s
        if s > max_str then max_str = s end
    end
    return total / #hand, max_str
end

function M.choose_card(hand, state)
    if #hand == 0 then return nil end
    local mv = state.manilha_value
    local strengths = {}
    for i, card in ipairs(hand) do
        table.insert(strengths, {index=i, strength=CardStrength.get_strength(card, mv)})
    end
    table.sort(strengths, function(a, b) return a.strength < b.strength end)

    local cpu_wins   = state.players[2].tricks_won
    local p_wins     = state.players[1].tricks_won
    local p_card     = state.current_trick.player_card

    if cpu_wins > p_wins then
        return strengths[1].index
    elseif p_wins > cpu_wins then
        return strengths[#strengths].index
    else
        if p_card then
            local p_str = CardStrength.get_strength(p_card, mv)
            for _, s in ipairs(strengths) do
                if s.strength > p_str then return s.index end
            end
            return strengths[1].index
        else
            local mid = math.ceil(#strengths / 2)
            return strengths[mid].index
        end
    end
end

-- Returns "call", "accept", "raise", "run", or nil
function M.decide_truco(hand, state)
    if #hand == 0 then return nil end
    local avg, max_str = assess_hand(hand, state.manilha_value)
    local truco = state.truco

    if truco.pending and truco.called_by == "player" then
        if max_str >= 104 then
            return (truco.level < 4) and "raise" or "accept"
        elseif avg >= 7 or max_str >= 102 then
            return "accept"
        else
            return "run"
        end
    elseif not truco.pending and truco.level < 4 then
        -- Keep the same call behavior used in the original flow: truco/retruco
        -- can happen again after acceptance while value is below 12.
        if avg >= 8 or max_str >= 103 then
            return "call"
        end
    end
    return nil
end

return M
