-- modules/json.lua
-- Pure Lua JSON encoder/decoder (Lua 5.1 compatible, ASCII-only source)

local json = {}

-------------------------------------------------------------------------------
-- Encoder
-------------------------------------------------------------------------------

local encode

local ESCAPE_CHARS = {
    ['\\'] = '\\\\', ['"']  = '\\"',
    ['\b'] = '\\b',  ['\f'] = '\\f',
    ['\n'] = '\\n',  ['\r'] = '\\r',
    ['\t'] = '\\t',
}

local function encode_string(s)
    s = s:gsub('[%z\1-\31\\"]', function(c)
        return ESCAPE_CHARS[c] or string.format('\\u%04x', c:byte())
    end)
    return '"' .. s .. '"'
end

local function is_array(t)
    local max_key = 0
    local count   = 0
    for k in pairs(t) do
        if type(k) ~= 'number' or k ~= math.floor(k) or k < 1 then
            return false
        end
        if k > max_key then max_key = k end
        count = count + 1
    end
    return count == max_key
end

encode = function(val, seen)
    seen = seen or {}
    local t = type(val)
    if t == 'nil' then
        return 'null'
    elseif t == 'boolean' then
        return val and 'true' or 'false'
    elseif t == 'number' then
        if val ~= val or val == math.huge or val == -math.huge then
            return 'null'
        end
        if math.floor(val) == val and math.abs(val) < 2^53 then
            return string.format('%d', val)
        end
        return string.format('%.14g', val)
    elseif t == 'string' then
        return encode_string(val)
    elseif t == 'table' then
        if seen[val] then error('json.encode: circular reference') end
        seen[val] = true
        local result
        if is_array(val) then
            local parts = {}
            for i, v in ipairs(val) do parts[i] = encode(v, seen) end
            result = '[' .. table.concat(parts, ',') .. ']'
        else
            local parts = {}
            for k, v in pairs(val) do
                if type(k) == 'string' or type(k) == 'number' then
                    parts[#parts + 1] = encode_string(tostring(k)) .. ':' .. encode(v, seen)
                end
            end
            result = '{' .. table.concat(parts, ',') .. '}'
        end
        seen[val] = nil
        return result
    end
    return 'null'
end

json.encode = encode

-------------------------------------------------------------------------------
-- Decoder
-------------------------------------------------------------------------------

local SPACES = { [' ']=true, ['\t']=true, ['\r']=true, ['\n']=true }

local function skip_ws(s, i)
    while i <= #s and SPACES[s:sub(i,i)] do i = i + 1 end
    return i
end

local parse_value

local function parse_string(s, i)
    assert(s:sub(i,i) == '"', 'expected " at pos '..i)
    i = i + 1
    local parts = {}
    while i <= #s do
        local c = s:sub(i,i)
        if c == '"' then
            return table.concat(parts), i + 1
        elseif c == '\\' then
            i = i + 1
            local esc = s:sub(i,i)
            if     esc == '"'  then parts[#parts+1] = '"'
            elseif esc == '\\' then parts[#parts+1] = '\\'
            elseif esc == '/'  then parts[#parts+1] = '/'
            elseif esc == 'b'  then parts[#parts+1] = '\b'
            elseif esc == 'f'  then parts[#parts+1] = '\f'
            elseif esc == 'n'  then parts[#parts+1] = '\n'
            elseif esc == 'r'  then parts[#parts+1] = '\r'
            elseif esc == 't'  then parts[#parts+1] = '\t'
            elseif esc == 'u'  then
                local hex = s:sub(i+1, i+4)
                local cp  = tonumber(hex, 16)
                if not cp then error('invalid \\u at pos '..i) end
                if cp < 0x80 then
                    parts[#parts+1] = string.char(cp)
                elseif cp < 0x800 then
                    parts[#parts+1] = string.char(
                        0xC0 + math.floor(cp / 0x40),
                        0x80 + (cp % 0x40))
                else
                    parts[#parts+1] = string.char(
                        0xE0 + math.floor(cp / 0x1000),
                        0x80 + math.floor((cp % 0x1000) / 0x40),
                        0x80 + (cp % 0x40))
                end
                i = i + 4
            else
                error('unknown escape: \\'..esc..' at pos '..i)
            end
        else
            parts[#parts+1] = c
        end
        i = i + 1
    end
    error('unterminated string')
end

local function parse_number(s, i)
    local j = i
    if s:sub(j,j) == '-' then j = j + 1 end
    if s:sub(j,j) == '0' then
        j = j + 1
    else
        assert(s:sub(j,j):match('%d'), 'invalid number at pos '..i)
        while s:sub(j,j):match('%d') do j = j + 1 end
    end
    if s:sub(j,j) == '.' then
        j = j + 1
        assert(s:sub(j,j):match('%d'), 'invalid number at pos '..i)
        while s:sub(j,j):match('%d') do j = j + 1 end
    end
    if s:sub(j,j):match('[eE]') then
        j = j + 1
        if s:sub(j,j):match('[+%-]') then j = j + 1 end
        assert(s:sub(j,j):match('%d'), 'invalid exponent at pos '..i)
        while s:sub(j,j):match('%d') do j = j + 1 end
    end
    local num = tonumber(s:sub(i, j-1))
    assert(num, 'invalid number at pos '..i)
    return num, j
end

local function parse_array(s, i)
    i = i + 1
    local arr = {}
    i = skip_ws(s, i)
    if s:sub(i,i) == ']' then return arr, i+1 end
    while true do
        local val
        val, i = parse_value(s, i)
        arr[#arr+1] = val
        i = skip_ws(s, i)
        local c = s:sub(i,i)
        if     c == ']' then return arr, i+1
        elseif c == ',' then i = skip_ws(s, i+1)
        else error('expected , or ] at pos '..i)
        end
    end
end

local function parse_object(s, i)
    i = i + 1
    local obj = {}
    i = skip_ws(s, i)
    if s:sub(i,i) == '}' then return obj, i+1 end
    while true do
        i = skip_ws(s, i)
        assert(s:sub(i,i) == '"', 'object key must be string at pos '..i)
        local key
        key, i = parse_string(s, i)
        i = skip_ws(s, i)
        assert(s:sub(i,i) == ':', 'expected : at pos '..i)
        i = skip_ws(s, i+1)
        local val
        val, i = parse_value(s, i)
        obj[key] = val
        i = skip_ws(s, i)
        local c = s:sub(i,i)
        if     c == '}' then return obj, i+1
        elseif c == ',' then i = i+1
        else error('expected , or } at pos '..i)
        end
    end
end

parse_value = function(s, i)
    i = skip_ws(s, i)
    local c = s:sub(i,i)
    if     c == '"' then return parse_string(s, i)
    elseif c == '{' then return parse_object(s, i)
    elseif c == '[' then return parse_array(s, i)
    elseif c == 't' then
        assert(s:sub(i, i+3) == 'true', 'invalid token at pos '..i)
        return true, i+4
    elseif c == 'f' then
        assert(s:sub(i, i+4) == 'false', 'invalid token at pos '..i)
        return false, i+5
    elseif c == 'n' then
        assert(s:sub(i, i+3) == 'null', 'invalid token at pos '..i)
        return nil, i+4
    elseif c == '-' or c:match('%d') then
        return parse_number(s, i)
    end
    error('unexpected char "'..c..'" at pos '..i)
end

function json.decode(s)
    if type(s) ~= 'string' then
        return nil, 'json.decode: expected string, got '..type(s)
    end
    local ok, val_or_err = pcall(parse_value, s, 1)
    if not ok then return nil, tostring(val_or_err) end
    return val_or_err
end

return json
