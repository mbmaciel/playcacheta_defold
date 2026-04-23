local M = {}

M.WINNING_SCORE = 12

function M.award_hand_points(state, winner_id)
    if winner_id then
        state.players[winner_id].score = state.players[winner_id].score + state.truco.hand_points
    end
end

function M.check_match_winner(state)
    for _, p in ipairs(state.players) do
        if p.score >= M.WINNING_SCORE then return p.id end
    end
    return nil
end

return M
