// ===============================
// Green Floating 3D Cube
// Renders as a real solid-color 3D cube using the same rasterizer as
// cubeRenderer.js (reuses projectPoint, edgeFunction, isFaceVisible).
// Floats above the existing box with a pulsing green glow effect.
// ===============================
"use strict";

var greenCubeObj = null;
var _greenCubeTime = 0;

function initGreenCube() {
    var baseZ = getRawTerrainHeight(cube.x, cube.y) + cube.size;
    greenCubeObj = {
        x:     cube.x,
        y:     cube.y,
        z:     baseZ,       // current world z (updated each frame)
        baseZ: baseZ,       // resting z = top of the box
        size:  20           // much smaller than the 100-unit box
    };
    // Register this cube as an interactable NPC with the quest system
    QuestManager.setNpcPosition('greenCube', cube.x, cube.y);
}

function updateGreenCubeFloat(t) {
    if (!greenCubeObj) return;
    _greenCubeTime = t;
    // Bob sinusoidally above the box top
    greenCubeObj.z = greenCubeObj.baseZ + playerHeightOffset
                   + Math.sin(t * 0.0018) * 8;
}

// Returns the 8 corners of the green cube in world space
function _gcVertices() {
    var g = greenCubeObj;
    var s = g.size / 2;
    var z0 = g.z, z1 = g.z + g.size;
    return [
        {x: g.x - s, y: g.y - s, z: z0},  // 0 back-left-bottom
        {x: g.x + s, y: g.y - s, z: z0},  // 1 back-right-bottom
        {x: g.x + s, y: g.y + s, z: z0},  // 2 front-right-bottom
        {x: g.x - s, y: g.y + s, z: z0},  // 3 front-left-bottom
        {x: g.x - s, y: g.y - s, z: z1},  // 4 back-left-top
        {x: g.x + s, y: g.y - s, z: z1},  // 5 back-right-top
        {x: g.x + s, y: g.y + s, z: z1},  // 6 front-right-top
        {x: g.x - s, y: g.y + s, z: z1}   // 7 front-left-top
    ];
}

// Solid-color triangle rasterizer — same depth buffer as the textured cube
function _drawFlatTriangle(p0, p1, p2, color) {
    var sw    = screendata.canvas.width;
    var sh    = screendata.canvas.height;
    var buf32 = screendata.buf32;
    var depth = screendata.depthBuffer;

    var minX = Math.max(0,      Math.floor(Math.min(p0.x, p1.x, p2.x)));
    var maxX = Math.min(sw - 1, Math.ceil (Math.max(p0.x, p1.x, p2.x)));
    var minY = Math.max(0,      Math.floor(Math.min(p0.y, p1.y, p2.y)));
    var maxY = Math.min(sh - 1, Math.ceil (Math.max(p0.y, p1.y, p2.y)));
    if (minX > maxX || minY > maxY) return;

    var area = edgeFunction(p0.x, p0.y, p1.x, p1.y, p2.x, p2.y);
    if (Math.abs(area) < 0.001) return;
    var invArea = 1.0 / area;

    for (var py = minY; py <= maxY; py++) {
        var row = py * sw;
        for (var px = minX; px <= maxX; px++) {
            var cx = px + 0.5, cy = py + 0.5;
            var w0 = edgeFunction(p1.x, p1.y, p2.x, p2.y, cx, cy);
            var w1 = edgeFunction(p2.x, p2.y, p0.x, p0.y, cx, cy);
            var w2 = edgeFunction(p0.x, p0.y, p1.x, p1.y, cx, cy);
            if (area > 0 ? (w0 < 0 || w1 < 0 || w2 < 0) : (w0 > 0 || w1 > 0 || w2 > 0)) continue;

            var b0 = w0 * invArea, b1 = w1 * invArea, b2 = w2 * invArea;
            var interpInvZ  = b0 * p0.invZ + b1 * p1.invZ + b2 * p2.invZ;
            var pixelDepth  = 1.0 / interpInvZ - 0.5;

            var bufIdx = row + px;
            if (pixelDepth < depth[bufIdx]) {
                buf32[bufIdx]  = color;
                depth[bufIdx]  = pixelDepth;
            }
        }
    }
}

