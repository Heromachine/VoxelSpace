-- ============================================================
-- RPC: find_or_create_match
-- Returns the match_id of the open world match (creates if none exists)
-- ============================================================

local nk = require("nakama")

local function find_or_create_match(context, payload)
    -- List matches with label "open_world"
    local matches = nk.match_list(10, true, "open_world", nil, nil, nil)

    if matches and #matches > 0 then
        -- Join the first available match
        return nk.json_encode({ match_id = matches[1].match_id })
    end

    -- No existing match — create one
    local match_id = nk.match_create("match_handler", {})
    return nk.json_encode({ match_id = match_id })
end

nk.register_rpc(find_or_create_match, "find_or_create_match")
