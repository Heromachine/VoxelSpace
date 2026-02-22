// ===============================
// Minimap - Overhead and Side Views
// ===============================
"use strict";

function DrawMinimap(){
    if (!showMinimaps) return;  // Skip if minimaps disabled
    var ctx = screendata.context;
    var mmScale = uiScale.minimap;
    var size = Math.floor(200 * mmScale);  // minimap size in pixels (scaled)
    var range = minimapZoomRange;  // world units to show (adjustable via slider)
    var margin = Math.floor(10 * mmScale);
    var cx = screendata.canvas.width - size - margin;  // top-right corner
    var cy = margin;

    // Draw background
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(cx, cy, size, size);
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.strokeRect(cx, cy, size, size);

    // Draw terrain colors from color map
    var scale = size / (range * 2);
    for(var py = 0; py < size; py += 2){
        for(var px = 0; px < size; px += 2){
            // Map screen pos to world pos
            var wx = camera.x + (px - size/2) / scale;
            var wy = camera.y + (py - size/2) / scale;

            // Sample color map
            var mapX = Math.floor(wx) & (map.width - 1);
            var mapY = Math.floor(wy) & (map.height - 1);
            var col = map.color[(mapY << map.shift) + mapX];

            // Extract RGB (stored as ABGR)
            var r = col & 0xFF;
            var g = (col >> 8) & 0xFF;
            var b = (col >> 16) & 0xFF;

            ctx.fillStyle = 'rgb('+r+','+g+','+b+')';
            ctx.fillRect(cx + px, cy + py, 2, 2);
        }
    }

    // Draw player as triangle pointing in look direction
    var pcx = cx + size/2;  // player center on minimap
    var pcy = cy + size/2;

    // Draw cube as a 2D square (clipped to minimap bounds)
    var cubeOffsetX = (cube.x - camera.x) * scale;
    var cubeOffsetY = (cube.y - camera.y) * scale;
    var cubeHalfSizePx = (cube.size / 2) * scale;
    // Only draw if any part of cube is visible on minimap
    if (Math.abs(cubeOffsetX) < size/2 + cubeHalfSizePx &&
        Math.abs(cubeOffsetY) < size/2 + cubeHalfSizePx) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(cx, cy, size, size);  // Clip to minimap bounds
        ctx.clip();
        ctx.fillStyle = 'rgba(200, 50, 50, 0.7)';  // Semi-transparent red
        ctx.fillRect(
            pcx + cubeOffsetX - cubeHalfSizePx,
            pcy + cubeOffsetY - cubeHalfSizePx,
            cubeHalfSizePx * 2,
            cubeHalfSizePx * 2
        );
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 2;
        ctx.strokeRect(
            pcx + cubeOffsetX - cubeHalfSizePx,
            pcy + cubeOffsetY - cubeHalfSizePx,
            cubeHalfSizePx * 2,
            cubeHalfSizePx * 2
        );
        ctx.restore();
    }
    // Draw camera frustum as the entire visible FOV triangle
    var angle = camera.angle;
    var hFov = DisplayConfig.fov.current * Math.PI / 180;  // horizontal FOV in radians

    // Extend frustum to the edge of the minimap (full visible range)
    var frustumLength = size / 2;  // extends to edge of minimap
    var frustumHalfWidth = Math.tan(hFov / 2) * frustumLength;

    ctx.save();
    // Clip to minimap rectangle so frustum doesn't extend outside
    ctx.beginPath();
    ctx.rect(cx, cy, size, size);
    ctx.clip();
    ctx.translate(pcx, pcy);
    ctx.rotate(-angle);

    // Draw filled frustum triangle
    ctx.beginPath();
    ctx.moveTo(0, 0);  // player position (apex)
    ctx.lineTo(-frustumHalfWidth, -frustumLength);  // left edge at far end
    ctx.lineTo(frustumHalfWidth, -frustumLength);   // right edge at far end
    ctx.closePath();
    ctx.fillStyle = 'rgba(255,255,0,0.25)';
    ctx.fill();

    // Draw frustum edge lines for visibility
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-frustumHalfWidth, -frustumLength);
    ctx.moveTo(0, 0);
    ctx.lineTo(frustumHalfWidth, -frustumLength);
    ctx.strokeStyle = 'rgba(255,255,0,0.6)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();

    // Draw small player dot at center
    ctx.beginPath();
    ctx.arc(pcx, pcy, 4, 0, Math.PI * 2);
    ctx.fillStyle = 'yellow';
    ctx.fill();
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Draw remote players on minimap
    var myId = (typeof NakamaClient !== "undefined") ? NakamaClient.getUserId() : null;
    var now  = Date.now();
    if (typeof nakamaState !== "undefined") {
        // Draw radar-revealed shout positions (orange pulses)
        var revealIds = Object.keys(nakamaState.radarReveals);
        for (var ri = 0; ri < revealIds.length; ri++) {
            var ruid   = revealIds[ri];
            var reveal = nakamaState.radarReveals[ruid];
            var rrx    = (reveal.x - camera.x) * scale;
            var rry    = (reveal.y - camera.y) * scale;
            if (Math.abs(rrx) < size / 2 && Math.abs(rry) < size / 2) {
                ctx.beginPath();
                ctx.arc(pcx + rrx, pcy + rry, 6, 0, Math.PI * 2);
                ctx.fillStyle = "rgba(255,160,0,0.6)";
                ctx.fill();
                ctx.strokeStyle = "#ff9900";
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        }

        // Draw remote players as grey dots
        var rpIds = Object.keys(nakamaState.remotePlayers);
        for (var rpi = 0; rpi < rpIds.length; rpi++) {
            var rpid = rpIds[rpi];
            if (rpid === myId) continue;
            var rp = nakamaState.remotePlayers[rpid];
            if (!rp || now - rp.lastSeen > 3000) continue;
            var rpx = (rp.x - camera.x) * scale;
            var rpy = (rp.y - camera.y) * scale;
            if (Math.abs(rpx) < size / 2 && Math.abs(rpy) < size / 2) {
                ctx.beginPath();
                ctx.arc(pcx + rpx, pcy + rpy, 4, 0, Math.PI * 2);
                ctx.fillStyle = "#aaaaaa";
                ctx.fill();
                ctx.strokeStyle = "white";
                ctx.lineWidth = 1;
                ctx.stroke();
            }
        }
    }

    // Draw hitscan and CCD range circles (admin dev view only)
    if (isAdmin && showHitRanges) {
        // Hitscan range (red circle - instant hit zone)
        if (hitscanDist > 0) {
            var hitscanRadius = hitscanDist * scale;
            if (hitscanRadius < size / 2) {  // Only draw if fits on minimap
                ctx.beginPath();
                ctx.arc(pcx, pcy, hitscanRadius, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(255, 100, 100, 0.8)';
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 5]);
                ctx.stroke();
                ctx.setLineDash([]);
            }
        }

        // CCD max range (blue circle - projectile zone)
        var ccdRadius = ccdMaxDist * scale;
        if (ccdRadius < size / 2) {  // Only draw if fits on minimap
            ctx.beginPath();
            ctx.arc(pcx, pcy, ccdRadius, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(100, 170, 255, 0.6)';
            ctx.lineWidth = 1;
            ctx.setLineDash([10, 5]);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }

    // Draw bullets as red dots on minimap (admin dev view only)
    if (isAdmin) {
    var bulletWorldRadius = bulletSize * 2;  // bullet radius in world units
    items.forEach(function(it){
        if(it.type === 'bullet'){
            var bx = (it.x - camera.x) * scale;
            var by = (it.y - camera.y) * scale;
            if(Math.abs(bx) < size/2 && Math.abs(by) < size/2){
                ctx.beginPath();
                var bulletRadius = Math.max(2, bulletWorldRadius * scale);
                ctx.arc(pcx + bx, pcy + by, bulletRadius, 0, Math.PI * 2);
                ctx.fillStyle = 'red';
                ctx.fill();
            }
        }
    });
    } // end isAdmin bullet dots

    // Draw test target on minimap (admin dev view only)
    if (isAdmin && testTarget.enabled) {
        var tx = (testTarget.x - camera.x) * scale;
        var ty = (testTarget.y - camera.y) * scale;
        if (Math.abs(tx) < size/2 && Math.abs(ty) < size/2) {
            var targetRadius = testTarget.radius * scale;
            // Outer ring
            ctx.beginPath();
            ctx.arc(pcx + tx, pcy + ty, targetRadius, 0, Math.PI * 2);
            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 2;
            ctx.stroke();
            // Inner dot
            ctx.beginPath();
            ctx.arc(pcx + tx, pcy + ty, 3, 0, Math.PI * 2);
            ctx.fillStyle = '#ffff00';
            ctx.fill();
            // Crosshair
            ctx.beginPath();
            ctx.moveTo(pcx + tx - targetRadius, pcy + ty);
            ctx.lineTo(pcx + tx + targetRadius, pcy + ty);
            ctx.moveTo(pcx + tx, pcy + ty - targetRadius);
            ctx.lineTo(pcx + tx, pcy + ty + targetRadius);
            ctx.strokeStyle = 'rgba(255,255,255,0.5)';
            ctx.lineWidth = 1;
            ctx.stroke();
        }
    }

    // Dev-only overlays on the overhead map (admin only)
    if (isAdmin) {
        // View direction line (blue)
        var viewLineLen = 25 * scale;
        ctx.save();
        ctx.translate(pcx, pcy);
        ctx.rotate(-angle);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -viewLineLen);
        ctx.strokeStyle = 'rgba(0,100,255,0.7)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();

        // Barrel direction line (orange) and gun shape
        var gunDir = getGunWorldDirection();
        var barrelLineLen = 20 * scale;
        ctx.beginPath();
        ctx.moveTo(pcx, pcy);
        ctx.lineTo(pcx + gunDir.x * barrelLineLen, pcy + gunDir.y * barrelLineLen);
        ctx.strokeStyle = 'orange';
        ctx.lineWidth = 2;
        ctx.stroke();

        var barrelPos = getBarrelWorldPos();
        var bpx = (barrelPos.x - camera.x) * scale;
        var bpy = (barrelPos.y - camera.y) * scale;
        if(Math.abs(bpx) < size/2 && Math.abs(bpy) < size/2){
            ctx.save();
            ctx.translate(pcx + bpx, pcy + bpy);
            var gunAngle = Math.atan2(-gunDir.y, -gunDir.x);
            ctx.rotate(gunAngle);
            var currentSlot = playerWeapons[currentWeaponIndex];
            var totalPlayerHeight = playerHeightOffset / 0.93;
            var gunWorldLength = WeaponConfig.getWeaponLength(currentSlot.type, totalPlayerHeight);
            var pxPerUnit = scale;
            var gunBodyLen = Math.max(8, 0.5 * gunWorldLength * pxPerUnit);
            var gunBodyWidth = Math.max(4, 0.25 * gunWorldLength * pxPerUnit);
            var barrelLen = Math.max(6, 0.5 * gunWorldLength * pxPerUnit);
            var barrelWidth = Math.max(2, 0.15 * gunWorldLength * pxPerUnit);
            ctx.beginPath();
            ctx.rect(-gunBodyLen * 0.6, -gunBodyWidth/2, gunBodyLen, gunBodyWidth);
            ctx.rect(gunBodyLen * 0.3, -barrelWidth/2, barrelLen, barrelWidth);
            ctx.fillStyle = 'rgba(80,80,80,0.9)';
            ctx.fill();
            ctx.strokeStyle = 'cyan';
            ctx.lineWidth = 1;
            ctx.stroke();
            var tipRadius = Math.max(2, 0.1 * gunWorldLength * pxPerUnit);
            ctx.beginPath();
            ctx.arc(gunBodyLen * 0.3 + barrelLen, 0, tipRadius, 0, Math.PI * 2);
            ctx.fillStyle = 'cyan';
            ctx.fill();
            ctx.restore();
        }

        // Bullet spawn position (gray circle)
        var spawnX = barrelPos.x + gunDir.x * gunModel.barrelDistance;
        var spawnY = barrelPos.y + gunDir.y * gunModel.barrelDistance;
        var spx = (spawnX - camera.x) * scale;
        var spy = (spawnY - camera.y) * scale;
        var spawnRadius = Math.max(3, bulletSize * 2 * scale);
        if(Math.abs(spx) < size/2 && Math.abs(spy) < size/2){
            ctx.beginPath();
            ctx.arc(pcx + spx, pcy + spy, spawnRadius, 0, Math.PI * 2);
            ctx.fillStyle = '#888';
            ctx.fill();
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 1;
            ctx.stroke();
        }
    } // end isAdmin overhead dev overlays

    // Title
    ctx.fillStyle = 'white';
    ctx.font = '10px Arial';
    if (isAdmin) {
        var modeText = gunModel.pivotMode === 'barrel' ? '[ADS]' : '[HIP]';
        ctx.fillText('OVERHEAD ' + modeText + ' [' + minimapZoomRange + '] Z=zoom', cx + 5, cy + 12);
    } else {
        ctx.fillText('MAP', cx + 5, cy + 12);
    }

    // === SIDE VIEW and LEGEND (admin dev only) ===
    if (isAdmin) {
        DrawSideView(ctx);
        DrawMinimapLegend(ctx);
    }
}

