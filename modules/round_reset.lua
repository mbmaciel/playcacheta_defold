local TrucoManager = require "modules.truco_manager"

local M = {}

function M.reset_for_new_hand(state)
    for _, p in ipairs(state.players) do
        p.hand = {}
        p.tricks_won = 0
    end
    state.current_trick  = {player_card=nil, cpu_card=nil}
    state.tricks         = {}
    state.trick_number   = 1
    state.phase          = "play"
    state.truco          = TrucoManager.init()
    state.hand_over      = false
    state.hand_winner    = nil
    state.selected_hand_index = nil
end

return M
