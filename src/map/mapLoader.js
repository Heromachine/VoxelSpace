// ===============================
// Map Loading
// ===============================
"use strict";

function DownloadImagesAsync(urls){
    return new Promise(function(resolve){
        var pending=urls.length,result=[];
        if(!pending){resolve([]);return;}
        urls.forEach(function(url,i){
            var img=new Image();
            img.onload=function(){
                var tcv=document.createElement("canvas"),
                    tcx=tcv.getContext("2d");
                tcv.width=map.width;
                tcv.height=map.height;
                tcx.drawImage(img,0,0,map.width,map.height);
                result[i]=tcx.getImageData(0,0,map.width,map.height).data;
                pending--;
                if(!pending)resolve(result);
            };
            img.src=url;
        });
    });
}

function LoadMap(files){
    var f=files.split(";");
    DownloadImagesAsync(["maps/"+f[0]+".png","maps/"+f[1]+".png"]).then(OnLoadedImages);
}

function OnLoadedImages(result){
    var datac = result[0], datah = result[1];
    for (var i = 0; i < map.width * map.height; i++) {
        map.color[i] = 0xFF000000 |
                       (datac[(i<<2)+2] << 16) |
                       (datac[(i<<2)+1] << 8) |
                        datac[(i<<2)+0];
        map.altitude[i] = datah[i<<2];
    }

    // Flatten terrain under the cube
    flattenTerrainUnderCube();

    // Start draw loop
    Draw();
}

// Flatten terrain within the cube's footprint to prevent terrain poking through
function flattenTerrainUnderCube() {
    var s = cube.size;
    var minX = Math.floor(cube.x - s/2);
    var maxX = Math.ceil(cube.x + s/2);
    var minY = Math.floor(cube.y - s/2);
    var maxY = Math.ceil(cube.y + s/2);

    // Find the minimum height within the cube's footprint
    var minHeight = 255;
    for (var y = minY; y <= maxY; y++) {
        for (var x = minX; x <= maxX; x++) {
            var mx = x & (map.width - 1);
            var my = y & (map.height - 1);
            var idx = (my << map.shift) + mx;
            if (map.altitude[idx] < minHeight) {
                minHeight = map.altitude[idx];
            }
        }
    }

    // Set all terrain within cube footprint to that minimum height
    for (var y = minY; y <= maxY; y++) {
        for (var x = minX; x <= maxX; x++) {
            var mx = x & (map.width - 1);
            var my = y & (map.height - 1);
            var idx = (my << map.shift) + mx;
            map.altitude[idx] = minHeight;
        }
    }

    // Add one fixed heart as a test
    items.push({
        type: "heart",
        x: 20, y: 110, z: getGroundHeight(20,110)+50,
        dx: 0, dy: 0, dz: 0,
        image: textures.heart
    });

    // Spawn a pistol on the ground near player start
    groundWeapons.push({
        type: "pistol",
        x: 40,
        y: 40,
        z: getRawTerrainHeight(40, 40)
    });

    // Spawn random trees on green-ish terrain
    spawnRandomItems("tree", textures.tree, {
        step: 8,
        chance: 0.01,
        colorCheck: (col) => ((col & 0x00FF00) > 0x004000)
    });
}