// Side view showing terrain profile, player height, and bullets
function DrawSideView(ctx){
    var mmScale = uiScale.minimap;
    var width = Math.floor(200 * mmScale);   // minimap width (scaled)
    var height = Math.floor(80 * mmScale);   // minimap height (scaled)
    var margin = Math.floor(10 * mmScale);
    var sx = screendata.canvas.width - width - margin;  // top-right, below main minimap
    var sy = margin + Math.floor(210 * mmScale); // below the square minimap

    var rangeForward = sideViewZoomRange;  // world units to show forward (adjustable via slider)
    var rangeBack = Math.max(2, Math.floor(rangeForward / 6));  // world units to show behind
    var heightRange = Math.max(10, Math.floor(rangeForward / 2));  // world units of height to show

    // Background
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fillRect(sx, sy, width, height);
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 1;
    ctx.strokeRect(sx, sy, width, height);

    // Calculate look direction
    var fx = -Math.sin(camera.angle);
    var fy = -Math.cos(camera.angle);

    // Find min/max terrain height in view for scaling
    var minH = camera.height - Math.max(5, Math.floor(rangeForward / 6));
    var maxH = camera.height + Math.max(5, Math.floor(rangeForward / 3));

    // Calculate scale factors (pixels per world unit)
    var scaleX = width / (rangeForward + rangeBack);
    var scaleY = height / (maxH - minH);

    // Helper to convert world coords to screen coords
    function toScreen(dist, worldZ){
        var px = sx + ((dist + rangeBack) / (rangeForward + rangeBack)) * width;
        var py = sy + height - ((worldZ - minH) / (maxH - minH)) * height;
        return {x: px, y: py};
    }

    // Draw terrain profile (raw terrain without player height offset)
    ctx.beginPath();
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 2;
    var firstPoint = true;
    for(var d = -rangeBack; d <= rangeForward; d += 5){
        var wx = camera.x + fx * d;
        var wy = camera.y + fy * d;
        var terrainZ = getRawTerrainHeight(wx, wy);
        var p = toScreen(d, terrainZ);
        if(firstPoint){
            ctx.moveTo(p.x, p.y);
            firstPoint = false;
        } else {
            ctx.lineTo(p.x, p.y);
        }
    }
    ctx.stroke();

    // Fill terrain area
    ctx.lineTo(sx + width, sy + height);
    ctx.lineTo(sx, sy + height);
    ctx.closePath();
    ctx.fillStyle = 'rgba(100,100,100,0.5)';
    ctx.fill();

    // Draw raw ground level line at camera position (for reference)
    var rawGroundAtCam = getRawTerrainHeight(camera.x, camera.y);
    var groundLine = toScreen(0, rawGroundAtCam);
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(sx, groundLine.y);
    ctx.lineTo(sx + width, groundLine.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw player with proper human proportions
    // Human proportions: total height, head = 1/8, torso = 3/8, legs = 4/8
    var totalPlayerHeight = playerHeightOffset / 0.93;
    var headDiameter = totalPlayerHeight / 8;
    var torsoHeight = totalPlayerHeight * 3 / 8;
    var torsoWidth = totalPlayerHeight / 5;  // shoulder width
    var legLength = totalPlayerHeight * 4 / 8;

    // Calculate world Z positions (camera.height = eye level, eyes are ~40% down from head top)
    var headTopZ = camera.height + headDiameter * 0.4;
    var headBottomZ = camera.height - headDiameter * 0.6;  // chin/neck
    var torsoBottomZ = headBottomZ - torsoHeight;  // waist
    var feetZ = torsoBottomZ - legLength;  // feet position (moves with player)

    // Convert to screen coordinates
    var headCenter = toScreen(0, camera.height);
    var headRadius = Math.max(3, headDiameter * scaleY / 2);
    var torsoTop = toScreen(0, headBottomZ);
    var torsoBottom = toScreen(0, torsoBottomZ);
    var feetPos = toScreen(0, feetZ);
    var torsoWidthPx = Math.max(4, torsoWidth * scaleX);

    // Draw head (yellow circle)
    ctx.beginPath();
    ctx.arc(headCenter.x, headCenter.y, headRadius, 0, Math.PI * 2);
    ctx.fillStyle = 'yellow';
    ctx.fill();
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Draw torso (yellow rectangle attached to bottom of head)
    // Screen Y is inverted: higher world Z = lower screen Y, so torsoBottom.y > torsoTop.y
    var torsoHeightPx = torsoBottom.y - torsoTop.y;
    ctx.fillStyle = 'yellow';
    ctx.fillRect(torsoTop.x - torsoWidthPx/2, torsoTop.y, torsoWidthPx, torsoHeightPx);
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 1;
    ctx.strokeRect(torsoTop.x - torsoWidthPx/2, torsoTop.y, torsoWidthPx, torsoHeightPx);

    // Draw legs (two lines from waist to feet - fixed length, moves with player)
    var legWidth = Math.max(1, torsoWidthPx / 4);
    var legSpacing = torsoWidthPx / 3;
    ctx.strokeStyle = 'yellow';
    ctx.lineWidth = legWidth;
    // Left leg
    ctx.beginPath();
    ctx.moveTo(torsoBottom.x - legSpacing/2, torsoBottom.y);
    ctx.lineTo(feetPos.x - legSpacing/2, feetPos.y);
    ctx.stroke();
    // Right leg
    ctx.beginPath();
    ctx.moveTo(torsoBottom.x + legSpacing/2, torsoBottom.y);
    ctx.lineTo(feetPos.x + legSpacing/2, feetPos.y);
    ctx.stroke();

    // Draw max jump height indicator (green line from feet to max jump apex)
    // Physics: max height = v²/(2g), with gravity ~0.5 and typical deltaTime, roughly jumpStrength * 1.2
    var maxJumpFeetZ = rawGroundAtCam + player.jumpMaxStrength * 1.2;  // max height feet can reach
    var jumpApex = toScreen(0, maxJumpFeetZ);
    // Vertical line from current feet to max jump feet position
    ctx.beginPath();
    ctx.moveTo(feetPos.x, feetPos.y);
    ctx.lineTo(jumpApex.x, jumpApex.y);
    ctx.strokeStyle = '#00ff88';  // light green (distinct from cyan gun)
    ctx.lineWidth = 1;
    ctx.stroke();
    // Horizontal tick at jump apex
    var tickWidth = 6;
    ctx.beginPath();
    ctx.moveTo(jumpApex.x - tickWidth, jumpApex.y);
    ctx.lineTo(jumpApex.x + tickWidth, jumpApex.y);
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw vertical FOV cone (same as overhead view's horizontal cone)
    // Calculate actual vertical FOV from aspect ratio (16:9) and horizontal FOV
    var hFov = DisplayConfig.fov.current * Math.PI / 180;  // horizontal FOV in radians
    var aspectRatio = DisplayConfig.resolution.aspectRatio;
    var vFov = 2 * Math.atan(Math.tan(hFov / 2) / aspectRatio);  // vertical FOV in radians

    // Use accurate pitch calculation matching the camera projection
    var screenCenterY = screendata.canvas.height / 2;
    var fovPitch = Math.atan((camera.horizon - screenCenterY) / camera.focalLength);
    var fovConeRange = 30;  // world units for cone length (matches overhead view)

    // Calculate the top and bottom edges of the FOV cone
    var topAngle = fovPitch + vFov / 2;
    var bottomAngle = fovPitch - vFov / 2;

    var topEndZ = camera.height + Math.tan(topAngle) * fovConeRange;
    var bottomEndZ = camera.height + Math.tan(bottomAngle) * fovConeRange;

    var coneStart = toScreen(0, camera.height);
    var coneTopEnd = toScreen(fovConeRange, topEndZ);
    var coneBottomEnd = toScreen(fovConeRange, bottomEndZ);

    ctx.beginPath();
    ctx.moveTo(coneStart.x, coneStart.y);
    ctx.lineTo(coneTopEnd.x, coneTopEnd.y);
    ctx.lineTo(coneBottomEnd.x, coneBottomEnd.y);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255,255,0,0.2)';
    ctx.fill();

    // Draw bullets as red dots with direction lines (scaled to world units)
    var bulletWorldSize = bulletSize * 2;  // bullet diameter in world units
    items.forEach(function(it){
        if(it.type === 'bullet'){
            // Calculate distance along look direction
            var dx = it.x - camera.x;
            var dy = it.y - camera.y;
            var dist = dx * fx + dy * fy;  // project onto look direction

            if(dist > -rangeBack && dist < rangeForward){
                var p = toScreen(dist, it.z);
                var bulletR = Math.max(2, bulletWorldSize * Math.min(scaleX, scaleY) / 2);
                ctx.beginPath();
                ctx.arc(p.x, p.y, bulletR, 0, Math.PI * 2);
                ctx.fillStyle = 'red';
                ctx.fill();
            }
        }
    });

    // Draw test target in side view
    if (testTarget.enabled) {
        var tdx = testTarget.x - camera.x;
        var tdy = testTarget.y - camera.y;
        var targetDist = tdx * fx + tdy * fy;  // distance along look direction

        if (targetDist > -rangeBack && targetDist < rangeForward) {
            var targetScreen = toScreen(targetDist, testTarget.z);
            var targetR = Math.max(4, testTarget.radius * Math.min(scaleX, scaleY));

            // Outer ring
            ctx.beginPath();
            ctx.arc(targetScreen.x, targetScreen.y, targetR, 0, Math.PI * 2);
            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Inner dot
            ctx.beginPath();
            ctx.arc(targetScreen.x, targetScreen.y, 3, 0, Math.PI * 2);
            ctx.fillStyle = '#ffff00';
            ctx.fill();

            // Crosshair lines
            ctx.beginPath();
            ctx.moveTo(targetScreen.x - targetR, targetScreen.y);
            ctx.lineTo(targetScreen.x + targetR, targetScreen.y);
            ctx.moveTo(targetScreen.x, targetScreen.y - targetR);
            ctx.lineTo(targetScreen.x, targetScreen.y + targetR);
            ctx.strokeStyle = 'rgba(255,255,255,0.5)';
            ctx.lineWidth = 1;
            ctx.stroke();
        }
    }

    // Draw view direction (blue line - where you're looking/screen center)
    // Use accurate pitch calculation matching the camera projection
    var viewPitch = Math.atan((camera.horizon - screenCenterY) / camera.focalLength);
    var viewEndDist = 200;
    var viewEndZ = camera.height + Math.tan(viewPitch) * viewEndDist;
    var viewStart = toScreen(0, camera.height);
    var viewEnd = toScreen(viewEndDist, viewEndZ);
    ctx.beginPath();
    ctx.moveTo(viewStart.x, viewStart.y);
    ctx.lineTo(viewEnd.x, viewEnd.y);
    ctx.strokeStyle = 'rgba(0,100,255,0.7)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Get gun barrel position in world space
    var barrelPos = getBarrelWorldPos();
    var gunDir = getGunWorldDirection();

    // Calculate gun distance along look direction
    var gunDx = barrelPos.x - camera.x;
    var gunDy = barrelPos.y - camera.y;
    var gunDist = gunDx * fx + gunDy * fy;

    // Calculate gun pitch based on pivot mode
    var gunPitch;
    var pivotScreenPos;
    var gunWorldLength = WeaponConfig.getWeaponLength(playerWeapons[currentWeaponIndex].type, totalPlayerHeight);

    if (gunModel.pivotMode === 'barrel') {
        // ADS mode: gun follows view direction, pivot at barrel/spawn point
        gunPitch = -viewPitch;  // Gun matches camera pitch
        // Pivot point is at barrel position (forward from player)
        var pivotDist = gunModel.worldForward;
        var pivotZ = camera.height - gunModel.worldDown + Math.tan(viewPitch) * pivotDist;
        pivotScreenPos = toScreen(pivotDist, pivotZ);
    } else {
        // Hip fire mode: gun uses its own rotation, pivot at grip
        var horizontalDist = Math.sqrt(gunDir.x * gunDir.x + gunDir.y * gunDir.y);
        gunPitch = Math.atan2(-gunDir.z, horizontalDist);
        // Pivot point is at grip (back of gun, close to player)
        var gripDist = gunModel.worldForward - gunWorldLength * 0.4;  // grip is back from barrel
        var gripZ = camera.height - gunModel.worldDown;
        pivotScreenPos = toScreen(gripDist, gripZ);
    }

    // Draw gun shape (side view silhouette) at pivot point
    var gunScreen = pivotScreenPos;

    ctx.save();
    ctx.translate(gunScreen.x, gunScreen.y);
    ctx.rotate(gunPitch);

    // Draw gun shape (side silhouette) - realistic size from WeaponConfig
    var currentSlot = playerWeapons[currentWeaponIndex];
    var pxPerUnit = Math.min(scaleX, scaleY);  // pixels per world unit on side view
    var gunBodyLen = 0.5 * gunWorldLength * pxPerUnit;
    var gunBodyH = 0.3 * gunWorldLength * pxPerUnit;
    var barrelLen = 0.5 * gunWorldLength * pxPerUnit;
    var barrelH = 0.15 * gunWorldLength * pxPerUnit;
    var gripLen = 0.2 * gunWorldLength * pxPerUnit;
    var gripH = 0.35 * gunWorldLength * pxPerUnit;
    // Ensure minimum visibility
    gunBodyLen = Math.max(gunBodyLen, 6);
    gunBodyH = Math.max(gunBodyH, 3);
    barrelLen = Math.max(barrelLen, 5);
    barrelH = Math.max(barrelH, 2);
    gripLen = Math.max(gripLen, 3);
    gripH = Math.max(gripH, 4);
    ctx.beginPath();
    // Gun body
    ctx.rect(-gunBodyLen * 0.7, -gunBodyH/2, gunBodyLen, gunBodyH);
    // Barrel
    ctx.rect(gunBodyLen * 0.3, -barrelH/2, barrelLen, barrelH);
    // Grip
    ctx.rect(-gunBodyLen * 0.4, gunBodyH/2, gripLen, gripH);
    ctx.fillStyle = 'rgba(80,80,80,0.9)';
    ctx.fill();
    ctx.strokeStyle = 'cyan';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Barrel tip marker
    var tipR = Math.max(2, 0.05 * gunWorldLength * pxPerUnit);
    ctx.beginPath();
    ctx.arc(gunBodyLen * 0.3 + barrelLen, 0, tipR, 0, Math.PI * 2);
    ctx.fillStyle = 'cyan';
    ctx.fill();

    ctx.restore();

    // Calculate bullet spawn position (offset from barrel by barrelDistance)
    var bulletSpawnX = barrelPos.x + gunDir.x * gunModel.barrelDistance;
    var bulletSpawnY = barrelPos.y + gunDir.y * gunModel.barrelDistance;
    var bulletSpawnZ = barrelPos.z + gunDir.z * gunModel.barrelDistance;
    var bulletDx = bulletSpawnX - camera.x;
    var bulletDy = bulletSpawnY - camera.y;
    var bulletDist = bulletDx * fx + bulletDy * fy;

    // Draw bullet spawn position (gray dot) - scaled to world units
    var spawnR = Math.max(3, bulletSize * 2 * Math.min(scaleX, scaleY));
    var bulletScreen = toScreen(bulletDist, bulletSpawnZ);
    ctx.beginPath();
    ctx.arc(bulletScreen.x, bulletScreen.y, spawnR, 0, Math.PI * 2);
    ctx.fillStyle = '#888';
    ctx.fill();
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Draw line from gun to bullet spawn
    ctx.beginPath();
    ctx.moveTo(gunScreen.x, gunScreen.y);
    ctx.lineTo(bulletScreen.x, bulletScreen.y);
    ctx.strokeStyle = 'rgba(255,100,100,0.7)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw barrel direction line (orange - where bullets will go)
    var barrelEndDist = 200;  // world units ahead
    var barrelEndZ;

    if (gunModel.pivotMode === 'barrel') {
        // ADS mode: use ACTUAL shooting pitch (same formula as bullet spawn)
        // Bullets go toward screen center, not horizon-based pitch
        var aimPitch = Math.atan((camera.horizon - screenCenterY) / camera.focalLength);
        barrelEndZ = barrelPos.z + Math.tan(aimPitch) * barrelEndDist;
    } else {
        // Hip fire mode: barrel follows gun's own direction
        var barrelFwdComponent = gunDir.x * fx + gunDir.y * fy;
        barrelEndZ = barrelPos.z + (-gunDir.z / Math.abs(barrelFwdComponent || 0.01)) * barrelEndDist;
    }
    var barrelStart = toScreen(gunDist, barrelPos.z);
    var barrelEnd = toScreen(gunDist + barrelEndDist, barrelEndZ);
    ctx.beginPath();
    ctx.moveTo(barrelStart.x, barrelStart.y);
    ctx.lineTo(barrelEnd.x, barrelEnd.y);
    ctx.strokeStyle = 'orange';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw pivot point marker (magenta diamond)
    var pivotSize = 4;
    ctx.beginPath();
    ctx.moveTo(pivotScreenPos.x, pivotScreenPos.y - pivotSize);
    ctx.lineTo(pivotScreenPos.x + pivotSize, pivotScreenPos.y);
    ctx.lineTo(pivotScreenPos.x, pivotScreenPos.y + pivotSize);
    ctx.lineTo(pivotScreenPos.x - pivotSize, pivotScreenPos.y);
    ctx.closePath();
    ctx.fillStyle = '#ff00ff';  // magenta
    ctx.fill();
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Title with mode indicator
    ctx.fillStyle = 'white';
    ctx.font = '10px Arial';
    var modeText = gunModel.pivotMode === 'barrel' ? '[ADS]' : '[HIP]';
    ctx.fillText('SIDE VIEW ' + modeText + ' [' + sideViewZoomRange + '] Z=zoom', sx + 5, sy + 12);
}

// Legend box at top-left corner
function DrawMinimapLegend(ctx){
    var mmScale = uiScale.minimap;
    var width = Math.floor(200 * mmScale);
    var height = Math.floor(86 * mmScale);  // increased for 5 rows
    var margin = Math.floor(10 * mmScale);
    var lx = margin;  // top-left corner
    var ly = margin;

    // Background
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fillRect(lx, ly, width, height);
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 1;
    ctx.strokeRect(lx, ly, width, height);

    // Legend items in two columns
    ctx.font = '10px Arial';
    var col1 = lx + 10;
    var col2 = lx + 105;
    var row1 = ly + 14;
    var row2 = ly + 28;
    var row3 = ly + 42;
    var row4 = ly + 56;
    var row5 = ly + 70;

    ctx.fillStyle = 'yellow';
    ctx.fillText('\u25CFplayer', col1, row1);
    ctx.fillStyle = 'red';
    ctx.fillText('\u25CFbullet', col2, row1);

    ctx.fillStyle = 'cyan';
    ctx.fillText('\u25A0gun', col1, row2);
    ctx.fillStyle = 'orange';
    ctx.fillText('\u2014aim', col2, row2);

    ctx.fillStyle = '#888';
    ctx.fillText('\u25CFspawn', col1, row3);
    ctx.fillStyle = 'rgba(0,100,255,1)';
    ctx.fillText('\u2014view', col2, row3);

    ctx.fillStyle = '#00ff88';
    ctx.fillText('|jump', col1, row4);
    ctx.fillStyle = '#ff00ff';
    ctx.fillText('\u25C6pivot', col2, row4);

    // Show current mode
    ctx.fillStyle = 'white';
    ctx.fillText(gunModel.pivotMode === 'barrel' ? 'Mode: ADS' : 'Mode: Hip', col1, row5);
}
