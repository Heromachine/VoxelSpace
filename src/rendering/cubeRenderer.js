// ===============================
// 3D Cube Rendering
// ===============================
"use strict";

// Get cube vertices in world space (8 corners of a cube)
function getCubeVertices() {
    var s = cube.size;
    var baseZ = getRawTerrainHeight(cube.x, cube.y);  // Sit on terrain
    return [
        // Bottom face (z = baseZ)
        {x: cube.x - s/2, y: cube.y - s/2, z: baseZ},       // 0: back-left-bottom
        {x: cube.x + s/2, y: cube.y - s/2, z: baseZ},       // 1: back-right-bottom
        {x: cube.x + s/2, y: cube.y + s/2, z: baseZ},       // 2: front-right-bottom
        {x: cube.x - s/2, y: cube.y + s/2, z: baseZ},       // 3: front-left-bottom
        // Top face (z = baseZ + size)
        {x: cube.x - s/2, y: cube.y - s/2, z: baseZ + s},   // 4: back-left-top
        {x: cube.x + s/2, y: cube.y - s/2, z: baseZ + s},   // 5: back-right-top
        {x: cube.x + s/2, y: cube.y + s/2, z: baseZ + s},   // 6: front-right-top
        {x: cube.x - s/2, y: cube.y + s/2, z: baseZ + s}    // 7: front-left-top
    ];
}

// Near plane distance - increase to reduce warping when close
var CUBE_NEAR_PLANE = 5;

// Project a 3D point to screen coordinates
// Must match RenderItems projection exactly to avoid shifting
function projectPoint(p) {
    var dx = p.x - camera.x;
    var dy = p.y - camera.y;

    // Use precomputed trig values from RenderCube
    var sinYaw = cubeSinYaw;
    var cosYaw = cubeCosYaw;

    // Ground-plane distance (same as RenderItems uses)
    var groundForward = -dx * sinYaw - dy * cosYaw;

    // Check if behind camera or too close (near plane)
    if (groundForward < CUBE_NEAR_PLANE) return null;

    var sw = screendata.canvas.width;

    // Right offset (same as RenderItems)
    var right = dx * cosYaw - dy * sinYaw;

    // Use same projection formula as RenderItems
    // Store 1/z for perspective-correct interpolation
    var invZ = 1.0 / groundForward;
    return {
        x: right * (sw / 2) * invZ + sw / 2,
        y: (camera.height - p.z) * camera.focalLength * invZ + camera.horizon,
        depth: groundForward,
        invZ: invZ
    };
}

// Edge function: returns which side of edge A->B point P is on
function edgeFunction(ax, ay, bx, by, px, py) {
    return (bx - ax) * (py - ay) - (by - ay) * (px - ax);
}

// Draw a filled triangle with perspective-correct depth interpolation
function drawFilledTriangle(p0, p1, p2, pixelColor, baseDepth) {
    var sw = screendata.canvas.width;
    var sh = screendata.canvas.height;
    var buf32 = screendata.buf32;
    var depth = screendata.depthBuffer;

    // Get bounding box
    var minX = Math.max(0, Math.floor(Math.min(p0.x, p1.x, p2.x)));
    var maxX = Math.min(sw - 1, Math.ceil(Math.max(p0.x, p1.x, p2.x)));
    var minY = Math.max(0, Math.floor(Math.min(p0.y, p1.y, p2.y)));
    var maxY = Math.min(sh - 1, Math.ceil(Math.max(p0.y, p1.y, p2.y)));

    if (minX > maxX || minY > maxY) return;

    // Compute area of full triangle (for barycentric coords)
    var area = edgeFunction(p0.x, p0.y, p1.x, p1.y, p2.x, p2.y);
    if (Math.abs(area) < 0.001) return; // Degenerate triangle

    var invArea = 1.0 / area;

    // Rasterize the triangle
    for (var py = minY; py <= maxY; py++) {
        for (var px = minX; px <= maxX; px++) {
            var pxc = px + 0.5;
            var pyc = py + 0.5;

            // Compute edge functions for point
            var w0 = edgeFunction(p1.x, p1.y, p2.x, p2.y, pxc, pyc);
            var w1 = edgeFunction(p2.x, p2.y, p0.x, p0.y, pxc, pyc);
            var w2 = edgeFunction(p0.x, p0.y, p1.x, p1.y, pxc, pyc);

            // Check if inside (all same sign or zero)
            var inside = (area > 0) ? (w0 >= 0 && w1 >= 0 && w2 >= 0) : (w0 <= 0 && w1 <= 0 && w2 <= 0);
            if (!inside) continue;

            // Barycentric coordinates
            var b0 = w0 * invArea;
            var b1 = w1 * invArea;
            var b2 = w2 * invArea;

            // Perspective-correct interpolation: interpolate 1/z, then convert back
            var interpInvZ = b0 * p0.invZ + b1 * p1.invZ + b2 * p2.invZ;
            var pixelDepth = (1.0 / interpInvZ) - 0.5;

            var bufIdx = py * sw + px;

            // Depth test - only draw if in front of existing pixel
            if (pixelDepth < depth[bufIdx]) {
                buf32[bufIdx] = pixelColor;
                depth[bufIdx] = pixelDepth;
            }
        }
    }
}

