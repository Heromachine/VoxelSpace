// ===============================
// UNUSED: Push Away From Cube
// ===============================
// This function was intended to prevent camera clipping through cube walls
// when rotating, but didn't fully solve the rendering issue.
// Kept here in case needed later.
"use strict";

/*
// Push player away from cube if too close (prevents camera clipping on rotation)
function pushAwayFromCube() {
    var halfSize = cube.size / 2;
    var cubeBaseZ = getRawTerrainHeight(cube.x, cube.y);
    var cubeTopZ = cubeBaseZ + cube.size;
    var feetZ = camera.height - playerHeightOffset;

    // Only push if player is at cube's height level (not on top or below)
    if (feetZ >= cubeTopZ - 1 || feetZ < cubeBaseZ) return;

    // Minimum safe distance from cube center to camera
    var safeDistance = PLAYER_RADIUS + PUSH_OUT_BUFFER;

    // Vector from cube center to camera
    var dx = camera.x - cube.x;
    var dy = camera.y - cube.y;

    // Clamp to cube surface to find closest point on cube
    var clampedX = Math.max(-halfSize, Math.min(halfSize, dx));
    var clampedY = Math.max(-halfSize, Math.min(halfSize, dy));

    // Vector from closest point on cube to camera
    var pushX = dx - clampedX;
    var pushY = dy - clampedY;
    var dist = Math.sqrt(pushX * pushX + pushY * pushY);

    // If camera is inside the cube (dist is 0 or very small), push toward nearest edge
    if (dist < 0.001) {
        // Camera is inside cube bounds - find nearest edge
        var distToLeft = dx + halfSize;
        var distToRight = halfSize - dx;
        var distToBack = dy + halfSize;
        var distToFront = halfSize - dy;

        var minDist = Math.min(distToLeft, distToRight, distToBack, distToFront);

        if (minDist === distToLeft) {
            camera.x = cube.x - halfSize - safeDistance;
        } else if (minDist === distToRight) {
            camera.x = cube.x + halfSize + safeDistance;
        } else if (minDist === distToBack) {
            camera.y = cube.y - halfSize - safeDistance;
        } else {
            camera.y = cube.y + halfSize + safeDistance;
        }
    } else if (dist < safeDistance) {
        // Camera is too close to cube surface - push outward
        var pushAmount = safeDistance - dist;
        var normX = pushX / dist;
        var normY = pushY / dist;
        camera.x += normX * pushAmount;
        camera.y += normY * pushAmount;
    }
}
*/
