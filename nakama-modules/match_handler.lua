-- ============================================================
-- VoxelSpace Open World Match Handler
-- Nakama Lua server-side module
-- ============================================================

local nk = require("nakama")

local OP_POSITION      = 1
local OP_CHAT          = 2
local OP_HIT           = 3
local OP_PLAYER_LIST   = 4
local OP_PLAYER_JOIN   = 5
local OP_PLAYER_LEAVE  = 6
local OP_PLAYER_KICKED = 7
local OP_DAMAGE        = 8
local OP_RADAR_REVEAL  = 9

local TICK_RATE      = 20
local VICINITY_RANGE = 150
local SHOUT_RANGE    = 500
local MAX_SPEED      = 300
local MAX_HEALTH     = 100

local M = {}

local function dist2d(x1, y1, x2, y2)
    local dx = x1 - x2
    local dy = y1 - y2
    return math.sqrt(dx * dx + dy * dy)
end

local function load_player_data(nk_inst, user_id)
    local ok, result = pcall(function()
        return nk_inst.storage_read({{
            collection = "player", key = "data", user_id = user_id
        }})
    end)
    if ok and result and #result > 0 then
        return nk_inst.json_decode(result[1].value)
    end
    return nil
end

local function save_player_data(nk_inst, user_id, data)
    pcall(function()
        nk_inst.storage_write({{
            collection = "player", key = "data", user_id = user_id,
            value = nk_inst.json_encode(data),
            permission_read = 1, permission_write = 1
        }})
    end)
end

function M.match_init(context, logger, nk, params)
    logger.info("VoxelSpace open world match initialised")
    return { players = {}, presences = {} }, TICK_RATE, "open_world"
end

function M.match_join_attempt(context, logger, nk, dispatcher, tick, state, presence, metadata)
    return state, true, ""
end

function M.match_join(context, logger, nk, dispatcher, tick, state, presences)
    for _, presence in ipairs(presences) do
        local uid   = presence.user_id
        local saved = load_player_data(nk, uid)
        local clan  = saved and saved.clan or nil
        local sx    = math.random(-300, 300)
        local sy    = math.random(-300, 300)

        state.presences[uid] = presence
        state.players[uid]   = {
            x = sx, y = sy, height = 78, angle = 0, health = MAX_HEALTH,
            username = presence.username, clan = clan,
            lastX = sx, lastY = sy, lastTime = nk.time() / 1000.0
        }

        -- Send current player list to new joiner
        local list = {}
        for euid, p in pairs(state.players) do
            if euid ~= uid then
                table.insert(list, { userId = euid, username = p.username,
                    x = p.x, y = p.y, height = p.height, angle = p.angle, health = p.health })
            end
        end
        dispatcher.broadcast_message(OP_PLAYER_LIST,
            nk.json_encode({ players = list }), { presence }, nil, true)

        -- Broadcast join to everyone
        dispatcher.broadcast_message(OP_PLAYER_JOIN,
            nk.json_encode({ userId = uid, username = presence.username,
                x = sx, y = sy, height = 78, angle = 0, health = MAX_HEALTH }),
            nil, nil, true)

        logger.info(string.format("Player joined: %s (%s)", presence.username, uid))
    end
    return state
end

function M.match_leave(context, logger, nk, dispatcher, tick, state, presences)
    for _, presence in ipairs(presences) do
        local uid = presence.user_id
        state.players[uid]   = nil
        state.presences[uid] = nil
        dispatcher.broadcast_message(OP_PLAYER_LEAVE,
            nk.json_encode({ userId = uid }), nil, nil, true)
        logger.info(string.format("Player left: %s", uid))
    end
    return state
end

