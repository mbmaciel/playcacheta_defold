local Validator = require "modules.cacheta.hand_validator"
local CachetaState = require "modules.cacheta.game_state"

local M = {}

-- Simulate adding a card and return how many unmatched remain
local function score_with_card(hand, new_card, wild_value, wild_color)
    local test = {}
    for _, c in ipairs(hand) do table.insert(test, c) end
    table.insert(test, new_card)
    -- Must discard 1 to evaluate as 9-card hand — find best discard too
    local best = math.huge
    for i = 1, #test do
        local h2 = {}
        for j, c in ipairs(test) do
            if j ~= i then table.insert(h2, c) end
        end
        local u = Validator.count_unmatched(h2, wild_value, wild_color)
        if u < best then best = u end
    end
    return best
end

-- Decide draw source: "deck" or "discard"
-- Takes the discard if it improves the hand (fewer unmatched after optimal discard)
function M.choose_draw_source(hand, discard_top, wild_value, wild_color)
    if not discard_top then return "deck" end
    local current = Validator.count_unmatched(hand, wild_value, wild_color)
    local with_discard = score_with_card(hand, discard_top, wild_value, wild_color)
    return (with_discard < current) and "discard" or "deck"
end

-- Choose which card to discard from a 10-card hand
-- Returns the index of the worst card (most unmatched after removing it)
function M.choose_discard(hand, wild_value, wild_color)
    if #hand == 0 then return 1 end
    local best_idx   = 1
    local best_score = math.huge

    for i = 1, #hand do
        -- Don't discard wilds unless forced
        if CachetaState.is_wild(hand[i], wild_value, wild_color) then
            -- Try discarding wild only as last resort
        else
            local test = {}
            for j, c in ipairs(hand) do
                if j ~= i then table.insert(test, c) end
            end
            local u = Validator.count_unmatched(test, wild_value, wild_color)
            if u < best_score then
                best_score = u
                best_idx   = i
            end
        end
    end

    -- If all non-wilds produce the same score, pick the card with lowest group potential
    if best_score == math.huge then
        -- Fall back: discard first non-wild
        for i = 1, #hand do
            if not CachetaState.is_wild(hand[i], wild_value, wild_color) then
                return i
            end
        end
        return 1
    end

    return best_idx
end

-- Decide whether CPU (in na_boa state) should take the player's discard
-- Returns true if the discard card would complete the hand
function M.should_take_discard_na_boa(hand, discard_card, wild_value, wild_color)
    if not discard_card then return false end
    local test = {}
    for _, c in ipairs(hand) do table.insert(test, c) end
    table.insert(test, discard_card)
    -- Remove worst card and check if remaining 9 are complete
    local idx = M.choose_discard(test, wild_value, wild_color)
    local h9 = {}
    for i, c in ipairs(test) do
        if i ~= idx then table.insert(h9, c) end
    end
    return Validator.is_hand_complete(h9, wild_value, wild_color)
end

return M