function _drawFlatQuad(v0, v1, v2, v3, color) {
    var p0 = projectPoint(v0), p1 = projectPoint(v1);
    var p2 = projectPoint(v2), p3 = projectPoint(v3);
    var behind = (p0.wasBehind?1:0)+(p1.wasBehind?1:0)+(p2.wasBehind?1:0)+(p3.wasBehind?1:0);
    if (behind >= 3) return;
    _drawFlatTriangle(p0, p1, p2, color);
    _drawFlatTriangle(p0, p2, p3, color);
}

function RenderGreenCube() {
    if (!greenCubeObj) return;

    // Share the camera trig with projectPoint (same values cubeRenderer uses)
    cubeSinYaw = Math.sin(camera.angle);
    cubeCosYaw = Math.cos(camera.angle);

    var g = greenCubeObj;
    var dx = g.x - camera.x, dy = g.y - camera.y;
    var fwd    = -dx * cubeSinYaw - dy * cubeCosYaw;
    var half   = g.size / 2;
    var extent = half * (Math.abs(cubeSinYaw) + Math.abs(cubeCosYaw));
    if (fwd + extent < CUBE_NEAR_PLANE) return;

    // Pulsing brightness (0.65 – 1.0)
    var pulse  = 0.65 + 0.35 * Math.sin(_greenCubeTime * 0.003);
    var centerZ = g.z + half;

    // ABGR packed colors:  0xFF_BB_GG_RR
    // Top face — brightest
    var topG = Math.min(255, Math.round(230 * pulse));
    var topColor = 0xFF000000 | (topG << 8);
    // Side faces — medium
    var sideG = Math.min(255, Math.round(170 * pulse));
    var sideColor = 0xFF000000 | (sideG << 8) | 12;  // tiny hint of teal
    // Bottom — darkest
    var botG = Math.min(255, Math.round(90 * pulse));
    var botColor = 0xFF000000 | (botG << 8);

    var v = _gcVertices();

    var faces = [
        {verts:[v[0],v[1],v[5],v[4]], center:{x:g.x,       y:g.y-half,  z:centerZ}, normal:{x:0,y:-1,z:0}, color:sideColor},
        {verts:[v[2],v[3],v[7],v[6]], center:{x:g.x,       y:g.y+half,  z:centerZ}, normal:{x:0,y: 1,z:0}, color:sideColor},
        {verts:[v[3],v[0],v[4],v[7]], center:{x:g.x-half,  y:g.y,       z:centerZ}, normal:{x:-1,y:0,z:0}, color:sideColor},
        {verts:[v[1],v[2],v[6],v[5]], center:{x:g.x+half,  y:g.y,       z:centerZ}, normal:{x: 1,y:0,z:0}, color:sideColor},
        {verts:[v[4],v[5],v[6],v[7]], center:{x:g.x,       y:g.y,       z:g.z+g.size}, normal:{x:0,y:0,z: 1}, color:topColor},
        {verts:[v[3],v[2],v[1],v[0]], center:{x:g.x,       y:g.y,       z:g.z},     normal:{x:0,y:0,z:-1}, color:botColor}
    ];

    // Back-face cull, compute depth, sort far→near (painter's algorithm)
    var visible = [];
    faces.forEach(function(face) {
        if (!isFaceVisible(face.center, face.normal, half)) return;
        var sum = 0;
        face.verts.forEach(function(p) {
            sum += -(p.x - camera.x) * cubeSinYaw - (p.y - camera.y) * cubeCosYaw;
        });
        face.avgDepth = sum / 4;
        visible.push(face);
    });
    visible.sort(function(a, b) { return b.avgDepth - a.avgDepth; });

    visible.forEach(function(face) {
        _drawFlatQuad(face.verts[0], face.verts[1], face.verts[2], face.verts[3], face.color);
    });
}
