local Deck = require "modules.deck"
local TrucoManager = require "modules.truco_manager"

local M = {}

function M.create()
    return {
        deck = {},
        vira = nil,
        manilha_value = nil,
        players = {
            {id=1, hand={}, tricks_won=0, score=0, name="Jogador"},
            {id=2, hand={}, tricks_won=0, score=0, name="CPU"},
        },
        current_trick = {player_card=nil, cpu_card=nil},
        tricks = {},
        trick_number = 1,
        current_turn = 1,
        phase = "play",   -- "play" | "trick_over" | "hand_over" | "game_over"
        truco = TrucoManager.init(),
        hand_over = false,
        hand_winner = nil,
        round_number = 1,
        starting_player = 1,
        selected_hand_index = nil,
    }
end

function M.start_new_hand(state)
    state.deck = Deck.create()
    Deck.shuffle(state.deck)

    for _, p in ipairs(state.players) do
        p.hand = {}
        p.tricks_won = 0
    end

    for _ = 1, 3 do
        table.insert(state.players[1].hand, Deck.draw(state.deck))
        table.insert(state.players[2].hand, Deck.draw(state.deck))
    end

    state.vira          = Deck.draw(state.deck)
    state.manilha_value = Deck.next_value(state.vira.value)

    state.current_trick  = {player_card=nil, cpu_card=nil}
    state.tricks         = {}
    state.trick_number   = 1
    state.current_turn   = state.starting_player
    state.phase          = "play"
    state.truco          = TrucoManager.init()
    state.hand_over      = false
    state.hand_winner    = nil
    state.selected_hand_index = nil
end

return M
