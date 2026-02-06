// ===============================
// Gun Viewmodel Rendering
// ===============================
"use strict";

// Load OBJ file
function loadGunModel() {
    fetch('3D_models/Gun _obj/Gun.obj')
        .then(response => response.text())
        .then(text => {
            var lines = text.split('\n');
            var vertices = [];
            var uvs = [];
            var faces = [];

            lines.forEach(line => {
                var parts = line.trim().split(/\s+/);
                if (parts[0] === 'v') {
                    vertices.push({
                        x: parseFloat(parts[1]),
                        y: parseFloat(parts[2]),
                        z: parseFloat(parts[3])
                    });
                } else if (parts[0] === 'vt') {
                    uvs.push({
                        u: parseFloat(parts[1]),
                        v: parseFloat(parts[2])
                    });
                } else if (parts[0] === 'f') {
                    var faceVerts = [];
                    var faceUVs = [];
                    for (var i = 1; i < parts.length; i++) {
                        var indices = parts[i].split('/');
                        faceVerts.push(parseInt(indices[0]) - 1);
                        if (indices[1]) {
                            faceUVs.push(parseInt(indices[1]) - 1);
                        }
                    }
                    if (faceVerts.length === 3) {
                        faces.push({ verts: faceVerts, uvs: faceUVs });
                    } else if (faceVerts.length === 4) {
                        faces.push({ verts: [faceVerts[0], faceVerts[1], faceVerts[2]], uvs: [faceUVs[0], faceUVs[1], faceUVs[2]] });
                        faces.push({ verts: [faceVerts[0], faceVerts[2], faceVerts[3]], uvs: [faceUVs[0], faceUVs[2], faceUVs[3]] });
                    }
                }
            });

            gunModel.vertices = vertices;
            gunModel.uvs = uvs;
            gunModel.faces = faces;
            gunModel.loaded = true;
            console.log('Gun model loaded:', vertices.length, 'vertices,', uvs.length, 'UVs,', faces.length, 'faces');
        })
        .catch(err => console.error('Failed to load gun model:', err));

    // Load gun texture
    gunModel.texture = new Image();
    gunModel.textureLoaded = false;
    gunModel.texture.onload = function() {
        gunModel.textureCanvas = document.createElement('canvas');
        gunModel.textureCanvas.width = gunModel.texture.width;
        gunModel.textureCanvas.height = gunModel.texture.height;
        var tctx = gunModel.textureCanvas.getContext('2d');
        tctx.drawImage(gunModel.texture, 0, 0);
        gunModel.textureData = tctx.getImageData(0, 0, gunModel.texture.width, gunModel.texture.height);
        gunModel.textureLoaded = true;
        console.log('Gun texture loaded:', gunModel.texture.width, 'x', gunModel.texture.height);
    };
    gunModel.texture.onerror = function() {
        console.error('Failed to load gun texture');
    };
    gunModel.texture.src = '3D_models/Gun _obj/Gun.png';
}

