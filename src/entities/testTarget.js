// ===============================
// Test Target - floating circle for gun mechanics testing
// ===============================
"use strict";

// Position target in front of player at eye level
function positionTestTarget() {
    var fx = -Math.sin(camera.angle);
    var fy = -Math.cos(camera.angle);
    testTarget.x = camera.x + fx * testTarget.distance;
    testTarget.y = camera.y + fy * testTarget.distance;
    testTarget.z = camera.height; // at eye level
}

// Calculate gun mechanics data relative to target
function updateTargetMetrics() {
    if (!testTarget.enabled) return;

    var dx = testTarget.x - camera.x;
    var dy = testTarget.y - camera.y;
    var dz = testTarget.z - camera.height;

    // Distance to target
    testTarget.playerDistance = Math.sqrt(dx*dx + dy*dy + dz*dz);
    var horizDist = Math.sqrt(dx*dx + dy*dy);

    // Angle to target (horizontal)
    var targetAngle = Math.atan2(-dx, -dy); // same convention as camera.angle
    testTarget.angleToTarget = (targetAngle - camera.angle) * 180 / Math.PI;
    // Normalize to -180 to 180
    while (testTarget.angleToTarget > 180) testTarget.angleToTarget -= 360;
    while (testTarget.angleToTarget < -180) testTarget.angleToTarget += 360;

    // Pitch to target
    testTarget.pitchToTarget = Math.atan2(dz, horizDist) * 180 / Math.PI;

    // Current aim direction
    var cameraPitch = horizonToPitchRad(camera.horizon - pitchOffset) * 180 / Math.PI;

    // Aim error (difference between where we're aiming and where target is)
    var aimHorizError = testTarget.angleToTarget;
    var aimVertError = testTarget.pitchToTarget - cameraPitch;
    testTarget.aimError = Math.sqrt(aimHorizError*aimHorizError + aimVertError*aimVertError);
}

// Render the test target as a circle in 3D space
function RenderTestTarget() {
    if (!testTarget.enabled) return;

    var ctx = screendata.context;
    var sw = screendata.canvas.width;
    var sh = screendata.canvas.height;
    var sinYaw = Math.sin(camera.angle);
    var cosYaw = Math.cos(camera.angle);
    var focal = camera.focalLength;

    // Calculate position relative to camera
    var dx = testTarget.x - camera.x;
    var dy = testTarget.y - camera.y;
    var dz = testTarget.z - camera.height;

    // Ground-plane distance (forward from camera)
    var groundForward = -dx * sinYaw - dy * cosYaw;

    // Don't render if behind camera or too far
    if (groundForward < 1 || groundForward > camera.distance) return;

    // Right offset
    var rx = cosYaw, ry = -sinYaw;
    var right = dx * rx + dy * ry;

    // Screen position
    var screenX = right * (sw / 2) / groundForward + sw / 2;
    var screenY = -dz * focal / groundForward + camera.horizon;

    // Scale radius based on distance
    var screenRadius = testTarget.radius * focal / groundForward;

    // Don't render if off screen
    if (screenX < -screenRadius || screenX > sw + screenRadius) return;
    if (screenY < -screenRadius || screenY > sh + screenRadius) return;

    // Draw outer ring (white)
    ctx.beginPath();
    ctx.arc(screenX, screenY, screenRadius, 0, Math.PI * 2);
    ctx.strokeStyle = testTarget.ringColor;
    ctx.lineWidth = 3;
    ctx.stroke();

    // Draw inner circle (red)
    ctx.beginPath();
    ctx.arc(screenX, screenY, screenRadius * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = testTarget.color;
    ctx.fill();

    // Draw crosshair on target
    ctx.beginPath();
    ctx.moveTo(screenX - screenRadius, screenY);
    ctx.lineTo(screenX + screenRadius, screenY);
    ctx.moveTo(screenX, screenY - screenRadius);
    ctx.lineTo(screenX, screenY + screenRadius);
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Draw center dot
    ctx.beginPath();
    ctx.arc(screenX, screenY, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#ffff00';
    ctx.fill();
}
