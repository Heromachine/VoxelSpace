// ===============================
// Voxel Terrain Rendering Engine
// ===============================
"use strict";

// Terrain height functions
var getRawTerrainHeight=(x,y)=>map.altitude[((Math.floor(y)&(map.width-1))<<map.shift)+(Math.floor(x)&(map.height-1))];

// Get ground height including cube top surface
function getGroundHeight(x, y) {
    var terrainHeight = getRawTerrainHeight(x, y) + playerHeightOffset;

    // Check if position is within cube's X/Y bounds
    var halfSize = cube.size / 2;
    if (x >= cube.x - halfSize && x <= cube.x + halfSize &&
        y >= cube.y - halfSize && y <= cube.y + halfSize) {
        // Player is above cube footprint - check cube top
        var cubeBaseZ = getRawTerrainHeight(cube.x, cube.y);
        var cubeTopZ = cubeBaseZ + cube.size + playerHeightOffset;

        // Return the higher of terrain or cube top
        return Math.max(terrainHeight, cubeTopZ);
    }

    return terrainHeight;
}

// Render terrain using voxel space algorithm
function Render(){
    var sw=screendata.canvas.width,sh=screendata.canvas.height,
        sinang=Math.sin(camera.angle),cosang=Math.cos(camera.angle),
        deltaz=1,depth=screendata.depthBuffer;

    hiddeny.fill(sh);
    for(var z=1;z<camera.distance;z+=deltaz){
        var plx=-cosang*z-sinang*z,ply=sinang*z-cosang*z,prx=cosang*z-sinang*z,pry=-sinang*z-cosang*z,dx=(prx-plx)/sw,dy=(pry-ply)/sw;
        plx+=camera.x;ply+=camera.y;var invz = camera.focalLength / z;
        for(var i=0;i<sw;i++){
            var mapoffset=((Math.floor(ply)&(map.width-1))<<map.shift)+(Math.floor(plx)&(map.height-1));
            var heightonscreen=(camera.height-map.altitude[mapoffset])*invz+camera.horizon;
            if(heightonscreen<hiddeny[i]){
                for(var k=heightonscreen|0;k<hiddeny[i];k++){
                    var idx=k*sw+i;
                    if(z<depth[idx]){screendata.buf32[idx]=map.color[mapoffset];depth[idx]=z;}
                }
                hiddeny[i]=heightonscreen;
            }
            plx+=dx;ply+=dy;
        }
        if(z>1000)deltaz+=0.02;else deltaz+=0.005;
    }
}

function horizonToPitchRad(h){return h*90/500*Math.PI/180;}
