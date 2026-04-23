-- modules/session.lua
-- Session persistence using sys.save/sys.load (Defold built-in)

local M = {}

local function path()
    return sys.get_save_file('play_cacheta', 'session')
end

function M.save(token, user)
    pcall(sys.save, path(), {token=token, user=user})
end

function M.load()
    local ok, data = pcall(sys.load, path())
    if ok and data and data.token and data.user then
        return data.token, data.user
    end
    return nil, nil
end

function M.clear()
    pcall(sys.save, path(), {})
end

return M
