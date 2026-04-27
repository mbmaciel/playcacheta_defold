local Deck = require "modules.deck"

local M = {}

-- Cacheta sequence order (A=low, K=high face card)
M.VALUE_ORDER = {"A","2","3","4","5","6","7","Q","J","K"}

-- Portuguese suit colors
M.RED_SUITS   = {ouros=true, copas=true}
M.BLACK_SUITS = {paus=true, espadas=true}

function M.get_suit_color(suit)
    return M.RED_SUITS[suit] and "red" or "black"
end

function M.get_value_index(value)
    for i, v in ipairs(M.VALUE_ORDER) do
        if v == value then return i end
    end
    return 0
end

-- Returns the next value in cacheta order (wraps around)
function M.next_value(value)
    local idx = M.get_value_index(value)
    if idx == 0 then return M.VALUE_ORDER[1] end
    local next_i = idx + 1
    if next_i > #M.VALUE_ORDER then next_i = 1 end
    return M.VALUE_ORDER[next_i]
end

-- Wild cards: next value after vira, same color as vira
function M.get_wild_cards(vira)
    if not vira then return {}, nil end
    local wild_value = M.next_value(vira.value)
    local vira_color = M.get_suit_color(vira.suit)
    return wild_value, vira_color
end

function M.is_wild(card, wild_value, wild_color)
    if not wild_value or not wild_color then return false end
    return card.value == wild_value and M.get_suit_color(card.suit) == wild_color
end

function M.create()
    return {
        deck         = {},
        discard_pile = {},
        vira         = nil,
        wild_value   = nil,
        wild_color   = nil,
        players = {
            {id=1, hand={}, score=10, name="Você",       na_boa=false, queimado=false},
            {id=2, hand={}, score=10, name="Adversário", na_boa=false, queimado=false},
        },
        current_turn   = 1,
        phase          = "draw_choice",
        hand_over      = false,
        hand_winner    = nil,
        round_number   = 1,
        starting_player = 1,
        selected_hand_index = nil,
        baixar_with_ten     = false,
    }
end

function M.start_new_hand(state)
    state.deck = Deck.create()
    Deck.shuffle(state.deck)

    for _, p in ipairs(state.players) do
        p.hand     = {}
        p.na_boa   = false
        p.queimado = false
    end

    -- Deal 9 cards alternately
    for _ = 1, 9 do
        table.insert(state.players[1].hand, Deck.draw(state.deck))
        table.insert(state.players[2].hand, Deck.draw(state.deck))
    end

    -- Reveal vira (determines wild)
    state.vira = Deck.draw(state.deck)
    state.wild_value, state.wild_color = M.get_wild_cards(state.vira)

    -- Empty discard pile
    state.discard_pile = {}

    state.current_turn       = state.starting_player
    state.phase              = "draw_choice"
    state.hand_over          = false
    state.hand_winner        = nil
    state.selected_hand_index = nil
    state.baixar_with_ten    = false
end

return M
