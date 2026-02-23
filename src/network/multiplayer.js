// ===============================
// Multiplayer Manager
// Handles: position sync, chat, hit reporting, damage receiving
// ===============================
"use strict";

var Multiplayer = (function () {

    // Opcodes (must match match_handler.lua)
    var OP_POSITION      = 1;
    var OP_CHAT          = 2;
    var OP_HIT           = 3;
    var OP_PLAYER_LIST   = 4;
    var OP_PLAYER_JOIN   = 5;
    var OP_PLAYER_LEAVE  = 6;
    var OP_PLAYER_KICKED = 7;
    var OP_DAMAGE        = 8;
    var OP_RADAR_REVEAL  = 9;
    var OP_KILL   = 10;
    var OP_PING   = 11;
    var OP_PONG   = 12;
    var OP_SHOOT  = 13;

    var _matchId     = null;
    var _connected   = false;
    var _isAnonymous = false;

    // Position broadcast throttle
    var POSITION_INTERVAL_MS = 100;  // 10 Hz
    var _lastPositionSend    = 0;

    var PING_INTERVAL_MS = 4000;
    var _lastPingSend    = 0;
    var _pingTs          = 0;

    // ── Init ─────────────────────────────────────────────────

    async function init(isAnonymous) {
        _isAnonymous = isAnonymous;

        try {
            await NakamaClient.connect(onMessage, onDisconnect);
            var match = await NakamaClient.joinOrCreateMatch();
            _matchId   = match.match_id;
            _connected = true;
            console.log("Multiplayer connected, match:", _matchId);

            // Load clan from storage (or set after clan selection)
            if (!isAnonymous) {
                var saved = await NakamaClient.readPlayerData();
                if (saved && saved.clan) {
                    nakamaState.myClan = saved.clan;
                }
            }
        } catch (e) {
            console.error("Multiplayer init failed:", e);
            _connected = false;
        }
    }

    // ── Disconnect ────────────────────────────────────────────

    function disconnect() {
        _connected = false;
        _matchId   = null;
        NakamaClient.disconnect();
        // Clear remote players
        nakamaState.remotePlayers = {};
    }

    // ── Per-frame update (call from game loop) ────────────────

    function update() {
        if (!_connected || !_matchId) return;

        var now = Date.now();
        if (now - _lastPositionSend >= POSITION_INTERVAL_MS) {
            _lastPositionSend = now;
            sendPosition();
        }

        if (now - _lastPingSend >= PING_INTERVAL_MS) {
            _lastPingSend = now;
            _pingTs = now;
            NakamaClient.sendMatchData(_matchId, OP_PING, { ts: now });
        }

        // Tick down radar reveals
        var revealIds = Object.keys(nakamaState.radarReveals);
        for (var i = 0; i < revealIds.length; i++) {
            var uid = revealIds[i];
            if (now >= nakamaState.radarReveals[uid].expiry) {
                delete nakamaState.radarReveals[uid];
            }
        }
    }

    // ── Send position ─────────────────────────────────────────

    function sendPosition() {
        NakamaClient.sendMatchData(_matchId, OP_POSITION, {
            x:      camera.x,
            y:      camera.y,
            height: camera.height,
            angle:  camera.angle,
            health: player.health,
            ping:   nakamaState.myPing
        });
    }

    // ── Send chat emoji ───────────────────────────────────────

    function sendChat(emoji, shout) {
        if (!_connected || !_matchId) return;
        NakamaClient.sendMatchData(_matchId, OP_CHAT, {
            emoji: emoji,
            shout: shout === true
        });
    }

    // ── Broadcast a shot fired (visual only for other clients) ───

    function sendShoot(x, y, z, dx, dy, dz) {
        if (!_connected || !_matchId) return;
        NakamaClient.sendMatchData(_matchId, OP_SHOOT, {
            x: x, y: y, z: z,
            dx: dx, dy: dy, dz: dz
        });
    }

    // ── Report a hit on a remote player ──────────────────────

    function reportHit(targetUserId, damage) {
        if (!_connected || !_matchId) return;
        NakamaClient.sendMatchData(_matchId, OP_HIT, {
            targetId: targetUserId,
            damage:   damage
        });
    }

    // ── Message handler ───────────────────────────────────────

    function onMessage(opCode, data) {
        var myId = NakamaClient.getUserId();

        if (opCode === OP_PLAYER_LIST) {
            // Initial list of players already in match
            if (data.players) {
                for (var i = 0; i < data.players.length; i++) {
                    var p = data.players[i];
                    nakamaState.remotePlayers[p.userId] = {
                        userId:   p.userId,
                        username: p.username,
                        x:        p.x,
                        y:        p.y,
                        height:   p.height,
                        angle:    p.angle,
                        health:   p.health,
                        kills:    p.kills || 0,
                        ping:     null,
                        lastSeen: Date.now()
                    };
                }
            }

        } else if (opCode === OP_PLAYER_JOIN) {
            if (data.userId === myId) {
                // Teleport our camera to the server-assigned spawn position
                camera.x = data.x;
                camera.y = data.y;
                return;
            }
            nakamaState.remotePlayers[data.userId] = {
                userId:   data.userId,
                username: data.username,
                x:        data.x,
                y:        data.y,
                height:   data.height,
                angle:    data.angle,
                health:   data.health,
                kills:    0,
                ping:     null,
                lastSeen: Date.now()
            };
            showChatNotification(data.username + " joined");

        } else if (opCode === OP_PLAYER_LEAVE) {
            delete nakamaState.remotePlayers[data.userId];

        } else if (opCode === OP_POSITION) {
            if (data.userId === myId) return;
            var rp = nakamaState.remotePlayers[data.userId];
            if (rp) {
                rp.x        = data.x;
                rp.y        = data.y;
                rp.height   = data.height;
                rp.angle    = data.angle;
                rp.health   = data.health;
                rp.lastSeen = Date.now();
                if (data.ping != null) rp.ping = data.ping;
            }

        } else if (opCode === OP_CHAT) {
            showEmojiChat(data.senderId, data.x, data.y, data.emoji, data.shout);

        } else if (opCode === OP_PLAYER_KICKED) {
            if (data.reason === "friendly_fire") {
                showKickScreen("Friendly Fire — You shot a clanmate.");
            } else {
                showKickScreen("You were kicked: " + (data.reason || "unknown"));
            }
            disconnect();

        } else if (opCode === OP_DAMAGE) {
            // Server confirmed we took damage
            player.health = Math.max(0, data.health);

        } else if (opCode === OP_RADAR_REVEAL) {
            // A player shouted — reveal on radar for 5 seconds
            nakamaState.radarReveals[data.userId] = {
                x:      data.x,
                y:      data.y,
                expiry: Date.now() + 5000
            };

        } else if (opCode === OP_KILL) {
            if (data.killerId === myId) {
                nakamaState.myKills++;
            } else {
                var killer = nakamaState.remotePlayers[data.killerId];
                if (killer) killer.kills = data.kills;
            }

        } else if (opCode === OP_PONG) {
            nakamaState.myPing = Date.now() - _pingTs;

        } else if (opCode === OP_SHOOT) {
            if (data.userId === myId) return;
            items.push({
                type: "bullet",
                x: data.x, y: data.y, z: data.z,
                prevX: data.x, prevY: data.y, prevZ: data.z,
                dx: data.dx, dy: data.dy, dz: data.dz,
                distance: 0,
                image: textures.bullet,
                damage: 0,
                hitscanHit: null,
                stopDistance: null,
                remote: true
            });
        }
    }

    function onDisconnect() {
        _connected = false;
        if (_isAnonymous) {
            // Wipe anon player data
            nakamaState.remotePlayers = {};
        }
        showKickScreen("Disconnected from server.");
    }

    // ── UI helpers ────────────────────────────────────────────

    function showChatNotification(text) {
        var el = document.getElementById("mp-notification");
        if (!el) return;
        el.textContent = text;
        el.style.opacity = "1";
        clearTimeout(el._timeout);
        el._timeout = setTimeout(function () { el.style.opacity = "0"; }, 3000);
    }

    function showEmojiChat(senderId, sx, sy, emoji, shout) {
        // Add to chat log array for renderer to display in world space
        nakamaState.chatBubbles.push({
            senderId: senderId,
            x:        sx,
            y:        sy,
            emoji:    emoji,
            shout:    shout,
            expiry:   Date.now() + 4000
        });
        // Prune old bubbles
        nakamaState.chatBubbles = nakamaState.chatBubbles.filter(function (b) {
            return Date.now() < b.expiry;
        });
    }

    function showKickScreen(reason) {
        var el = document.getElementById("kick-screen");
        if (!el) return;
        var msg = el.querySelector(".kick-reason");
        if (msg) msg.textContent = reason;
        el.style.display = "flex";
    }

    // ── Public API ─────────────────────────────────────────────

    return {
        init:       init,
        update:     update,
        disconnect: disconnect,
        sendChat:   sendChat,
        sendShoot:  sendShoot,
        reportHit:  reportHit,
        isConnected: function () { return _connected; }
    };

})();
