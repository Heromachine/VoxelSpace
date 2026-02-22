// ===============================
// Remote Player Renderer
// Renders other players as rectangles projected into voxel space
// ===============================
"use strict";

var PLAYER_WIDTH_WORLD  = 20;   // width in world units
var PLAYER_HEIGHT_WORLD = 78;   // total body height in world units
var PLAYER_EYE_HEIGHT   = 30;   // eye height above feet (matches playerHeightOffset)

function RenderRemotePlayers() {
    var ctx = screendata.context;
    if (!ctx) return;

    var myId = NakamaClient.getUserId();
    var now  = Date.now();

    // Camera projection values
    var sinA = Math.sin(camera.angle);
    var cosA = Math.cos(camera.angle);
    var W    = screendata.canvas.width;
    var H    = screendata.canvas.height;
    var fl   = camera.focalLength;
    var camH = camera.height;
    var camX = camera.baseX !== undefined ? camera.baseX : camera.x;
    var camY = camera.baseY !== undefined ? camera.baseY : camera.y;

    var players = nakamaState.remotePlayers;
    var playerIds = Object.keys(players);

    for (var i = 0; i < playerIds.length; i++) {
        var uid = playerIds[i];
        if (uid === myId) continue;

        var rp = players[uid];

        // Skip stale players (not heard from in 10 seconds)
        if (now - rp.lastSeen > 10000) continue;

        // World -> camera-relative vector
        var dx = rp.x - camX;
        var dy = rp.y - camY;

        // Project onto forward/right axes
        var fwd   = (-dx * sinA) + (-dy * cosA);   // forward distance
        var right = ( dx * cosA) + (-dy * sinA);   // lateral offset

        // Cull if behind camera or beyond draw distance
        if (fwd <= 1) continue;
        if (fwd > camera.distance) continue;

        // Screen X (horizontal center of player)
        var screenX = (right / fwd) * fl + W / 2;

        // Cull if completely off-screen horizontally
        var screenW = Math.max(2, (PLAYER_WIDTH_WORLD / fwd) * fl);
        if (screenX + screenW / 2 < 0 || screenX - screenW / 2 > W) continue;

        // Screen Y for feet and head.
        // rp.height = their camera.height = eye altitude = terrain + PLAYER_EYE_HEIGHT
        // Feet are PLAYER_EYE_HEIGHT below the eye; head is above.
        var feetZ   = rp.height - PLAYER_EYE_HEIGHT;
        var headZ   = rp.height + (PLAYER_HEIGHT_WORLD - PLAYER_EYE_HEIGHT);
        var screenYFeet = camera.horizon - (feetZ - camH) / fwd * fl;
        var screenYHead = camera.horizon - (headZ - camH) / fwd * fl;

        var rectTop = Math.min(screenYHead, screenYFeet);
        var rectBot = Math.max(screenYHead, screenYFeet);
        var screenH = rectBot - rectTop;

        if (screenH < 4) continue;

        // ── Off-screen indicator (player above or below viewport) ──────────
        if (rectBot < 0 || rectTop > H) {
            var indX = Math.max(20, Math.min(W - 20, Math.floor(screenX)));
            var above = rectBot < 0;
            var indY  = above ? 14 : H - 14;

            ctx.save();
            ctx.fillStyle   = "#FFFF00";
            ctx.strokeStyle = "#333300";
            ctx.lineWidth   = 1.5;
            ctx.beginPath();
            if (above) {
                ctx.moveTo(indX,      indY - 9);
                ctx.lineTo(indX - 8,  indY + 5);
                ctx.lineTo(indX + 8,  indY + 5);
            } else {
                ctx.moveTo(indX,      indY + 9);
                ctx.lineTo(indX - 8,  indY - 5);
                ctx.lineTo(indX + 8,  indY - 5);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Username near the arrow
            ctx.font      = "9px Arial";
            ctx.fillStyle = "#FFFF00";
            ctx.textAlign = "center";
            ctx.fillText(
                rp.username || "?",
                indX,
                above ? indY + 16 : indY - 8
            );
            ctx.restore();
            continue;
        }

        // ── On-screen rectangle ─────────────────────────────────────────────
        var rectX = Math.floor(screenX - screenW / 2);
        var rectY = Math.floor(rectTop);
        var rectW = Math.ceil(screenW);
        var rectH = Math.ceil(screenH);

        ctx.save();
        ctx.globalAlpha = 0.9;

        // Body — bright yellow so it's easy to spot (clan colour stays secret)
        ctx.fillStyle = "#FFFF00";
        ctx.fillRect(rectX, rectY, rectW, rectH);

        // Dark outline for contrast against any terrain colour
        ctx.strokeStyle = "#333300";
        ctx.lineWidth   = 2;
        ctx.strokeRect(rectX, rectY, rectW, rectH);

        // Health bar directly above the rectangle
        var hpBarH = Math.max(3, Math.floor(rectH * 0.06));
        var hpBarY = rectY - hpBarH - 2;
        var hpRatio = Math.max(0, Math.min(1, (rp.health || 100) / 100));

        ctx.fillStyle = "#333";
        ctx.fillRect(rectX, hpBarY, rectW, hpBarH);
        ctx.fillStyle = hpRatio > 0.5 ? "#44cc44" : hpRatio > 0.25 ? "#ccaa22" : "#cc3333";
        ctx.fillRect(rectX, hpBarY, Math.floor(rectW * hpRatio), hpBarH);

        // Username label (visible up to 300 world units)
        if (fwd < 300) {
            var fontSize = Math.max(8, Math.min(14, Math.floor(fl / fwd * 8)));
            ctx.font      = fontSize + "px Arial";
            ctx.fillStyle = "rgba(255,255,0,0.9)";
            ctx.textAlign = "center";
            ctx.fillText(rp.username || "?", rectX + rectW / 2, hpBarY - 2);
        }

        ctx.restore();

        // Chat bubble if active
        var bubbles = nakamaState.chatBubbles;
        for (var b = 0; b < bubbles.length; b++) {
            var bubble = bubbles[b];
            if (bubble.senderId === uid && Date.now() < bubble.expiry) {
                ctx.save();
                ctx.font      = "20px Arial";
                ctx.textAlign = "center";
                ctx.fillText(bubble.emoji, rectX + rectW / 2, rectY - 28);
                if (bubble.shout) {
                    ctx.font      = "8px Arial";
                    ctx.fillStyle = "#ffaa00";
                    ctx.fillText("SHOUT", rectX + rectW / 2, rectY - 18);
                }
                ctx.restore();
                break;
            }
        }
    }
}
