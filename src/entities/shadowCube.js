// ===============================
// VoidKeeper — Floating 3D Cube NPC
//
// A second NPC entity using the same solid-color 3D rasterizer as greenCube.js
// (_drawFlatQuad, projectPoint, isFaceVisible etc. are shared globals).
// Floats at ground level ~90 units west of GreenBox with a pulsing violet glow.
//
// World position: SHADOW_NPC_X, SHADOW_NPC_Y (constants below)
// Quest:          VoidQuest  (quests/VoidQuest.js)
// NPC id:         'shadowCube'
// ===============================
"use strict";

var shadowCubeObj   = null;
var _shadowCubeTime = 0;

var SHADOW_NPC_X = -90;
var SHADOW_NPC_Y = -120;

function initShadowCube() {
    var baseZ = getRawTerrainHeight(SHADOW_NPC_X, SHADOW_NPC_Y);
    shadowCubeObj = {
        x:     SHADOW_NPC_X,
        y:     SHADOW_NPC_Y,
        z:     baseZ,
        baseZ: baseZ,
        size:  20
    };
    QuestManager.setNpcPosition('shadowCube', SHADOW_NPC_X, SHADOW_NPC_Y);
}

function updateShadowCubeFloat(t) {
    if (!shadowCubeObj) return;
    _shadowCubeTime = t;
    // Slightly faster, smaller bob than GreenBox to feel distinct
    shadowCubeObj.z = shadowCubeObj.baseZ + playerHeightOffset
                    + Math.sin(t * 0.0024) * 6;
}

// Returns the 8 corners of the shadow cube in world space
function _scVertices() {
    var g = shadowCubeObj;
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

function RenderShadowCube() {
    if (!shadowCubeObj) return;

    // Share the camera trig with projectPoint (same values cubeRenderer uses)
    cubeSinYaw = Math.sin(camera.angle);
    cubeCosYaw = Math.cos(camera.angle);

    var g = shadowCubeObj;
    var dx = g.x - camera.x, dy = g.y - camera.y;
    var fwd    = -dx * cubeSinYaw - dy * cubeCosYaw;
    var half   = g.size / 2;
    var extent = half * (Math.abs(cubeSinYaw) + Math.abs(cubeCosYaw));
    if (fwd + extent < CUBE_NEAR_PLANE) return;

    // Pulsing brightness (0.6 – 1.0) at a different frequency from GreenBox
    var pulse   = 0.6 + 0.4 * Math.sin(_shadowCubeTime * 0.0025);
    var centerZ = g.z + half;

    // ABGR packed colors: 0xFF_BB_GG_RR — violet palette
    // Top face — bright violet
    var topR = Math.min(255, Math.round(190 * pulse));
    var topB = Math.min(255, Math.round(230 * pulse));
    var topColor  = 0xFF000000 | (topB << 16) | topR;
    // Side faces — medium violet
    var sideR = Math.min(255, Math.round(135 * pulse));
    var sideB = Math.min(255, Math.round(175 * pulse));
    var sideColor = 0xFF000000 | (sideB << 16) | sideR;
    // Bottom — darkest
    var botR = Math.min(255, Math.round(65 * pulse));
    var botB = Math.min(255, Math.round(85 * pulse));
    var botColor  = 0xFF000000 | (botB << 16) | botR;

    var v = _scVertices();

    var faces = [
        {verts:[v[0],v[1],v[5],v[4]], center:{x:g.x,      y:g.y-half, z:centerZ}, normal:{x: 0,y:-1,z:0}, color:sideColor},
        {verts:[v[2],v[3],v[7],v[6]], center:{x:g.x,      y:g.y+half, z:centerZ}, normal:{x: 0,y: 1,z:0}, color:sideColor},
        {verts:[v[3],v[0],v[4],v[7]], center:{x:g.x-half, y:g.y,      z:centerZ}, normal:{x:-1,y: 0,z:0}, color:sideColor},
        {verts:[v[1],v[2],v[6],v[5]], center:{x:g.x+half, y:g.y,      z:centerZ}, normal:{x: 1,y: 0,z:0}, color:sideColor},
        {verts:[v[4],v[5],v[6],v[7]], center:{x:g.x,      y:g.y,      z:g.z+g.size}, normal:{x:0,y:0,z: 1}, color:topColor},
        {verts:[v[3],v[2],v[1],v[0]], center:{x:g.x,      y:g.y,      z:g.z},     normal:{x:0,y:0,z:-1}, color:botColor}
    ];

    // Back-face cull, depth sort (far → near), then draw
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
