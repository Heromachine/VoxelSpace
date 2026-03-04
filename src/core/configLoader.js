// ===============================
// JSON Config Loader
// ===============================
"use strict";

var ConfigLoader = {
    loaded: false,
    settings: null,
    gunModel: null,
    weapons: null,
    display: null,
    gamepadConfig: null,

    // Load all JSON configs
    loadAll: async function() {
        try {
            const [settings, gunModelData, weapons, display, gamepadData] = await Promise.all([
                fetch('data/settings.json').then(r => r.json()).catch(() => null),
                fetch('data/gunModel.json').then(r => r.json()).catch(() => null),
                fetch('data/weapons.json').then(r => r.json()).catch(() => null),
                fetch('data/display.json').then(r => r.json()).catch(() => null),
                fetch('data/gamepad.json').then(r => r.json()).catch(() => null)
            ]);

            this.settings = settings;
            this.gunModel = gunModelData;
            this.weapons = weapons;
            this.display = display;
            this.gamepadConfig = gamepadData;
            this.loaded = true;

            console.log('JSON configs loaded from data/ folder');
            return true;
        } catch (error) {
            console.log('Could not load JSON configs:', error);
            return false;
        }
    },

    // Apply loaded settings to game state
    applyGunModel: function(gm) {
        if (!this.gunModel || !gm) return;
        var data = this.gunModel;

        // ADS visual settings → gunViewModel (independent from mechanics)
        if (data.ads) {
            gunViewModel.adsOffsetX = data.ads.offsetX;
            gunViewModel.adsOffsetY = data.ads.offsetY;
            gunViewModel.adsOffsetZ = data.ads.offsetZ;
            gunViewModel.adsScale = data.ads.scale;
            gunViewModel.adsRotationX = data.ads.rotationX;
            gunViewModel.adsRotationY = data.ads.rotationY;
            gunViewModel.adsRotationZ = data.ads.rotationZ;
        }

        // Hip visual settings → gunViewModel (independent from mechanics)
        if (data.hip) {
            gunViewModel.hipOffsetX = data.hip.offsetX;
            gunViewModel.hipOffsetY = data.hip.offsetY;
            gunViewModel.hipOffsetZ = data.hip.offsetZ;
            gunViewModel.hipScale = data.hip.scale;
            gunViewModel.hipRotationX = data.hip.rotationX;
            gunViewModel.hipRotationY = data.hip.rotationY;
            gunViewModel.hipRotationZ = data.hip.rotationZ;
        }

        // Barrel settings (support both old single format and new ads/hip format)
        if (data.barrel) {
            // Check for new ADS/Hip barrel format
            if (data.barrel.ads) {
                gm.adsBarrelX = data.barrel.ads.x;
                gm.adsBarrelY = data.barrel.ads.y;
                gm.adsBarrelZ = data.barrel.ads.z;
                gm.adsBarrelYaw = data.barrel.ads.yaw || 0;
            } else {
                // Old format - apply to ADS
                gm.adsBarrelX = data.barrel.x;
                gm.adsBarrelY = data.barrel.y;
                gm.adsBarrelZ = data.barrel.z;
                gm.adsBarrelYaw = data.barrel.yaw || 0;
            }

            if (data.barrel.hip) {
                gm.hipBarrelX = data.barrel.hip.x;
                gm.hipBarrelY = data.barrel.hip.y;
                gm.hipBarrelZ = data.barrel.hip.z;
                gm.hipBarrelYaw = data.barrel.hip.yaw || 0;
            } else {
                // Old format - use same as ADS for hip
                gm.hipBarrelX = gm.adsBarrelX;
                gm.hipBarrelY = gm.adsBarrelY;
                gm.hipBarrelZ = gm.adsBarrelZ;
                gm.hipBarrelYaw = gm.adsBarrelYaw;
            }

            gm.barrelDistance = data.barrel.distance;
        }

        // World settings (support both old single format and new ads/hip format)
        if (data.world) {
            if (data.world.ads) {
                gm.adsWorldForward = data.world.ads.forward;
                gm.adsWorldRight = data.world.ads.right;
                gm.adsWorldDown = data.world.ads.down;
            } else {
                // Old format - apply to ADS
                gm.adsWorldForward = data.world.forward;
                gm.adsWorldRight = data.world.right;
                gm.adsWorldDown = data.world.down;
            }

            if (data.world.hip) {
                gm.hipWorldForward = data.world.hip.forward;
                gm.hipWorldRight = data.world.hip.right;
                gm.hipWorldDown = data.world.hip.down;
            } else {
                // Old format - use same as ADS for hip
                gm.hipWorldForward = gm.adsWorldForward;
                gm.hipWorldRight = gm.adsWorldRight;
                gm.hipWorldDown = gm.adsWorldDown;
            }
        }

        if (data.adsLerpSpeed) gm.adsLerpSpeed = data.adsLerpSpeed;

        console.log('Applied gun model settings from JSON');
    },

    // Apply weapon data to WeaponConfig
    applyWeapons: function() {
        if (!this.weapons || typeof WeaponConfig === 'undefined') return;
        WeaponConfig.weapons = this.weapons;
        console.log('Applied weapons config from JSON');
    },

    // Apply gamepad config to global gamepad object
    applyGamepad: function() {
        if (!this.gamepadConfig || typeof gamepad === 'undefined') return;
        var data = this.gamepadConfig;

        if (data.deadzone !== undefined) gamepad.deadzone = data.deadzone;
        if (data.lookSensitivity !== undefined) gamepad.lookSensitivity = data.lookSensitivity;

        if (data.buttons) {
            if (data.buttons.jump !== undefined) gamepad.buttons.jump = data.buttons.jump;
            if (data.buttons.crouch !== undefined) gamepad.buttons.crouch = data.buttons.crouch;
            if (data.buttons.reload !== undefined) gamepad.buttons.reload = data.buttons.reload;
            if (data.buttons.sprint !== undefined) gamepad.buttons.sprint = data.buttons.sprint;
            if (data.buttons.sprintAlt !== undefined) gamepad.buttons.sprintAlt = data.buttons.sprintAlt;
            if (data.buttons.shoot !== undefined) gamepad.buttons.shoot = data.buttons.shoot;
            if (data.buttons.aim !== undefined) gamepad.buttons.aim = data.buttons.aim;
            if (data.buttons.start !== undefined) gamepad.buttons.start = data.buttons.start;
            if (data.buttons.swapWeapon !== undefined) gamepad.buttons.swapWeapon = data.buttons.swapWeapon;
            if (data.buttons.pickup !== undefined) gamepad.buttons.pickup = data.buttons.pickup;
        }

        if (data.axes) {
            if (data.axes.moveX !== undefined) gamepad.axes.moveX = data.axes.moveX;
            if (data.axes.moveY !== undefined) gamepad.axes.moveY = data.axes.moveY;
            if (data.axes.lookX !== undefined) gamepad.axes.lookX = data.axes.lookX;
            if (data.axes.lookY !== undefined) gamepad.axes.lookY = data.axes.lookY;
        }

        console.log('Applied gamepad config from JSON');
    },

    // Generate JSON for export (for Save button)
    exportSettings: function(gm) {
        return {
            settings: {
                camera: {
                    fov: camera.baseFocalLength,
                    pitchOffset: typeof pitchOffset !== 'undefined' ? pitchOffset : 0,
                    targetFPS: typeof targetFPS !== 'undefined' ? targetFPS : 60
                },
                player: {
                    playerHeight: typeof playerHeightOffset !== 'undefined' ? playerHeightOffset : 80,
                    normalHeight: typeof player !== 'undefined' ? player.normalHeight : 80,
                    crouchHeight: typeof player !== 'undefined' ? player.crouchHeight : 40,
                    jumpMin: typeof player !== 'undefined' ? player.jumpMinStrength : 10,
                    jumpMax: typeof player !== 'undefined' ? player.jumpMaxStrength : 25
                },
                bullet: {
                    bulletSize: typeof bulletSize !== 'undefined' ? bulletSize : 2.0,
                    barrelDistance: gm.barrelDistance
                },
                minimap: {
                    zoomRange: typeof minimapZoomRange !== 'undefined' ? minimapZoomRange : 200,
                    sideViewZoomRange: typeof sideViewZoomRange !== 'undefined' ? sideViewZoomRange : 300
                },
                scope: {
                    mode: typeof scopeMode !== 'undefined' ? scopeMode : 'crop'
                },
                debug: {
                    showHitRanges: typeof showHitRanges !== 'undefined' ? showHitRanges : true,
                    showGMD: typeof showGMD !== 'undefined' ? showGMD : true,
                    showTestTarget: typeof testTarget !== 'undefined' ? testTarget.enabled : true,
                    targetDistance: typeof testTarget !== 'undefined' ? testTarget.distance : 25,
                    targetRadius: typeof testTarget !== 'undefined' ? testTarget.radius : 2.0
                }
            },
            gunModel: {
                ads: {
                    offsetX: gunViewModel.adsOffsetX,
                    offsetY: gunViewModel.adsOffsetY,
                    offsetZ: gunViewModel.adsOffsetZ,
                    scale: gunViewModel.adsScale,
                    rotationX: gunViewModel.adsRotationX,
                    rotationY: gunViewModel.adsRotationY,
                    rotationZ: gunViewModel.adsRotationZ
                },
                hip: {
                    offsetX: gunViewModel.hipOffsetX,
                    offsetY: gunViewModel.hipOffsetY,
                    offsetZ: gunViewModel.hipOffsetZ,
                    scale: gunViewModel.hipScale,
                    rotationX: gunViewModel.hipRotationX,
                    rotationY: gunViewModel.hipRotationY,
                    rotationZ: gunViewModel.hipRotationZ
                },
                barrel: {
                    ads: {
                        x: gm.adsBarrelX,
                        y: gm.adsBarrelY,
                        z: gm.adsBarrelZ,
                        yaw: gm.adsBarrelYaw
                    },
                    hip: {
                        x: gm.hipBarrelX,
                        y: gm.hipBarrelY,
                        z: gm.hipBarrelZ,
                        yaw: gm.hipBarrelYaw
                    },
                    distance: gm.barrelDistance
                },
                world: {
                    ads: {
                        forward: gm.adsWorldForward,
                        right: gm.adsWorldRight,
                        down: gm.adsWorldDown
                    },
                    hip: {
                        forward: gm.hipWorldForward,
                        right: gm.hipWorldRight,
                        down: gm.hipWorldDown
                    }
                },
                adsLerpSpeed: gm.adsLerpSpeed
            },
            gamepad: typeof gamepad !== 'undefined' ? {
                deadzone: gamepad.deadzone,
                lookSensitivity: gamepad.lookSensitivity,
                buttons: {
                    jump: gamepad.buttons.jump,
                    crouch: gamepad.buttons.crouch,
                    reload: gamepad.buttons.reload,
                    sprint: gamepad.buttons.sprint,
                    sprintAlt: gamepad.buttons.sprintAlt,
                    shoot: gamepad.buttons.shoot,
                    aim: gamepad.buttons.aim,
                    start: gamepad.buttons.start,
                    swapWeapon: gamepad.buttons.swapWeapon,
                    pickup: gamepad.buttons.pickup
                },
                axes: {
                    moveX: gamepad.axes.moveX,
                    moveY: gamepad.axes.moveY,
                    lookX: gamepad.axes.lookX,
                    lookY: gamepad.axes.lookY
                }
            } : null
        };
    },

    // Copy JSON to clipboard for manual file update
    copyToClipboard: function(gm) {
        var exported = this.exportSettings(gm);
        var jsonStr = JSON.stringify(exported, null, 2);

        navigator.clipboard.writeText(jsonStr).then(function() {
            console.log('Settings JSON copied to clipboard!');
            console.log('Paste into data/settings.json, data/gunModel.json, and data/gamepad.json');
        }).catch(function(err) {
            console.error('Failed to copy:', err);
            // Fallback: log to console
            console.log('=== SETTINGS JSON ===');
            console.log(JSON.stringify(exported.settings, null, 2));
            console.log('=== GUN MODEL JSON ===');
            console.log(JSON.stringify(exported.gunModel, null, 2));
            console.log('=== GAMEPAD JSON ===');
            console.log(JSON.stringify(exported.gamepad, null, 2));
        });

        return exported;
    }
};
