// ===============================
// Nakama Client - Auth & Socket
// ===============================
"use strict";

var NakamaClient = (function () {

    var SERVER_HOST = "192.168.1.222";
    var SERVER_PORT = "7350";
    var SERVER_KEY  = "defaulthttpkey";
    var USE_SSL     = false;

    var _client   = null;
    var _session  = null;
    var _socket   = null;
    var _onMessage = null;  // callback(opCode, data)
    var _onDisconnect = null;

    function getClient() {
        if (!_client) {
            _client = new nakamajs.Client(SERVER_KEY, SERVER_HOST, SERVER_PORT, USE_SSL);
        }
        return _client;
    }

    // ── Authentication ──────────────────────────────────────

    async function loginAnonymous() {
        var client = getClient();
        _session = await client.authenticateDevice(
            "anon_" + Date.now() + "_" + Math.random().toString(36).slice(2),
            true,   // create account
            "Guest_" + Math.floor(Math.random() * 9999)
        );
        return _session;
    }

    async function loginUsername(username, password) {
        var client = getClient();
        _session = await client.authenticateEmail(
            username + "@voxelspace.game",  // Nakama email auth needs email format
            password,
            true,    // create if not exists
            username
        );
        return _session;
    }

    // Steam auth placeholder — requires Steam Web API key on server
    async function loginSteam(steamToken) {
        var client = getClient();
        _session = await client.authenticateSteam(steamToken, true);
        return _session;
    }

    // ── Session helpers ─────────────────────────────────────

    function getSession() { return _session; }
    function getUserId()   { return _session ? _session.user_id : null; }
    function getUsername() { return _session ? _session.username : null; }
    function isLoggedIn()  { return _session !== null && !_session.isexpired(Date.now() / 1000); }

    // ── Socket connection ───────────────────────────────────

    async function connect(onMessage, onDisconnect) {
        if (!_session) throw new Error("Not authenticated");
        _onMessage    = onMessage;
        _onDisconnect = onDisconnect;

        _socket = getClient().createSocket(USE_SSL, false);

        _socket.ondisconnect = function (evt) {
            console.warn("Nakama socket disconnected", evt);
            if (_onDisconnect) _onDisconnect(evt);
        };

        _socket.onnotification = function (notification) {
            console.log("Nakama notification:", notification);
        };

        _socket.onmatchdata = function (matchData) {
            if (_onMessage) {
                var decoded = null;
                try {
                    var str = new TextDecoder().decode(matchData.data);
                    decoded = JSON.parse(str);
                } catch (e) {
                    decoded = matchData.data;
                }
                _onMessage(matchData.op_code, decoded, matchData.presence);
            }
        };

        await _socket.connect(_session, true);
        return _socket;
    }

    // ── Match management ────────────────────────────────────

    async function joinOrCreateMatch() {
        if (!_socket) throw new Error("Socket not connected");
        // Try to find existing open world match by label
        var result = await _socket.rpc("find_or_create_match", "{}");
        var data = JSON.parse(result.payload);
        var match = await _socket.joinMatch(data.match_id);
        return match;
    }

    // ── Sending messages ─────────────────────────────────────

    function sendMatchData(matchId, opCode, data) {
        if (!_socket || !matchId) return;
        var encoded = new TextEncoder().encode(JSON.stringify(data));
        _socket.sendMatchState(matchId, opCode, encoded);
    }

    // ── Storage ──────────────────────────────────────────────

    async function readPlayerData() {
        if (!_client || !_session) return null;
        try {
            var result = await _client.readStorageObjects(_session, {
                object_ids: [{ collection: "player", key: "data", user_id: getUserId() }]
            });
            if (result.objects && result.objects.length > 0) {
                return JSON.parse(result.objects[0].value);
            }
        } catch (e) {
            console.warn("Could not read player data:", e);
        }
        return null;
    }

    async function writePlayerData(data) {
        if (!_client || !_session) return;
        try {
            await _client.writeStorageObjects(_session, [{
                collection:       "player",
                key:              "data",
                value:            JSON.stringify(data),
                permission_read:  1,
                permission_write: 1
            }]);
        } catch (e) {
            console.warn("Could not write player data:", e);
        }
    }

    // ── Disconnect ───────────────────────────────────────────

    function disconnect() {
        if (_socket) {
            _socket.disconnect(true);
            _socket = null;
        }
        _session = null;
    }

    return {
        loginAnonymous:    loginAnonymous,
        loginUsername:     loginUsername,
        loginSteam:        loginSteam,
        getSession:        getSession,
        getUserId:         getUserId,
        getUsername:       getUsername,
        isLoggedIn:        isLoggedIn,
        connect:           connect,
        joinOrCreateMatch: joinOrCreateMatch,
        sendMatchData:     sendMatchData,
        readPlayerData:    readPlayerData,
        writePlayerData:   writePlayerData,
        disconnect:        disconnect
    };

})();
