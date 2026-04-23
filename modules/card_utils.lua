local M = {}

local VALUE_ORDER = {
    A = 1,
    ["2"] = 2,
    ["3"] = 3,
    ["4"] = 4,
    ["5"] = 5,
    ["6"] = 6,
    ["7"] = 7,
    J = 11,
    Q = 12,
    K = 13
}

function M.get_rank(card)
    return VALUE_ORDER[card.value]
end

function M.same_suit(a, b)
    return a.suit == b.suit
end

function M.same_value(a, b)
    return a.value == b.value
end

function M.card_equals(a, b)
    return a.value == b.value and a.suit == b.suit
end

function M.clone_cards(cards)
    local out = {}
    for i, c in ipairs(cards) do
        out[i] = { id = c.id, value = c.value, suit = c.suit }
    end
    return out
end

function M.sort_by_rank(cards)
    table.sort(cards, function(a, b)
        local ra = M.get_rank(a)
        local rb = M.get_rank(b)
        if ra == rb then return a.suit < b.suit end
        return ra < rb
    end)
end

function M.group_by_value(cards)
    local groups = {}
    for _, card in ipairs(cards) do
        groups[card.value] = groups[card.value] or {}
        table.insert(groups[card.value], card)
    end
    return groups
end

function M.group_by_suit(cards)
    local groups = {}
    for _, card in ipairs(cards) do
        groups[card.suit] = groups[card.suit] or {}
        table.insert(groups[card.suit], card)
    end
    return groups
end

return M
