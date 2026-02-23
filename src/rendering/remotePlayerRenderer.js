// ===============================
// Remote Player Renderer
// Two-pass rendering:
//   RenderRemotePlayerBodies()   – before Flip(), writes depth-tested pixels into buf32
//   RenderRemotePlayerOverlays() – after  Flip(), draws HUD (health bar, name, arrow) via canvas 2D
// ===============================
"use strict";

var PLAYER_WIDTH_WORLD  = 20;
var PLAYER_HEIGHT_WORLD = 78;
var PLAYER_EYE_HEIGHT   = 30;

// Shared per-frame screen data filled by RenderRemotePlayerBodies
var _rpScreenData = {};

function RenderRemotePlayerBodies() {
    _rpScreenData = {};

    var W    = screendata.canvas.width;
    var H    = screendata.canvas.height;
    var buf  = screendata.buf32;
    var dep  = screendata.depthBuffer;
    var fl   = camera.focalLength;
    var camH = camera.height;
    var camX = camera.baseX !== undefined ? camera.baseX : camera.x;
    var camY = camera.baseY !== undefined ? camera.baseY : camera.y;
    var sinA = Math.sin(camera.angle);
    var cosA = Math.cos(camera.angle);

    var myId    = NakamaClient.getUserId();
    var now     = Date.now();
    var players = nakamaState.remotePlayers;

    for (var uid in players) {
        if (uid === myId) continue;
        var rp = players[uid];
        if (now - rp.lastSeen > 10000) continue;

        var dx  = rp.x - camX;
        var dy  = rp.y - camY;
        var fwd   = (-dx * sinA) + (-dy * cosA);
        var right = ( dx * cosA) + (-dy * sinA);

        if (fwd <= 1) continue;
        if (fwd > camera.distance) continue;

        var screenX = (right / fwd) * fl + W / 2;
        var screenW = Math.max(2, (PLAYER_WIDTH_WORLD / fwd) * fl);
        if (screenX + screenW / 2 < 0 || screenX - screenW / 2 > W) continue;

        var feetZ      = rp.height - PLAYER_EYE_HEIGHT;
        var headZ      = rp.height + (PLAYER_HEIGHT_WORLD - PLAYER_EYE_HEIGHT);
        var screenYFeet = camera.horizon - (feetZ - camH) / fwd * fl;
        var screenYHead = camera.horizon - (headZ - camH) / fwd * fl;
        var rectTop = Math.min(screenYHead, screenYFeet);
        var rectBot = Math.max(screenYHead, screenYFeet);
        var screenH = rectBot - rectTop;

        if (screenH < 4) continue;

        var rectX = Math.floor(screenX - screenW / 2);
        var rectY = Math.floor(rectTop);
        var rectW = Math.ceil(screenW);
        var rectHPx = Math.ceil(screenH);

        _rpScreenData[uid] = {
            fwd: fwd, screenX: screenX,
            rectX: rectX, rectY: rectY, rectW: rectW, rectH: rectHPx,
            offscreen: (rectBot < 0 || rectTop > H),
            aboveViewport: rectBot < 0
        };

        if (rectBot < 0 || rectTop > H) continue; // off-screen — only overlay arrow needed

        // Health-based body colour (buf32 little-endian RGBA: A<<24 | B<<16 | G<<8 | R)
        var hpRatio = Math.max(0, Math.min(1, (rp.health || 100) / 100));
        var bodyColor;
        if      (hpRatio > 0.5)  bodyColor = 0xFF44CC44; // green
        else if (hpRatio > 0.25) bodyColor = 0xFF22AACC; // orange
        else                     bodyColor = 0xFF3333CC; // red
        var edgeColor = 0xFF003333; // dark outline

        var xStart = Math.max(0, rectX);
        var xEnd   = Math.min(W - 1, rectX + rectW - 1);
        var yStart = Math.max(0, rectY);
        var yEnd   = Math.min(H - 1, rectY + rectHPx - 1);

        for (var py = yStart; py <= yEnd; py++) {
            for (var px = xStart; px <= xEnd; px++) {
                var idx = py * W + px;
                if (fwd >= dep[idx]) continue; // occluded by terrain
                var isEdge = (px <= xStart + 1 || px >= xEnd - 1 ||
                              py <= yStart + 1 || py >= yEnd - 1);
                buf[idx] = isEdge ? edgeColor : bodyColor;
            }
        }
    }
}

function RenderRemotePlayerOverlays() {
    var ctx = screendata.context;
    if (!ctx) return;

    var W  = screendata.canvas.width;
    var H  = screendata.canvas.height;
    var fl = camera.focalLength;
    var now = Date.now();
    var players = nakamaState.remotePlayers;

    for (var uid in _rpScreenData) {
        var sd = _rpScreenData[uid];
        var rp = players[uid];
        if (!rp) continue;

        var hpRatio = Math.max(0, Math.min(1, (rp.health || 100) / 100));

        if (sd.offscreen) {
            // Off-screen directional arrow
            var indX  = Math.max(20, Math.min(W - 20, Math.floor(sd.screenX)));
            var above = sd.aboveViewport;
            var indY  = above ? 14 : H - 14;

            ctx.save();
            ctx.fillStyle   = "#FFFF00";
            ctx.strokeStyle = "#333300";
            ctx.lineWidth   = 1.5;
            ctx.beginPath();
            if (above) {
                ctx.moveTo(indX,     indY - 9);
                ctx.lineTo(indX - 8, indY + 5);
                ctx.lineTo(indX + 8, indY + 5);
            } else {
                ctx.moveTo(indX,     indY + 9);
                ctx.lineTo(indX - 8, indY - 5);
                ctx.lineTo(indX + 8, indY - 5);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.font      = "9px Arial";
            ctx.fillStyle = "#FFFF00";
            ctx.textAlign = "center";
            ctx.fillText(rp.username || "?", indX, above ? indY + 16 : indY - 8);
            ctx.restore();
            continue;
        }

        var rectX  = sd.rectX;
        var rectY  = sd.rectY;
        var rectW  = sd.rectW;
        var rectH  = sd.rectH;

        // Health bar
        var hpBarH = Math.max(3, Math.floor(rectH * 0.06));
        var hpBarY = rectY - hpBarH - 2;
        ctx.fillStyle = "#333";
        ctx.fillRect(rectX, hpBarY, rectW, hpBarH);
        ctx.fillStyle = hpRatio > 0.5 ? "#44cc44" : hpRatio > 0.25 ? "#ccaa22" : "#cc3333";
        ctx.fillRect(rectX, hpBarY, Math.floor(rectW * hpRatio), hpBarH);

        // Username label (within 300 world units)
        if (sd.fwd < 300) {
            var fontSize = Math.max(8, Math.min(14, Math.floor(fl / sd.fwd * 8)));
            ctx.font      = fontSize + "px Arial";
            ctx.fillStyle = "rgba(255,255,0,0.9)";
            ctx.textAlign = "center";
            ctx.fillText(rp.username || "?", rectX + rectW / 2, hpBarY - 2);
        }

        // Chat bubble
        var bubbles = nakamaState.chatBubbles;
        for (var b = 0; b < bubbles.length; b++) {
            var bubble = bubbles[b];
            if (bubble.senderId === uid && now < bubble.expiry) {
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
