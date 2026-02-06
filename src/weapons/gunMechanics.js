// ===============================
// Gun Mechanics - Direction and Position Calculations
// ===============================
"use strict";

// Get the gun's forward direction in world space (based on gun rotation + camera angle)
function getGunWorldDirection() {
    var rotX = gunModel.rotationX * Math.PI / 180;
    var rotY = gunModel.rotationY * Math.PI / 180;
    var rotZ = gunModel.rotationZ * Math.PI / 180;

    var cosX = Math.cos(rotX), sinX = Math.sin(rotX);
    var cosY = Math.cos(rotY), sinY = Math.sin(rotY);
    var cosZ = Math.cos(rotZ), sinZ = Math.sin(rotZ);

    // Gun's forward is +X in model space
    var x = 1, y = 0, z = 0;

    // Apply same rotations as rendering
    var y1 = y * cosX - z * sinX;
    var z1 = y * sinX + z * cosX;
    var x2 = x * cosY + z1 * sinY;
    var z2 = -x * sinY + z1 * cosY;
    var x3 = x2 * cosZ - y1 * sinZ;
    var y3 = x2 * sinZ + y1 * cosZ;

    // Convert screen-space direction to world-space using camera angle + barrel yaw
    var aimAngle = camera.angle + (gunModel.barrelYaw || 0) * Math.PI / 180;
    var camSin = Math.sin(aimAngle);
    var camCos = Math.cos(aimAngle);

    // World forward is -sin(angle), -cos(angle)
    var worldX = -x3 * camCos - z2 * camSin;
    var worldY = x3 * camSin - z2 * camCos;
    var worldZ = y3;

    // Normalize
    var len = Math.sqrt(worldX*worldX + worldY*worldY + worldZ*worldZ) || 1;
    return { x: worldX/len, y: worldY/len, z: worldZ/len };
}

// Get barrel position in screen coordinates (for debug drawing)
function getBarrelScreenPos() {
    var sw = screendata.canvas.width;
    var sh = screendata.canvas.height;

    // Scale based on screen size (same as gunRenderer)
    var refWidth = 800;
    var refHeight = 600;

    // Use separate scale factors for X and Y positioning
    var scaleX = Math.max(0.3, sw / refWidth);
    var scaleY = Math.max(0.3, sh / refHeight);

    var scaledOffsetX = gunModel.offsetX * scaleX;
    var scaledOffsetY = gunModel.offsetY * scaleY;
    var centerX = sw - scaledOffsetX;
    var centerY = sh - scaledOffsetY;

    var rotX = gunModel.rotationX * Math.PI / 180;
    var rotY = gunModel.rotationY * Math.PI / 180;
    var rotZ = gunModel.rotationZ * Math.PI / 180;

    var cosX = Math.cos(rotX), sinX = Math.sin(rotX);
    var cosY = Math.cos(rotY), sinY = Math.sin(rotY);
    var cosZ = Math.cos(rotZ), sinZ = Math.sin(rotZ);

    // Gun's forward direction in screen space (after rotation)
    var fwdX = 1, fwdY = 0, fwdZ = 0;
    var fy1 = fwdY * cosX - fwdZ * sinX;
    var fz1 = fwdY * sinX + fwdZ * cosX;
    var fx2 = fwdX * cosY + fz1 * sinY;
    var fz2 = -fwdX * sinY + fz1 * cosY;
    var fx3 = fx2 * cosZ - fy1 * sinZ;
    var fy3 = fx2 * sinZ + fy1 * cosZ;

    // Gun's up direction in screen space
    var upX = 0, upY = 1, upZ = 0;
    var uy1 = upY * cosX - upZ * sinX;
    var uz1 = upY * sinX + upZ * cosX;
    var ux2 = upX * cosY + uz1 * sinY;
    var uz2 = -upX * sinY + uz1 * cosY;
    var ux3 = ux2 * cosZ - uy1 * sinZ;
    var uy3 = ux2 * sinZ + uy1 * cosZ;

    // Gun's right direction in screen space
    var rtX = 0, rtY = 0, rtZ = 1;
    var ry1 = rtY * cosX - rtZ * sinX;
    var rz1 = rtY * sinX + rtZ * cosX;
    var rx2 = rtX * cosY + rz1 * sinY;
    var rz2 = -rtX * sinY + rz1 * cosY;
    var rx3 = rx2 * cosZ - ry1 * sinZ;
    var ry3 = rx2 * sinZ + ry1 * cosZ;

    // Barrel offset in gun-relative space (forward/up/right)
    var fwd = gunModel.barrelX;
    var up = gunModel.barrelY;
    var right = gunModel.barrelZ;

    // Combine offsets in screen space
    var screenX = fx3 * fwd + ux3 * up + rx3 * right;
    var screenY = fy3 * fwd + uy3 * up + ry3 * right;

    // Use min for gun size scale (same as gunRenderer)
    var sizeScale = Math.max(0.3, Math.min(scaleX, scaleY));

    return {
        x: centerX + screenX * gunModel.scale * sizeScale,
        y: centerY - screenY * gunModel.scale * sizeScale
    };
}

