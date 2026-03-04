// ===============================
// Homing Bullet Behavior (3D)
// ===============================
// Ported from Space Game's homing.js, adapted for 3D (dx/dy/dz).
// Steers a bullet toward its homingTarget with a limited turn rate.
//
// bullet must have: dx, dy, dz, homingSpeed, homingTarget (object with x, y, z)

function updateHoming3D(bullet, deltaTime) {
    if (!bullet.homingTarget) return;

    var speed = Math.hypot(bullet.dx, bullet.dy, bullet.dz);
    if (speed < 0.001) return;

    // Direction to target
    var tx = bullet.homingTarget.x - bullet.x;
    var ty = bullet.homingTarget.y - bullet.y;
    var tz = (bullet.homingTarget.z || 0) - bullet.z;
    var td = Math.hypot(tx, ty, tz);
    if (td < 0.001) return;

    // Normalize both directions
    var cx = bullet.dx / speed, cy = bullet.dy / speed, cz = bullet.dz / speed;
    var nx = tx / td,           ny = ty / td,           nz = tz / td;

    // Angle between current and target directions
    var dot = cx * nx + cy * ny + cz * nz;
    dot = Math.max(-1, Math.min(1, dot));
    var angle = Math.acos(dot);
    if (angle < 0.0001) return;

    // Rotate current direction toward target by at most turnRate radians
    var turnRate = (bullet.homingSpeed || 2) * deltaTime;
    var t = Math.min(turnRate / angle, 1);

    var dx = cx + (nx - cx) * t;
    var dy = cy + (ny - cy) * t;
    var dz = cz + (nz - cz) * t;

    var mag = Math.hypot(dx, dy, dz) || 1;
    bullet.dx = (dx / mag) * speed;
    bullet.dy = (dy / mag) * speed;
    bullet.dz = (dz / mag) * speed;
}
