local M = {}

local VALUE_ORDER = {"4","5","6","7","Q","J","K","A","2","3"}

local SUIT_STRENGTH = {paus=4, copas=3, espadas=2, ouros=1}

function M.get_value_index(value)
    for i, v in ipairs(VALUE_ORDER) do
        if v == value then return i - 1 end
    end
    return 0
end

function M.get_manilha_value(vira_value)
    for i, v in ipairs(VALUE_ORDER) do
        if v == vira_value then
            local next_i = i + 1
            if next_i > #VALUE_ORDER then next_i = 1 end
            return VALUE_ORDER[next_i]
        end
    end
    return VALUE_ORDER[1]
end

function M.get_strength(card, manilha_value)
    if card.value == manilha_value then
        return 100 + (SUIT_STRENGTH[card.suit] or 0)
    end
    return M.get_value_index(card.value)
end

function M.compare(card1, card2, manilha_value)
    local s1 = M.get_strength(card1, manilha_value)
    local s2 = M.get_strength(card2, manilha_value)
    if s1 > s2 then return 1
    elseif s2 > s1 then return 2
    else return 0
    end
end

return M
