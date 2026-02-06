// ===============================
// Voxel Terrain Rendering Engine
// ===============================
"use strict";

// Terrain height functions
var getRawTerrainHeight=(x,y)=>map.altitude[((Math.floor(y)&(map.width-1))<<map.shift)+(Math.floor(x)&(map.height-1))];
var getGroundHeight=(x,y)=>getRawTerrainHeight(x,y)+playerHeightOffset;

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
