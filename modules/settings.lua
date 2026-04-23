local M = {}

local function path()
    return sys.get_save_file("play_cacheta", "settings")
end

local function load_all()
    local ok, data = pcall(sys.load, path())
    if ok and type(data) == "table" then
        return data
    end
    return {}
end

local function save_all(data)
    pcall(sys.save, path(), data or {})
end

function M.load_music_enabled()
    local data = load_all()
    if data.music_enabled == nil then
        return true
    end
    return data.music_enabled == true
end

function M.set_music_enabled(enabled)
    local data = load_all()
    data.music_enabled = enabled and true or false
    save_all(data)
end

return M