function M.match_loop(context, logger, nk, dispatcher, tick, state, messages)
    for _, msg in ipairs(messages) do
        local sender_uid = msg.sender.user_id
        local record     = state.players[sender_uid]
        if not record then goto continue end

        local op   = msg.op_code
        local data = nk.json_decode(msg.data)

        if op == OP_POSITION then
            local now  = nk.time() / 1000.0
            local dt   = math.max(0.001, now - (record.lastTime or now))
            local nx   = data.x or record.x
            local ny   = data.y or record.y
            local moved = dist2d(nx, ny, record.lastX, record.lastY)

            if moved <= MAX_SPEED * dt + 5 then
                record.x      = nx
                record.y      = ny
                record.height = data.height or record.height
                record.angle  = data.angle  or record.angle
                record.health = math.max(0, math.min(MAX_HEALTH, data.health or record.health))
            end
            record.lastX    = record.x
            record.lastY    = record.y
            record.lastTime = now

            local others = {}
            for uid, p in pairs(state.presences) do
                if uid ~= sender_uid then table.insert(others, p) end
            end
            if #others > 0 then
                dispatcher.broadcast_message(OP_POSITION,
                    nk.json_encode({ userId = sender_uid,
                        x = record.x, y = record.y, height = record.height,
                        angle = record.angle, health = record.health }),
                    others, nil, false)
            end

        elseif op == OP_CHAT then
            local emoji = data.emoji or "?"
            local shout = data.shout == true
            local range = shout and SHOUT_RANGE or VICINITY_RANGE
            local recipients = {}
            for uid, p in pairs(state.players) do
                if uid ~= sender_uid and dist2d(record.x, record.y, p.x, p.y) <= range then
                    table.insert(recipients, state.presences[uid])
                end
            end
            if #recipients > 0 then
                dispatcher.broadcast_message(OP_CHAT,
                    nk.json_encode({ senderId = sender_uid, x = record.x, y = record.y,
                        emoji = emoji, shout = shout }),
                    recipients, nil, true)
            end
            if shout then
                local radar_r = {}
                for uid, p in pairs(state.players) do
                    if uid ~= sender_uid and dist2d(record.x, record.y, p.x, p.y) <= SHOUT_RANGE then
                        table.insert(radar_r, state.presences[uid])
                    end
                end
                if #radar_r > 0 then
                    dispatcher.broadcast_message(OP_RADAR_REVEAL,
                        nk.json_encode({ userId = sender_uid, x = record.x, y = record.y }),
                        radar_r, nil, true)
                end
            end

        elseif op == OP_HIT then
            local target_id = data.targetId
            local damage    = math.max(0, math.min(100, tonumber(data.damage) or 0))
            local target    = state.players[target_id]
            if not target then goto continue end
            if dist2d(record.x, record.y, target.x, target.y) > 1000 then goto continue end

            -- Friendly fire check
            if record.clan and target.clan and record.clan == target.clan then
                local sp = state.presences[sender_uid]
                if sp then
                    dispatcher.broadcast_message(OP_PLAYER_KICKED,
                        nk.json_encode({ reason = "friendly_fire" }), { sp }, nil, true)
                end
                state.players[sender_uid]   = nil
                state.presences[sender_uid] = nil
                dispatcher.broadcast_message(OP_PLAYER_LEAVE,
                    nk.json_encode({ userId = sender_uid }), nil, nil, true)
                logger.info(string.format("Friendly fire kick: %s -> %s (clan: %s)",
                    sender_uid, target_id, record.clan))
                goto continue
            end

            target.health = math.max(0, target.health - damage)
            local tp = state.presences[target_id]
            if tp then
                dispatcher.broadcast_message(OP_DAMAGE,
                    nk.json_encode({ shooterId = sender_uid, damage = damage, health = target.health }),
                    { tp }, nil, true)
            end
        end

        ::continue::
    end
    return state
end

function M.match_terminate(context, logger, nk, dispatcher, tick, state, grace_seconds)
    logger.info("VoxelSpace match terminating")
    return state
end

function M.match_signal(context, logger, nk, dispatcher, tick, state, data)
    return state, ""
end

return M