// Get barrel position in world coordinates (for bullet spawning)
function getBarrelWorldPos() {
    // Camera direction vectors
    var camSin = Math.sin(camera.angle);
    var camCos = Math.cos(camera.angle);
    var fx = -camSin, fy = -camCos;  // forward (world)
    var rx = camCos, ry = -camSin;   // right (world)

    // Gun base position in world (offset from camera)
    var gunWorldX = camera.x + fx * gunModel.worldForward + rx * gunModel.worldRight;
    var gunWorldY = camera.y + fy * gunModel.worldForward + ry * gunModel.worldRight;
    var gunWorldZ = camera.height - gunModel.worldDown;

    // Get the direction the gun is pointing (differs based on pivot mode)
    var gunDirX, gunDirY, gunDirZ;
    if (gunModel.pivotMode === 'barrel') {
        // ADS mode: gun aims at SCREEN CENTER (where crosshair is)
        var screenCenterY = screendata.canvas.height / 2;
        var screenCenterPitch = Math.atan((camera.horizon - screenCenterY) / camera.focalLength);
        var cosPitch = Math.cos(screenCenterPitch);
        var sinPitch = Math.sin(screenCenterPitch);
        gunDirX = fx * cosPitch;
        gunDirY = fy * cosPitch;
        gunDirZ = sinPitch;
    } else {
        // Hip fire mode: use gun's own rotation
        var gunDir = getGunWorldDirection();
        gunDirX = gunDir.x;
        gunDirY = gunDir.y;
        gunDirZ = gunDir.z;
    }

    // Calculate up and right vectors perpendicular to gun direction
    var worldUp = {x: 0, y: 0, z: 1};

    // Right = gunDir cross worldUp
    var rightX = gunDirY * worldUp.z - gunDirZ * worldUp.y;
    var rightY = gunDirZ * worldUp.x - gunDirX * worldUp.z;
    var rightZ = gunDirX * worldUp.y - gunDirY * worldUp.x;
    var rightLen = Math.sqrt(rightX*rightX + rightY*rightY + rightZ*rightZ) || 1;
    rightX /= rightLen; rightY /= rightLen; rightZ /= rightLen;

    // Up = right cross gunDir
    var upX = rightY * gunDirZ - rightZ * gunDirY;
    var upY = rightZ * gunDirX - rightX * gunDirZ;
    var upZ = rightX * gunDirY - rightY * gunDirX;
    var upLen = Math.sqrt(upX*upX + upY*upY + upZ*upZ) || 1;
    upX /= upLen; upY /= upLen; upZ /= upLen;

    // Barrel offset in gun-relative space (scaled to world units)
    var bScale = gunModel.scale / 30;
    var fwd = gunModel.barrelX * bScale;
    var up = gunModel.barrelY * bScale;
    var right = gunModel.barrelZ * bScale;

    // Apply offsets in gun-direction space
    var barrelOffsetX = gunDirX * fwd + upX * up + rightX * right;
    var barrelOffsetY = gunDirY * fwd + upY * up + rightY * right;
    var barrelOffsetZ = gunDirZ * fwd + upZ * up + rightZ * right;

    return {
        x: gunWorldX + barrelOffsetX,
        y: gunWorldY + barrelOffsetY,
        z: gunWorldZ + barrelOffsetZ,
        // Also return the gun direction for convenience
        dirX: gunDirX,
        dirY: gunDirY,
        dirZ: gunDirZ
    };
}
