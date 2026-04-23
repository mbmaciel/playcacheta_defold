local RoundRules = require "modules.round_rules"

local M = {}

function M.is_player_turn(state)
    return state.current_turn == 1
        and state.phase == "play"
        and not state.truco.pending
        and not state.hand_over
end

function M.play_card(state, player_id, card_index)
    local player = state.players[player_id]
    if not player.hand[card_index] then return nil end
    local card = table.remove(player.hand, card_index)
    if player_id == 1 then
        state.current_trick.player_card = card
    else
        state.current_trick.cpu_card = card
    end
    return card
end

function M.both_played(state)
    return state.current_trick.player_card ~= nil
       and state.current_trick.cpu_card   ~= nil
end

-- Resolves trick, updates state. Returns trick winner (id or nil)
function M.resolve_trick(state)
    local pc = state.current_trick.player_card
    local cc = state.current_trick.cpu_card
    local winner = RoundRules.get_trick_winner(pc, 1, cc, 2, state.manilha_value)

    table.insert(state.tricks, {winner=winner, player_card=pc, cpu_card=cc})

    if winner then
        state.players[winner].tricks_won = state.players[winner].tricks_won + 1
    end

    state.trick_number = state.trick_number + 1
    -- Winner of trick leads next; on tie, same leader keeps the turn
    if winner then state.current_turn = winner end

    state.current_trick = {player_card=nil, cpu_card=nil}
    return winner
end

function M.check_hand_over(state)
    return RoundRules.is_hand_over(
        state.tricks,
        state.players[1].tricks_won,
        state.players[2].tricks_won
    )
end

return M
