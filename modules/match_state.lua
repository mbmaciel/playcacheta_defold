local M = {}

function M.init_match(state)
    state.round_number   = 1
    state.starting_player = 1
    state.players[1].score = 0
    state.players[2].score = 0
end

function M.advance_round(state)
    state.round_number    = (state.round_number or 1) + 1
    state.starting_player = (state.starting_player == 1) and 2 or 1
end

return M