// Render gun viewmodel (first-person weapon overlay)
function RenderGunViewmodel(ctx) {
    var sw = screendata.canvas.width;
    var sh = screendata.canvas.height;

    // Scale gun position and size based on screen size
    // Use 800x600 as reference resolution
    var refWidth = 800;
    var refHeight = 600;

    // Use separate scale factors for X and Y positioning to handle aspect ratio changes
    var scaleX = Math.max(0.3, sw / refWidth);
    var scaleY = Math.max(0.3, sh / refHeight);
    // Use min for gun size so it doesn't get too large
    var sizeScale = Math.max(0.3, Math.min(scaleX, scaleY));

    // Apply separate scales to offsets for correct positioning
    var scaledOffsetX = gunModel.offsetX * scaleX;
    var scaledOffsetY = gunModel.offsetY * scaleY;

    var centerX = sw - scaledOffsetX;
    var centerY = sh - scaledOffsetY;

    if (!gunModel.loaded) {
        ctx.fillStyle = 'rgba(100,100,100,0.5)';
        ctx.fillRect(centerX - 50, centerY - 30, 100, 60);
        ctx.strokeStyle = 'white';
        ctx.strokeRect(centerX - 50, centerY - 30, 100, 60);
        ctx.fillStyle = 'yellow';
        ctx.font = '12px Arial';
        ctx.fillText('Gun loading...', centerX - 35, centerY + 5);
        var barrel = getBarrelScreenPos();
        ctx.beginPath();
        ctx.arc(barrel.x, barrel.y, 6, 0, Math.PI * 2);
        ctx.fillStyle = 'cyan';
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();
        return;
    }

    var rotX = gunModel.rotationX * Math.PI / 180;
    var rotY = gunModel.rotationY * Math.PI / 180;
    var rotZ = gunModel.rotationZ * Math.PI / 180;

    var cosX = Math.cos(rotX), sinX = Math.sin(rotX);
    var cosY = Math.cos(rotY), sinY = Math.sin(rotY);
    var cosZ = Math.cos(rotZ), sinZ = Math.sin(rotZ);

    var depthScale = 1 - gunModel.offsetZ / 200;
    var scale = gunModel.scale * depthScale * sizeScale;

    var projected = gunModel.vertices.map(v => {
        var x = v.x, y = v.y, z = v.z;
        var y1 = y * cosX - z * sinX;
        var z1 = y * sinX + z * cosX;
        var x2 = x * cosY + z1 * sinY;
        var z2 = -x * sinY + z1 * cosY;
        var x3 = x2 * cosZ - y1 * sinZ;
        var y3 = x2 * sinZ + y1 * cosZ;
        return {
            x: centerX + x3 * scale,
            y: centerY - y3 * scale,
            z: z2 + gunModel.offsetZ / 100
        };
    });

    var sortedFaces = gunModel.faces.map((faceData, i) => {
        var verts = faceData.verts;
        var avgZ = 0;
        verts.forEach(idx => avgZ += projected[idx].z);
        avgZ /= verts.length;
        return { faceData, avgZ, index: i };
    }).sort((a, b) => a.avgZ - b.avgZ);

    function sampleTexture(u, v) {
        if (!gunModel.textureLoaded || !gunModel.textureData) {
            return { r: 128, g: 128, b: 128 };
        }
        var tw = gunModel.texture.width;
        var th = gunModel.texture.height;
        u = u - Math.floor(u);
        v = 1 - (v - Math.floor(v));
        var px = Math.floor(u * (tw - 1));
        var py = Math.floor(v * (th - 1));
        var idx = (py * tw + px) * 4;
        var data = gunModel.textureData.data;
        return { r: data[idx], g: data[idx + 1], b: data[idx + 2] };
    }

    sortedFaces.forEach(item => {
        var verts = item.faceData.verts;
        var uvIndices = item.faceData.uvs;
        var p0 = projected[verts[0]];
        var p1 = projected[verts[1]];
        var p2 = projected[verts[2]];

        var ax = p1.x - p0.x, ay = p1.y - p0.y;
        var bx = p2.x - p0.x, by = p2.y - p0.y;
        var cross = ax * by - ay * bx;

        var shade = 0.5 + 0.5 * Math.abs(cross) / (Math.sqrt(ax*ax + ay*ay) * Math.sqrt(bx*bx + by*by) + 0.001);
        shade = Math.min(1, Math.max(0.3, shade));

        var r = 128, g = 128, b = 128;
        if (uvIndices && uvIndices.length >= 3 && gunModel.uvs && gunModel.uvs.length > 0) {
            var uv0 = gunModel.uvs[uvIndices[0]] || {u:0.5, v:0.5};
            var uv1 = gunModel.uvs[uvIndices[1]] || {u:0.5, v:0.5};
            var uv2 = gunModel.uvs[uvIndices[2]] || {u:0.5, v:0.5};
            var centerU = (uv0.u + uv1.u + uv2.u) / 3;
            var centerV = (uv0.v + uv1.v + uv2.v) / 3;
            var texColor = sampleTexture(centerU, centerV);
            r = texColor.r;
            g = texColor.g;
            b = texColor.b;
        }

        r = Math.floor(r * shade);
        g = Math.floor(g * shade);
        b = Math.floor(b * shade);

        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.closePath();
        ctx.fillStyle = 'rgb(' + r + ',' + g + ',' + b + ')';
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.1)';
        ctx.lineWidth = 0.5;
        ctx.stroke();
    });

    var barrel = getBarrelScreenPos();
    ctx.beginPath();
    ctx.arc(barrel.x, barrel.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = 'cyan';
    ctx.fill();
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 1;
    ctx.stroke();
}

// Render ground weapons (floating pickups)
function RenderGroundWeapons() {
    var ctx = screendata.context;
    var sw = screendata.canvas.width;
    var sinYaw = Math.sin(camera.angle);
    var cosYaw = Math.cos(camera.angle);
    var rx = cosYaw, ry = -sinYaw;
    var focal = camera.focalLength;

    groundWeapons.forEach(function(gw) {
        var dx = gw.x - camera.x;
        var dy = gw.y - camera.y;
        var groundForward = -dx * sinYaw - dy * cosYaw;

        if (groundForward < 1 || groundForward > 200) return;

        var right = dx * rx + dy * ry;
        var screenX = right * (sw / 2) / groundForward + sw / 2;
        var floatHeight = gw.z + 20 + Math.sin(Date.now() / 300) * 3;
        var screenY = (camera.height - floatHeight) * focal / groundForward + camera.horizon;

        var weaponDef = weapons[gw.type];
        var size = 30 * focal / groundForward;
        size = Math.max(10, Math.min(40, size));

        ctx.beginPath();
        ctx.arc(screenX, screenY, size / 2, 0, Math.PI * 2);
        ctx.fillStyle = weaponDef.bgColor;
        ctx.fill();
        ctx.strokeStyle = weaponDef.color;
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.fillStyle = 'white';
        ctx.font = 'bold ' + Math.floor(size * 0.6) + 'px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(weaponDef.letter, screenX, screenY + size * 0.2);
        ctx.textAlign = 'left';
    });
}
