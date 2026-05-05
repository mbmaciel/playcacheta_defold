-- modules/api.lua
-- HTTP client wrapping Defold http.request() for the playcacheta API
---@diagnostic disable: undefined-global

local JSON = require('modules.json')
local M    = {}

M.BASE_URL = 'http://localhost:3001'
-- http://api.playcacheta.online
M.token    = nil

local function _headers()
    local h = {['Content-Type']='application/json', ['Accept']='application/json'}
    if M.token then h['Authorization'] = 'Bearer '..M.token end
    return h
end

local function _parse(response)
    local status = response.status or 0
    local body   = response.response or ''
    if status == 304 then
        if body == '' then return true, {} end
        local data = JSON.decode(body)
        if type(data) == 'table' then return true, data end
        return true, {}
    end
    if status >= 200 and status < 300 then
        if body == '' then return true, {} end
        local data, err = JSON.decode(body)
        if data then return true, data end
        return false, 'Invalid response: '..(err or '')
    end
    local data = JSON.decode(body)
    if type(data) == 'table' and data.error then return false, data.error end
    if type(data) == 'table' and data.message then return false, data.message end
    if status == 0 then return false, 'Sem conexao com o servidor' end
    return false, 'HTTP '..status
end

local function _get(path, callback)
    http.request(M.BASE_URL..path, 'GET', function(_, _, response)
        callback(_parse(response))
    end, _headers(), nil)
end

local function _post(path, body, callback)
    local data = body and JSON.encode(body) or ''
    http.request(M.BASE_URL..path, 'POST', function(_, _, response)
        callback(_parse(response))
    end, _headers(), data)
end

-- Auth

function M.login(cpf, password, callback)
    _post('/auth/login', {cpf=cpf, password=password}, function(ok, data)
        if ok and data.token then M.token = data.token end
        callback(ok, data)
    end)
end

function M.register(name, cpf, email, password, phone, callback)
    _post('/auth/register', {
        name=name, cpf=cpf, email=email, password=password,
        phone=(phone ~= '' and phone or nil),
    }, function(ok, data)
        if ok and data.token then M.token = data.token end
        callback(ok, data)
    end)
end

-- Profile
function M.get_me(callback)
    _get('/users/me', callback)
end

-- Rooms

function M.list_rooms(game_type, callback)
    local path = '/game/rooms'
    if game_type and game_type ~= '' then
        path = path .. '?gameType=' .. game_type
    end
    _get(path, callback)
end

function M.get_room(code, callback)
    _get('/game/rooms/'..code:upper(), callback)
end

function M.create_room(name, game_type, callback)
    _post('/game/rooms', {
        name           = (name ~= '' and name or nil),
        fichasPerRound = 5,
        isPrivate      = false,
        gameType       = game_type or 'truco_paulista',
    }, callback)
end

function M.join_room(code, callback)
    _post('/game/rooms/'..code:upper()..'/join', {}, callback)
end

function M.leave_room(code, callback)
    _post('/game/rooms/'..code:upper()..'/leave', {}, callback)
end

-- Token management

function M.set_token(t)  M.token = t end
function M.clear_token() M.token = nil end

return M
