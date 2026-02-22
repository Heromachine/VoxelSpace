// ===============================
// Remote Player Renderer
// Renders other players as rectangles projected into voxel space
// ===============================
"use strict";

var PLAYER_WIDTH_WORLD  = 20;   // width in world units
var PLAYER_HEIGHT_WORLD = 78;   // standing height in world units

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
    var fl   = camera.focalLength;      // focal length for projection
    var camH = camera.height;
    var camX = camera.baseX !== undefined ? camera.baseX : camera.x;
    var camY = camera.baseY !== undefined ? camera.baseY : camera.y;

    var players = nakamaState.remotePlayers;
    var playerIds = Object.keys(players);

    for (var i = 0; i < playerIds.length; i++) {
        var uid = playerIds[i];
        if (uid === myId) continue;

        var rp = players[uid];

        // Skip stale players (not heard from in 3 seconds)
        if (now - rp.lastSeen > 3000) continue;

        // World -> camera-relative vector
        var dx = rp.x - camX;
        var dy = rp.y - camY;

        // Project onto forward/right axes
        // Forward: (-sinA, -cosA), Right: (cosA, -sinA)
        var fwd   = (-dx * sinA) + (-dy * cosA);   // distance in front of camera
        var right = ( dx * cosA) + (-dy * sinA);   // lateral offset

        // Cull if behind camera or too far
        if (fwd <= 1) continue;
        if (fwd > camera.distance) continue;

        // Screen X (center of player)
        var screenX = (right / fwd) * fl + W / 2;

        // Screen Y for feet and head
        // voxel formula: screenY = horizon - (worldZ - camH) / fwd * fl
        var feetZ  = rp.height - PLAYER_HEIGHT_WORLD;
        var headZ  = rp.height;

        var screenYFeet = camera.horizon - (feetZ - camH) / fwd * fl;
        var screenYHead = camera.horizon - (headZ - camH) / fwd * fl;

        // Player width in screen pixels
        var screenW = (PLAYER_WIDTH_WORLD / fwd) * fl;
        var screenH = Math.abs(screenYFeet - screenYHead);

        // Minimum visibility
        if (screenH < 4) continue;
        if (screenW < 2) screenW = 2;

        // Cull if completely off screen
        if (screenX + screenW / 2 < 0 || screenX - screenW / 2 > W) continue;

        var rectX = Math.floor(screenX - screenW / 2);
        var rectY = Math.floor(Math.min(screenYHead, screenYFeet));
        var rectW = Math.ceil(screenW);
        var rectH = Math.ceil(screenH);

        // Depth-test: only draw if player is closer than terrain at that column
        // Use the depth buffer sampled at screen center column
        var depthCol = Math.floor(screenX);
        if (depthCol >= 0 && depthCol < W) {
            var terrainDepth = screendata.depthBuffer[depthCol];
            if (terrainDepth > 0 && fwd > terrainDepth) continue;  // occluded
        }

        // Draw the rectangle (grey — clan is secret)
        ctx.save();
        ctx.globalAlpha = 0.85;

        // Body rectangle
        ctx.fillStyle = "#888888";
        ctx.fillRect(rectX, rectY, rectW, rectH);

        // Outline
        ctx.strokeStyle = "#cccccc";
        ctx.lineWidth = 1;
        ctx.strokeRect(rectX, rectY, rectW, rectH);

        // Health bar above player
        var hpBarW = rectW;
        var hpBarH = Math.max(3, Math.floor(rectH * 0.06));
        var hpBarY = rectY - hpBarH - 2;
        var hpRatio = Math.max(0, Math.min(1, (rp.health || 0) / 100));

        ctx.fillStyle = "#333";
        ctx.fillRect(rectX, hpBarY, hpBarW, hpBarH);
        ctx.fillStyle = hpRatio > 0.5 ? "#44cc44" : hpRatio > 0.25 ? "#ccaa22" : "#cc3333";
        ctx.fillRect(rectX, hpBarY, Math.floor(hpBarW * hpRatio), hpBarH);

        // Username label (only show if close enough)
        if (fwd < 300) {
            var fontSize = Math.max(8, Math.min(14, Math.floor(fl / fwd * 8)));
            ctx.font = fontSize + "px Arial";
            ctx.fillStyle = "rgba(255,255,255,0.8)";
            ctx.textAlign = "center";
            ctx.fillText(rp.username || "?", rectX + rectW / 2, hpBarY - 2);
        }

        ctx.restore();

        // Draw chat bubble if active
        var bubbles = nakamaState.chatBubbles;
        for (var b = 0; b < bubbles.length; b++) {
            var bubble = bubbles[b];
            if (bubble.senderId === uid && Date.now() < bubble.expiry) {
                var bubbleY = rectY - 28;
                ctx.save();
                ctx.font = "20px Arial";
                ctx.textAlign = "center";
                ctx.fillText(bubble.emoji, rectX + rectW / 2, bubbleY);
                if (bubble.shout) {
                    ctx.font = "8px Arial";
                    ctx.fillStyle = "#ffaa00";
                    ctx.fillText("SHOUT", rectX + rectW / 2, bubbleY + 10);
                }
                ctx.restore();
                break;
            }
        }
    }
}
