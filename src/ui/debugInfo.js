// ===============================
// Gun Mechanics Debug Info Overlay
// ===============================
"use strict";

function DrawGunDebugInfo() {
    if (!showGMD || !testTarget.enabled) return;

    var ctx = screendata.context;
    var x = 10;
    var y = 150;
    var lineHeight = 14;

    ctx.font = '12px monospace';
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(x - 5, y - 15, 300, 300);

    ctx.fillStyle = '#00ff00';
    ctx.fillText('=== GUN MECHANICS DEBUG ===', x, y);
    y += lineHeight + 5;

    // Camera info
    ctx.fillStyle = '#ffffff';
    var cameraPitch = horizonToPitchRad(camera.horizon - pitchOffset) * 180 / Math.PI;
    var screenCenterPitch = Math.atan((camera.horizon - screendata.canvas.height/2) / camera.focalLength) * 180 / Math.PI;
    var cameraAngleDeg = (camera.angle * 180 / Math.PI) % 360;
    ctx.fillText('Camera Angle: ' + cameraAngleDeg.toFixed(1) + '\u00B0', x, y); y += lineHeight;
    ctx.fillText('Horizon Pitch: ' + cameraPitch.toFixed(1) + '\u00B0 | Crosshair: ' + screenCenterPitch.toFixed(1) + '\u00B0', x, y); y += lineHeight;
    ctx.fillText('Camera Height: ' + camera.height.toFixed(1), x, y); y += lineHeight;
    y += 5;

    // Target info
    ctx.fillStyle = '#ffff00';
    ctx.fillText('--- Target ---', x, y); y += lineHeight;
    ctx.fillStyle = '#ffffff';
    ctx.fillText('Distance: ' + testTarget.playerDistance.toFixed(1) + ' units', x, y); y += lineHeight;
    ctx.fillText('Horiz Angle to Target: ' + testTarget.angleToTarget.toFixed(1) + '\u00B0', x, y); y += lineHeight;
    ctx.fillText('Pitch to Target: ' + testTarget.pitchToTarget.toFixed(1) + '\u00B0', x, y); y += lineHeight;
    ctx.fillText('Aim Error: ' + testTarget.aimError.toFixed(1) + '\u00B0', x, y); y += lineHeight;
    y += 5;

    // Gun info
    ctx.fillStyle = '#00ffff';
    ctx.fillText('--- Gun State ---', x, y); y += lineHeight;
    ctx.fillStyle = '#ffffff';
    ctx.fillText('Pivot Mode: ' + gunModel.pivotMode, x, y); y += lineHeight;
    ctx.fillText('ADS Lerp: ' + gunModel.adsLerp.toFixed(2), x, y); y += lineHeight;
    ctx.fillText('Rotation X/Y/Z: ' + gunModel.rotationX.toFixed(0) + '/' +
                 gunModel.rotationY.toFixed(0) + '/' + gunModel.rotationZ.toFixed(0), x, y); y += lineHeight;
    y += 5;

    // Barrel info
    var barrelPos = getBarrelWorldPos();
    ctx.fillStyle = '#ff00ff';
    ctx.fillText('--- Barrel/Spawn ---', x, y); y += lineHeight;
    ctx.fillStyle = '#ffffff';
    ctx.fillText('Barrel World Pos: ' + barrelPos.x.toFixed(1) + ', ' +
                 barrelPos.y.toFixed(1) + ', ' + barrelPos.z.toFixed(1), x, y); y += lineHeight;
    ctx.fillText('Barrel Dir: ' + barrelPos.dirX.toFixed(2) + ', ' +
                 barrelPos.dirY.toFixed(2) + ', ' + barrelPos.dirZ.toFixed(2), x, y); y += lineHeight;

    // Hit tracking
    y += 5;
    ctx.fillStyle = '#00ff00';
    ctx.fillText('Hits: ' + testTarget.hits + '  Misses: ' + testTarget.misses, x, y); y += lineHeight;

    if (testTarget.bulletHitPos) {
        ctx.fillStyle = '#ffff00';
        ctx.fillText('Last Hit Offset: ' + testTarget.bulletHitPos.x.toFixed(2) + ', ' +
                     testTarget.bulletHitPos.y.toFixed(2) + ', ' + testTarget.bulletHitPos.z.toFixed(2), x, y); y += lineHeight;
        ctx.fillText('Hit Dist from Center: ' + testTarget.bulletHitPos.dist.toFixed(2), x, y);
    }

    y += lineHeight + 5;
    ctx.fillStyle = '#888888';
    ctx.fillText('T = reposition target | G = toggle target', x, y);
}
