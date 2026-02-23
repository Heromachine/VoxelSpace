// ===============================
// Camera, Physics, and Player Movement
// ===============================
"use strict";

// Physics helpers
var MAX_SLOPE=2;
var PLAYER_RADIUS = 10; // Player collision radius for cube collision
var PUSH_OUT_BUFFER = 5; // Extra buffer to prevent camera clipping on rotation
var isOnGround=()=>camera.height<=getGroundHeight(camera.x,camera.y)+0.1;

// Ray-AABB intersection for bullet collision with cube
// Returns {t: distance, hit: {x,y,z}} or null if no hit
function rayIntersectsCube(rayOrigin, rayDir, segmentLength) {
    var halfSize = cube.size / 2;
    var cubeBaseZ = getRawTerrainHeight(cube.x, cube.y);

    var minX = cube.x - halfSize, maxX = cube.x + halfSize;
    var minY = cube.y - halfSize, maxY = cube.y + halfSize;
    var minZ = cubeBaseZ, maxZ = cubeBaseZ + cube.size;

    var tMin = 0, tMax = segmentLength;

    // X slab
    if (Math.abs(rayDir.x) < 0.0001) {
        if (rayOrigin.x < minX || rayOrigin.x > maxX) return null;
    } else {
        var t1 = (minX - rayOrigin.x) / rayDir.x;
        var t2 = (maxX - rayOrigin.x) / rayDir.x;
        if (t1 > t2) { var tmp = t1; t1 = t2; t2 = tmp; }
        tMin = Math.max(tMin, t1);
        tMax = Math.min(tMax, t2);
        if (tMin > tMax) return null;
    }

    // Y slab
    if (Math.abs(rayDir.y) < 0.0001) {
        if (rayOrigin.y < minY || rayOrigin.y > maxY) return null;
    } else {
        var t1 = (minY - rayOrigin.y) / rayDir.y;
        var t2 = (maxY - rayOrigin.y) / rayDir.y;
        if (t1 > t2) { var tmp = t1; t1 = t2; t2 = tmp; }
        tMin = Math.max(tMin, t1);
        tMax = Math.min(tMax, t2);
        if (tMin > tMax) return null;
    }

    // Z slab
    if (Math.abs(rayDir.z) < 0.0001) {
        if (rayOrigin.z < minZ || rayOrigin.z > maxZ) return null;
    } else {
        var t1 = (minZ - rayOrigin.z) / rayDir.z;
        var t2 = (maxZ - rayOrigin.z) / rayDir.z;
        if (t1 > t2) { var tmp = t1; t1 = t2; t2 = tmp; }
        tMin = Math.max(tMin, t1);
        tMax = Math.min(tMax, t2);
        if (tMin > tMax) return null;
    }

    // Hit found
    return {
        t: tMin,
        hit: {
            x: rayOrigin.x + rayDir.x * tMin,
            y: rayOrigin.y + rayDir.y * tMin,
            z: rayOrigin.z + rayDir.z * tMin
        }
    };
}

// Check if position collides with the cube (AABB collision)
function collidesWithCube(x, y, z) {
    var halfSize = cube.size / 2;
    var cubeBaseZ = getRawTerrainHeight(cube.x, cube.y);
    var cubeTopZ = cubeBaseZ + cube.size;

    // Check X bounds (with player radius)
    if (x + PLAYER_RADIUS < cube.x - halfSize) return false;
    if (x - PLAYER_RADIUS > cube.x + halfSize) return false;

    // Check Y bounds (with player radius)
    if (y + PLAYER_RADIUS < cube.y - halfSize) return false;
    if (y - PLAYER_RADIUS > cube.y + halfSize) return false;

    // Check Z bounds - allow walking on top
    // z is camera.height (player feet position, includes playerHeightOffset)
    // If player's feet are at or above cube top, they're standing ON the cube, not colliding
    var feetZ = z - playerHeightOffset;  // Convert back to raw height
    if (feetZ >= cubeTopZ - 1) return false;  // Standing on top (1 unit tolerance)
    if (feetZ < cubeBaseZ) return false;  // Below cube (shouldn't happen normally)

    return true;  // Collision with cube sides!
}

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

