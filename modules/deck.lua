local M = {}

M.SUITS  = {"ouros", "espadas", "copas", "paus"}
M.VALUES = {"4","5","6","7","Q","J","K","A","2","3"}

function M.create()
    local deck = {}
    for _, suit in ipairs(M.SUITS) do
        for _, value in ipairs(M.VALUES) do
            deck[#deck+1] = {id = value.."_"..suit, value = value, suit = suit}
        end
    end
    return deck
end

function M.shuffle(deck)
    for i = #deck, 2, -1 do
        local j = math.random(i)
        deck[i], deck[j] = deck[j], deck[i]
    end
end

function M.draw(deck)
    return table.remove(deck)
end

function M.get_value_index(value)
    for i, v in ipairs(M.VALUES) do
        if v == value then return i - 1 end
    end
    return 0
end

function M.next_value(value)
    for i, v in ipairs(M.VALUES) do
        if v == value then
            local next_i = i + 1
            if next_i > #M.VALUES then next_i = 1 end
            return M.VALUES[next_i]
        end
    end
    return M.VALUES[1]
end

return M
