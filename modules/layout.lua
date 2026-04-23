local M = {}

-- Visual size of cards at CARD_SCALE (128x180 image * 0.60)
M.CARD_WIDTH   = 77
M.CARD_HEIGHT  = 108
M.CARD_SPACING = 88

function M.get_player_hand_position(index, total, screen_w, screen_h, selected)
    local total_width = (total - 1) * M.CARD_SPACING
    local start_x = (screen_w * 0.5) - (total_width * 0.5)
    local x = start_x + (index - 1) * M.CARD_SPACING
    local y = screen_h * 0.22
    if selected then y = y + 22 end
    return {x=x, y=y}
end

function M.get_cpu_hand_position(index, total, screen_w, screen_h)
    local total_width = (total - 1) * M.CARD_SPACING
    local start_x = (screen_w * 0.5) - (total_width * 0.5)
    local x = start_x + (index - 1) * M.CARD_SPACING
    local y = screen_h * 0.78
    return {x=x, y=y}
end

function M.get_player_trick_position(screen_w, screen_h)
    return {x = screen_w * 0.38, y = screen_h * 0.50}
end

function M.get_cpu_trick_position(screen_w, screen_h)
    return {x = screen_w * 0.62, y = screen_h * 0.50}
end

function M.get_vira_position(screen_w, screen_h)
    return {x = screen_w * 0.82, y = screen_h * 0.62}
end

return M