// Draw a filled quad (4 vertices) by splitting into two triangles
function drawFilledQuad(v0, v1, v2, v3, color) {
    // Project all vertices
    var p0 = projectPoint(v0);
    var p1 = projectPoint(v1);
    var p2 = projectPoint(v2);
    var p3 = projectPoint(v3);

    // Skip if any vertex is behind camera
    if (!p0 || !p1 || !p2 || !p3) return;

    // Extract RGB and convert to ABGR for buffer
    var r = color & 0xFF;
    var g = (color >> 8) & 0xFF;
    var b = (color >> 16) & 0xFF;

    // Apply simple shading based on average depth
    var avgDepth = (p0.depth + p1.depth + p2.depth + p3.depth) / 4;
    var shade = Math.max(0.3, Math.min(1.0, 1.0 - avgDepth / 1000));
    r = Math.floor(r * shade);
    g = Math.floor(g * shade);
    b = Math.floor(b * shade);

    var pixelColor = 0xFF000000 | (b << 16) | (g << 8) | r;

    // Split quad into two triangles: (0,1,2) and (0,2,3)
    // Per-pixel depth is interpolated inside drawFilledTriangle
    drawFilledTriangle(p0, p1, p2, pixelColor, 0);
    drawFilledTriangle(p0, p2, p3, pixelColor, 0);
}

// Render the 3D cube
function RenderCube() {
    // Precompute trig values once per frame
    cubeSinYaw = Math.sin(camera.angle);
    cubeCosYaw = Math.cos(camera.angle);

    var v = getCubeVertices();

    // Define the 6 faces with consistent CCW winding when viewed from outside
    // Each face uses slightly different shade of blue for visual distinction
    var faces = [
        {verts: [v[0], v[1], v[5], v[4]], color: 0xFF0000CC}, // Back face (y- side): 0->1->5->4
        {verts: [v[2], v[3], v[7], v[6]], color: 0xFF0000FF}, // Front face (y+ side): 2->3->7->6
        {verts: [v[3], v[0], v[4], v[7]], color: 0xFF0000AA}, // Left face (x- side): 3->0->4->7
        {verts: [v[1], v[2], v[6], v[5]], color: 0xFF0000DD}, // Right face (x+ side): 1->2->6->5
        {verts: [v[4], v[5], v[6], v[7]], color: 0xFF3333FF}, // Top face (z+ side): 4->5->6->7
        {verts: [v[3], v[2], v[1], v[0]], color: 0xFF000088}  // Bottom face (z- side): 3->2->1->0
    ];

    // Sort faces by average depth (painter's algorithm - draw far faces first)
    faces.forEach(function(face) {
        var totalDepth = 0;
        face.verts.forEach(function(vert) {
            var dx = vert.x - camera.x;
            var dy = vert.y - camera.y;
            totalDepth += -dx * cubeSinYaw - dy * cubeCosYaw;
        });
        face.avgDepth = totalDepth / 4;
    });

    faces.sort(function(a, b) { return b.avgDepth - a.avgDepth; });

    // Draw each face
    faces.forEach(function(face) {
        drawFilledQuad(face.verts[0], face.verts[1], face.verts[2], face.verts[3], face.color);
    });
}