var canMoveTo=(nx,ny)=>{
    // Check cube collision first
    var playerZ = camera.height;
    if (collidesWithCube(nx, ny, playerZ)) return false;

    // Original slope checking (only when on ground)
    if(!isOnGround())return true;
    var curH=getGroundHeight(camera.x,camera.y),newH=getGroundHeight(nx,ny);
    if(newH<=curH)return true;
    var horizDist=Math.hypot(nx-camera.x,ny-camera.y);
    if(!horizDist)return true;
    return (newH-curH)/horizDist<=MAX_SLOPE;
};

// Main camera update function - handles movement, jumping, shooting
function UpdateCamera(){
    var current=Date.now(),deltaTime=(current-time)*0.03,
        isSprinting = input.sprint || input.gpSprint,
        baseSpeed=player.moveSpeed*(isSprinting?player.sprintMultiplier:1)*deltaTime,nx,ny,slopeMult;

    // Gamepad look (Right Stick)
    if(input.lookX !== 0 || input.lookY !== 0){
        camera.angle = (camera.angle - input.lookX * gamepad.lookSensitivity) % (2 * Math.PI);
        if(camera.angle < 0) camera.angle += 2 * Math.PI;
        camera.horizon = Math.max(-400, Math.min(600, camera.horizon - input.lookY * gamepad.lookSensitivity * 100));
    }

    // Push player away from cube if too close (prevents camera clipping on rotation)
    pushAwayFromCube();

    // Keyboard Movement
    if(input.forward){nx=camera.x-Math.sin(camera.angle)*baseSpeed;ny=camera.y-Math.cos(camera.angle)*baseSpeed;slopeMult=canMoveTo(nx,ny);camera.x+=(nx-camera.x)*slopeMult;camera.y+=(ny-camera.y)*slopeMult;}
    if(input.backward){nx=camera.x+Math.sin(camera.angle)*baseSpeed;ny=camera.y+Math.cos(camera.angle)*baseSpeed;slopeMult=canMoveTo(nx,ny);camera.x+=(nx-camera.x)*slopeMult;camera.y+=(ny-camera.y)*slopeMult;}
    if(input.left){nx=camera.x-Math.cos(camera.angle)*baseSpeed;ny=camera.y+Math.sin(camera.angle)*baseSpeed;slopeMult=canMoveTo(nx,ny);camera.x+=(nx-camera.x)*slopeMult;camera.y+=(ny-camera.y)*slopeMult;}
    if(input.right){nx=camera.x+Math.cos(camera.angle)*baseSpeed;ny=camera.y-Math.sin(camera.angle)*baseSpeed;slopeMult=canMoveTo(nx,ny);camera.x+=(nx-camera.x)*slopeMult;camera.y+=(ny-camera.y)*slopeMult;}

    // Gamepad Movement (Left Stick) - analog for smooth control
    if(input.moveX !== 0 || input.moveY !== 0){
        var fx = -Math.sin(camera.angle), fy = -Math.cos(camera.angle); // forward
        var rx = Math.cos(camera.angle), ry = -Math.sin(camera.angle);  // right
        var moveSpeed = baseSpeed * Math.min(1, Math.hypot(input.moveX, input.moveY));

        nx = camera.x + (fx * -input.moveY + rx * input.moveX) * moveSpeed;
        ny = camera.y + (fy * -input.moveY + ry * input.moveX) * moveSpeed;
        slopeMult = canMoveTo(nx, ny);
        camera.x += (nx - camera.x) * slopeMult;
        camera.y += (ny - camera.y) * slopeMult;
    }

    camera.velocityY-=0.5*deltaTime;camera.height+=camera.velocityY*deltaTime;

    // Ground clamping FIRST - ensures consistent state for jump check
    var groundHeight=getGroundHeight(camera.x,camera.y);
    var wasInAir = camera.height > groundHeight + 1; // track if falling
    if(camera.height < groundHeight){
        camera.height = groundHeight;
        camera.velocityY = 0;
    }

    // Crouch handling
    var isCrouching = input.crouch || input.gpCrouch;
    if(isCrouching){if(!player.isCrouching){player.isCrouching=true;}}
    else if(player.isCrouching){player.isCrouching=false;}

    // Charged jump system - hold to charge, release to jump
    var jumpHeld = input.jump || input.gpJumpHeld;
    var jumpBar = document.getElementById('jumpbar');
    var jumpCharge = document.getElementById('jumpcharge');
    // More forgiving ground check: within 2 units of ground and not moving up fast
    var onGround = (camera.height <= groundHeight + 2) && (camera.velocityY <= 0.5);

    if(jumpHeld){
        // Button is held
        if(onGround && !player.isChargingJump){
            // Just started pressing while on ground - begin charging
            player.isChargingJump = true;
            player.jumpChargeTime = 0;
        }

        if(player.isChargingJump){
            // Continue charging (don't require ground check each frame)
            player.jumpChargeTime = Math.min(player.jumpChargeTime + (current - time), player.jumpMaxChargeTime);

            // Show and update charge bar
            if(jumpBar) jumpBar.style.display = 'block';
            if(jumpCharge){
                var chargePercent = (player.jumpChargeTime / player.jumpMaxChargeTime) * 100;
                jumpCharge.style.width = chargePercent + '%';
            }
        }
    } else {
        // Button released
        if(player.isChargingJump){
            // Was charging - JUMP!
            var chargeRatio = player.jumpChargeTime / player.jumpMaxChargeTime;
            var jumpStrength = player.jumpMinStrength + (player.jumpMaxStrength - player.jumpMinStrength) * chargeRatio;
            camera.velocityY = jumpStrength;
        }

        // Reset charge state
        player.isChargingJump = false;
        player.jumpChargeTime = 0;
        if(jumpBar) jumpBar.style.display = 'none';
        if(jumpCharge) jumpCharge.style.width = '0%';
    }

    // Weapon swap (Q key or Y button)
    var wantSwap = input.swapWeapon || input.gpSwapWeapon;
    if(wantSwap && !player.wasSwapping){
        currentWeaponIndex = (currentWeaponIndex + 1) % 2;
    }
    player.wasSwapping = wantSwap;
    input.swapWeapon = false;  // Reset edge-triggered input
    input.gpSwapWeapon = false;

    // Get current weapon info
    var currentSlot = playerWeapons[currentWeaponIndex];
    var currentWeapon = weapons[currentSlot.type];

    // Check for nearby ground weapons (within 15 degrees of view and close enough)
    nearbyWeapon = null;
    var fx = -Math.sin(camera.angle), fy = -Math.cos(camera.angle);
    groundWeapons.forEach(function(gw) {
        var dx = gw.x - camera.x;
        var dy = gw.y - camera.y;
        var dist = Math.hypot(dx, dy);
        if(dist < 50) {  // Within pickup range
            // Check if facing it (within 15 degrees)
            var dot = (dx * fx + dy * fy) / dist;
            if(dot > Math.cos(15 * Math.PI / 180)) {  // cos(15deg) = 0.966
                nearbyWeapon = gw;
            }
        }
    });

    // Pickup weapon (E key or X button when near weapon)
    var wantPickup = input.pickupWeapon || input.gpPickupWeapon;
    if(wantPickup && nearbyWeapon && !player.wasPickingUp){
        // Swap current weapon with ground weapon
        var oldType = currentSlot.type;
        var oldAmmo = currentSlot.ammo;
        currentSlot.type = nearbyWeapon.type;
        currentSlot.ammo = weapons[nearbyWeapon.type].maxMagazine;
        currentSlot.isReloading = false;
        // Put old weapon on ground
        nearbyWeapon.type = oldType;
        nearbyWeapon.ammo = oldAmmo;
    }
    player.wasPickingUp = wantPickup;

    // Shooting - Hip fire or Iron sights (ADS)
    var isShooting = input.shoot || input.gpShoot;
    var isAiming = input.aimToggled;

    // ADS handling - Camera 1 (main) stays normal, scope uses Camera 2
    var fx = -Math.sin(camera.angle);
    var fy = -Math.cos(camera.angle);

    // Update scope camera state (Camera 2 for PiP) - using modular scope system
    if (activeScope) {
        activeScope.updateCamera(isAiming, currentWeapon.useScope);
    }

    // Main camera (Camera 1) - normal ADS behavior, unchanged for scoped weapons
    var adsForwardDistance = currentWeapon.useScope ? 0 : (currentWeapon.adsZoom - 1) * 30;
    var targetOffset = isAiming && !currentWeapon.useScope ? adsForwardDistance : 0;
    camera.adsOffset += (targetOffset - camera.adsOffset) * 0.15;

    // Keep main camera focal length constant
    camera.focalLength = camera.baseFocalLength;

    // Apply offset along look direction for main camera
    camera.baseX = camera.x - fx * camera.adsOffset;
    camera.baseY = camera.y - fy * camera.adsOffset;
    camera.x = camera.baseX + fx * camera.adsOffset;
    camera.y = camera.baseY + fy * camera.adsOffset;

    // Interpolate gun position between hip fire and ADS
    var targetLerp = isAiming ? 1 : 0;
    gunModel.adsLerp += (targetLerp - gunModel.adsLerp) * gunModel.adsLerpSpeed;

    // Lerp helper function
    function lerp(a, b, t) { return a + (b - a) * t; }

    // Update current gun position/rotation based on interpolation
    gunModel.offsetX = lerp(gunModel.hipOffsetX, gunModel.adsOffsetX, gunModel.adsLerp);
    gunModel.offsetY = lerp(gunModel.hipOffsetY, gunModel.adsOffsetY, gunModel.adsLerp);
    gunModel.offsetZ = lerp(gunModel.hipOffsetZ, gunModel.adsOffsetZ, gunModel.adsLerp);
    gunModel.scale = lerp(gunModel.hipScale, gunModel.adsScale, gunModel.adsLerp);
    gunModel.rotationX = lerp(gunModel.hipRotationX, gunModel.adsRotationX, gunModel.adsLerp);
    gunModel.rotationY = lerp(gunModel.hipRotationY, gunModel.adsRotationY, gunModel.adsLerp);
    gunModel.rotationZ = lerp(gunModel.hipRotationZ, gunModel.adsRotationZ, gunModel.adsLerp);

    // Update current barrel settings based on interpolation
    gunModel.barrelX = lerp(gunModel.hipBarrelX, gunModel.adsBarrelX, gunModel.adsLerp);
    gunModel.barrelY = lerp(gunModel.hipBarrelY, gunModel.adsBarrelY, gunModel.adsLerp);
    gunModel.barrelZ = lerp(gunModel.hipBarrelZ, gunModel.adsBarrelZ, gunModel.adsLerp);
    gunModel.barrelYaw = lerp(gunModel.hipBarrelYaw, gunModel.adsBarrelYaw, gunModel.adsLerp);

    // Update current world offset based on interpolation
    gunModel.worldForward = lerp(gunModel.hipWorldForward, gunModel.adsWorldForward, gunModel.adsLerp);
    gunModel.worldRight = lerp(gunModel.hipWorldRight, gunModel.adsWorldRight, gunModel.adsLerp);
    gunModel.worldDown = lerp(gunModel.hipWorldDown, gunModel.adsWorldDown, gunModel.adsLerp);

    // Update pivot mode based on ADS state
    gunModel.pivotMode = isAiming ? 'barrel' : 'grip';

    // Update crosshair style based on ADS and current weapon
    var crosshair = document.getElementById('crosshair');
    if(crosshair){
        // Hide crosshair when using scope (scope has its own reticle)
        if(isAiming && currentWeapon.useScope){
            crosshair.style.display = 'none';
        } else if(isAiming){
            crosshair.style.display = 'block';
            crosshair.style.borderColor = currentWeapon.color;
            crosshair.style.width = '6px';
            crosshair.style.height = '6px';
            crosshair.style.margin = '-3px 0 0 -3px';
        } else {
            crosshair.style.display = 'block';
            crosshair.style.borderColor = 'white';
            crosshair.style.width = '10px';
            crosshair.style.height = '10px';
            crosshair.style.margin = '-5px 0 0 -5px';
        }
    }

    // Check fire mode - semi-auto requires trigger release between shots
    var canShoot = true;
    if(currentWeapon.fireMode === "semi" && player.wasShooting){
        canShoot = false;
    }
    player.wasShooting = isShooting;

    if(isShooting && canShoot && !currentSlot.isReloading && currentSlot.ammo > 0 && current - currentSlot.lastShot > currentWeapon.fireRate){
        var bulletSpeed = currentWeapon.bulletSpeed;

        // Camera direction vectors (horizontal)
        var fx = -Math.sin(camera.angle), fy = -Math.cos(camera.angle);
        var rx = Math.cos(camera.angle), ry = -Math.sin(camera.angle);

        // Get bullet direction based on ADS mode
        var aimDirX, aimDirY, aimDirZ;
        if (gunModel.pivotMode === 'barrel') {
            // ADS mode: bullet goes toward SCREEN CENTER (where crosshair is)
            var screenCenterY = screendata.canvas.height / 2;
            var screenCenterPitch = Math.atan((camera.horizon - screenCenterY) / camera.focalLength);
            var cosPitch = Math.cos(screenCenterPitch);
            var sinPitch = Math.sin(screenCenterPitch);
            aimDirX = fx * cosPitch;
            aimDirY = fy * cosPitch;
            aimDirZ = sinPitch;
        } else {
            // Hip fire mode: use gun's own rotation
            var gunDir = getGunWorldDirection();
            aimDirX = gunDir.x;
            aimDirY = gunDir.y;
            aimDirZ = gunDir.z;
        }

        // Apply spread based on hip fire vs ADS (from WeaponConfig)
        var weaponSpread = WeaponConfig.getWeaponSpread(currentSlot.type);
        var spread = isAiming ? weaponSpread.adsSpread : weaponSpread.hipSpread;
        var spreadX = (Math.random() - 0.5) * spread;
        var spreadY = (Math.random() - 0.5) * spread;

        // Add spread to aim direction
        var dirx = aimDirX + rx * spreadX;
        var diry = aimDirY + ry * spreadX;
        var dirz = aimDirZ + spreadY;

        var mag = Math.hypot(dirx, diry, dirz) || 1;
        dirx = (dirx / mag) * bulletSpeed;
        diry = (diry / mag) * bulletSpeed;
        dirz = (dirz / mag) * bulletSpeed;

        // Spawn bullet from gun barrel position in world space
        var barrelPos = getBarrelWorldPos();
        var spawnX = barrelPos.x + barrelPos.dirX * gunModel.barrelDistance;
        var spawnY = barrelPos.y + barrelPos.dirY * gunModel.barrelDistance;
        var spawnZ = barrelPos.z + barrelPos.dirZ * gunModel.barrelDistance;

        lastBulletDestroyedPos = null;
        lastBulletDestroyedReason = null;

        // Normalize direction for raycast
        var rayDirX = dirx / bulletSpeed;
        var rayDirY = diry / bulletSpeed;
        var rayDirZ = dirz / bulletSpeed;

        // Try hitscan first (for targets within hitscan range)
        var hitscanHitPos = null;

        // Hitscan cube collision
        if (hitscanDistance > 0 && !currentWeapon.ccdOnly) {
            var cubeHitscan = rayIntersectsCube(
                {x: spawnX, y: spawnY, z: spawnZ},
                {x: rayDirX, y: rayDirY, z: rayDirZ},
                hitscanDistance
            );
            if (cubeHitscan) {
                hitscanHitPos = {x: cubeHitscan.hit.x, y: cubeHitscan.hit.y, z: cubeHitscan.hit.z, dist: cubeHitscan.t};
            }
        }

        // Hitscan test target collision (only if we didn't hit cube first, or cube is further)
        if (testTarget.enabled && hitscanDistance > 0 && !currentWeapon.ccdOnly) {
            // Ray-sphere intersection test
            var ocX = spawnX - testTarget.x;
            var ocY = spawnY - testTarget.y;
            var ocZ = spawnZ - testTarget.z;

            var a = rayDirX*rayDirX + rayDirY*rayDirY + rayDirZ*rayDirZ;
            var b = 2 * (ocX*rayDirX + ocY*rayDirY + ocZ*rayDirZ);
            var c = ocX*ocX + ocY*ocY + ocZ*ocZ - testTarget.radius*testTarget.radius;
            var discriminant = b*b - 4*a*c;

            if (discriminant >= 0) {
                var t = (-b - Math.sqrt(discriminant)) / (2*a);
                if (t < 0) t = (-b + Math.sqrt(discriminant)) / (2*a);

                if (t >= 0 && t <= hitscanDistance) {
                    // Only count as target hit if closer than cube hit
                    if (!hitscanHitPos || t < hitscanHitPos.dist) {
                        testTarget.hits++;
                        var hitX = spawnX + rayDirX * t;
                        var hitY = spawnY + rayDirY * t;
                        var hitZ = spawnZ + rayDirZ * t;
                        hitscanHitPos = {x: hitX, y: hitY, z: hitZ, dist: t};
                        testTarget.bulletHitPos = {
                            x: hitX - testTarget.x,
                            y: hitY - testTarget.y,
                            z: hitZ - testTarget.z,
                            dist: Math.sqrt((hitX-testTarget.x)**2 + (hitY-testTarget.y)**2 + (hitZ-testTarget.z)**2)
                        };
                    }
                }
            }
        }

        // Always spawn a bullet (for visual)
        var bullet = {
            type: "bullet",
            x: spawnX, y: spawnY, z: spawnZ,
            prevX: spawnX, prevY: spawnY, prevZ: spawnZ,
            dx: dirx, dy: diry, dz: dirz,
            distance: 0,
            image: textures.bullet,
            damage: currentWeapon.damage,
            hitscanHit: hitscanHitPos,
            stopDistance: hitscanHitPos ? hitscanHitPos.dist : null
        };
        lastBullet = bullet;
        items.push(bullet);

        if (typeof Multiplayer !== "undefined" && Multiplayer.isConnected()) {
            Multiplayer.sendShoot(spawnX, spawnY, spawnZ, dirx, diry, dirz);
        }

        currentSlot.ammo--;
        currentSlot.lastShot = current;
    }

    // Reload current weapon
    var isReloading = input.reload || input.gpReload;
    if(isReloading && !currentSlot.isReloading && currentSlot.ammo < currentWeapon.maxMagazine){
        currentSlot.isReloading = true;
        setTimeout(function(){
            currentSlot.ammo = currentWeapon.maxMagazine;
            currentSlot.isReloading = false;
        }, currentWeapon.reloadTime);
    }

    // Update moving items (bullets only) - with CCD collision detection
    items = items.filter(it=>{
        if(it.type==="bullet"){
            it.prevX = it.x;
            it.prevY = it.y;
            it.prevZ = it.z;

            it.x+=it.dx*deltaTime;it.y+=it.dy*deltaTime;it.z+=it.dz*deltaTime;it.distance+=Math.hypot(it.dx,it.dy,it.dz)*deltaTime;

            if (!it.remote && it.hitscanHit && it.distance >= it.stopDistance) {
                if(it===lastBullet){
                    lastBullet=null;
                    lastBulletDestroyedPos={x:it.hitscanHit.x, y:it.hitscanHit.y, z:it.hitscanHit.z};
                    lastBulletDestroyedReason="Hitscan Hit!";
                }
                return false;
            }

            if (!it.remote && testTarget.enabled && !it.hitscanHit) {
                var segDirX = it.x - it.prevX;
                var segDirY = it.y - it.prevY;
                var segDirZ = it.z - it.prevZ;
                var segLen = Math.sqrt(segDirX*segDirX + segDirY*segDirY + segDirZ*segDirZ);

                if (segLen > 0) {
                    var rayDirX = segDirX / segLen;
                    var rayDirY = segDirY / segLen;
                    var rayDirZ = segDirZ / segLen;

                    var ocX = it.prevX - testTarget.x;
                    var ocY = it.prevY - testTarget.y;
                    var ocZ = it.prevZ - testTarget.z;

                    var a = rayDirX*rayDirX + rayDirY*rayDirY + rayDirZ*rayDirZ;
                    var b = 2 * (ocX*rayDirX + ocY*rayDirY + ocZ*rayDirZ);
                    var c = ocX*ocX + ocY*ocY + ocZ*ocZ - testTarget.radius*testTarget.radius;
                    var discriminant = b*b - 4*a*c;

                    if (discriminant >= 0) {
                        var t = (-b - Math.sqrt(discriminant)) / (2*a);
                        if (t < 0) t = (-b + Math.sqrt(discriminant)) / (2*a);

                        if (t >= 0 && t <= segLen) {
                            testTarget.hits++;
                            var hitX = it.prevX + rayDirX * t;
                            var hitY = it.prevY + rayDirY * t;
                            var hitZ = it.prevZ + rayDirZ * t;
                            testTarget.bulletHitPos = {
                                x: hitX - testTarget.x,
                                y: hitY - testTarget.y,
                                z: hitZ - testTarget.z,
                                dist: Math.sqrt((hitX-testTarget.x)**2 + (hitY-testTarget.y)**2 + (hitZ-testTarget.z)**2)
                            };
                            if(it===lastBullet){lastBullet=null;lastBulletDestroyedPos={x:hitX,y:hitY,z:hitZ};lastBulletDestroyedReason="CCD Hit!";}
                            return false;
                        }
                    }

                    var prevDist = Math.sqrt((it.prevX-testTarget.x)**2 + (it.prevY-testTarget.y)**2);
                    var currDist = Math.sqrt((it.x-testTarget.x)**2 + (it.y-testTarget.y)**2);
                    if (it.prevDistToTarget && it.prevDistToTarget < currDist && it.prevDistToTarget < testTarget.radius * 3) {
                        testTarget.misses++;
                    }
                    it.prevDistToTarget = currDist;
                }
            }

            // Cube collision (CCD ray-AABB intersection)
            if (it.remote) {
                var terrainHeight=getRawTerrainHeight(it.x,it.y);
                if(it.z<=terrainHeight) return false;
                if(it.distance>=ccdMaxDistance) return false;
                return true;
            }
            var segDx = it.x - it.prevX;
            var segDy = it.y - it.prevY;
            var segDz = it.z - it.prevZ;
            var segLen = Math.sqrt(segDx*segDx + segDy*segDy + segDz*segDz);
            if (segLen > 0) {
                var cubeHit = rayIntersectsCube(
                    {x: it.prevX, y: it.prevY, z: it.prevZ},
                    {x: segDx/segLen, y: segDy/segLen, z: segDz/segLen},
                    segLen
                );
                if (cubeHit) {
                    if(it===lastBullet){
                        lastBullet=null;
                        lastBulletDestroyedPos = cubeHit.hit;
                        lastBulletDestroyedReason = "Cube Hit!";
                    }
                    return false;
                }
            }

            var terrainHeight=getRawTerrainHeight(it.x,it.y);
            if(it.z<=terrainHeight){if(it===lastBullet){lastBullet=null;lastBulletDestroyedPos={x:it.x,y:it.y,z:it.z};lastBulletDestroyedReason="Terrain Collision";}return false;}

            if(it.distance>=ccdMaxDistance){if(it===lastBullet){lastBullet=null;lastBulletDestroyedPos={x:it.x,y:it.y,z:it.z};lastBulletDestroyedReason="Max Range";}return false;}
        }
        return true;
    });

    // HUD updates
    document.getElementById('health').style.width=player.health+'%';
    var wepSlot = playerWeapons[currentWeaponIndex];
    var wepDef = weapons[wepSlot.type];
    document.getElementById('debug-bulletcount').innerText=`${wepDef.name}: ${wepSlot.ammo}/${wepDef.maxMagazine}${wepSlot.isReloading ? ' [RELOADING]' : ''}`;
    document.getElementById('debug-playerposition').innerText=`(${camera.x.toFixed(1)}, ${camera.y.toFixed(1)}, ${camera.height.toFixed(1)})`;
    document.getElementById('debug-playerrotation').innerText=`${(camera.angle*180/Math.PI).toFixed(1)}°, ${(camera.horizon*90/500).toFixed(1)}°`;
    document.getElementById('debug-lastbulletpos').innerText=lastBullet?`(${lastBullet.x.toFixed(1)}, ${lastBullet.y.toFixed(1)}, ${lastBullet.z.toFixed(1)})`:`None`;
    document.getElementById('debug-lastbulletscreen').innerText=lastBulletScreen?`(${lastBulletScreen.x.toFixed(0)}, ${lastBulletScreen.y.toFixed(0)}) z:${lastBulletScreen.z.toFixed(1)}`:`None`;
    document.getElementById('debug-lastbulletdestroyedpos').innerText=lastBulletDestroyedPos?`(${lastBulletDestroyedPos.x.toFixed(1)}, ${lastBulletDestroyedPos.y.toFixed(1)}, ${lastBulletDestroyedPos.z.toFixed(1)})`:`None`;
    document.getElementById('debug-lastbulletdestroyedreason').innerText=lastBulletDestroyedReason?`${lastBulletDestroyedReason}`:`None`;

    time=current;
}
