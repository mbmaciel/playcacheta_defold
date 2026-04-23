local M = {}

function M.point_in_card(px, py, card)
    local left = card.x - card.w * 0.5
    local bottom = card.y - card.h * 0.5
    return px >= left and px <= left + card.w and py >= bottom and py <= bottom + card.h
end

function M.find_topmost_card(card_objects, px, py)
    for i = #card_objects, 1, -1 do
        local card = card_objects[i]
        if M.point_in_card(px, py, card) then
            return card, i
        end
    end
    return nil, nil
end

function M.point_in_rect(px, py, x, y, w, h)
    local left = x - w * 0.5
    local bottom = y - h * 0.5
    return px >= left and px <= left + w and py >= bottom and py <= bottom + h
end

return M
