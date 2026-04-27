local CachetaState = require "modules.cacheta.game_state"

local M = {}

-- Returns numeric index for sorting (wilds get 0)
local function card_index(card, wild_value, wild_color)
    if CachetaState.is_wild(card, wild_value, wild_color) then return 0 end
    return CachetaState.get_value_index(card.value)
end

-- Check if two values are consecutive in cacheta order
local function are_consecutive(v1, v2)
    local i1 = CachetaState.get_value_index(v1)
    local i2 = CachetaState.get_value_index(v2)
    if i1 == 0 or i2 == 0 then return false end
    local diff = math.abs(i1 - i2)
    -- K(10) and A(1) are consecutive (wraparound)
    return diff == 1 or diff == (#CachetaState.VALUE_ORDER - 1)
end

-- Try to form a trinca (3+ same value) from a subset of cards
-- Returns list of valid trinca groups found, plus remaining cards
-- Uses greedy approach: find all groups, return remaining unmatched cards
local function find_trincas(cards, wild_value, wild_color)
    -- Group by value (non-wilds)
    local by_value = {}
    local wilds    = {}
    for _, c in ipairs(cards) do
        if CachetaState.is_wild(c, wild_value, wild_color) then
            table.insert(wilds, c)
        else
            by_value[c.value] = by_value[c.value] or {}
            table.insert(by_value[c.value], c)
        end
    end

    local groups    = {}
    local used_cards = {}

    for value, group in pairs(by_value) do
        if #group >= 3 then
            -- Can form a trinca without wild
            local grp = {}
            for i = 1, math.min(4, #group) do
                table.insert(grp, group[i])
                used_cards[group[i]] = true
            end
            table.insert(groups, {type="trinca", cards=grp})
        elseif #group == 2 and #wilds > 0 then
            -- Need one wild to complete
            local grp = {group[1], group[2], wilds[#wilds]}
            used_cards[group[1]] = true
            used_cards[group[2]] = true
            used_cards[wilds[#wilds]] = true
            table.remove(wilds)
            table.insert(groups, {type="trinca", cards=grp})
        end
    end

    local remaining = {}
    for _, c in ipairs(cards) do
        if not used_cards[c] then table.insert(remaining, c) end
    end
    -- Add unused wilds back to remaining
    for _, w in ipairs(wilds) do
        if not used_cards[w] then table.insert(remaining, w) end
    end

    return groups, remaining
end

-- Try to form sequences (3+ consecutive same suit) from cards
local function find_sequences(cards, wild_value, wild_color)
    -- Group non-wilds by suit, sort by value index
    local by_suit = {}
    local wilds   = {}
    for _, c in ipairs(cards) do
        if CachetaState.is_wild(c, wild_value, wild_color) then
            table.insert(wilds, c)
        else
            by_suit[c.suit] = by_suit[c.suit] or {}
            table.insert(by_suit[c.suit], c)
        end
    end

    -- Sort each suit group by value index
    for suit, grp in pairs(by_suit) do
        table.sort(grp, function(a, b)
            return CachetaState.get_value_index(a.value) < CachetaState.get_value_index(b.value)
        end)
    end

    local groups     = {}
    local used_cards = {}

    for suit, grp in pairs(by_suit) do
        -- Try to form sequences by extending chains
        local i = 1
        while i <= #grp do
            local chain = {grp[i]}
            local j = i + 1
            while j <= #grp do
                local last = chain[#chain]
                if are_consecutive(last.value, grp[j].value) then
                    table.insert(chain, grp[j])
                    j = j + 1
                else
                    break
                end
            end
            -- Try to extend chain with one wild at the end
            if #chain >= 2 and #wilds > 0 then
                local last = chain[#chain]
                local last_idx = CachetaState.get_value_index(last.value)
                local next_idx = (last_idx % #CachetaState.VALUE_ORDER) + 1
                local next_val = CachetaState.VALUE_ORDER[next_idx]
                -- Check next card is not already in chain
                local already_in = false
                for _, ch in ipairs(chain) do
                    if ch.value == next_val then already_in = true; break end
                end
                if not already_in then
                    table.insert(chain, wilds[#wilds])
                    table.remove(wilds)
                end
            end
            -- Try to extend with wild at the beginning
            if #chain >= 2 and #wilds > 0 then
                local first = chain[1]
                local first_idx = CachetaState.get_value_index(first.value)
                local prev_idx = first_idx - 1
                if prev_idx < 1 then prev_idx = #CachetaState.VALUE_ORDER end
                table.insert(chain, 1, wilds[#wilds])
                table.remove(wilds)
            end

            if #chain >= 3 then
                for _, c in ipairs(chain) do used_cards[c] = true end
                table.insert(groups, {type="sequence", cards=chain, suit=suit})
                i = j
            else
                i = i + 1
            end
        end
    end

    local remaining = {}
    for _, c in ipairs(cards) do
        if not used_cards[c] then table.insert(remaining, c) end
    end
    for _, w in ipairs(wilds) do
        if not used_cards[w] then table.insert(remaining, w) end
    end

    return groups, remaining
end

-- Find all groups in a hand. Returns {groups, unmatched_count}
function M.find_groups(hand, wild_value, wild_color)
    -- Try trincas first, then sequences on remaining, and vice versa
    -- Use the combination with fewer unmatched cards

    -- Pass 1: trincas first
    local t_groups, after_t = find_trincas(hand, wild_value, wild_color)
    local s_groups1, remain1 = find_sequences(after_t, wild_value, wild_color)
    local all1 = {}
    for _, g in ipairs(t_groups)  do table.insert(all1, g) end
    for _, g in ipairs(s_groups1) do table.insert(all1, g) end

    -- Pass 2: sequences first
    local s_groups2, after_s = find_sequences(hand, wild_value, wild_color)
    local t_groups2, remain2 = find_trincas(after_s, wild_value, wild_color)
    local all2 = {}
    for _, g in ipairs(s_groups2) do table.insert(all2, g) end
    for _, g in ipairs(t_groups2) do table.insert(all2, g) end

    if #remain1 <= #remain2 then
        return all1, #remain1
    else
        return all2, #remain2
    end
end

-- True if all 9 cards in hand form valid groups
function M.is_hand_complete(hand, wild_value, wild_color)
    if #hand ~= 9 then return false end
    local _, unmatched = M.find_groups(hand, wild_value, wild_color)
    return unmatched == 0
end

-- True if all 10 cards (before discarding) form valid groups
function M.can_baixar_with_ten(hand, wild_value, wild_color)
    if #hand ~= 10 then return false end
    local _, unmatched = M.find_groups(hand, wild_value, wild_color)
    return unmatched == 0
end

-- Count unmatched cards (lower = better hand)
function M.count_unmatched(hand, wild_value, wild_color)
    local _, unmatched = M.find_groups(hand, wild_value, wild_color)
    return unmatched
end

-- Check if player is "na boa" (exactly 1 card away from winning with 9)
-- i.e., removing any single non-wild card leaves 8 cards that are all grouped
function M.is_na_boa(hand, wild_value, wild_color)
    if #hand ~= 9 then return false end
    for i = 1, #hand do
        if not CachetaState.is_wild(hand[i], wild_value, wild_color) then
            local test = {}
            for j, c in ipairs(hand) do
                if j ~= i then table.insert(test, c) end
            end
            local _, unmatched = M.find_groups(test, wild_value, wild_color)
            if unmatched == 0 then return true end
        end
    end
    return false
end

-- Score a hand for AI purposes (lower = fewer unmatched)
function M.hand_score(hand, wild_value, wild_color)
    return M.count_unmatched(hand, wild_value, wild_color)
end

return M
